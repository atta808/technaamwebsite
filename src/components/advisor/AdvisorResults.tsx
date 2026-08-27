import Link from "next/link";
import type { AdvisorResult } from "@/lib/advisor";

function formatCost(cost: number | null) {
  if (cost === null) return "Unknown";
  return `$${cost.toFixed(2)}`;
}

export default function AdvisorResults({ result }: { result: AdvisorResult }) {
  const compareHref =
    result.recommendations.length >= 2
      ? `/compare/${result.recommendations[0].product_slug}-vs-${result.recommendations[1].product_slug}`
      : null;

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-2xl font-bold text-slate-900">Recommended stack</h2>
        {result.recommendations.length === 0 ? (
          <p className="mt-3 text-slate-500">
            No suitable products were found for these requirements.
          </p>
        ) : (
          <ol className="mt-5 grid gap-4">
            {result.recommendations.map((recommendation, index) => (
              <li
                key={recommendation.product_id}
                className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wider text-primary">
                      Rank {index + 1}
                    </p>
                    <h3 className="mt-1 text-xl font-bold text-slate-900">
                      {recommendation.product_name}
                    </h3>
                    <p className="text-sm text-slate-500">{recommendation.category ?? "Uncategorized"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-extrabold text-slate-900">
                      {recommendation.score}
                      <span className="text-lg font-bold text-slate-400">/100</span>
                    </p>
                    <p className="text-sm text-slate-500">
                      Confidence: {Math.round(recommendation.confidence * 100)}%
                    </p>
                  </div>
                </div>

                <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-semibold text-slate-500">Recommended plan</dt>
                    <dd className="text-slate-900">
                      {recommendation.recommended_plan ?? "Unknown"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-semibold text-slate-500">Estimated monthly cost</dt>
                    <dd className="text-slate-900">
                      {formatCost(recommendation.estimated_monthly_cost)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-semibold text-slate-500">Details</dt>
                    <dd>
                      <Link
                        href={`/tools/${recommendation.product_slug}`}
                        className="text-primary hover:underline"
                      >
                        View product intelligence
                      </Link>
                    </dd>
                  </div>
                </dl>

                <div className="mt-4 text-sm">
                  <p className="text-slate-700">
                    Plan type:{" "}
                    {recommendation.plan_kind === "free"
                      ? "Free"
                      : recommendation.plan_kind === "paid"
                        ? "Paid"
                        : "Unknown"}
                  </p>
                  {recommendation.free_alternative && recommendation.free_alternative_plan ? (
                    <p className="text-slate-500">
                      Free alternative: {recommendation.free_alternative_plan}
                    </p>
                  ) : null}
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="font-semibold text-slate-700">Why</h4>
                    <ul className="mt-2 space-y-1 text-sm text-slate-500">
                      {recommendation.reasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-700">Trade-offs</h4>
                    <ul className="mt-2 space-y-1 text-sm text-slate-500">
                      {recommendation.tradeoffs.map((tradeoff) => (
                        <li key={tradeoff}>{tradeoff}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {compareHref ? (
        <Link
          href={compareHref}
          className="inline-flex rounded-full bg-primary px-6 py-3 font-semibold text-white transition hover:bg-primary-dark"
        >
          Compare top recommendations
        </Link>
      ) : null}

      <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">Total estimated monthly cost</h2>
        <p className="mt-2 text-2xl font-extrabold text-slate-900">
          {result.estimated_total_monthly_cost === null
            ? "Estimate unavailable"
            : `$${result.estimated_total_monthly_cost.toFixed(2)}`}
        </p>
        {result.estimated_total_monthly_cost === null ? (
          <p className="mt-2 text-sm text-slate-500">
            Some pricing is unavailable, so total cost is an estimate.
          </p>
        ) : null}
      </section>

      <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">Assumptions</h2>
        <ul className="mt-3 space-y-1 text-sm text-slate-500">
          {result.assumptions.map((assumption) => (
            <li key={assumption}>{assumption}</li>
          ))}
        </ul>
      </section>

      <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">Missing information</h2>
        {result.missing_information.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">None.</p>
        ) : (
          <ul className="mt-3 space-y-1 text-sm text-slate-500">
            {result.missing_information.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">Methodology</h2>
        <p className="mt-3 text-sm text-slate-500">
          TechNaam Recommendation Engine v1. Recommendations are based on your
          requirements, public product data, and deterministic scoring.
        </p>
        <p className="mt-3 text-sm text-slate-500">
          Affiliate relationships do not determine TechNaam scores.
        </p>
      </section>
    </div>
  );
}
