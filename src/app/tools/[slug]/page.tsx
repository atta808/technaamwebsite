import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Check, ExternalLink, Info } from "lucide-react";
import { getProductDetailBySlug } from "@/lib/queries/product-detail";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductDetailBySlug(slug);

  if (!product) {
    return {
      title: "Product Not Found | TechNaam",
    };
  }

  return {
    metadataBase: new URL("https://technaam.com"),
    title: `${product.name} | TechNaam Intelligence`,
    description:
      product.description ??
      `${product.name} product intelligence from the TechNaam Technology Intelligence catalog.`,
    alternates: {
      canonical: `/tools/${product.slug}`,
    },
  };
}

function formatPrice(
  price: number | null,
  currency: string,
  billingPeriod: string | null,
  isPerUser: boolean
) {
  if (price === null) {
    return "Custom";
  }

  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 0,
  });

  const period =
    billingPeriod === "annual" ? "/yr" : billingPeriod === "monthly" ? "/mo" : "";
  return `${formatter.format(price)}${period}${isPerUser ? "/user" : ""}`;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProductDetailBySlug(slug);

  if (!product) {
    notFound();
  }

  const scoreDimensions = product.score
    ? [
        { label: "Performance", value: product.score.performance },
        { label: "Value", value: product.score.value },
        { label: "Ease of use", value: product.score.ease_of_use },
        { label: "Features", value: product.score.features },
        { label: "Reliability", value: product.score.reliability },
        { label: "Integrations", value: product.score.integrations },
        { label: "Automation", value: product.score.automation },
        { label: "Local AI", value: product.score.local_ai },
      ]
    : [];

  return (
    <main className="min-h-screen bg-slate-50 pt-32 pb-20">
      <div className="mx-auto max-w-6xl px-6">
        <header className="mb-12">
          <p className="text-sm font-semibold text-primary">
            {product.category?.name ?? "Technology Intelligence"}
          </p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            {product.name}
          </h1>
          <p className="mt-4 max-w-3xl text-lg text-slate-600">
            {product.description ?? "No description available."}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {product.vendor?.name ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                {product.vendor.name}
              </span>
            ) : null}
            {product.product_type ? (
              <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-bold uppercase tracking-wider text-primary">
                {product.product_type.replaceAll("_", " ")}
              </span>
            ) : null}
            {product.website_url ? (
              <a
                href={product.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
              >
                Official website
                <ExternalLink className="h-4 w-4" />
              </a>
            ) : null}
          </div>
        </header>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-8">
            <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-900">Features</h2>
              {product.features.length === 0 ? (
                <p className="mt-3 text-slate-500">No publicly documented features yet.</p>
              ) : (
                <ul className="mt-5 grid gap-3 md:grid-cols-2">
                  {product.features.map((feature) => (
                    <li
                      key={feature.slug}
                      className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4"
                    >
                      <Check className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                      <div>
                        <p className="font-semibold text-slate-900">{feature.name}</p>
                        <p className="text-sm text-slate-500">
                          {feature.support_level.replaceAll("_", " ")}
                          {feature.notes ? ` — ${feature.notes}` : ""}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-900">AI Models</h2>
              {product.models.length === 0 ? (
                <p className="mt-3 text-slate-500">No publicly documented models yet.</p>
              ) : (
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {product.models.map((model) => (
                    <div key={model.slug} className="rounded-2xl border border-slate-100 p-4">
                      <p className="font-semibold text-slate-900">{model.name}</p>
                      <p className="text-sm text-slate-500">
                        {model.provider ?? "Provider unknown"} ·{" "}
                        {model.model_type ?? "Type unknown"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-900">Hardware</h2>
              {!product.hardware ? (
                <p className="mt-3 text-slate-500">No public hardware requirements documented.</p>
              ) : (
                <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-semibold text-slate-500">Minimum RAM</dt>
                    <dd className="text-slate-900">
                      {product.hardware.min_ram_gb !== null
                        ? `${product.hardware.min_ram_gb} GB`
                        : "Unknown"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-semibold text-slate-500">Recommended RAM</dt>
                    <dd className="text-slate-900">
                      {product.hardware.recommended_ram_gb !== null
                        ? `${product.hardware.recommended_ram_gb} GB`
                        : "Unknown"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-semibold text-slate-500">GPU required</dt>
                    <dd className="text-slate-900">
                      {product.hardware.gpu_required === null
                        ? "Unknown"
                        : product.hardware.gpu_required
                          ? "Yes"
                          : "No"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-semibold text-slate-500">VRAM</dt>
                    <dd className="text-slate-900">
                      {product.hardware.vram_required_gb !== null
                        ? `${product.hardware.vram_required_gb} GB`
                        : "Unknown"}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-semibold text-slate-500">Operating systems</dt>
                    <dd className="text-slate-900">
                      {product.hardware.operating_systems?.length
                        ? product.hardware.operating_systems.join(", ")
                        : "Unknown"}
                    </dd>
                  </div>
                </dl>
              )}
            </section>

            <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-900">Sources</h2>
              {product.sources.length === 0 ? (
                <p className="mt-3 text-slate-500">No public sources available.</p>
              ) : (
                <ul className="mt-5 space-y-2">
                  {product.sources.map((source) => (
                    <li key={source.url}>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-primary hover:underline"
                      >
                        <ExternalLink className="h-4 w-4" />
                        {source.label}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-900">TechNaam Assessment</h2>
              {product.score?.overall !== null && product.score?.overall !== undefined ? (
                <div className="mt-5">
                  <p className="text-5xl font-extrabold text-primary">
                    {product.score.overall}
                    <span className="text-xl font-bold text-slate-400">/10</span>
                  </p>
                  <dl className="mt-5 space-y-3">
                    {scoreDimensions.map((dimension) => (
                      <div key={dimension.label}>
                        <dt className="text-sm font-semibold text-slate-500">
                          {dimension.label}
                        </dt>
                        <dd className="font-semibold text-slate-900">
                          {dimension.value ?? "—"}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  {product.score.methodology_version ? (
                    <p className="mt-5 flex items-start gap-2 text-sm text-slate-500">
                      <Info className="mt-0.5 h-4 w-4 shrink-0" />
                      Methodology: {product.score.methodology_version}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="mt-3 text-slate-500">No published assessment yet.</p>
              )}
            </section>

            <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-900">Pricing</h2>
              {product.pricing.length === 0 ? (
                <p className="mt-3 text-slate-500">No public pricing available.</p>
              ) : (
                <ul className="mt-5 space-y-3">
                  {product.pricing.map((plan) => (
                    <li key={`${plan.name}-${plan.price ?? "custom"}`} className="rounded-2xl bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-slate-900">{plan.name}</p>
                        <p className="font-bold text-slate-900">
                          {formatPrice(plan.price, plan.currency, plan.billing_period, plan.is_per_user)}
                        </p>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {plan.is_free ? "Free plan" : plan.price_model ?? "Paid plan"}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-900">Next Steps</h2>
              <p className="mt-3 text-slate-500">
                Compare and stack-building tools are coming next.
              </p>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
