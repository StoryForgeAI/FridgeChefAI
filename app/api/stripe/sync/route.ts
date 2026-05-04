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
    const { userId, email } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    console.log('[Stripe Sync] Syncing for user:', userId);

    // 1. Get profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    let customerId = profile?.stripe_customer_id;

    // 2. If no customer ID in DB, try to find by email in Stripe
    if (!customerId && email) {
      console.log('[Stripe Sync] No customer ID in DB, looking up by email:', email);
      const customers = await stripe.customers.list({ email, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        console.log('[Stripe Sync] Found Stripe customer by email:', customerId);
        
        // Save it to the profile for next time
        await supabaseAdmin.from('profiles').update({ stripe_customer_id: customerId }).eq('id', userId);
      }
    }

    if (!customerId) {
      console.log('[Stripe Sync] No Stripe customer found');
      return NextResponse.json({ synced: false, reason: 'no_customer' });
    }

    // 3. List active subscriptions
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

    console.log('[Stripe Sync] Found active subscription:', { id: subscription.id, tier, status: subscription.status });

    // 4. Update profile with subscription data and credits
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
