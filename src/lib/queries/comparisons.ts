import {
  getProductDetailBySlug,
  type ProductDetail,
} from "@/lib/queries/product-detail";

export type ComparisonProduct = ProductDetail;

export type ComparisonStatus = "ready" | "unavailable" | "invalid";

export type ComparisonResult = {
  comparisonSlug: string;
  leftSlug: string;
  rightSlug: string;
  status: ComparisonStatus;
  products: [ComparisonProduct | null, ComparisonProduct | null];
  unavailable: string[];
  reason: string | null;
};

const COMPARISON_PATTERN = /^([a-zA-Z0-9_-]+)-vs-([a-zA-Z0-9_-]+)$/;

function slugVariants(slug: string) {
  return Array.from(
    new Set([
      slug,
      slug.replaceAll("-", "_"),
      slug.replaceAll("_", "-"),
    ])
  );
}

function normalizeComparisonSegment(slug: string) {
  return slug.toLowerCase().replaceAll("-", "").replaceAll("_", "");
}

async function resolveProduct(slug: string): Promise<ComparisonProduct | null> {
  for (const variant of slugVariants(slug)) {
    const product = await getProductDetailBySlug(variant);
    if (product) {
      return product;
    }
  }

  return null;
}

export function parseComparisonSlug(slug: string) {
  const match = slug.match(COMPARISON_PATTERN);
  if (!match) {
    return null;
  }

  return {
    leftSlug: match[1],
    rightSlug: match[2],
  };
}

export async function getComparison(comparisonSlug: string): Promise<ComparisonResult> {
  const parsed = parseComparisonSlug(comparisonSlug);

  if (!parsed) {
    return {
      comparisonSlug,
      leftSlug: "",
      rightSlug: "",
      status: "invalid",
      products: [null, null],
      unavailable: [],
      reason: "Malformed comparison slug.",
    };
  }

  if (
    normalizeComparisonSegment(parsed.leftSlug) ===
    normalizeComparisonSegment(parsed.rightSlug)
  ) {
    return {
      comparisonSlug,
      leftSlug: parsed.leftSlug,
      rightSlug: parsed.rightSlug,
      status: "invalid",
      products: [null, null],
      unavailable: [],
      reason: "A product cannot be compared with itself.",
    };
  }

  const [leftProduct, rightProduct] = await Promise.all([
    resolveProduct(parsed.leftSlug),
    resolveProduct(parsed.rightSlug),
  ]);

  const unavailable = [
    leftProduct ? null : parsed.leftSlug,
    rightProduct ? null : parsed.rightSlug,
  ].filter(Boolean) as string[];

  return {
    comparisonSlug,
    leftSlug: parsed.leftSlug,
    rightSlug: parsed.rightSlug,
    status: leftProduct && rightProduct ? "ready" : "unavailable",
    products: [leftProduct, rightProduct],
    unavailable,
    reason:
      leftProduct && rightProduct
        ? null
        : "One or both products are not published yet.",
  };
}
