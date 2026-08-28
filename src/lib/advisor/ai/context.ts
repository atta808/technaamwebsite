import type {
  AdvisorInput,
  AdvisorResult,
} from "../types";
import type {
  SanitizedAdvisorContext,
  SanitizedInput,
  SanitizedRecommendation,
} from "./types";

export function sanitizeInput(input: AdvisorInput): SanitizedInput {
  return {
    project_type: input.project_type,
    industry: input.industry,
    team_size: input.team_size,
    budget_monthly: input.budget_monthly,
    experience_level: input.experience_level,
    codebase_size: input.codebase_size,
    primary_languages: input.primary_languages,
    frameworks: input.frameworks,
    operating_systems: input.operating_systems,
    deployment_preference: input.deployment_preference,
    ai_preference: input.ai_preference,
    privacy_requirement: input.privacy_requirement,
    local_ai_required: input.local_ai_required,
    collaboration_required: input.collaboration_required,
    agent_required: input.agent_required,
  };
}

function sanitizeRecommendation(
  recommendation: AdvisorResult["recommendations"][number]
): SanitizedRecommendation {
  return {
    product_name: recommendation.product_name,
    category: recommendation.category,
    recommended_plan: recommendation.recommended_plan,
    plan_kind: recommendation.plan_kind,
    estimated_monthly_cost: recommendation.estimated_monthly_cost,
    free_alternative_plan: recommendation.free_alternative_plan,
    reasons: recommendation.reasons,
    tradeoffs: recommendation.tradeoffs,
  };
}

export function buildSanitizedContext(
  input: AdvisorInput,
  result: AdvisorResult
): SanitizedAdvisorContext {
  return {
    input: sanitizeInput(input),
    recommendations: result.recommendations.slice(0, 3).map(sanitizeRecommendation),
    assumptions: result.assumptions,
    missing_information: result.missing_information,
  };
}

export function shouldSkipProvider(input: AdvisorInput) {
  return input.privacy_requirement === "offline";
}
