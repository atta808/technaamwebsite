export type ResolutionStatus = "resolved" | "unresolved" | "ambiguous";

export type StackInput = {
  technologies: {
    name: string;
    category?: string;
    version?: string;
  }[];
  project_type: string;
  team_size: number;
  budget_monthly: number | null;
  deployment_preference: string;
  primary_languages: string[];
  frameworks: string[];
  operating_systems: string[];
  ai_tools: string[];
  database_tools: string[];
  hosting_tools: string[];
  additional_requirements: string;
  // Included from AdvisorInput when overlapping, keeping standard types where applicable
  privacy_requirement: "standard" | "high" | "offline";
};

export type NormalizedTechnology = {
  original_name: string;
  normalized_name: string;
  resolved_product_id: string | null;
  resolved_product_slug: string | null;
  category: string | null;
  resolution_status: ResolutionStatus;
};

export type RoastFindingSeverity = "critical" | "high" | "medium" | "low" | "info";
export type RoastFindingCategory =
  | "redundancy"
  | "complexity"
  | "cost"
  | "compatibility"
  | "privacy"
  | "collaboration"
  | "architecture"
  | "unknown";

export type RoastFinding = {
  id: string;
  severity: RoastFindingSeverity;
  category: RoastFindingCategory;
  title: string;
  description: string;
  affected_technologies: string[];
  evidence_basis: string[];
  confidence: number;
  actionable: boolean;
  suggested_fix: string | null;
};

export type StackScore = {
  overall: number;
  architecture: number;
  simplicity: number;
  cost: number;
  compatibility: number;
  privacy: number;
  maintainability: number;
  confidence: number;
};

export type StackImprovementType = "remove" | "replace" | "consolidate" | "add" | "reconsider";

export type StackImprovement = {
  type: StackImprovementType;
  current_technology: string | null;
  suggested_technology: string | null;
  reason: string;
  expected_benefit: string;
  confidence: number;
};

export type RoastResult = {
  stack_score: StackScore;
  findings: RoastFinding[];
  improvements: StackImprovement[];
  resolved_technologies: NormalizedTechnology[];
  unresolved_technologies: NormalizedTechnology[];
  assumptions: string[];
  unresolved_information: string[];
  methodology_version: string;
};
