import { Check, Minus, X } from "lucide-react";
import type { ComparisonResult } from "@/lib/queries/comparisons";
import type { ProductDetail } from "@/lib/queries/product-detail";

const FEATURE_ROWS = [
  { slug: "code-completion", label: "Code completion" },
  { slug: "agent-mode", label: "Agent mode" },
  { slug: "codebase-context", label: "Codebase context" },
  { slug: "model-selection", label: "Model selection" },
  { slug: "mcp-support", label: "MCP" },
  { slug: "git-integration", label: "Git integration" },
  { slug: "multi-file-editing", label: "Multi-file editing" },
  { slug: "collaboration", label: "Collaboration" },
  { slug: "local-model-support", label: "Local model support" },
  { slug: "cloud-model-support", label: "Cloud model support" },
];

function formatPrice(
  price: number | null,
  currency: string,
  billingPeriod: string | null,
  isPerUser: boolean
) {
  if (price === null) return "Custom";

  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 0,
  });

  const period =
    billingPeriod === "annual" ? "/yr" : billingPeriod === "monthly" ? "/mo" : "";
  return `${formatter.format(price)}${period}${isPerUser ? "/user" : ""}`;
}

function pricingSummary(product: ProductDetail) {
  if (product.pricing.length === 0) return "Pricing unavailable";
  if (product.pricing.some((plan) => plan.is_free)) return "Free tier available";

  const plan = product.pricing.find((item) => item.price !== null);
  if (!plan || plan.price === null) return "Custom pricing";

  return formatPrice(plan.price, plan.currency, plan.billing_period, plan.is_per_user);
}

function featureValue(product: ProductDetail, slug: string) {
  return product.features.find((feature) => feature.slug === slug)?.support_level ?? "unknown";
}

function FeatureStatus({ value }: { value: string }) {
  if (value === "supported") {
    return <Check className="h-5 w-5 text-green-500" />;
  }
  if (value === "partial") {
    return <Minus className="h-5 w-5 text-amber-500" />;
  }
  if (value === "not_supported") {
    return <X className="h-5 w-5 text-red-400" />;
  }
  return <span className="text-sm text-slate-400">Unknown</span>;
}

function BestFor({
  productA,
  productB,
  dimension,
}: {
  productA: ProductDetail;
  productB: ProductDetail;
  dimension: keyof NonNullable<ProductDetail["score"]> | null;
}) {
  const scoreA = productA.score;
  const scoreB = productB.score;

  if (!dimension || !scoreA || !scoreB) {
    return <p className="text-slate-500">Insufficient verified data.</p>;
  }

  const valueA = scoreA[dimension];
  const valueB = scoreB[dimension];

  if (valueA === null || valueB === null || valueA === undefined || valueB === undefined) {
    return <p className="text-slate-500">Insufficient verified data.</p>;
  }

  if (valueA === valueB) {
    return <p className="text-slate-500">Comparable on this dimension.</p>;
  }

  return (
    <p className="text-slate-700">
      {valueA > valueB ? productA.name : productB.name}
    </p>
  );
}

function Verdict({ productA, productB }: { productA: ProductDetail; productB: ProductDetail }) {
  const scoreA = productA.score?.overall ?? null;
  const scoreB = productB.score?.overall ?? null;

  if (scoreA === null || scoreB === null) {
    return <p className="text-slate-500">Insufficient verified data.</p>;
  }

  if (scoreA === scoreB) {
    return <p className="text-slate-700">Comparable overall TechNaam score.</p>;
  }

  return (
    <p className="text-slate-700">
      Higher published TechNaam overall score: {scoreA > scoreB ? productA.name : productB.name}
    </p>
  );
}

