import { NextRequest, NextResponse } from 'next/server';
import { STRIPE_WEBHOOK_SECRET, PRICE_CREDIT_60, PRICE_CREDIT_200, PRICE_CREDIT_450, PRICE_TSS_3, PRICE_TSS_10, PRICE_TSS_25, PRICE_BUNDLE_STANDARD, PRICE_BUNDLE_PRO, PRICE_BUNDLE_CHEF, PRICE_BUNDLE_UNSTOPPABLE } from '@/lib/server-config';
import { stripe } from '@/lib/stripe';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

const REWARD_MAP: Record<string, { credits: number; tss: number }> = {
  [PRICE_CREDIT_60]: { credits: 60, tss: 0 },
  [PRICE_CREDIT_200]: { credits: 200, tss: 0 },
  [PRICE_CREDIT_450]: { credits: 450, tss: 0 },
  [PRICE_TSS_3]: { credits: 0, tss: 3 },
  [PRICE_TSS_10]: { credits: 0, tss: 10 },
  [PRICE_TSS_25]: { credits: 0, tss: 25 },
  [PRICE_BUNDLE_STANDARD]: { credits: 50, tss: 3 },
  [PRICE_BUNDLE_PRO]: { credits: 150, tss: 12 },
  [PRICE_BUNDLE_CHEF]: { credits: 500, tss: 20 },
  [PRICE_BUNDLE_UNSTOPPABLE]: { credits: 1000, tss: 50 }
};

export async function POST(req: NextRequest) {
  const supabaseAdmin: any = getSupabaseAdmin();
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    console.error('[Stripe Webhook] No signature');
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  try {
    const event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      const userId = session?.metadata?.user_id;
      const sessionId = session.id;
      const priceId = session?.line_items?.data[0]?.price?.id;

      console.log('[Stripe Webhook] Checkout completed. User:', userId, 'Session:', sessionId, 'Price:', priceId);

      if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

      const reward = priceId ? REWARD_MAP[priceId] : null;
      if (!reward) {
        console.error('[Stripe Webhook] Unknown priceId:', priceId);
        return NextResponse.json({ error: 'Unknown product' }, { status: 400 });
      }

      // Idempotency check
      const { data: profile } = await supabaseAdmin.from('profiles').select('last_processed_session_id, credits, tss_credits').eq('id', userId).single();
      
      if (profile?.last_processed_session_id === sessionId) {
        console.log('[Stripe Webhook] Session already processed:', sessionId);
        return NextResponse.json({ received: true });
      }

      // Apply rewards
      const currentCredits = profile?.credits ?? 0;
      const currentTss = profile?.tss_credits ?? 0;

      await supabaseAdmin.from('profiles').update({
        credits: currentCredits + reward.credits,
        tss_credits: currentTss + reward.tss,
        last_processed_session_id: sessionId
      }).eq('id', userId);

      console.log('[Stripe Webhook] Rewards applied:', { addedCredits: reward.credits, addedTss: reward.tss });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Stripe Webhook] Error:', error);
    return NextResponse.json({ error: 'Webhook error' }, { status: 400 });
  }
}
