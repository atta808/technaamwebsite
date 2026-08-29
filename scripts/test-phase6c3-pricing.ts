import assert from "node:assert/strict";
import { calculateRetailEffectiveCost } from "../src/lib/pricing/retail-cost";
import { calculateSubscriptionEffectiveCost } from "../src/lib/pricing/subscription-cost";

async function runTests() {
  console.log("Starting Phase 6C.3 Pricing Domain Tests...");

  console.log("Testing Retail Cost Calculation...");

  const retailOffer1 = {
    id: "1",
    price: 100,
    shipping_cost: null,
    currency_code: "USD",
    region_code: "US",
    tax_included: false,
    condition: "new" as const,
    confidence: 0.95,
    checked_at: "2026-08-30T00:00:00Z",
  };

  const result1 = calculateRetailEffectiveCost(retailOffer1);
  assert.equal(result1.effectiveCost, 100);
  assert.equal(result1.shippingCost, 0);
  assert.equal(result1.confidence, 0.95);
  assert.equal(result1.checkedAt, "2026-08-30T00:00:00Z");

  const retailOffer2 = {
    ...retailOffer1,
    id: "2",
    price: 100,
    shipping_cost: 15,
  };

  const result2 = calculateRetailEffectiveCost(retailOffer2);
  assert.equal(result2.effectiveCost, 115);
  assert.equal(result2.shippingCost, 15);

  const retailOffer3 = {
    ...retailOffer1,
    id: "3",
    tax_included: true,
    condition: "refurbished" as const,
  };

  const result3 = calculateRetailEffectiveCost(retailOffer3);
  assert.equal(result3.taxIncluded, true);
  assert.equal(result3.condition, "refurbished");
  assert.equal(result3.currencyCode, "USD");
  assert.equal(result3.regionCode, "US");

  console.log("Testing Subscription Normalization...");

  const basePlan = {
    id: "p1",
    name: "Pro Plan",
    currency: "EUR",
    price: 50,
    is_per_user: false,
    per_user_price: 0,
  };

  const monthlyPlan = {
    ...basePlan,
    billing_period: "monthly" as const,
  };

  const r1 = calculateSubscriptionEffectiveCost(monthlyPlan, {
    targetPeriod: "monthly",
  });

  assert.equal(r1.status, "supported");
  assert.equal(r1.effectiveCost, 50);
  assert.equal(r1.targetPeriod, "monthly");

  const r2 = calculateSubscriptionEffectiveCost(monthlyPlan, {
    targetPeriod: "annual",
  });

  assert.equal(r2.effectiveCost, 600);

  const weeklyPlan = {
    ...basePlan,
    billing_period: "weekly" as const,
    price: 10,
  };

  const r3 = calculateSubscriptionEffectiveCost(weeklyPlan, {
    targetPeriod: "monthly",
  });

  assert.equal(r3.effectiveCost, (10 * 52) / 12);

  const r4 = calculateSubscriptionEffectiveCost(weeklyPlan, {
    targetPeriod: "annual",
  });

  assert.equal(r4.effectiveCost, 520);

  const annualPlan = {
    ...basePlan,
    billing_period: "annual" as const,
    price: 1200,
  };

  const r5 = calculateSubscriptionEffectiveCost(annualPlan, {
    targetPeriod: "monthly",
  });

  assert.equal(r5.effectiveCost, 100);

  const r6 = calculateSubscriptionEffectiveCost(annualPlan, {
    targetPeriod: "annual",
  });

  assert.equal(r6.effectiveCost, 1200);

  const oneTimePlan = {
    ...basePlan,
    billing_period: "one_time" as const,
    price: 299,
  };

  const r7 = calculateSubscriptionEffectiveCost(oneTimePlan, {
    targetPeriod: "monthly",
  });

  assert.equal(r7.status, "supported");
  assert.equal(r7.effectiveCost, 299);
  assert.equal(r7.targetPeriod, "one_time");

  const usagePlan = {
    ...basePlan,
    billing_period: "usage_based" as const,
  };

  const r8 = calculateSubscriptionEffectiveCost(usagePlan, {
    targetPeriod: "monthly",
  });

  assert.equal(r8.status, "unsupported");
  assert.equal(r8.effectiveCost, null);
  assert.equal(r8.originalPeriod, "usage_based");

  const perUserPlan = {
    ...basePlan,
    billing_period: "monthly" as const,
    is_per_user: true,
    per_user_price: 15,
  };

  const r9 = calculateSubscriptionEffectiveCost(perUserPlan, {
    targetPeriod: "annual",
  });

  assert.equal(r9.effectiveCost, 600);
  assert.equal(r9.isPerUser, true);
  assert.equal(r9.perUserPrice, 180);

  console.log("All Phase 6C.3 Pricing Domain Tests PASSED.");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
