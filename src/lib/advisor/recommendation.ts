import { normalizeMonthlyCost, scoreProduct, SCORING_VERSION } from "./scoring";
import type {
  AdvisorInput,
  AdvisorProduct,
  AdvisorResult,
  Recommendation,
} from "./types";

function buildReasons(missing: string[]) {
  if (missing.length === 0) {
    return ["Matches the supplied requirements on available verified data."];
  }
  return missing.map((item) => `Limited data for ${item.replaceAll("_", " ")}.`);
}

function buildTradeoffs(product: AdvisorProduct, estimatedCost: number | null) {
  const tradeoffs: string[] = [];
  if (estimatedCost === null) {
    tradeoffs.push("Public pricing is unavailable or not directly comparable.");
  }
  if (!product.score || product.score.overall === null) {
    tradeoffs.push("No published TechNaam score is available.");
  }
  if (tradeoffs.length === 0) {
    tradeoffs.push("Tradeoff data is limited.");
  }
  return tradeoffs;
}

export function buildRecommendations(
  input: AdvisorInput,
  products: AdvisorProduct[]
): AdvisorResult {
  const recommendations: Recommendation[] = products
    .map((product) => {
      const result = scoreProduct(input, product);
      const estimatedCost = normalizeMonthlyCost(
        product.pricing,
        input.team_size
      );

      return {
        product_id: product.id,
        product_slug: product.slug,
        product_name: product.name,
        score: result.score,
        reasons: buildReasons(result.missing_information),
        tradeoffs: buildTradeoffs(product, estimatedCost),
        estimated_monthly_cost: estimatedCost,
        category: product.category,
        confidence: result.confidence,
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.product_name.localeCompare(b.product_name)
    );

  const top = recommendations.slice(0, 3);
  const knownCosts = top
    .map((item) => item.estimated_monthly_cost)
    .filter((cost): cost is number => cost !== null);
  const estimatedTotal =
    knownCosts.length > 0 ? knownCosts.reduce((sum, cost) => sum + cost, 0) : null;

  const missingInput: string[] = [];
  if (input.budget_monthly === null || input.budget_monthly === undefined) {
    missingInput.push("budget_monthly");
  }
  if (input.team_size < 1) {
    missingInput.push("team_size");
  }

  const missingInformation = Array.from(
    new Set([
      ...missingInput,
      ...top.flatMap((item) =>
        item.reasons
          .filter((reason) => reason.startsWith("Limited data for"))
          .map((reason) => reason.replace("Limited data for ", "").replace(".", ""))
      ),
    ])
  ).sort();

  const assumptions = ["Recommendations use only public verified product data."];
  if (estimatedTotal !== null && knownCosts.length !== top.length) {
    assumptions.push(
      "Estimated total excludes recommendations with unknown pricing."
    );
  }

  return {
    recommendations: top,
    estimated_total_monthly_cost: estimatedTotal,
    assumptions,
    missing_information: missingInformation,
    methodology_version: SCORING_VERSION,
  };
}
