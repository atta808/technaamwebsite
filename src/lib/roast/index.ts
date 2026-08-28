import type { AdvisorProduct } from "../advisor/types";
import type { StackInput, RoastResult } from "./types";
import { resolveTechnologies } from "./normalize";
import { detectFindings } from "./detection";
import { calculateStackScore, ROAST_SCORING_VERSION } from "./scoring";
import { generateImprovements } from "./recommendation";

export function roastMyStack(
  input: StackInput,
  catalog: AdvisorProduct[]
): RoastResult {
  // 1. Normalize and resolve input technologies against the catalog
  const resolvedAll = resolveTechnologies(input.technologies, catalog);

  const resolvedTechnologies = resolvedAll.filter(
    (t) => t.resolution_status === "resolved"
  );
  const unresolvedTechnologies = resolvedAll.filter(
    (t) => t.resolution_status === "unresolved" || t.resolution_status === "ambiguous"
  );

  // 2. Run deterministic detection rules to generate findings
  const findings = detectFindings(
    input,
    resolvedTechnologies,
    unresolvedTechnologies,
    catalog
  );

  // 3. Calculate stack scores based on findings and missing information
  const stackScore = calculateStackScore(
    input,
    findings,
    resolvedTechnologies,
    unresolvedTechnologies
  );

  // 4. Generate actionable improvements based on the findings
  const improvements = generateImprovements(findings);

  // Track unresolved signals similar to missing_information in Advisor
  const unresolvedInformation: string[] = [];
  if (input.budget_monthly === null) unresolvedInformation.push("budget_monthly");
  unresolvedTechnologies.forEach((t) => unresolvedInformation.push(`technology:${t.original_name}`));

  // Assumptions
  const assumptions: string[] = [
    "Analysis is based only on explicitly stated technologies and known integrations.",
  ];
  if (unresolvedTechnologies.length > 0) {
    assumptions.push("Unresolved technologies are assumed to not cause critical incompatibilities, but reduce overall confidence.");
  }

  return {
    stack_score: stackScore,
    findings,
    improvements,
    resolved_technologies: resolvedTechnologies,
    unresolved_technologies: unresolvedTechnologies,
    assumptions,
    unresolved_information: unresolvedInformation,
    methodology_version: ROAST_SCORING_VERSION,
  };
}
