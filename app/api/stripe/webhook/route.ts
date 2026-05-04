import { NextRequest, NextResponse } from 'next/server';
import { STRIPE_CHEF_PRICE_ID, STRIPE_PRO_PRICE_ID, STRIPE_STANDARD_PRICE_ID, STRIPE_WEBHOOK_SECRET } from '@/lib/server-config';
import { stripe } from '@/lib/stripe';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { STRIPE_TIERS, type SubscriptionTier } from '@/lib/types';

export const runtime = 'nodejs';

function resolveTierFromPrice(priceId: string): SubscriptionTier {
  if (priceId === STRIPE_STANDARD_PRICE_ID) return 'standard';
  if (priceId === STRIPE_PRO_PRICE_ID) return 'pro';
  if (priceId === STRIPE_CHEF_PRICE_ID) return 'chef';
  return 'free';
}

async function updateProfileSubscription(userId: string, subscription: any) {
  const supabaseAdmin: any = getSupabaseAdmin();
  const priceId = subscription.items.data[0]?.price?.id;
  const tier = resolveTierFromPrice(priceId);
  const config = STRIPE_TIERS[tier];

  console.log('[Stripe Webhook] Updating profile:', { userId, tier, priceId, subscriptionId: subscription.id, status: subscription.status });

  // Fetch current credits to ADD new ones
  const { data: current } = await supabaseAdmin.from('profiles').select('credits, tss_credits').eq('id', userId).single();
  const currentCredits = current?.credits ?? 0;
  const currentTss = current?.tss_credits ?? 0;

  return supabaseAdmin
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
}

export async function POST(req: NextRequest) {
  const supabaseAdmin: any = getSupabaseAdmin();
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    console.error('[Stripe Webhook] No signature provided');
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  try {
    const event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
    console.log('[Stripe Webhook] Event received:', event.type);

    // Checkout session completed – this fires right after payment
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      const userId = session?.metadata?.user_id || session?.customer_details?.email;
      const subscriptionId = session?.subscription;

      console.log('[Stripe Webhook] Checkout session completed:', { userId, subscriptionId });

      if (userId && subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
          expand: ['items.data.price']
        });
        await updateProfileSubscription(userId, subscription);
      }
    }

    // Subscription created or updated
    if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
      const subscription = event.data.object as any;
      const userId = subscription.metadata?.user_id;

      console.log('[Stripe Webhook] Subscription event:', { userId, subscriptionId: subscription.id, status: subscription.status });

      if (userId) {
        await updateProfileSubscription(userId, subscription);
      }
    }

    // Invoice payment succeeded – award monthly credits on subscription_cycle
    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object as any;
      const subscriptionId = invoice?.subscription;
      const billingReason = invoice?.billing_reason;

      console.log('[Stripe Webhook] Invoice payment succeeded:', { subscriptionId, billingReason });

      if (subscriptionId && billingReason === 'subscription_cycle') {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
          expand: ['items.data.price', 'metadata']
        });
        const userId = subscription.metadata?.user_id;
        const priceId = subscription.items.data[0]?.price?.id;
        const tier = resolveTierFromPrice(priceId);
        const config = STRIPE_TIERS[tier];

        if (userId) {
          const admin: any = getSupabaseAdmin();
          const { data: current } = await admin.from('profiles').select('credits, tss_credits').eq('id', userId).single();
          const currentData = current as any;
          const newCredits = (currentData?.credits ?? 0) + config.credits;
          const newTss = (currentData?.tss_credits ?? 0) + config.tss_credits;

          console.log('[Stripe Webhook] Awarding monthly credits:', { userId, newCredits, newTss });

          await admin.from('profiles').update({
            credits: newCredits,
            tss_credits: newTss,
            tier,
            subscription_tier: tier,
            subscription_status: subscription.status,
            stripe_subscription_id: subscription.id
          }).eq('id', userId);
        }
      }
    }

    // Subscription deleted/canceled
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as any;
      const userId = subscription.metadata?.user_id;
      const config = STRIPE_TIERS.free;

      console.log('[Stripe Webhook] Subscription deleted:', { userId });

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
  } catch (error) {
    console.error('[Stripe Webhook] Error:', error);
    return NextResponse.json({ error: 'Webhook error' }, { status: 400 });
  }
}
