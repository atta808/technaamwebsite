export type BillingPeriod =
  | "one_time"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "annual"
  | "usage_based";

export interface PricingPlanInput {
  id: string;
  name: string;
  currency: string;
  price: number;
  billing_period: BillingPeriod;
  is_per_user: boolean;
  per_user_price: number;
}

export interface RetailOfferInput {
  id: string;
  price: number;
  shipping_cost: number | null;
  currency_code: string;
  region_code: string;
  tax_included: boolean;
  condition: "new" | "refurbished" | "used";
  confidence: number | null;
  checked_at: string | null;
}

export interface RetailEffectiveCost {
  effectiveCost: number;
  currencyCode: string;
  regionCode: string;
  taxIncluded: boolean;
  condition: "new" | "refurbished" | "used";
  shippingCost: number;
  confidence: number | null;
  checkedAt: string | null;
}

export type SubscriptionTargetPeriod = "monthly" | "annual";

export interface SubscriptionEffectiveCost {
  status: "supported" | "unsupported";
  reason?: string;
  effectiveCost: number | null;
  currencyCode: string;
  targetPeriod: SubscriptionTargetPeriod | "one_time";
  isPerUser: boolean;
  perUserPrice: number | null;
  originalPeriod: BillingPeriod;
}
