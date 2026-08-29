import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  PricingPlanInput,
  RetailOfferInput,
} from "@/lib/pricing/types";

/**
 * Retrieves published pricing plans for a specific product.
 */
export async function getPricingPlansForProduct(
  productId: string
): Promise<PricingPlanInput[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("pricing_plans")
    .select(
      "id, name, currency, price, billing_period, is_per_user, per_user_price"
    )
    .eq("product_id", productId)
    .eq("is_published", true)
    .eq("is_active", true);

  if (error || !data) {
    return [];
  }

  return data as PricingPlanInput[];
}

/**
 * Retrieves retail offers visible under the current Supabase RLS context
 * for a specific technology entity.
 *
 * Publication visibility is intentionally enforced by Phase 6C.2 RLS.
 */
export async function getRetailOffersForTechEntity(
  techEntityId: string
): Promise<RetailOfferInput[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .schema("commercial")
    .from("retail_offers")
    .select(
      "id, price, shipping_cost, currency_code, region_code, tax_included, condition, confidence, checked_at"
    )
    .eq("tech_entity_id", techEntityId);

  if (error || !data) {
    return [];
  }

  return data as unknown as RetailOfferInput[];
}
