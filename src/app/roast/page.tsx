"use client";

import { useState } from "react";
import { RoastForm } from "@/components/roast/RoastForm";
import { RoastResults } from "@/components/roast/RoastResults";
import type { StackInput, RoastResult } from "@/lib/roast/types";

export default function RoastPage() {
  const [result, setResult] = useState<RoastResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (input: StackInput) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/roast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Too many requests. Please try again later.");
        }

        const errorData = await response.json().catch(() => null);
        if (errorData?.error) {
          if (Array.isArray(errorData.error)) {
             throw new Error(errorData.error.join(" "));
          }
          throw new Error(errorData.error);
        }
        throw new Error("Unable to analyze stack. Please check your inputs.");
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred while roasting your stack.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-gray-200">
      <main className="max-w-4xl mx-auto px-4 py-12 md:py-20">

        {/* Header */}
        <div className="text-center space-y-4 mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">
            Roast My Stack
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto">
            Find redundancy, complexity, cost risks, and compatibility problems in your current technology stack.
          </p>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-900/50 border border-red-500/50 rounded-lg text-red-200 text-center animate-in fade-in">
            {error}
          </div>
        )}

        {/* Dynamic Content */}
        {!result ? (
          <div className="animate-in fade-in duration-500">
            <RoastForm onSubmit={handleSubmit} isLoading={isLoading} />
          </div>
        ) : (
          <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-500">
            <div className="flex justify-between items-center bg-gray-950 p-4 border border-gray-800 rounded-lg shadow-sm">
              <span className="text-gray-400 font-medium">Analysis Complete</span>
              <button
                onClick={() => setResult(null)}
                className="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors"
              >
                Start Over
              </button>
            </div>

            <RoastResults result={result} />

            <div className="text-center pt-8 border-t border-gray-800">
              <button
                onClick={() => setResult(null)}
                className="px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-lg border border-gray-700 transition-colors"
              >
                Roast Another Stack
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
