"use client";

import { useState } from "react";
import type { StackInput } from "@/lib/roast/types";
import { Plus, X, Loader2 } from "lucide-react";
import { parseTechnologyInput } from "@/lib/roast/parsing";

type RoastFormProps = {
  onSubmit: (input: StackInput) => Promise<void>;
  isLoading: boolean;
};

function PillInput({
  label,
  description,
  items,
  onAdd,
  onRemove,
  required = false,
  parseInput,
}: {
  label: string;
  description?: string;
  items: string[];
  onAdd: (val: string) => void;
  onRemove: (idx: number) => void;
  required?: boolean;
  parseInput?: (input: string) => string[];
}) {
  const [inputValue, setInputValue] = useState("");

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addCurrentValue();
    }
  };

  const addCurrentValue = () => {
    const val = inputValue.trim();
    if (val) {
      if (parseInput) {
        const parsedItems = parseInput(val);
        parsedItems.forEach((item) => onAdd(item));
      } else {
        onAdd(val);
      }
      setInputValue("");
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-white">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {description && <p className="text-sm text-gray-400">{description}</p>}
      <div className="flex flex-wrap gap-2 mb-2">
        {items.map((item, idx) => (
          <span
            key={idx}
            className="inline-flex items-center gap-1 bg-gray-800 text-gray-200 px-3 py-1 rounded-full text-sm"
          >
            {item}
            <button
              type="button"
              onClick={() => onRemove(idx)}
              className="text-gray-400 hover:text-white"
              aria-label={`Remove ${item}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Type and press Enter to add"
        />
        <button
          type="button"
          onClick={addCurrentValue}
          className="px-4 py-2 bg-gray-800 text-gray-300 rounded-md hover:bg-gray-700 hover:text-white transition-colors flex items-center gap-1"
        >
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>
    </div>
  );
}

export function RoastForm({ onSubmit, isLoading }: RoastFormProps) {
  const [technologies, setTechnologies] = useState<string[]>([]);
  const [projectType, setProjectType] = useState("");
  const [teamSize, setTeamSize] = useState("");
  const [budgetMonthly, setBudgetMonthly] = useState("");
  const [deploymentPreference, setDeploymentPreference] = useState("");

  const [primaryLanguages, setPrimaryLanguages] = useState<string[]>([]);
  const [frameworks, setFrameworks] = useState<string[]>([]);
  const [operatingSystems, setOperatingSystems] = useState<string[]>([]);
  const [aiTools, setAiTools] = useState<string[]>([]);
  const [databaseTools, setDatabaseTools] = useState<string[]>([]);
  const [hostingTools, setHostingTools] = useState<string[]>([]);

  const [privacyRequirement, setPrivacyRequirement] = useState<"standard" | "high" | "offline">("standard");
  const [additionalRequirements, setAdditionalRequirements] = useState("");

  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic frontend validation for required fields
    if (technologies.length === 0) {
      setError("Please add at least one technology.");
      return;
    }
    if (!projectType.trim()) {
      setError("Project type is required.");
      return;
    }
    if (!teamSize || isNaN(Number(teamSize)) || Number(teamSize) < 1) {
      setError("Team size must be a valid number greater than 0.");
      return;
    }
    if (!deploymentPreference.trim()) {
      setError("Deployment preference is required.");
      return;
    }
    if (budgetMonthly && (isNaN(Number(budgetMonthly)) || Number(budgetMonthly) < 0)) {
      setError("Monthly budget must be a positive number.");
      return;
    }

    const payload: StackInput = {
      technologies: technologies.map((t) => ({ name: t })),
      project_type: projectType,
      team_size: Number(teamSize),
      deployment_preference: deploymentPreference,
      budget_monthly: budgetMonthly ? Number(budgetMonthly) : null,
      primary_languages: primaryLanguages,
      frameworks,
      operating_systems: operatingSystems,
      ai_tools: aiTools,
      database_tools: databaseTools,
      hosting_tools: hostingTools,
      privacy_requirement: privacyRequirement,
      additional_requirements: additionalRequirements,
    };

    try {
      await onSubmit(payload);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred.");
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 bg-gray-950 p-6 md:p-8 rounded-xl border border-gray-800 shadow-xl">
      {error && (
        <div className="bg-red-900/50 border border-red-500/50 text-red-200 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <div className="space-y-6">
        <h3 className="text-xl font-semibold text-white border-b border-gray-800 pb-2">Core Stack & Requirements</h3>

        <PillInput
          label="Technologies"
          description="List all the primary technologies in your stack (e.g., Next.js, Supabase, Cursor, Vercel)."
          required
          items={technologies}
          onAdd={(val) => setTechnologies((prev) => [...prev, val])}
          onRemove={(idx) => setTechnologies(technologies.filter((_, i) => i !== idx))}
          parseInput={parseTechnologyInput}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label htmlFor="projectType" className="block text-sm font-medium text-white">
              Project Type <span className="text-red-400">*</span>
            </label>
            <input
              id="projectType"
              type="text"
              value={projectType}
              onChange={(e) => setProjectType(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. B2B SaaS, Mobile App, E-commerce"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="teamSize" className="block text-sm font-medium text-white">
              Team Size <span className="text-red-400">*</span>
            </label>
            <input
              id="teamSize"
              type="number"
              min="1"
              value={teamSize}
              onChange={(e) => setTeamSize(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Number of developers"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="deploymentPreference" className="block text-sm font-medium text-white">
              Deployment Preference <span className="text-red-400">*</span>
            </label>
            <select
              id="deploymentPreference"
              value={deploymentPreference}
              onChange={(e) => setDeploymentPreference(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="" disabled>Select a deployment model</option>
              <option value="cloud">Managed Cloud / Serverless</option>
              <option value="self_hosted">Self Hosted / VPS</option>
              <option value="on_premise">On Premise</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="budgetMonthly" className="block text-sm font-medium text-white">
              Monthly Budget (Optional)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                id="budgetMonthly"
                type="number"
                min="0"
                value={budgetMonthly}
                onChange={(e) => setBudgetMonthly(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-md pl-8 pr-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. 100"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="privacyRequirement" className="block text-sm font-medium text-white">
              Privacy Requirement
            </label>
            <select
              id="privacyRequirement"
              value={privacyRequirement}
              onChange={(e) => setPrivacyRequirement(e.target.value as "standard" | "high" | "offline")}
              className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="standard">Standard (SaaS allowed)</option>
              <option value="high">High (Strict data residency)</option>
              <option value="offline">Offline (Air-gapped / Local only)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-xl font-semibold text-white border-b border-gray-800 pb-2">Detailed Categories (Optional)</h3>
        <p className="text-sm text-gray-400 pb-2">Provide more specifics to get a more accurate evaluation.</p>

        <PillInput
          label="Primary Languages"
          items={primaryLanguages}
          onAdd={(val) => setPrimaryLanguages([...primaryLanguages, val])}
          onRemove={(idx) => setPrimaryLanguages(primaryLanguages.filter((_, i) => i !== idx))}
        />
        <PillInput
          label="Frameworks"
          items={frameworks}
          onAdd={(val) => setFrameworks([...frameworks, val])}
          onRemove={(idx) => setFrameworks(frameworks.filter((_, i) => i !== idx))}
        />
        <PillInput
          label="Database Tools"
          items={databaseTools}
          onAdd={(val) => setDatabaseTools([...databaseTools, val])}
          onRemove={(idx) => setDatabaseTools(databaseTools.filter((_, i) => i !== idx))}
        />
        <PillInput
          label="Hosting Tools"
          items={hostingTools}
          onAdd={(val) => setHostingTools([...hostingTools, val])}
          onRemove={(idx) => setHostingTools(hostingTools.filter((_, i) => i !== idx))}
        />
        <PillInput
          label="AI Tools"
          items={aiTools}
          onAdd={(val) => setAiTools([...aiTools, val])}
          onRemove={(idx) => setAiTools(aiTools.filter((_, i) => i !== idx))}
        />
        <PillInput
          label="Operating Systems"
          items={operatingSystems}
          onAdd={(val) => setOperatingSystems([...operatingSystems, val])}
          onRemove={(idx) => setOperatingSystems(operatingSystems.filter((_, i) => i !== idx))}
        />

        <div className="space-y-2">
          <label htmlFor="additionalRequirements" className="block text-sm font-medium text-white">
            Additional Requirements (Optional)
          </label>
          <textarea
            id="additionalRequirements"
            value={additionalRequirements}
            onChange={(e) => setAdditionalRequirements(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
            placeholder="Any other constraints or requirements?"
          />
        </div>
      </div>

      <div className="pt-4 border-t border-gray-800">
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Analyzing Stack...
            </>
          ) : (
            "Roast My Stack"
          )}
        </button>
      </div>
    </form>
  );
}
