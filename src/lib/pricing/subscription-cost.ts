import {
  PricingPlanInput,
  SubscriptionTargetPeriod,
  SubscriptionEffectiveCost,
} from "./types";

/**
 * Calculates a normalized subscription effective cost for a pricing plan.
 *
 * Rules:
 * - one_time: never normalized to monthly/annual.
 * - usage_based: explicit unknown/unsupported.
 * - weekly, monthly, quarterly, annual: deterministically converted.
 * - Preserves is_per_user semantics.
 * - per_user_price is not nullable, defaults to 0. It is handled safely.
 * - No currency conversion.
 * - No affiliate/commission economics.
 */
export function calculateSubscriptionEffectiveCost(
  plan: PricingPlanInput,
  options: { targetPeriod: SubscriptionTargetPeriod }
): SubscriptionEffectiveCost {
  if (plan.billing_period === "usage_based") {
    return {
      status: "unsupported",
      reason:
        "usage_based pricing cannot be deterministically normalized without a usage model",
      effectiveCost: null,
      currencyCode: plan.currency,
      // Pass through the requested targetPeriod or explicitly omit assigning usage_based as targetPeriod
      targetPeriod: options.targetPeriod,
      isPerUser: plan.is_per_user,
      perUserPrice: null,
      originalPeriod: plan.billing_period,
    };
  }

  if (plan.billing_period === "one_time") {
    return {
      status: "supported",
      effectiveCost: plan.price,
      currencyCode: plan.currency,
      targetPeriod: "one_time",
      isPerUser: plan.is_per_user,
      perUserPrice: plan.is_per_user ? plan.per_user_price : null,
      originalPeriod: plan.billing_period,
    };
  }

  let annualizedBasePrice = 0;
  let annualizedPerUserPrice = 0;

  switch (plan.billing_period) {
    case "weekly":
      annualizedBasePrice = plan.price * 52;
      annualizedPerUserPrice = plan.per_user_price * 52;
      break;

    case "monthly":
      annualizedBasePrice = plan.price * 12;
      annualizedPerUserPrice = plan.per_user_price * 12;
      break;

    case "quarterly":
      annualizedBasePrice = plan.price * 4;
      annualizedPerUserPrice = plan.per_user_price * 4;
      break;

    case "annual":
      annualizedBasePrice = plan.price;
      annualizedPerUserPrice = plan.per_user_price;
      break;

    default:
      return {
        status: "unsupported",
        reason: `Unknown billing period: ${plan.billing_period}`,
        effectiveCost: null,
        currencyCode: plan.currency,
        targetPeriod: options.targetPeriod,
        isPerUser: plan.is_per_user,
        perUserPrice: null,
        originalPeriod: plan.billing_period,
      };
  }

  const effectiveCost =
    options.targetPeriod === "monthly"
      ? annualizedBasePrice / 12
      : annualizedBasePrice;

  const effectivePerUserCost =
    options.targetPeriod === "monthly"
      ? annualizedPerUserPrice / 12
      : annualizedPerUserPrice;

  return {
    status: "supported",
    effectiveCost,
    currencyCode: plan.currency,
    targetPeriod: options.targetPeriod,
    isPerUser: plan.is_per_user,
    perUserPrice: plan.is_per_user ? effectivePerUserCost : null,
    originalPeriod: plan.billing_period,
  };
}
