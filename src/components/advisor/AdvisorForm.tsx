"use client";

import { useState } from "react";
import AdvisorExplanation from "@/components/advisor/AdvisorExplanation";
import AdvisorResults from "@/components/advisor/AdvisorResults";
import type { AdvisorResult } from "@/lib/advisor";
import type { AIExplanation } from "@/lib/advisor/ai/types";

type FormState = {
  industry: string;
  project_type: string;
  team_size: string;
  budget_monthly: string;
  experience_level: string;
  primary_languages: string;
  frameworks: string;
  operating_systems: string;
  deployment_preference: string;
  ai_preference: string;
  agent_required: boolean;
  local_ai_required: boolean;
  privacy_requirement: string;
  collaboration_required: boolean;
  codebase_size: string;
  additional_requirements: string;
};

const initialForm: FormState = {
  industry: "",
  project_type: "web",
  team_size: "1",
  budget_monthly: "",
  experience_level: "intermediate",
  primary_languages: "TypeScript",
  frameworks: "React",
  operating_systems: "",
  deployment_preference: "cloud",
  ai_preference: "assistant",
  agent_required: false,
  local_ai_required: false,
  privacy_requirement: "standard",
  collaboration_required: false,
  codebase_size: "medium",
  additional_requirements: "",
};

function splitList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function AdvisorForm() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initialForm);
  const [result, setResult] = useState<AdvisorResult | null>(null);
  const [explanation, setExplanation] = useState<AIExplanation | null>(null);
  const [explanationState, setExplanationState] = useState<
    "loading" | "ready" | "unavailable"
  >("loading");
  const [explanationReason, setExplanationReason] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function stepError() {
    if (step === 0) {
      if (!form.industry.trim() || !form.project_type.trim()) {
        return "Industry and project type are required.";
      }
      const teamSize = Number(form.team_size);
      if (!Number.isInteger(teamSize) || teamSize < 1) {
        return "Team size must be a positive whole number.";
      }
      const budget = form.budget_monthly === "" ? null : Number(form.budget_monthly);
      if (budget !== null && (!Number.isFinite(budget) || budget < 0)) {
        return "Monthly budget must be zero or greater.";
      }
    }
    return null;
  }

  function next() {
    const validationError = stepError();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setStep((current) => Math.min(current + 1, 3));
  }

  function back() {
    setError(null);
    setStep((current) => Math.max(current - 1, 0));
  }

  async function submit() {
    setError(null);
    setLoading(true);

    const payload = {
      industry: form.industry,
      project_type: form.project_type,
      team_size: Number(form.team_size),
      budget_monthly:
        form.budget_monthly === "" ? null : Number(form.budget_monthly),
      experience_level: form.experience_level,
      primary_languages: splitList(form.primary_languages),
      frameworks: splitList(form.frameworks),
      operating_systems: splitList(form.operating_systems),
      deployment_preference: form.deployment_preference,
      ai_preference: form.ai_preference,
      agent_required: form.agent_required,
      local_ai_required: form.local_ai_required,
      privacy_requirement: form.privacy_requirement,
      collaboration_required: form.collaboration_required,
      codebase_size: form.codebase_size,
      additional_requirements: form.additional_requirements,
    };

    try {
      const response = await fetch("/api/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(
          Array.isArray(data.error)
            ? data.error.join(" ")
            : data.error ?? "Unable to build recommendation."
        );
      } else {
        setResult(data as AdvisorResult);
        void requestExplanation(payload);
      }
    } catch {
      setError("Unable to build recommendation.");
    } finally {
      setLoading(false);
    }
  }

  async function requestExplanation(payload: unknown) {
    setExplanationState("loading");
    setExplanationReason(null);

    try {
      const response = await fetch("/api/advisor/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        setExplanationState("unavailable");
        return;
      }

      if (data.available) {
        setExplanation(data.explanation as AIExplanation);
        setExplanationState("ready");
      } else {
        setExplanation(null);
        setExplanationState("unavailable");
        setExplanationReason(data.reason ?? null);
      }
    } catch {
      setExplanationState("unavailable");
      setExplanationReason(null);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <p className="text-sm font-semibold text-primary">Step {step + 1} of 4</p>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${((step + 1) / 4) * 100}%` }}
          />
        </div>
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        {step === 0 ? (
          <div className="grid gap-5 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Industry</span>
              <input
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                value={form.industry}
                onChange={(event) => update("industry", event.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Project type</span>
              <input
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                value={form.project_type}
                onChange={(event) => update("project_type", event.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Team size</span>
              <input
                type="number"
                min="1"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                value={form.team_size}
                onChange={(event) => update("team_size", event.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Monthly budget</span>
              <input
                type="number"
                min="0"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                value={form.budget_monthly}
                onChange={(event) => update("budget_monthly", event.target.value)}
              />
            </label>
            <label className="block md:col-span-2">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Experience level</span>
              <select
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                value={form.experience_level}
                onChange={(event) => update("experience_level", event.target.value)}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </label>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="grid gap-5 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Primary languages</span>
              <input
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                value={form.primary_languages}
                onChange={(event) => update("primary_languages", event.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Frameworks</span>
              <input
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                value={form.frameworks}
                onChange={(event) => update("frameworks", event.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Operating systems</span>
              <input
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                value={form.operating_systems}
                onChange={(event) => update("operating_systems", event.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Deployment preference</span>
              <input
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                value={form.deployment_preference}
                onChange={(event) => update("deployment_preference", event.target.value)}
              />
            </label>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="grid gap-5 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">AI preference</span>
              <input
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                value={form.ai_preference}
                onChange={(event) => update("ai_preference", event.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Privacy requirement</span>
              <select
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                value={form.privacy_requirement}
                onChange={(event) => update("privacy_requirement", event.target.value)}
              >
                <option value="standard">Standard</option>
                <option value="high">High</option>
                <option value="offline">Offline</option>
              </select>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.agent_required}
                onChange={(event) => update("agent_required", event.target.checked)}
              />
              <span className="text-sm font-semibold text-slate-700">Need coding agents</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.local_ai_required}
                onChange={(event) => update("local_ai_required", event.target.checked)}
              />
              <span className="text-sm font-semibold text-slate-700">Need local AI</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.collaboration_required}
                onChange={(event) => update("collaboration_required", event.target.checked)}
              />
              <span className="text-sm font-semibold text-slate-700">Need collaboration</span>
            </label>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="grid gap-5 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Codebase size</span>
              <select
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                value={form.codebase_size}
                onChange={(event) => update("codebase_size", event.target.value)}
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </label>
            <label className="block md:col-span-2">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Additional requirements</span>
              <textarea
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                value={form.additional_requirements}
                onChange={(event) => update("additional_requirements", event.target.value)}
              />
            </label>
          </div>
        ) : null}

        {error ? <p className="mt-5 text-sm text-red-600">{error}</p> : null}

        <div className="mt-7 flex items-center justify-between">
          <button
            type="button"
            onClick={back}
            disabled={step === 0}
            className="rounded-full border border-slate-200 px-6 py-3 font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Back
          </button>
          {step < 3 ? (
            <button
              type="button"
              onClick={next}
              className="rounded-full bg-primary px-6 py-3 font-semibold text-white transition hover:bg-primary-dark"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={loading}
              className="rounded-full bg-primary px-6 py-3 font-semibold text-white transition hover:bg-primary-dark disabled:opacity-60"
            >
              {loading ? "Building…" : "Build My Stack"}
            </button>
          )}
        </div>
      </div>

      {result ? (
        <div className="mt-10">
          <AdvisorResults result={result} />
          <AdvisorExplanation
            state={explanationState}
            explanation={explanation}
            reason={explanationReason}
          />
        </div>
      ) : null}
    </div>
  );
}
