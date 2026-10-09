import type {
  ProposalType,
  SuggestRelationshipPayload,
  SuggestTechnologyPayload,
} from "./types";

export type AgentProposalRequest = {
  proposal_type: Exclude<ProposalType, "suggest_retail_observation">;
  payload: SuggestTechnologyPayload | SuggestRelationshipPayload;
  source_url: string;
  confidence: number;
};

const ENTITY_TYPES = new Set(["product", "hardware", "os", "mobile", "other"]);
const RELATIONSHIP_TYPES = new Set([
  "runs_on", "requires", "compatible_with", "incompatible_with", "depends_on",
  "integrates_with", "alternative_to", "replaces", "uses_model",
  "requires_hardware", "powered_by", "contains",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= maxLength;
}

export function validateProposalRequest(input: unknown):
  | { ok: true; value: AgentProposalRequest }
  | { ok: false; error: string } {
  if (!isRecord(input)) return { ok: false, error: "Request body must be a JSON object." };

  if (input.proposal_type === "suggest_retail_observation") {
    return { ok: false, error: "Retail observations are disabled for this pilot." };
  }
  if (input.proposal_type !== "suggest_technology" && input.proposal_type !== "suggest_relationship") {
    return { ok: false, error: "Unsupported proposal_type." };
  }

  if (!isRecord(input.payload)) return { ok: false, error: "payload must be a JSON object." };

  if (!nonEmptyString(input.source_url, 2048)) {
    return { ok: false, error: "source_url must be a non-empty URL no longer than 2048 characters." };
  }

  let source: URL;
  try {
    source = new URL(input.source_url);
  } catch {
    return { ok: false, error: "source_url must be an absolute HTTP or HTTPS URL." };
  }
  if (!["http:", "https:"].includes(source.protocol) || !source.hostname || source.username || source.password) {
    return { ok: false, error: "source_url must be a valid HTTP or HTTPS URL without credentials." };
  }

  if (typeof input.confidence !== "number" || !Number.isFinite(input.confidence) ||
      input.confidence < 0 || input.confidence > 1) {
    return { ok: false, error: "confidence must be a number between 0 and 1." };
  }

  if (input.proposal_type === "suggest_technology") {
    const payload = input.payload;
    if (!nonEmptyString(payload.name, 160) || !nonEmptyString(payload.slug, 160) ||
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(payload.slug.trim())) {
      return { ok: false, error: "Technology payload requires a name and a lowercase hyphenated slug." };
    }
    if (typeof payload.entity_type !== "string" || !ENTITY_TYPES.has(payload.entity_type)) {
      return { ok: false, error: "Technology payload has an invalid entity_type." };
    }
    if (payload.identifiers !== undefined) {
      if (!Array.isArray(payload.identifiers) || payload.identifiers.length > 50) {
        return { ok: false, error: "identifiers must be an array containing at most 50 entries." };
      }
      for (const identifier of payload.identifiers) {
        if (!isRecord(identifier) || !nonEmptyString(identifier.type, 80) ||
            !nonEmptyString(identifier.value, 300)) {
          return { ok: false, error: "Each identifier requires non-empty type and value strings." };
        }
      }
    }
    return {
      ok: true,
      value: {
        proposal_type: "suggest_technology",
        payload: {
          name: payload.name.trim(),
          slug: payload.slug.trim(),
          entity_type: payload.entity_type as SuggestTechnologyPayload["entity_type"],
          ...(payload.identifiers === undefined ? {} : {
            identifiers: (payload.identifiers as Array<{type: string; value: string}>).map((item) => ({
              type: item.type.trim(), value: item.value.trim(),
            })),
          }),
        },
        source_url: source.toString(),
        confidence: Math.round(input.confidence * 1000) / 1000,
      },
    };
  }

  const payload = input.payload;
  if (!nonEmptyString(payload.source_entity_id, 36) ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(payload.source_entity_id) ||
      !nonEmptyString(payload.target_entity_id, 36) ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(payload.target_entity_id) ||
      !nonEmptyString(payload.relationship_type, 80) ||
      !RELATIONSHIP_TYPES.has(payload.relationship_type)) {
    return { ok: false, error: "Relationship payload requires valid entity UUIDs and an allowed relationship_type." };
  }
  if (payload.source_entity_id === payload.target_entity_id) {
    return { ok: false, error: "A relationship cannot target the same entity as its source." };
  }

  return {
    ok: true,
    value: {
      proposal_type: "suggest_relationship",
      payload: {
        source_entity_id: payload.source_entity_id,
        target_entity_id: payload.target_entity_id,
        relationship_type: payload.relationship_type,
      },
      source_url: source.toString(),
      confidence: Math.round(input.confidence * 1000) / 1000,
    },
  };
}

export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${stableStringify(value[key])}`
    ).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

export async function proposalFingerprint(proposal: {
  proposal_type: string;
  payload: unknown;
  source_url: string;
  confidence: number;
}): Promise<string> {
  const bytes = new TextEncoder().encode(stableStringify({
    proposal_type: proposal.proposal_type,
    payload: proposal.payload,
    source_url: proposal.source_url,
    confidence: proposal.confidence,
  }));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
