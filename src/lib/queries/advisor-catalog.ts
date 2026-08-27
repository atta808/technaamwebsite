import type { AdvisorProduct } from "@/lib/advisor/types";
import { getPublishedTools } from "@/lib/queries/products";
import { getProductDetailBySlug } from "@/lib/queries/product-detail";

export async function getAdvisorCatalog(): Promise<AdvisorProduct[]> {
  const tools = await getPublishedTools();

  const details = await Promise.all(
    tools.map((tool) => getProductDetailBySlug(tool.slug))
  );

  return details.flatMap((product) => {
    if (!product) {
      return [];
    }

    return [
      {
        id: product.id,
        name: product.name,
        slug: product.slug,
        category: product.category?.name ?? null,
        product_type: product.product_type,
        description: product.description,
        pricing: product.pricing.map((plan) => ({
          name: plan.name,
          price: plan.price,
          currency: plan.currency,
          billing_period: plan.billing_period,
          is_per_user: plan.is_per_user,
          is_free: plan.is_free,
          price_model: plan.price_model,
        })),
        features: product.features.map((feature) => ({
          slug: feature.slug,
          name: feature.name,
          support_level: feature.support_level,
        })),
        models: product.models.map((model) => model.name),
        operating_systems: product.hardware?.operating_systems ?? null,
        score: product.score,
      } satisfies AdvisorProduct,
    ];
  });
}
