import type { AdvisorInput, ExperienceLevel } from "./types";

export type AdvisorParseResult =
  | { ok: true; value: AdvisorInput }
  | { ok: false; errors: string[] };

const ENUM_VALUES = {
  privacy_requirement: ["standard", "high", "offline"],
  codebase_size: ["small", "medium", "large"],
  experience_level: ["beginner", "intermediate", "advanced"],
} as const;

const MAX_STRING_LENGTH = 200;
const MAX_ARRAY_ITEMS = 20;
const MAX_TEAM_SIZE = 500;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(
  body: Record<string, unknown>,
  key: string,
  errors: string[],
  optional = false
) {
  const value = body[key];
  if (
    optional &&
    (value === undefined ||
      (typeof value === "string" && value.trim().length === 0))
  ) {
    return "";
  }
  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push(`${key} is required and must be a non-empty string.`);
    return "";
  }
  if (value.length > MAX_STRING_LENGTH) {
    errors.push(`${key} must be ${MAX_STRING_LENGTH} characters or fewer.`);
  }
  return value.trim();
}

function requireBoolean(
  body: Record<string, unknown>,
  key: string,
  errors: string[]
) {
  const value = body[key];
  if (typeof value !== "boolean") {
    errors.push(`${key} must be a boolean.`);
    return false;
  }
  return value;
}

function requireStringArray(
  body: Record<string, unknown>,
  key: string,
  errors: string[],
  optional = false
) {
  const value = body[key];
  if (value === undefined && optional) {
    return [];
  }
  if (!Array.isArray(value)) {
    errors.push(`${key} must be an array.`);
    return [];
  }
  if (value.length > MAX_ARRAY_ITEMS) {
    errors.push(`${key} must contain ${MAX_ARRAY_ITEMS} items or fewer.`);
  }
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, MAX_ARRAY_ITEMS);
}

function requireEnum<T extends string>(
  body: Record<string, unknown>,
  key: string,
  allowed: readonly T[],
  errors: string[],
  fallback: T
) {
  const value = body[key];
  if (value === undefined) {
    return fallback;
  }
  if (!allowed.includes(value as T)) {
    errors.push(`${key} must be one of: ${allowed.join(", ")}.`);
    return fallback;
  }
  return value as T;
}

export function parseAdvisorInput(body: unknown): AdvisorParseResult {
  const errors: string[] = [];

  if (!isRecord(body)) {
    return { ok: false, errors: ["Request body must be a JSON object."] };
  }

  const industry = requireString(body, "industry", errors);
  const project_type = requireString(body, "project_type", errors);
  const deployment_preference = requireString(body, "deployment_preference", errors);
  const ai_preference = requireString(body, "ai_preference", errors);
  requireString(body, "additional_requirements", errors, true);

  const team_size = Number(body.team_size);
  if (!Number.isInteger(team_size) || team_size < 1 || team_size > MAX_TEAM_SIZE) {
    errors.push(`team_size must be an integer between 1 and ${MAX_TEAM_SIZE}.`);
  }

  const budget_monthly = body.budget_monthly;
  if (
    budget_monthly !== null &&
    budget_monthly !== undefined &&
    (typeof budget_monthly !== "number" || !Number.isFinite(budget_monthly) || budget_monthly < 0)
  ) {
    errors.push("budget_monthly must be a non-negative number or null.");
  }

  const primary_languages = requireStringArray(body, "primary_languages", errors);
  const frameworks = requireStringArray(body, "frameworks", errors);
  const operating_systems = requireStringArray(body, "operating_systems", errors);

  const local_ai_required = requireBoolean(body, "local_ai_required", errors);
  const collaboration_required = requireBoolean(body, "collaboration_required", errors);
  const agent_required = requireBoolean(body, "agent_required", errors);

  const privacy_requirement = requireEnum(
    body,
    "privacy_requirement",
    ENUM_VALUES.privacy_requirement,
    errors,
    "standard"
  );
  const codebase_size = requireEnum(
    body,
    "codebase_size",
    ENUM_VALUES.codebase_size,
    errors,
    "medium"
  );
  const experience_level = requireEnum(
    body,
    "experience_level",
    ENUM_VALUES.experience_level,
    errors,
    "intermediate"
  ) as ExperienceLevel;

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      industry,
      project_type,
      team_size,
      budget_monthly:
        typeof budget_monthly === "number" ? budget_monthly : null,
      primary_languages,
      frameworks,
      operating_systems,
      deployment_preference,
      ai_preference,
      privacy_requirement,
      local_ai_required,
      collaboration_required,
      agent_required,
      codebase_size,
      experience_level,
    },
  };
}
