import 'server-only';

export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
export const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY!;
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

// One-time Credit Packs
export const PRICE_CREDIT_60 = process.env.PRICE_CREDIT_60 || '';
export const PRICE_CREDIT_200 = process.env.PRICE_CREDIT_200 || '';
export const PRICE_CREDIT_450 = process.env.PRICE_CREDIT_450 || '';

// TSS Packs
export const PRICE_TSS_3 = process.env.PRICE_TSS_3 || '';
export const PRICE_TSS_10 = process.env.PRICE_TSS_10 || '';
export const PRICE_TSS_25 = process.env.PRICE_TSS_25 || '';

// Bundles
export const PRICE_BUNDLE_STANDARD = process.env.PRICE_BUNDLE_STANDARD || '';
export const PRICE_BUNDLE_PRO = process.env.PRICE_BUNDLE_PRO || '';
export const PRICE_BUNDLE_CHEF = process.env.PRICE_BUNDLE_CHEF || '';
export const PRICE_BUNDLE_UNSTOPPABLE = process.env.PRICE_BUNDLE_UNSTOPPABLE || '';
