import type { AIExplanation } from "@/lib/advisor/ai/types";

type AdvisorExplanationProps = {
  state: "loading" | "ready" | "unavailable";
  explanation: AIExplanation | null;
  reason: string | null;
};

export default function AdvisorExplanation({
  state,
  explanation,
  reason,
}: AdvisorExplanationProps) {
  if (state === "loading") {
    return (
      <section
        className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
        aria-busy="true"
      >
        <h2 className="text-xl font-bold text-slate-900">
          AI Personalized Explanation
        </h2>
        <p className="mt-3 text-sm text-slate-500">Preparing personalized explanation…</p>
      </section>
    );
  }

  if (state === "unavailable" || !explanation) {
    return (
      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">
          AI Personalized Explanation
        </h2>
        <p className="mt-3 text-sm text-slate-500">
          {reason === "offline"
            ? "AI explanation is disabled for offline privacy mode."
            : "AI explanation is currently unavailable. Deterministic recommendations remain available above."}
        </p>
      </section>
    );
  }

  return (
    <section className="mt-8 rounded-3xl border border-blue-100 bg-blue-50/40 p-6 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wider text-primary">
        AI Personalized Explanation
      </p>
      <h2 className="mt-2 text-xl font-bold text-slate-900">{explanation.summary}</h2>

      <div className="mt-5 grid gap-4">
        {explanation.product_explanations.map((item, index) => (
          <div key={`${item.why_it_fits}-${index}`} className="rounded-2xl bg-white p-4">
            <p className="font-semibold text-slate-900">{item.why_it_fits}</p>
            <p className="mt-1 text-sm text-slate-500">{item.considerations}</p>
          </div>
        ))}
      </div>

      <p className="mt-4 text-sm text-slate-500">{explanation.uncertainty_note}</p>
    </section>
  );
}
