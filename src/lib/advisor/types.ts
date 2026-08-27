export type ExperienceLevel = "beginner" | "intermediate" | "advanced";

export type AdvisorInput = {
  industry: string;
  team_size: number;
  budget_monthly: number | null;
  project_type: string;
  primary_languages: string[];
  frameworks: string[];
  operating_systems: string[];
  deployment_preference: string;
  ai_preference: string;
  privacy_requirement: "standard" | "high" | "offline";
  local_ai_required: boolean;
  collaboration_required: boolean;
  agent_required: boolean;
  codebase_size: "small" | "medium" | "large";
  experience_level: ExperienceLevel;
};

export type PricingPlan = {
  name: string;
  price: number | null;
  currency: string;
  billing_period: string | null;
  is_per_user: boolean;
  is_free: boolean;
  price_model: string | null;
};

export type AdvisorFeature = {
  slug: string;
  name: string;
  support_level: string;
};

export type AdvisorProduct = {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  product_type: string | null;
  description: string | null;
  pricing: PricingPlan[];
  features: AdvisorFeature[];
  models: string[];
  operating_systems: string[] | null;
  score: {
    overall: number | null;
    performance: number | null;
    value: number | null;
    ease_of_use: number | null;
    features: number | null;
    reliability: number | null;
    integrations: number | null;
    automation: number | null;
    local_ai: number | null;
  } | null;
};

export type Recommendation = {
  product_id: string;
  product_slug: string;
  product_name: string;
  recommended_plan: string | null;
  plan_kind: "free" | "paid" | "unknown";
  score: number;
  reasons: string[];
  tradeoffs: string[];
  estimated_monthly_cost: number | null;
  free_alternative: boolean;
  free_alternative_plan: string | null;
  category: string | null;
  confidence: number;
};

export type AdvisorResult = {
  recommendations: Recommendation[];
  estimated_total_monthly_cost: number | null;
  assumptions: string[];
  missing_information: string[];
  methodology_version: string;
};
