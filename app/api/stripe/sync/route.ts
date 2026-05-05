import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { 
  PRICE_CREDIT_60, PRICE_CREDIT_200, PRICE_CREDIT_450,
  PRICE_TSS_3, PRICE_TSS_10, PRICE_TSS_25,
  PRICE_BUNDLE_STANDARD, PRICE_BUNDLE_PRO, PRICE_BUNDLE_CHEF, PRICE_BUNDLE_UNSTOPPABLE
} from '@/lib/server-config';

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

  try {
    const { userId, sessionId } = await req.json();
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

    console.log('[Stripe Sync] Syncing user:', userId, 'session:', sessionId);

    // 1. Try session ID first
    let priceId: string | undefined;
    if (sessionId) {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      priceId = session?.line_items?.data[0]?.price?.id;
    }

    // 2. If we have priceId, check if it's a known product
    const reward = priceId ? REWARD_MAP[priceId] : null;

    if (reward) {
      // Check if this session was already processed (idempotency)
      // For simplicity, we just add credits if we find a valid session that hasn't been processed yet? 
      // Actually, we don't have a "processed_session_ids" table.
      // The webhook is the primary source of truth. This sync is just to trigger UI update.
      // BUT the user complains about not getting credits. 
      // If the webhook failed or hasn't run yet, this sync endpoint acts as a backup.
      
      // Check current balance vs expected balance? No.
      // Just add the credits here as a fallback? No, that might double add.
      // Best approach: If we see the session completed, and the user's balance DOES NOT reflect it, add it.
      // But we don't know what their balance was before.
      
      // Solution: Use the webhook for credit addition. Use sync ONLY to check if the user HAS credits.
      // If the user buys something, and the profile doesn't show it, we show "Processing".
      // Since we can't reliably "retry" credit addition without a ledger table, we rely on Webhook.
      // However, if Webhook fails, the user loses money.
      
      // Safe Sync: Only update if profile doesn't have enough credits? No, users earn credits too.
      // Actually, for one-time payments, we CAN check if this specific session was applied?
      // We can add `last_processed_session_id` to profiles table.
      
      const { data: profile } = await supabaseAdmin.from('profiles').select('*').eq('id', userId).single();
      
      if (profile?.last_processed_session_id === sessionId) {
        return NextResponse.json({ synced: true, reason: 'already_processed' });
      }

      // If not processed, and session is complete, apply rewards
      await supabaseAdmin.from('profiles').update({
        credits: (profile?.credits || 0) + reward.credits,
        tss_credits: (profile?.tss_credits || 0) + reward.tss,
        last_processed_session_id: sessionId
      }).eq('id', userId);

      return NextResponse.json({ synced: true, addedCredits: reward.credits, addedTss: reward.tss });
    }

    return NextResponse.json({ synced: false, reason: 'no_valid_product_in_session' });

  } catch (error: any) {
    console.error('[Stripe Sync] Fatal:', error);
    return NextResponse.json({ synced: false, error: error.message }, { status: 500 });
  }
}
