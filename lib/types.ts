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

export interface BarcodePreview {
  barcode: string;
  name: string;
  kcal: number | null;
  image_url?: string | null;
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

export const STRIPE_TIERS = {
  free: {
    label: 'Free',
    price: 0,
    credits: 0,
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

export function resolveProfileTier(profile?: Pick<Profile, 'tier' | 'subscription_tier'> | null): SubscriptionTier {
  return profile?.subscription_tier ?? profile?.tier ?? 'free';
}
