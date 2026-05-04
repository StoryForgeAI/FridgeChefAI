import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { STRIPE_TIERS, type SubscriptionTier } from '@/lib/types';

export const runtime = 'nodejs';

function resolveTierFromPrice(priceId: string): SubscriptionTier {
  if (priceId === process.env.STRIPE_STANDARD_PRICE_ID) return 'standard';
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return 'pro';
  if (priceId === process.env.STRIPE_CHEF_PRICE_ID) return 'chef';
  return 'free';
}

export async function POST(req: NextRequest) {
  const supabaseAdmin: any = getSupabaseAdmin();

  try {
    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    console.log('[Stripe Sync] Looking up subscriptions for user:', userId);

    // Get profile to find Stripe customer
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    const customerId = profile?.stripe_customer_id;
    if (!customerId) {
      console.log('[Stripe Sync] No Stripe customer found for user');
      return NextResponse.json({ synced: false, reason: 'no_customer' });
    }

    // List subscriptions for this customer
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
      status: 'active'
    });

    if (subscriptions.data.length === 0) {
      console.log('[Stripe Sync] No active subscriptions found');
      return NextResponse.json({ synced: false, reason: 'no_active_subscription' });
    }

    const subscription = subscriptions.data[0];
    const priceId = subscription.items.data[0]?.price?.id;
    const tier = resolveTierFromPrice(priceId);
    const config = STRIPE_TIERS[tier];

    console.log('[Stripe Sync] Found active subscription:', {
      subscriptionId: subscription.id,
      priceId,
      tier,
      status: subscription.status
    });

    // Update profile
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

    console.log('[Stripe Sync] Profile updated successfully');

    return NextResponse.json({
      synced: true,
      tier,
      subscriptionId: subscription.id
    });
  } catch (error) {
    console.error('[Stripe Sync] Error:', error);
    return NextResponse.json({ synced: false, error: 'Sync failed' }, { status: 500 });
  }
}
