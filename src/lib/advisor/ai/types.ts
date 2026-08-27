export type SanitizedInput = {
  project_type: string;
  industry: string;
  team_size: number;
  budget_monthly: number | null;
  experience_level: string;
  codebase_size: string;
  primary_languages: string[];
  frameworks: string[];
  operating_systems: string[];
  deployment_preference: string;
  ai_preference: string;
  privacy_requirement: string;
  local_ai_required: boolean;
  collaboration_required: boolean;
  agent_required: boolean;
};

export type SanitizedRecommendation = {
  product_name: string;
  category: string | null;
  recommended_plan: string | null;
  plan_kind: string;
  estimated_monthly_cost: number | null;
  free_alternative_plan: string | null;
  reasons: string[];
  tradeoffs: string[];
};

export type SanitizedAdvisorContext = {
  input: SanitizedInput;
  recommendations: SanitizedRecommendation[];
  assumptions: string[];
  missing_information: string[];
};

export type AIExplanationProduct = {
  why_it_fits: string;
  considerations: string;
};

export type AIExplanation = {
  summary: string;
  product_explanations: AIExplanationProduct[];
  uncertainty_note: string;
};

export type AIExplanationResponse =
  | { available: true; explanation: AIExplanation }
  | { available: false; reason: "offline" | "provider_unavailable" };

export type AIProvider = {
  readonly name: string;
  explain(context: SanitizedAdvisorContext): Promise<AIExplanationResponse>;
};
