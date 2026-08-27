export type AIProductExplanation = {
  product_name: string;
  why_it_fits: string;
  considerations: string;
};

export type AIExplanationResult = {
  summary: string;
  product_explanations: AIProductExplanation[];
  uncertainty_note: string;
};

export type SafeAIContext = {
  input: {
    industry: string;
    project_type: string;
    team_size: number;
    budget_monthly: number | null;
    experience_level: string;
    primary_languages: string[];
    frameworks: string[];
    operating_systems: string[];
    deployment_preference: string;
    ai_preference: string;
    local_ai_required: boolean;
    collaboration_required: boolean;
    agent_required: boolean;
    codebase_size: string;
    additional_requirements?: string;
  };
  recommendations: Array<{
    product_name: string;
    recommended_plan: string | null;
    confidence: number;
    reasons: string[];
    tradeoffs: string[];
  }>;
  missing_information: string[];
  assumptions: string[];
};

export interface AIProvider {
  explain(context: SafeAIContext): Promise<AIExplanationResult>;
}
