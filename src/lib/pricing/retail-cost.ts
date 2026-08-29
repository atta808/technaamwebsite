import { RetailOfferInput, RetailEffectiveCost } from "./types";

/**
 * Calculates the retail effective cost from a retail offer.
 *
 * Rules:
 * - effectiveCost = price + (shipping_cost ?? 0)
 * - Returns metadata indicating the basis.
 * - Does not manipulate the price based on confidence/trust scores.
 * - Does not perform currency conversion.
 * - Does not calculate tax.
 * - Does not incorporate affiliate/commission economics.
 */
export function calculateRetailEffectiveCost(
  offer: RetailOfferInput
): RetailEffectiveCost {
  const shippingCost = offer.shipping_cost ?? 0;
  const effectiveCost = offer.price + shippingCost;

  return {
    effectiveCost,
    currencyCode: offer.currency_code,
    regionCode: offer.region_code,
    taxIncluded: offer.tax_included,
    condition: offer.condition,
    shippingCost,
    confidence: offer.confidence,
    checkedAt: offer.checked_at,
  };
}
