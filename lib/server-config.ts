import 'server-only';

export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
export const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY!;
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
export const STRIPE_STANDARD_PRICE_ID = process.env.STRIPE_STANDARD_PRICE_ID || process.env.NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID || '';
export const STRIPE_PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID || process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || '';
export const STRIPE_CHEF_PRICE_ID = process.env.STRIPE_CHEF_PRICE_ID || process.env.NEXT_PUBLIC_STRIPE_CHEF_PRICE_ID || '';
