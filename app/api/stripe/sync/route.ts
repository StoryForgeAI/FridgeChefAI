import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { STRIPE_TIERS, type SubscriptionTier } from '@/lib/types';
import { STRIPE_STANDARD_PRICE_ID, STRIPE_PRO_PRICE_ID, STRIPE_CHEF_PRICE_ID } from '@/lib/server-config';

export const runtime = 'nodejs';

function resolveTierFromPrice(priceId: string): SubscriptionTier {
  console.log('[Stripe Sync] Resolving tier for priceId:', priceId);
  if (priceId === STRIPE_STANDARD_PRICE_ID) return 'standard';
  if (priceId === STRIPE_PRO_PRICE_ID) return 'pro';
  if (priceId === STRIPE_CHEF_PRICE_ID) return 'chef';
  return 'free';
}

async function updateProfile(supabaseAdmin: any, userId: string, subscription: any) {
  const priceId = subscription.items.data[0]?.price?.id;
  const tier = resolveTierFromPrice(priceId);
  const config = STRIPE_TIERS[tier];

  console.log('[Stripe Sync] Updating profile:', { userId, tier, priceId, config });

  const { data: current } = await supabaseAdmin.from('profiles').select('credits, tss_credits').eq('id', userId).single();
  const currentCredits = current?.credits ?? 20;
  const currentTss = current?.tss_credits ?? 0;

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      tier,
      subscription_tier: tier,
      subscription_status: subscription.status,
      stripe_customer_id: subscription.customer,
      stripe_subscription_id: subscription.id,
      credits: currentCredits + config.credits,
      tss_credits: currentTss + config.tss_credits,
      discount_percent: config.discount,
      item_limit: config.itemLimit,
      recipe_suggestion_limit: config.recipeSuggestions,
      stats_access_level: config.statsAccessLevel
    })
    .eq('id', userId);

  if (error) throw error;
  return { tier, credits: currentCredits + config.credits, tss_credits: currentTss + config.tss_credits };
}

export async function POST(req: NextRequest) {
  const supabaseAdmin: any = getSupabaseAdmin();

  try {
    const { userId, sessionId } = await req.json();
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

    console.log('[Stripe Sync] Syncing user:', userId);

    let subscription: any = null;

    // 1. Try session ID first
    if (sessionId) {
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        console.log('[Stripe Sync] Session status:', session.payment_status, 'sub:', session.subscription);
        
        if (session.subscription) {
          const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
          subscription = await stripe.subscriptions.retrieve(subId, { expand: ['items.data.price'] });
        }
      } catch (err: any) {
        console.log('[Stripe Sync] Session retrieve failed:', err.message);
      }
    }

    // 2. Fallback: List all subscriptions for the customer
    if (!subscription) {
      const { data: profile } = await supabaseAdmin.from('profiles').select('stripe_customer_id').eq('id', userId).single();
      const customerId = profile?.stripe_customer_id;
      
      if (customerId) {
        const subs = await stripe.subscriptions.list({ customer: customerId, limit: 10, status: 'all' });
        // Prefer active/trialing, then incomplete (being processed), then any
        const activeSub = subs.data.find(s => s.status === 'active' || s.status === 'trialing');
        const incompleteSub = subs.data.find(s => s.status === 'incomplete' || s.status === 'incomplete_expired');
        const chosen = activeSub || incompleteSub || subs.data[0];
        if (chosen) {
          subscription = await stripe.subscriptions.retrieve(chosen.id, { expand: ['items.data.price'] });
          console.log('[Stripe Sync] Found via customer:', subscription.id, subscription.status);
        }
      }
    }

    if (!subscription) {
      console.log('[Stripe Sync] No subscription found');
      return NextResponse.json({ synced: false, reason: 'no_subscription' });
    }

    // Don't sync if subscription is definitely not valid
    if (subscription.status === 'canceled' || subscription.status === 'incomplete_expired') {
      console.log('[Stripe Sync] Subscription is', subscription.status, '- not syncing');
      return NextResponse.json({ synced: false, reason: 'subscription_' + subscription.status });
    }

    console.log('[Stripe Sync] Found subscription:', { id: subscription.id, status: subscription.status });

    const result = await updateProfile(supabaseAdmin, userId, subscription);
    return NextResponse.json({ synced: true, ...result });
  } catch (error: any) {
    console.error('[Stripe Sync] Fatal:', error);
    return NextResponse.json({ synced: false, error: error.message }, { status: 500 });
  }
}
