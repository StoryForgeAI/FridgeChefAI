export type SubscriptionTier = 'free' | 'standard' | 'pro' | 'chef';
export type StatsAccessLevel = 'basic' | 'pro' | 'ultra';

export interface Profile {
  id: string;
  tier?: SubscriptionTier | null;
  subscription_tier?: SubscriptionTier | null;
  credits: number;
  tss_credits: number;
  subscription_status?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  discount_percent?: number | null;
  item_limit?: number | null;
  recipe_suggestion_limit?: number | null;
  stats_access_level?: StatsAccessLevel | null;
  created_at: string;
  updated_at: string;
}

export interface PantryItem {
  id: string;
  user_id: string;
  barcode: string;
  name: string;
  kcal: number | null;
  created_at: string;
}

export interface Recipe {
  title: string;
  description: string;
  ingredients: string[];
  prep?: string[];
  steps: string[];
  kcal_per_serving: number;
}

export interface RecipeHistory {
  id: string;
  user_id: string;
  ingredients: string[];
  recipe: Recipe[];
  max_calories: number | null;
  allergies: string[] | null;
  servings: number;
  created_at: string;
}

export interface Stats {
  id: string;
  user_id: string;
  total_recipes_generated: number;
  total_pantry_items: number;
  total_credits_used: number;
  extra_stats: {
    total_calories_scanned?: number;
    [key: string]: unknown;
  };
  created_at: string;
  updated_at: string;
}

export type ProductType = 'credit_pack' | 'tss_pack' | 'bundle';

export const PRODUCTS = {
  // Credit Packs
  credit_60: {
    id: 'credit_60',
    type: 'credit_pack' as ProductType,
    label: 'Starter Credits',
    description: '60 Credits',
    credits: 60,
    tss: 0,
    price: 1.99,
    envKey: 'PRICE_CREDIT_60'
  },
  credit_200: {
    id: 'credit_200',
    type: 'credit_pack' as ProductType,
    label: 'Power User Credits',
    description: '200 Credits',
    credits: 200,
    tss: 0,
    price: 9.99,
    envKey: 'PRICE_CREDIT_200'
  },
  credit_450: {
    id: 'credit_450',
    type: 'credit_pack' as ProductType,
    label: 'Master Credits',
    description: '450 Credits',
    credits: 450,
    tss: 0,
    price: 14.99,
    envKey: 'PRICE_CREDIT_450'
  },

  // TSS Packs
  tss_3: {
    id: 'tss_3',
    type: 'tss_pack' as ProductType,
    label: 'Starter TSS',
    description: '3 TSS Credits',
    credits: 0,
    tss: 3,
    price: 3.99,
    envKey: 'PRICE_TSS_3'
  },
  tss_10: {
    id: 'tss_10',
    type: 'tss_pack' as ProductType,
    label: 'Pro TSS',
    description: '10 TSS Credits',
    credits: 0,
    tss: 10,
    price: 9.99,
    envKey: 'PRICE_TSS_10'
  },
  tss_25: {
    id: 'tss_25',
    type: 'tss_pack' as ProductType,
    label: 'Master TSS',
    description: '25 TSS Credits',
    credits: 0,
    tss: 25,
    price: 19.99,
    envKey: 'PRICE_TSS_25'
  },

  // Bundles
  bundle_standard: {
    id: 'bundle_standard',
    type: 'bundle' as ProductType,
    label: 'Standard Bundle',
    description: '50 Credits + 3 TSS',
    credits: 50,
    tss: 3,
    price: 3.99,
    envKey: 'PRICE_BUNDLE_STANDARD'
  },
  bundle_pro: {
    id: 'bundle_pro',
    type: 'bundle' as ProductType,
    label: 'Pro Bundle',
    description: '150 Credits + 12 TSS',
    credits: 150,
    tss: 12,
    price: 9.99,
    envKey: 'PRICE_BUNDLE_PRO'
  },
  bundle_chef: {
    id: 'bundle_chef',
    type: 'bundle' as ProductType,
    label: 'Chef Bundle',
    description: '500 Credits + 20 TSS',
    credits: 500,
    tss: 20,
    price: 24.99,
    envKey: 'PRICE_BUNDLE_CHEF'
  },
  bundle_unstoppable: {
    id: 'bundle_unstoppable',
    type: 'bundle' as ProductType,
    label: 'Unstoppable Bundle',
    description: '1000 Credits + 50 TSS',
    credits: 1000,
    tss: 50,
    price: 49.99,
    envKey: 'PRICE_BUNDLE_UNSTOPPABLE'
  }
} as const;

export function resolveProfileTier(profile?: Pick<Profile, 'tier' | 'subscription_tier'> | null): SubscriptionTier {
  return profile?.subscription_tier ?? profile?.tier ?? 'free';
}

// Kept for UI limits and tier display logic
export const STRIPE_TIERS = {
  free: {
    label: 'Free',
    price: 0,
    credits: 20,
    tss_credits: 0,
    discount: 0,
    itemLimit: 5,
    recipeSuggestions: 5,
    statsAccessLevel: 'basic' as StatsAccessLevel
  },
  standard: {
    label: 'Standard',
    price: 2.99,
    credits: 250,
    tss_credits: 10,
    discount: 0.1,
    itemLimit: 10,
    recipeSuggestions: 5,
    statsAccessLevel: 'basic' as StatsAccessLevel
  },
  pro: {
    label: 'Pro',
    price: 9.99,
    credits: 3000,
    tss_credits: 80,
    discount: 0.25,
    itemLimit: 50,
    recipeSuggestions: 5,
    statsAccessLevel: 'pro' as StatsAccessLevel
  },
  chef: {
    label: 'Chef',
    price: 18.99,
    credits: 6500,
    tss_credits: 160,
    discount: 0.3,
    itemLimit: 100,
    recipeSuggestions: 10,
    statsAccessLevel: 'ultra' as StatsAccessLevel
  }
} as const;
