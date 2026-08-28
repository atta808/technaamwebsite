import type { AdvisorProduct } from "../advisor/types";
import type { NormalizedTechnology, ResolutionStatus, StackInput } from "./types";

export function normalizeTechnologyName(name: string): string {
  // Conservative normalization: lowercase, remove excess whitespace.
  // "next js" -> "next.js" etc.
  let normalized = name.trim().toLowerCase();

  // Handle common aliases safely without merging unrelated products
  if (normalized === "next js" || normalized === "nextjs") {
    normalized = "next.js";
  } else if (normalized === "node js" || normalized === "nodejs") {
    normalized = "node.js";
  } else if (normalized === "react js" || normalized === "reactjs") {
    normalized = "react";
  }

  return normalized;
}

export function resolveTechnologies(
  inputTechnologies: StackInput["technologies"],
  catalog: AdvisorProduct[]
): NormalizedTechnology[] {
  return inputTechnologies.map((inputTech) => {
    const normalizedName = normalizeTechnologyName(inputTech.name);

    // Filter catalog to find matches based on normalized name or slug
    const matches = catalog.filter((product) => {
      const productNormalized = normalizeTechnologyName(product.name);
      return (
        productNormalized === normalizedName ||
        product.slug === normalizedName.replace(/\s+/g, "-") ||
        productNormalized.includes(normalizedName)
      );
    });

    let status: ResolutionStatus = "unresolved";
    let resolvedProduct: AdvisorProduct | null = null;

    if (matches.length === 1) {
      // Exactly one match
      // Require exact match for confident resolution unless it's a known alias handled above
      if (
        normalizeTechnologyName(matches[0].name) === normalizedName ||
        matches[0].slug === normalizedName.replace(/\s+/g, "-")
      ) {
        status = "resolved";
        resolvedProduct = matches[0];
      } else {
        // Matched by substring, might be ambiguous
        status = "ambiguous";
      }
    } else if (matches.length > 1) {
      // Multiple potential matches, try to find an exact match first
      const exactMatch = matches.find(
        (m) =>
          normalizeTechnologyName(m.name) === normalizedName ||
          m.slug === normalizedName.replace(/\s+/g, "-")
      );

      if (exactMatch) {
        status = "resolved";
        resolvedProduct = exactMatch;
      } else {
        status = "ambiguous";
      }
    } else {
      // No matches at all
      status = "unresolved";
    }

    // Generic terms checking
    const genericTerms = ["database", "ai editor", "hosting", "frontend", "backend", "auth"];
    if (genericTerms.includes(normalizedName)) {
       status = "ambiguous";
       resolvedProduct = null;
    }

    return {
      original_name: inputTech.name,
      normalized_name: normalizedName,
      resolved_product_id: resolvedProduct?.id ?? null,
      resolved_product_slug: resolvedProduct?.slug ?? null,
      category: resolvedProduct?.category ?? inputTech.category ?? null,
      resolution_status: status,
    };
  });
}
