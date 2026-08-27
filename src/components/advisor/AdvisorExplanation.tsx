"use client";

import { useEffect, useState } from "react";
import type { AdvisorInput } from "@/lib/advisor/types";
import type { AIExplanationResult } from "@/lib/ai/provider";

type Props = {
  input: AdvisorInput;
};

export default function AdvisorExplanation({ input }: Props) {
  const [loading, setLoading] = useState(true);
  const [explanation, setExplanation] = useState<AIExplanationResult | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let active = true;

    async function fetchExplanation() {
      try {
        const res = await fetch("/api/advisor/explain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });

        if (!active) return;

        if (!res.ok) {
          setUnavailable(true);
          setLoading(false);
          return;
        }

        const data = await res.json();
        if (data.status === "unavailable") {
          setUnavailable(true);
        } else if (data.status === "success" && data.explanation) {
          setExplanation(data.explanation);
        } else {
          setUnavailable(true);
        }
      } catch {
        if (active) {
          setUnavailable(true);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchExplanation();

    return () => {
      active = false;
    };
  }, [input]);

  if (unavailable) {
    return null; // Graceful degradation
  }

  if (loading) {
    return (
      <div className="mt-8 p-6 bg-blue-50/50 rounded-lg border border-blue-100 animate-pulse">
        <div className="h-6 bg-blue-200 rounded w-1/4 mb-4"></div>
        <div className="h-4 bg-blue-100 rounded w-full mb-2"></div>
        <div className="h-4 bg-blue-100 rounded w-3/4 mb-6"></div>
        <div className="h-4 bg-blue-100 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-blue-100 rounded w-2/3"></div>
      </div>
    );
  }

  if (!explanation) {
    return null;
  }

  return (
    <div className="mt-8 p-6 bg-blue-50 rounded-lg border border-blue-200 text-sm text-blue-900">
      <div className="flex items-center gap-2 mb-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-5 h-5 text-blue-600"
        >
          <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
        </svg>
        <h3 className="font-semibold text-lg">AI Personalized Explanation</h3>
      </div>

      <div className="mb-6">
        <p>{explanation.summary}</p>
      </div>

      <div className="space-y-4">
        {explanation.product_explanations.map((prod, idx) => (
          <div key={idx} className="bg-white p-4 rounded border border-blue-100">
            <h4 className="font-medium text-blue-950 mb-2">{prod.product_name}</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <span className="block text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">Why it fits</span>
                <p className="text-gray-700">{prod.why_it_fits}</p>
              </div>
              <div>
                <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Considerations</span>
                <p className="text-gray-700">{prod.considerations}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {explanation.uncertainty_note && (
        <div className="mt-6 pt-4 border-t border-blue-200">
          <p className="italic text-gray-600">Note: {explanation.uncertainty_note}</p>
        </div>
      )}
    </div>
  );
}
