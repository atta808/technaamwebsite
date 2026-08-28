import type { RoastFinding, StackImprovement } from "./types";

export function generateImprovements(
  findings: RoastFinding[]
): StackImprovement[] {
  const improvements: StackImprovement[] = [];

  for (const finding of findings) {
    if (!finding.actionable) {
      continue;
    }

    if (finding.category === "redundancy") {
      // Suggest consolidating redundant tools
      if (finding.affected_technologies.length > 1) {
         improvements.push({
           type: "consolidate",
           current_technology: finding.affected_technologies.join(", "),
           suggested_technology: finding.affected_technologies[0], // Arbitrarily suggest standardizing on the first one as an example, actual logic could be more complex
           reason: finding.description,
           expected_benefit: "Reduced architectural complexity and potential cost savings by standardizing on a single platform for this responsibility.",
           confidence: finding.confidence,
         });
      }
    }

    if (finding.category === "privacy") {
       // Suggest replacing cloud tools with self-hostable tools from catalog if possible
       for (const tech of finding.affected_technologies) {
          improvements.push({
             type: "replace",
             current_technology: tech,
             suggested_technology: null, // Defer specific suggestion unless we implement a full "find self-hostable alternative" query here
             reason: finding.description,
             expected_benefit: "Meets stated privacy requirements and ensures data sovereignty.",
             confidence: finding.confidence,
          });
       }
    }

    if (finding.category === "cost") {
        improvements.push({
           type: "reconsider",
           current_technology: null,
           suggested_technology: null,
           reason: finding.description,
           expected_benefit: "Brings recurring infrastructure costs back within stated budget constraints.",
           confidence: finding.confidence,
        });
    }

    if (finding.category === "complexity" && finding.title === "High Stack Complexity") {
        improvements.push({
           type: "remove",
           current_technology: null,
           suggested_technology: null,
           reason: finding.description,
           expected_benefit: "Streamlines onboarding, reduces maintenance overhead, and lowers risk of integration failures.",
           confidence: finding.confidence,
        })
    }
  }

  // Ensure no duplicate improvements based on reason
  const uniqueImprovements: StackImprovement[] = [];
  const seenReasons = new Set<string>();

  for (const imp of improvements) {
     if (!seenReasons.has(imp.reason)) {
        uniqueImprovements.push(imp);
        seenReasons.add(imp.reason);
     }
  }

  return uniqueImprovements;
}
