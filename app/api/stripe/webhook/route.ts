import { NextRequest, NextResponse } from 'next/server';
import { STRIPE_CHEF_PRICE_ID, STRIPE_PRO_PRICE_ID, STRIPE_STANDARD_PRICE_ID, STRIPE_WEBHOOK_SECRET } from '@/lib/server-config';
import { stripe } from '@/lib/stripe';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { STRIPE_TIERS, type SubscriptionTier } from '@/lib/types';

export const runtime = 'nodejs';

function resolveTierFromPrice(priceId: string): SubscriptionTier {
  if (priceId === STRIPE_STANDARD_PRICE_ID) {
    return 'standard';
  }

  if (priceId === STRIPE_PRO_PRICE_ID) {
    return 'pro';
  }

  if (priceId === STRIPE_CHEF_PRICE_ID) {
    return 'chef';
  }

  return 'free';
}

export async function POST(req: NextRequest) {
  const supabaseAdmin: any = getSupabaseAdmin();
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  try {
    const event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);

    if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
      const subscription = event.data.object as any;
      const priceId = subscription.items.data[0]?.price?.id;
      const userId = subscription.metadata?.user_id;
      const tier = resolveTierFromPrice(priceId);
      const config = STRIPE_TIERS[tier];

      if (userId) {
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
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as any;
      const userId = subscription.metadata?.user_id;
      const config = STRIPE_TIERS.free;

      if (userId) {
        await supabaseAdmin
          .from('profiles')
          .update({
            tier: 'free',
            subscription_tier: 'free',
            subscription_status: 'canceled',
            stripe_subscription_id: null,
            credits: config.credits,
            tss_credits: config.tss_credits,
            discount_percent: config.discount,
            item_limit: config.itemLimit,
            recipe_suggestion_limit: config.recipeSuggestions,
            stats_access_level: config.statsAccessLevel
          })
          .eq('id', userId);
      }
    }

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: 'Webhook error' }, { status: 400 });
  }
}
