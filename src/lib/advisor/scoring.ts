import type {
  AdvisorInput,
  AdvisorProduct,
  PricingPlan,
} from "./types";

export const SCORING_VERSION = "v1";

export const WEIGHTS = {
  requirement_match: 20,
  feature_match: 15,
  budget_fit: 15,
  team_fit: 10,
  privacy_fit: 10,
  local_ai_fit: 10,
  platform_fit: 5,
  collaboration_fit: 5,
  agent_fit: 5,
  technical_fit: 5,
} as const;

export type ScoringDimension = keyof typeof WEIGHTS;

const CONFIDENCE_REDUCTION_PER_MISSING = 0.05;
const MIN_CONFIDENCE = 0.25;
const PRICING_UNKNOWN_CONFIDENCE_REDUCTION = 0.1;

const BASELINE_FEATURE_SLUGS = [
  "code-completion",
  "codebase-context",
  "model-selection",
  "git-integration",
  "multi-file-editing",
];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function featureState(
  product: AdvisorProduct,
  slug: string
): "supported" | "partial" | "not_supported" | "unknown" {
  const feature = product.features.find((item) => item.slug === slug);
  if (!feature) {
    return "unknown";
  }
  if (feature.support_level === "supported") {
    return "supported";
  }
  if (feature.support_level === "partial") {
    return "partial";
  }
  if (feature.support_level === "not_supported") {
    return "not_supported";
  }
  return "unknown";
}

export function normalizeMonthlyCost(
  pricing: PricingPlan[],
  teamSize: number
): number | null {
  const team = Math.max(1, Math.round(teamSize));
  const candidates: number[] = [];

  for (const plan of pricing) {
    if (plan.price === null) {
      continue;
    }

    if (plan.price_model === "usage_based" || plan.price_model === "custom") {
      continue;
    }

    let cost = plan.price;
    if (plan.billing_period === "annual") {
      cost = plan.price / 12;
    }
    if (plan.is_per_user) {
      cost = cost * team;
    }

    candidates.push(cost);
  }

  if (candidates.length === 0) {
    return null;
  }

  return Math.min(...candidates);
}

export type RecommendedPlanSelection = {
  plan_name: string | null;
  plan_kind: "free" | "paid" | "unknown";
  monthly_cost: number | null;
  free_alternative: boolean;
  free_alternative_plan: string | null;
};

function planMonthlyCost(plan: PricingPlan, teamSize: number): number | null {
  if (plan.price === null) {
    return null;
  }
  if (plan.price_model === "usage_based" || plan.price_model === "custom") {
    return null;
  }

  let cost = plan.price;
  if (plan.billing_period === "annual") {
    cost = plan.price / 12;
  }
  if (plan.is_per_user) {
    cost = cost * Math.max(1, Math.round(teamSize));
  }
  return cost;
}

export function selectRecommendedPlan(
  pricing: PricingPlan[],
  teamSize: number
): RecommendedPlanSelection {
  const freePlans = pricing.filter(
    (plan) => plan.is_free || (plan.price !== null && plan.price === 0)
  );
  const paidPlans = pricing.filter(
    (plan) =>
      plan.price !== null &&
      plan.price > 0 &&
      plan.price_model !== "usage_based" &&
      plan.price_model !== "custom"
  );
  const unknownPlans = pricing.filter(
    (plan) =>
      plan.price === null ||
      plan.price_model === "usage_based" ||
      plan.price_model === "custom"
  );

  const rankedPaid = paidPlans
    .map((plan) => ({ plan, cost: planMonthlyCost(plan, teamSize) }))
    .filter((item): item is { plan: PricingPlan; cost: number } => item.cost !== null)
    .sort((a, b) => a.cost - b.cost || a.plan.name.localeCompare(b.plan.name));

  if (rankedPaid.length > 0) {
    const selected = rankedPaid[0];
    const freeAlternative = freePlans[0] ?? null;
    return {
      plan_name: selected.plan.name,
      plan_kind: "paid",
      monthly_cost: selected.cost,
      free_alternative: Boolean(freeAlternative),
      free_alternative_plan: freeAlternative?.name ?? null,
    };
  }

  const freePlan = freePlans[0] ?? null;
  if (freePlan) {
    return {
      plan_name: freePlan.name,
      plan_kind: "free",
      monthly_cost: 0,
      free_alternative: false,
      free_alternative_plan: null,
    };
  }

  return {
    plan_name: unknownPlans[0]?.name ?? null,
    plan_kind: "unknown",
    monthly_cost: null,
    free_alternative: false,
    free_alternative_plan: null,
  };
}