export default function ComparisonView({ comparison }: { comparison: ComparisonResult }) {
  if (comparison.status !== "ready") {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <h1 className="text-3xl font-extrabold text-slate-900">Comparison coming soon</h1>
        <p className="mt-3 text-slate-500">
          One or both products are not published yet. Check back once both products are public.
        </p>
      </section>
    );
  }

  const [productA, productB] = comparison.products;
  if (!productA || !productB) {
    return null;
  }

  return (
    <div className="space-y-8">
      <header className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="grid gap-6 text-center md:grid-cols-[1fr_auto_1fr] md:items-center">
          <div>
            <p className="text-sm font-semibold text-primary">{productA.category?.name ?? "Category"}</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">{productA.name}</h2>
          </div>
          <p className="text-xl font-extrabold text-slate-300">VS</p>
          <div>
            <p className="text-sm font-semibold text-primary">{productB.category?.name ?? "Category"}</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">{productB.name}</h2>
          </div>
        </div>
        <p className="mt-5 text-center text-slate-500">
          A neutral comparison of publicly verified TechNaam product intelligence.
        </p>
      </header>

      <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">Quick comparison</h2>
        <div className="mt-5 grid gap-6 md:grid-cols-2">
          {[productA, productB].map((product) => (
            <div key={product.id} className="rounded-2xl bg-slate-50 p-5">
              <h3 className="text-lg font-bold text-slate-900">{product.name}</h3>
              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="font-semibold text-slate-500">Pricing</dt>
                  <dd className="text-slate-900">{pricingSummary(product)}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-500">Free tier</dt>
                  <dd className="text-slate-900">
                    {product.pricing.some((plan) => plan.is_free) ? "Yes" : "No"}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-500">Product type</dt>
                  <dd className="text-slate-900">
                    {product.product_type?.replaceAll("_", " ") ?? "Unknown"}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-500">Availability</dt>
                  <dd className="text-slate-900">Published</dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">Feature matrix</h2>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="py-3 pr-4 font-semibold text-slate-500">Feature</th>
                <th className="py-3 px-4 font-semibold text-slate-900">{productA.name}</th>
                <th className="py-3 px-4 font-semibold text-slate-900">{productB.name}</th>
              </tr>
            </thead>
            <tbody>
              {FEATURE_ROWS.map((row) => {
                const valueA = featureValue(productA, row.slug);
                const valueB = featureValue(productB, row.slug);
                if (valueA === "unknown" && valueB === "unknown") return null;
                return (
                  <tr key={row.slug} className="border-b border-slate-100">
                    <td className="py-3 pr-4 font-medium text-slate-700">{row.label}</td>
                    <td className="py-3 px-4">
                      <FeatureStatus value={valueA} />
                    </td>
                    <td className="py-3 px-4">
                      <FeatureStatus value={valueB} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">TechNaam score comparison</h2>
        {productA.score || productB.score ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="font-bold text-slate-900">{productA.name}</p>
              <p className="mt-2 text-4xl font-extrabold text-primary">
                {productA.score?.overall ?? "—"}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="font-bold text-slate-900">{productB.name}</p>
              <p className="mt-2 text-4xl font-extrabold text-primary">
                {productB.score?.overall ?? "—"}
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-slate-500">Insufficient verified data.</p>
        )}
      </section>

      <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">Best for</h2>
        <dl className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <dt className="font-semibold text-slate-500">Best for beginners</dt>
            <dd>
              <BestFor productA={productA} productB={productB} dimension="ease_of_use" />
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-500">Best for power users</dt>
            <dd>
              <BestFor productA={productA} productB={productB} dimension="performance" />
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-500">Best value</dt>
            <dd>
              <BestFor productA={productA} productB={productB} dimension="value" />
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-500">Best for local/privacy</dt>
            <dd>
              <BestFor productA={productA} productB={productB} dimension="local_ai" />
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-500">Best for teams</dt>
            <dd>
              <BestFor productA={productA} productB={productB} dimension={null} />
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-500">Best for agentic coding</dt>
            <dd>
              <BestFor productA={productA} productB={productB} dimension={null} />
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">Verdict</h2>
        <div className="mt-3">
          <Verdict productA={productA} productB={productB} />
        </div>
      </section>

      <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">Pricing details</h2>
        <div className="mt-5 grid gap-6 md:grid-cols-2">
          {[productA, productB].map((product) => (
            <div key={product.id}>
              <h3 className="font-bold text-slate-900">{product.name}</h3>
              {product.pricing.length === 0 ? (
                <p className="mt-2 text-slate-500">No public pricing available.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {product.pricing.map((plan) => (
                    <li key={`${plan.name}-${plan.price ?? "custom"}`} className="flex justify-between gap-3 text-sm">
                      <span className="text-slate-700">{plan.name}</span>
                      <span className="font-semibold text-slate-900">
                        {formatPrice(plan.price, plan.currency, plan.billing_period, plan.is_per_user)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">Sources</h2>
        <div className="mt-5 grid gap-6 md:grid-cols-2">
          {[productA, productB].map((product) => (
            <div key={product.id}>
              <h3 className="font-bold text-slate-900">{product.name}</h3>
              <ul className="mt-3 space-y-2">
                {product.sources.map((source) => (
                  <li key={source.url}>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {source.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
