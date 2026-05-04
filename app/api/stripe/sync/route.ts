import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { STRIPE_TIERS, type SubscriptionTier } from '@/lib/types';
import { STRIPE_STANDARD_PRICE_ID, STRIPE_PRO_PRICE_ID, STRIPE_CHEF_PRICE_ID } from '@/lib/server-config';

export const runtime = 'nodejs';

function resolveTierFromPrice(priceId: string): SubscriptionTier {
  if (priceId === STRIPE_STANDARD_PRICE_ID) return 'standard';
  if (priceId === STRIPE_PRO_PRICE_ID) return 'pro';
  if (priceId === STRIPE_CHEF_PRICE_ID) return 'chef';
  return 'free';
}

export async function POST(req: NextRequest) {
  const supabaseAdmin: any = getSupabaseAdmin();

  try {
    const { userId, sessionId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    console.log('[Stripe Sync] Starting sync for user:', userId, 'sessionId:', sessionId);

    let subscription: any = null;

    // 1. If we have a session ID, retrieve the checkout session
    if (sessionId) {
      console.log('[Stripe Sync] Retrieving checkout session:', sessionId);
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      console.log('[Stripe Sync] Session payment_status:', session.payment_status, 'subscription:', session.subscription);

      if (session.subscription) {
        const subId = typeof session.subscription === 'string' ? session.subscription : (session.subscription as any).id;
        console.log('[Stripe Sync] Retrieving subscription:', subId);
        subscription = await stripe.subscriptions.retrieve(subId, {
          expand: ['items.data.price']
        });
        console.log('[Stripe Sync] Subscription status:', subscription.status, 'items:', subscription.items.data.length);
      }
    }

    // 2. Fallback: look up by customer
    if (!subscription) {
      console.log('[Stripe Sync] No subscription from session, trying customer lookup');
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('stripe_customer_id')
        .eq('id', userId)
        .single();

      const customerId = profile?.stripe_customer_id;
      if (customerId) {
        const subscriptions = await stripe.subscriptions.list({
          customer: customerId,
          limit: 1,
          status: 'all'
        });
        if (subscriptions.data.length > 0) {
          subscription = subscriptions.data[0];
          console.log('[Stripe Sync] Found subscription via customer:', subscription.id, subscription.status);
        }
      }
    }

    if (!subscription) {
      console.log('[Stripe Sync] No subscription found anywhere');
      return NextResponse.json({ synced: false, reason: 'no_subscription' });
    }

    // 3. Get tier and config
    const priceId = subscription.items.data[0]?.price?.id;
    console.log('[Stripe Sync] Price ID from subscription:', priceId);
    console.log('[Stripe Sync] Server price IDs:', { standard: STRIPE_STANDARD_PRICE_ID, pro: STRIPE_PRO_PRICE_ID, chef: STRIPE_CHEF_PRICE_ID });

    const tier = resolveTierFromPrice(priceId);
    const config = STRIPE_TIERS[tier];

    console.log('[Stripe Sync] Resolved tier:', tier, 'config:', config);

    // 4. Update profile
    await supabaseAdmin
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

    console.log('[Stripe Sync] Profile updated successfully!');

    return NextResponse.json({
      synced: true,
      tier,
      subscriptionId: subscription.id
    });
  } catch (error) {
    console.error('[Stripe Sync] Error:', error);
    return NextResponse.json({ synced: false, error: String(error) }, { status: 500 });
  }
}