function requiredFeatureSlugs(input: AdvisorInput) {
  const slugs = new Set<string>();

  if (input.agent_required) {
    slugs.add("agent-mode");
  }
  if (input.local_ai_required) {
    slugs.add("local-model-support");
  }
  if (input.collaboration_required) {
    slugs.add("collaboration");
  }
  if (input.privacy_requirement === "offline") {
    slugs.add("local-model-support");
  }

  return Array.from(slugs);
}

function dimensionResult(score: number, missing: string[] = []) {
  return { score: clamp(Math.round(score), 0, 100), missing };
}

export function featureMatchScore(input: AdvisorInput, product: AdvisorProduct) {
  const slugs = Array.from(
    new Set([...requiredFeatureSlugs(input), ...BASELINE_FEATURE_SLUGS])
  );
  const missing: string[] = [];
  let matched = 0;

  for (const slug of slugs) {
    const state = featureState(product, slug);
    if (state === "unknown") {
      missing.push(`feature:${slug}`);
      continue;
    }
    if (state === "supported") {
      matched += 1;
    } else if (state === "partial") {
      matched += 0.5;
    }
  }

  const knownCount = slugs.filter(
    (slug) => featureState(product, slug) !== "unknown"
  ).length;
  if (knownCount === 0) {
    return dimensionResult(70, missing);
  }
  return dimensionResult((matched / knownCount) * 100, missing);
}

export function requirementMatchScore(input: AdvisorInput, product: AdvisorProduct) {
  const slugs = requiredFeatureSlugs(input);
  if (slugs.length === 0) {
    return dimensionResult(100);
  }

  const missing: string[] = [];
  let matched = 0;

  for (const slug of slugs) {
    const state = featureState(product, slug);
    if (state === "unknown") {
      missing.push(`requirement:${slug}`);
      continue;
    }
    if (state === "supported") {
      matched += 1;
    } else if (state === "partial") {
      matched += 0.5;
    }
  }

  const knownCount = slugs.filter(
    (slug) => featureState(product, slug) !== "unknown"
  ).length;
  if (knownCount === 0) {
    return dimensionResult(70, missing);
  }
  return dimensionResult((matched / knownCount) * 100, missing);
}

export function budgetFitScore(
  input: AdvisorInput,
  product: AdvisorProduct
) {
  const missing: string[] = [];
  const budget = input.budget_monthly;

  if (budget === null || budget === undefined) {
    missing.push("budget_monthly");
    return dimensionResult(70, missing);
  }

  const cost = normalizeMonthlyCost(product.pricing, input.team_size);

  if (cost === null) {
    missing.push("pricing:unknown");
    return dimensionResult(50, missing);
  }

  if (cost === 0) {
    return dimensionResult(100, missing);
  }

  if (budget === 0) {
    return dimensionResult(0, missing);
  }

  const ratio = cost / budget;
  const score = ratio <= 1 ? 100 : clamp(100 - (ratio - 1) * 100, 0, 100);
  return dimensionResult(score, missing);
}

export function teamFitScore(input: AdvisorInput, product: AdvisorProduct) {
  const missing: string[] = [];
  const state = featureState(product, "collaboration");

  if (!input.collaboration_required) {
    return dimensionResult(90, missing);
  }

  if (state === "unknown") {
    missing.push("collaboration_feature");
    return dimensionResult(70, missing);
  }

  if (state === "supported") {
    return dimensionResult(100, missing);
  }
  if (state === "partial") {
    return dimensionResult(65, missing);
  }

  missing.push("collaboration_feature");
  return dimensionResult(20, missing);
}

export function localAiFitScore(input: AdvisorInput, product: AdvisorProduct) {
  const missing: string[] = [];
  if (!input.local_ai_required && input.privacy_requirement !== "offline") {
    return dimensionResult(100, missing);
  }

  const state = featureState(product, "local-model-support");
  if (state === "supported" || state === "partial") {
    return dimensionResult(100, missing);
  }
  if (state === "unknown") {
    missing.push("local_ai_feature");
    return dimensionResult(70, missing);
  }

  missing.push("local_ai_feature");
  return dimensionResult(15, missing);
}

