import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  try {
    const { userId, return_url } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // Fetch user profile to get Stripe customer id
    const admin = getSupabaseAdmin();
    const { data: profile } = await admin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single()
      .returns<{ stripe_customer_id: string | null }>();
    const customer = profile?.stripe_customer_id;
    if (!customer) {
      return NextResponse.json({ error: 'No Stripe customer found for user' }, { status: 400 });
    }

    const portalSession = await (stripe as any).billingPortal.sessions.create({
      customer,
      return_url: return_url ?? undefined,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err) {
    return NextResponse.json({ error: 'Portal error' }, { status: 500 });
  }
}
