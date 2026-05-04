import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  const { priceId, userId, email } = await req.json();

  if (!priceId || !userId) {
    return NextResponse.json({ error: 'Missing checkout payload' }, { status: 400 });
  }

  try {
    const origin = req.headers.get('origin') || new URL(req.url).origin;
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email,
      metadata: { user_id: userId },
      subscription_data: {
        metadata: { user_id: userId }
      },
      success_url: `${origin}/profile?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/profile?canceled=true`
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch {
    return NextResponse.json({ error: 'Checkout failed' }, { status: 500 });
  }
}
