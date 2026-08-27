import type { AdvisorInput, AdvisorResult } from "@/lib/advisor/types";
import type { SafeAIContext } from "./provider";

export function buildSanitizedContext(
  input: AdvisorInput,
  result: AdvisorResult
): SafeAIContext | null {
  if (input.privacy_requirement === "offline") {
    return null;
  }

  const top3 = result.recommendations.slice(0, 3);

  return {
    input: {
      industry: input.industry,
      project_type: input.project_type,
      team_size: input.team_size,
      budget_monthly: input.budget_monthly,
      experience_level: input.experience_level,
      primary_languages: input.primary_languages,
      frameworks: input.frameworks,
      operating_systems: input.operating_systems,
      deployment_preference: input.deployment_preference,
      ai_preference: input.ai_preference,
      local_ai_required: input.local_ai_required,
      collaboration_required: input.collaboration_required,
      agent_required: input.agent_required,
      codebase_size: input.codebase_size,
    },
    recommendations: top3.map((rec) => ({
      product_name: rec.product_name,
      recommended_plan: rec.recommended_plan,
      confidence: rec.confidence,
      reasons: rec.reasons,
      tradeoffs: rec.tradeoffs,
    })),
    missing_information: result.missing_information,
    assumptions: result.assumptions,
  };
}
