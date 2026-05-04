import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { STRIPE_TIERS, type SubscriptionTier } from '@/lib/types';
import { STRIPE_STANDARD_PRICE_ID, STRIPE_PRO_PRICE_ID, STRIPE_CHEF_PRICE_ID } from '@/lib/server-config';

export const runtime = 'nodejs';

function resolveTierFromPrice(priceId: string): SubscriptionTier {
  console.log('[Stripe Sync] Resolving tier for priceId:', priceId);
  console.log('[Stripe Sync] Env standard:', STRIPE_STANDARD_PRICE_ID);
  console.log('[Stripe Sync] Env pro:', STRIPE_PRO_PRICE_ID);
  console.log('[Stripe Sync] Env chef:', STRIPE_CHEF_PRICE_ID);
  
  if (priceId === STRIPE_STANDARD_PRICE_ID) return 'standard';
  if (priceId === STRIPE_PRO_PRICE_ID) return 'pro';
  if (priceId === STRIPE_CHEF_PRICE_ID) return 'chef';
  return 'free';
}

export async function POST(req: NextRequest) {
  const supabaseAdmin: any = getSupabaseAdmin();

  try {
    const body = await req.json();
    const { userId, sessionId } = body;
    console.log('[Stripe Sync] Received request:', JSON.stringify(body));

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    let subscription: any = null;
    let lastError = '';

    // 1. Try via session ID
    if (sessionId) {
      try {
        console.log('[Stripe Sync] Retrieving checkout session:', sessionId);
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        console.log('[Stripe Sync] Session:', { id: session.id, payment_status: session.payment_status, subscription: session.subscription });

        if (session.subscription) {
          const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
          subscription = await stripe.subscriptions.retrieve(subId, {
            expand: ['items.data.price']
          });
          console.log('[Stripe Sync] Subscription from session:', { id: subscription.id, status: subscription.status, priceId: subscription.items.data[0]?.price?.id });
        } else {
          lastError = 'Session has no subscription object';
        }
      } catch (err: any) {
        lastError = `Session retrieve failed: ${err.message}`;
        console.log('[Stripe Sync] Session retrieve error:', lastError);
      }
    }

    // 2. Fallback: lookup by customer
    if (!subscription) {
      try {
        console.log('[Stripe Sync] Trying customer lookup');
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('stripe_customer_id')
          .eq('id', userId)
          .single();

        const customerId = profile?.stripe_customer_id;
        if (customerId) {
          const subscriptions = await stripe.subscriptions.list({
            customer: customerId,
            limit: 3,
            status: 'all'
          });
          console.log('[Stripe Sync] Customer subscriptions found:', subscriptions.data.length);
          
          // Get the most recent active or trialing subscription
          for (const sub of subscriptions.data) {
            if (sub.status === 'active' || sub.status === 'trialing') {
              subscription = sub;
              break;
            }
          }
          
          if (subscription) {
            // Re-retrieve with expanded price if needed
            if (!subscription.items.data[0]?.price?.id) {
              subscription = await stripe.subscriptions.retrieve(subscription.id, {
                expand: ['items.data.price']
              });
            }
            console.log('[Stripe Sync] Found subscription via customer:', subscription.id, subscription.status);
          } else {
            lastError = 'No active/trialing subscriptions for customer';
          }
        } else {
          lastError = 'No stripe_customer_id in profile';
        }
      } catch (err: any) {
        lastError = `Customer lookup failed: ${err.message}`;
        console.log('[Stripe Sync] Customer lookup error:', lastError);
      }
    }

    if (!subscription) {
      console.log('[Stripe Sync] No subscription found. Last error:', lastError);
      return NextResponse.json({ synced: false, reason: 'no_subscription', error: lastError });
    }

    // 3. Resolve tier
    const priceId = subscription.items.data[0]?.price?.id;
    const tier = resolveTierFromPrice(priceId);
    const config = STRIPE_TIERS[tier];

    console.log('[Stripe Sync] Tier:', tier, 'Price ID:', priceId, 'Config:', config);

    // 4. Update profile
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        tier,
        subscription_tier: tier,
        subscription_status: subscription.status,
        stripe_customer_id: subscription.customer,
        stripe_subscription_id: subscription.id,
        credits: config.credits,
        tss_credits: config.tss_credits,
        discount_percent: config.discount,
        item_limit: config.itemLimit,
        recipe_suggestion_limit: config.recipeSuggestions,
        stats_access_level: config.statsAccessLevel
      })
      .eq('id', userId);

    if (updateError) {
      console.error('[Stripe Sync] DB update error:', updateError);
      return NextResponse.json({ synced: false, error: updateError.message });
    }

    console.log('[Stripe Sync] SUCCESS! Profile updated');

    return NextResponse.json({
      synced: true,
      tier,
      subscriptionId: subscription.id,
      credits: config.credits,
      tss_credits: config.tss_credits
    });
  } catch (error: any) {
    console.error('[Stripe Sync] Fatal error:', error);
    return NextResponse.json({ synced: false, error: error.message }, { status: 500 });
  }
}
