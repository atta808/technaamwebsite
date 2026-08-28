import type { RoastFinding, StackInput, StackScore, NormalizedTechnology } from "./types";

export const ROAST_SCORING_VERSION = "v1";

export function calculateStackScore(
  stack: StackInput,
  findings: RoastFinding[],
  resolvedTechnologies: NormalizedTechnology[],
  unresolvedTechnologies: NormalizedTechnology[]
): StackScore {
  let overall = 100;
  let architecture = 100;
  let simplicity = 100;
  let cost = 100;
  let compatibility = 100;
  let privacy = 100;
  let maintainability = 100;
  let confidence = 1.0;

  // Penalize confidence based on missing input or unresolved tech
  if (unresolvedTechnologies.length > 0) {
     // Decrease confidence by 0.1 for each unresolved technology, up to a max of 0.5 reduction
     const penalty = Math.min(unresolvedTechnologies.length * 0.1, 0.5);
     confidence -= penalty;
  }

  // Decrease confidence for missing critical budget information
  if (stack.budget_monthly === null) {
      confidence -= 0.1;
  }

  // Determine deductions based on findings
  for (const finding of findings) {
     const severityWeight = getSeverityWeight(finding.severity);

     if (finding.category === "redundancy" || finding.category === "architecture") {
       architecture -= 15 * severityWeight;
       simplicity -= 10 * severityWeight;
       maintainability -= 10 * severityWeight;
     }

     if (finding.category === "complexity") {
       simplicity -= 20 * severityWeight;
       maintainability -= 15 * severityWeight;
     }

     if (finding.category === "cost") {
       cost -= 30 * severityWeight;
     }

     if (finding.category === "compatibility" || finding.category === "collaboration") {
       compatibility -= 20 * severityWeight;
     }

     if (finding.category === "privacy") {
       privacy -= 30 * severityWeight;
       architecture -= 10 * severityWeight;
     }
  }

  // Ensure all scores are bounded between 0 and 100
  architecture = Math.max(0, Math.min(100, architecture));
  simplicity = Math.max(0, Math.min(100, simplicity));
  cost = Math.max(0, Math.min(100, cost));
  compatibility = Math.max(0, Math.min(100, compatibility));
  privacy = Math.max(0, Math.min(100, privacy));
  maintainability = Math.max(0, Math.min(100, maintainability));

  // Overall is a weighted average of dimensions
  overall = Math.round(
    (architecture * 0.25) +
    (simplicity * 0.20) +
    (maintainability * 0.20) +
    (compatibility * 0.15) +
    (cost * 0.10) +
    (privacy * 0.10)
  );

  confidence = Math.max(0.25, confidence);

  return {
    overall,
    architecture,
    simplicity,
    cost,
    compatibility,
    privacy,
    maintainability,
    confidence,
  };
}

function getSeverityWeight(severity: string): number {
  switch (severity) {
    case "critical": return 1.0;
    case "high": return 0.75;
    case "medium": return 0.5;
    case "low": return 0.25;
    case "info": return 0.0;
    default: return 0.0;
  }
}
