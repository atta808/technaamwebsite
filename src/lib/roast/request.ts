import type { StackInput } from "./types";

export type RoastParseResult =
  | { ok: true; value: StackInput }
  | { ok: false; errors: string[] };

const ENUM_VALUES = {
  privacy_requirement: ["standard", "high", "offline"],
} as const;

const MAX_STRING_LENGTH = 200;
const MAX_ARRAY_ITEMS = 50;
const MAX_TEAM_SIZE = 10000;

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

function parseTechnologies(
  body: Record<string, unknown>,
  errors: string[]
): StackInput["technologies"] {
  const value = body.technologies;
  if (!Array.isArray(value)) {
    errors.push(`technologies must be an array.`);
    return [];
  }
  if (value.length === 0) {
    errors.push(`technologies is required and cannot be empty.`);
    return [];
  }
  if (value.length > MAX_ARRAY_ITEMS) {
    errors.push(`technologies must contain ${MAX_ARRAY_ITEMS} items or fewer.`);
  }

  const techList: StackInput["technologies"] = [];

  for (const item of value) {
    if (!isRecord(item)) {
      errors.push(`technologies items must be objects.`);
      continue;
    }

    const name = item.name;
    if (typeof name !== "string" || name.trim().length === 0) {
      errors.push(`technologies items must have a non-empty name string.`);
      continue;
    }

    if (name.length > MAX_STRING_LENGTH) {
      errors.push(`technologies name must be ${MAX_STRING_LENGTH} characters or fewer.`);
      continue;
    }

    const techObj: { name: string; category?: string; version?: string } = { name: name.trim() };

    if (typeof item.category === "string") {
      techObj.category = item.category.trim().slice(0, MAX_STRING_LENGTH);
    }

    if (typeof item.version === "string") {
      techObj.version = item.version.trim().slice(0, MAX_STRING_LENGTH);
    }

    techList.push(techObj);
  }

  return techList.slice(0, MAX_ARRAY_ITEMS);
}

export function parseRoastInput(body: unknown): RoastParseResult {
  const errors: string[] = [];

  if (!isRecord(body)) {
    return { ok: false, errors: ["Request body must be a JSON object."] };
  }

  const technologies = parseTechnologies(body, errors);
  const project_type = requireString(body, "project_type", errors);
  const deployment_preference = requireString(body, "deployment_preference", errors);

  const additional_requirements = requireString(body, "additional_requirements", errors, true);

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

  const primary_languages = requireStringArray(body, "primary_languages", errors, true);
  const frameworks = requireStringArray(body, "frameworks", errors, true);
  const operating_systems = requireStringArray(body, "operating_systems", errors, true);
  const ai_tools = requireStringArray(body, "ai_tools", errors, true);
  const database_tools = requireStringArray(body, "database_tools", errors, true);
  const hosting_tools = requireStringArray(body, "hosting_tools", errors, true);

  const privacy_requirement = requireEnum(
    body,
    "privacy_requirement",
    ENUM_VALUES.privacy_requirement,
    errors,
    "standard"
  );

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      technologies,
      project_type,
      team_size,
      budget_monthly:
        typeof budget_monthly === "number" ? budget_monthly : null,
      deployment_preference,
      primary_languages,
      frameworks,
      operating_systems,
      ai_tools,
      database_tools,
      hosting_tools,
      additional_requirements,
      privacy_requirement,
    },
  };
}
