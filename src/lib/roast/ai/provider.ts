import type {
  AIExplanation,
  AIExplanationResponse,
  RoastAIProvider,
  SanitizedRoastContext,
} from "./types";

export const DEEPSEEK_MODEL_ID = "deepseek-v4-flash";

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNumber(value: unknown): value is number {
  return typeof value === "number";
}

export function parseAIExplanation(
  value: unknown,
  context: SanitizedRoastContext
): AIExplanation | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;

  if (
    !isString(record.headline) ||
    !isString(record.summary) ||
    !isString(record.roast) ||
    !isString(record.uncertainty_note) ||
    !Array.isArray(record.top_issues) ||
    !Array.isArray(record.improvement_explanations)
  ) {
    return null;
  }

  const validFindingIds = new Set(context.findings.map(f => f.id));
  const maxImprovementIndex = context.improvements.length - 1;

  const topIssues = record.top_issues.flatMap((item) => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      return [];
    }

    const issue = item as Record<string, unknown>;

    if (!isString(issue.finding_id) || !isString(issue.explanation)) {
      return [];
    }

    // AI MUST NOT invent findings.
    if (!validFindingIds.has(issue.finding_id)) {
      return [];
    }

    return [
      {
        finding_id: issue.finding_id,
        explanation: issue.explanation,
      },
    ];
  });

  const improvementExplanations = record.improvement_explanations.flatMap((item) => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      return [];
    }

    const explanation = item as Record<string, unknown>;

    if (!isNumber(explanation.improvement_index) || !isString(explanation.explanation)) {
      return [];
    }

    // AI MUST NOT invent improvements.
    if (
      explanation.improvement_index < 0 ||
      explanation.improvement_index > maxImprovementIndex
    ) {
      return [];
    }

    return [
      {
        improvement_index: explanation.improvement_index,
        explanation: explanation.explanation,
      },
    ];
  });

  return {
    headline: record.headline,
    summary: record.summary,
    roast: record.roast,
    top_issues: topIssues,
    improvement_explanations: improvementExplanations,
    uncertainty_note: record.uncertainty_note,
  };
}

type DeepSeekProviderOptions = {
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
};

export class DeepSeekRoastProvider implements RoastAIProvider {
  readonly name = "deepseek";

  private readonly apiKey: string | undefined;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: DeepSeekProviderOptions = {}) {
    this.apiKey = options.apiKey;
    this.model = options.model ?? DEEPSEEK_MODEL_ID;
    this.timeoutMs = options.timeoutMs ?? 10_000;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async explain(
    context: SanitizedRoastContext
  ): Promise<AIExplanationResponse> {
    if (!this.apiKey) {
      return { available: false, reason: "provider_unavailable" };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchImpl(
        "https://api.deepseek.com/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: this.model,

            response_format: {
              type: "json_object",
            },

            max_tokens: 3000,

            messages: [
              {
                role: "system",
                content: `
You are an explanation and personality layer for a "Roast My Stack" system.
Your job is to provide an entertaining, witty, direct, technical, and constructive review of the supplied deterministic stack analysis.
Do not be abusive, insulting toward the user, discriminatory, humiliating, or falsely alarmist.
A "Roast" means playful technical criticism (e.g. "Your stack isn't broken. It's just carrying two backpacks for a three-minute walk.")

You are NOT the recommendation engine.
Use only the supplied deterministic facts.
Do not invent facts, products, capabilities, or architectural incompatibilities.
UNKNOWN ≠ BAD. If a technology is unresolved, just say it could not be verified.

Return ONLY valid JSON.
Do not use Markdown fences.
Do not include any text before or after the JSON object.

The JSON MUST follow this structure:

{
  "headline": "A short, witty title for the roast.",
  "summary": "A concise summary of the stack's overall shape.",
  "roast": "A playful technical roast of the stack.",
  "top_issues": [
    {
      "finding_id": "Must exactly match a finding 'id' from the supplied context.",
      "explanation": "Explanation of the finding."
    }
  ],
  "improvement_explanations": [
    {
      "improvement_index": 0,
      "explanation": "Explanation of the improvement at this index."
    }
  ],
  "uncertainty_note": "Assumptions made or missing context."
}

Rules:
- top_issues MAY be empty if the context has no findings.
- improvement_explanations MAY be empty if the context has no improvements.
- You must NOT invent finding_id or improvement_index. They MUST correspond to items in the supplied deterministic context.
`.trim(),
              },
              {
                role: "user",
                content: JSON.stringify(context),
              },
            ],
          }),
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        return { available: false, reason: "provider_unavailable" };
      }

      const payload = (await response.json()) as {
        choices?: Array<{
          message?: {
            content?: unknown;
          };
        }>;
      };

      const content = payload.choices?.[0]?.message?.content;

      if (typeof content !== "string" || content.trim() === "") {
        return { available: false, reason: "provider_unavailable" };
      }

      let parsedContent: unknown;

      try {
        parsedContent = JSON.parse(content);
      } catch {
        return { available: false, reason: "provider_unavailable" };
      }

      const parsed = parseAIExplanation(parsedContent, context);

      if (!parsed) {
        return { available: false, reason: "provider_unavailable" };
      }

      return {
        available: true,
        explanation: parsed,
      };
    } catch {
      return { available: false, reason: "provider_unavailable" };
    } finally {
      clearTimeout(timeout);
    }
  }
}
