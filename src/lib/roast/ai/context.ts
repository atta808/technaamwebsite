import type { StackInput, RoastResult } from "../types";
import type { SanitizedRoastContext, SanitizedStackInput } from "./types";

function sanitizeInput(input: StackInput): SanitizedStackInput {
  return {
    project_type: input.project_type,
    team_size: input.team_size,
    budget_monthly: input.budget_monthly,
    deployment_preference: input.deployment_preference,
    primary_languages: input.primary_languages,
    frameworks: input.frameworks,
    operating_systems: input.operating_systems,
    privacy_requirement: input.privacy_requirement,
  };
}

export function buildSanitizedContext(
  input: StackInput,
  result: RoastResult
): SanitizedRoastContext {
  return {
    input: sanitizeInput(input),
    stack_score: {
      overall: result.stack_score.overall,
      confidence: result.stack_score.confidence,
    },
    resolved_technologies: result.resolved_technologies.map(t => ({
      normalized_name: t.normalized_name,
      resolution_status: t.resolution_status,
    })),
    unresolved_technologies: result.unresolved_technologies.map(t => ({
      normalized_name: t.normalized_name,
      resolution_status: t.resolution_status,
    })),
    findings: result.findings.map(f => ({
      id: f.id,
      severity: f.severity,
      category: f.category,
      title: f.title,
      description: f.description,
      affected_technologies: f.affected_technologies,
      // Intentionally omitting evidence_basis if it could contain sensitive or internal information.
    })),
    improvements: result.improvements.map(i => ({
      type: i.type,
      current_technology: i.current_technology,
      suggested_technology: i.suggested_technology,
      reason: i.reason,
      expected_benefit: i.expected_benefit,
    })),
  };
}

export function shouldSkipProvider(input: StackInput): boolean {
  return input.privacy_requirement === "offline";
}
