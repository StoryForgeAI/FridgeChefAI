import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { 
  PRICE_CREDIT_60, PRICE_CREDIT_200, PRICE_CREDIT_450,
  PRICE_TSS_3, PRICE_TSS_10, PRICE_TSS_25,
  PRICE_BUNDLE_STANDARD, PRICE_BUNDLE_PRO, PRICE_BUNDLE_CHEF, PRICE_BUNDLE_UNSTOPPABLE
} from '@/lib/server-config';

const PRODUCT_PRICE_MAP: Record<string, string> = {
  credit_60: PRICE_CREDIT_60,
  credit_200: PRICE_CREDIT_200,
  credit_450: PRICE_CREDIT_450,
  tss_3: PRICE_TSS_3,
  tss_10: PRICE_TSS_10,
  tss_25: PRICE_TSS_25,
  bundle_standard: PRICE_BUNDLE_STANDARD,
  bundle_pro: PRICE_BUNDLE_PRO,
  bundle_chef: PRICE_BUNDLE_CHEF,
  bundle_unstoppable: PRICE_BUNDLE_UNSTOPPABLE
};

export async function POST(req: NextRequest) {
  const { productKey, userId, email } = await req.json();

  const priceId = PRODUCT_PRICE_MAP[productKey];
  if (!priceId || !userId) {
    return NextResponse.json({ error: 'Invalid product or missing userId' }, { status: 400 });
  }

  try {
    const origin = req.headers.get('origin') || new URL(req.url).origin;
    const session = await stripe.checkout.sessions.create({
      mode: 'payment', // One-time payment
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email,
      metadata: { user_id: userId },
      success_url: `${origin}/profile?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/profile?canceled=true`
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('[Stripe Checkout] Error:', err);
    return NextResponse.json({ error: 'Checkout failed: ' + err.message }, { status: 500 });
  }
}