export function privacyFitScore(input: AdvisorInput, product: AdvisorProduct) {
  const missing: string[] = [];
  if (input.privacy_requirement === "standard") {
    return dimensionResult(100, missing);
  }

  const state = featureState(product, "local-model-support");
  if (state === "supported" || state === "partial") {
    return dimensionResult(100, missing);
  }
  if (state === "unknown") {
    missing.push("privacy_feature");
    return dimensionResult(70, missing);
  }

  missing.push("privacy_feature");
  return dimensionResult(20, missing);
}

export function platformFitScore(input: AdvisorInput, product: AdvisorProduct) {
  const missing: string[] = [];
  const required = input.operating_systems.filter(Boolean);

  if (required.length === 0) {
    return dimensionResult(100, missing);
  }

  if (!product.operating_systems || product.operating_systems.length === 0) {
    missing.push("operating_systems");
    return dimensionResult(50, missing);
  }

  const supported = new Set(
    product.operating_systems.map((os) => os.toLowerCase())
  );
  const matched = required.filter((os) => supported.has(os.toLowerCase())).length;
  return dimensionResult((matched / required.length) * 100, missing);
}

export function collaborationFitScore(
  input: AdvisorInput,
  product: AdvisorProduct
) {
  return teamFitScore(input, product);
}

export function agentFitScore(input: AdvisorInput, product: AdvisorProduct) {
  const missing: string[] = [];
  if (!input.agent_required) {
    return dimensionResult(100, missing);
  }

  const state = featureState(product, "agent-mode");
  if (state === "supported" || state === "partial") {
    return dimensionResult(100, missing);
  }
  if (state === "unknown") {
    missing.push("agent_feature");
    return dimensionResult(70, missing);
  }

  missing.push("agent_feature");
  return dimensionResult(15, missing);
}

export function technicalFitScore(input: AdvisorInput, product: AdvisorProduct) {
  if (input.experience_level === "beginner") {
    return dimensionResult(
      ["ai_app_builder", "developer_tool"].includes(product.product_type ?? "")
        ? 90
        : 70
    );
  }

  if (input.experience_level === "advanced") {
    return dimensionResult(
      ["coding_agent", "ai_ide"].includes(product.product_type ?? "") ? 95 : 75
    );
  }

  return dimensionResult(85);
}

export function scoreProduct(input: AdvisorInput, product: AdvisorProduct) {
  const dimensions = {
    requirement_match: requirementMatchScore(input, product),
    feature_match: featureMatchScore(input, product),
    budget_fit: budgetFitScore(input, product),
    team_fit: teamFitScore(input, product),
    privacy_fit: privacyFitScore(input, product),
    local_ai_fit: localAiFitScore(input, product),
    platform_fit: platformFitScore(input, product),
    collaboration_fit: collaborationFitScore(input, product),
    agent_fit: agentFitScore(input, product),
    technical_fit: technicalFitScore(input, product),
  };

  let score = 0;
  for (const dimension of Object.keys(WEIGHTS) as ScoringDimension[]) {
    score += dimensions[dimension].score * WEIGHTS[dimension];
  }
  score = clamp(Math.round(score / 100), 0, 100);

  const missing = Object.values(dimensions).flatMap((item) => item.missing);
  const uniqueMissing = Array.from(new Set(missing)).sort();
  let confidence = 1;
  confidence -= uniqueMissing.length * CONFIDENCE_REDUCTION_PER_MISSING;
  if (
    uniqueMissing.some((item) => item === "pricing:unknown") ||
    normalizeMonthlyCost(product.pricing, input.team_size) === null
  ) {
    confidence -= PRICING_UNKNOWN_CONFIDENCE_REDUCTION;
  }
  confidence = clamp(confidence, MIN_CONFIDENCE, 1);

  return {
    score,
    confidence,
    dimensions: Object.fromEntries(
      Object.entries(dimensions).map(([key, value]) => [key, value.score])
    ) as Record<ScoringDimension, number>,
    missing_information: uniqueMissing,
  };
}

export function scoreDeterminism(input: AdvisorInput, product: AdvisorProduct) {
  return JSON.stringify({ input, product, weights: WEIGHTS });
}
