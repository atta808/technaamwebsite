export type SanitizedStackInput = {
  project_type: string;
  team_size: number;
  budget_monthly: number | null;
  deployment_preference: string;
  primary_languages: string[];
  frameworks: string[];
  operating_systems: string[];
  privacy_requirement: "standard" | "high" | "offline";
};

export type SanitizedRoastFinding = {
  id: string;
  severity: string;
  category: string;
  title: string;
  description: string;
  affected_technologies: string[];
};

export type SanitizedStackImprovement = {
  type: string;
  current_technology: string | null;
  suggested_technology: string | null;
  reason: string;
  expected_benefit: string;
};

export type SanitizedNormalizedTechnology = {
  normalized_name: string;
  resolution_status: string;
};

export type SanitizedRoastContext = {
  input: SanitizedStackInput;
  stack_score: {
    overall: number;
    confidence: number;
  };
  resolved_technologies: SanitizedNormalizedTechnology[];
  unresolved_technologies: SanitizedNormalizedTechnology[];
  findings: SanitizedRoastFinding[];
  improvements: SanitizedStackImprovement[];
};

export type AITopIssue = {
  finding_id: string;
  explanation: string;
};

export type AIImprovementExplanation = {
  improvement_index: number;
  explanation: string;
};

export type AIExplanation = {
  headline: string;
  summary: string;
  roast: string;
  top_issues: AITopIssue[];
  improvement_explanations: AIImprovementExplanation[];
  uncertainty_note: string;
};

export type AIExplanationResponse =
  | { available: true; explanation: AIExplanation }
  | { available: false; reason: "offline" | "provider_unavailable" };

export type RoastAIProvider = {
  readonly name: string;
  explain(context: SanitizedRoastContext): Promise<AIExplanationResponse>;
};
