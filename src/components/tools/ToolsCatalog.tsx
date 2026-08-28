"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { ToolProduct } from "@/lib/queries/products";

type ToolsCatalogProps = {
  products: ToolProduct[];
};

function formatPricing(product: ToolProduct): string {
  if (product.pricing.length === 0) {
    return "Pricing unavailable";
  }

  if (product.pricing.some((plan) => plan.is_free)) {
    return "Free plan available";
  }

  const pricedPlan = product.pricing.find((plan) => plan.price !== null);
  if (!pricedPlan || pricedPlan.price === null) {
    return "Custom pricing";
  }

  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: pricedPlan.currency || "USD",
    maximumFractionDigits: 0,
  });

  const period =
    pricedPlan.billing_period === "annual"
      ? "/yr"
      : pricedPlan.billing_period === "monthly"
        ? "/mo"
        : "";

  return `${formatter.format(pricedPlan.price)}${period}${pricedPlan.is_per_user ? "/user" : ""}`;
}

export default function ToolsCatalog({ products }: ToolsCatalogProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const categories = useMemo(() => {
    const values = new Map<string, string>();
    for (const product of products) {
      if (product.category?.slug && product.category.name) {
        values.set(product.category.slug, product.category.name);
      }
    }
    return Array.from(values.entries()).sort(([, a], [, b]) => a.localeCompare(b));
  }, [products]);

  const visibleProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter((product) => {
      if (category !== "all" && product.category?.slug !== category) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = [
        product.name,
        product.description,
        product.product_type,
        product.vendor?.name,
        product.category?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [products, category, search]);

  if (products.length === 0) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">No tools published yet</h2>
        <p className="mt-3 text-slate-500">
          Verified product intelligence will appear here as soon as records are reviewed and published.
        </p>
      </section>
    );
  }

  return (
    <div>
      <div className="mb-8 grid gap-4 md:grid-cols-[minmax(0,1fr)_240px]">
        <label className="sr-only" htmlFor="tools-search">
          Search tools
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            id="tools-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search tools"
            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <label className="sr-only" htmlFor="tools-category">
          Filter by category
        </label>
        <select
          id="tools-category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          <option value="all">All categories</option>
          {categories.map(([slug, name]) => (
            <option key={slug} value={slug}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {visibleProducts.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
          No tools match the current filters.
        </p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {visibleProducts.map((product) => (
            <article
              key={product.id}
              className="flex flex-col rounded-3xl border border-slate-100 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-900/10"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <h2 className="text-xl font-bold text-slate-900">{product.name}</h2>
                {product.product_type ? (
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
                    {product.product_type.replaceAll("_", " ")}
                  </span>
                ) : null}
              </div>

              <p className="text-sm font-medium text-slate-500">
                {product.vendor?.name ?? "Vendor unavailable"}
              </p>

              <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-500">
                {product.description ?? "No description available."}
              </p>

              <div className="mt-5 space-y-2 text-sm">
                <p className="text-slate-600">
                  <span className="font-semibold">Category:</span>{" "}
                  {product.category?.name ?? "Uncategorized"}
                </p>
                <p className="text-slate-600">
                  <span className="font-semibold">Pricing:</span>{" "}
                  {formatPricing(product)}
                </p>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-4">
                <span
                  className="inline-flex items-center text-sm font-semibold text-slate-400"
                  aria-disabled="true"
                >
                  Details coming next
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
