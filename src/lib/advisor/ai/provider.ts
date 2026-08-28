import type {
  AIExplanation,
  AIExplanationResponse,
  AIProvider,
  SanitizedAdvisorContext,
} from "./types";

export const DEEPSEEK_MODEL_ID = "deepseek-v4-flash";

function isString(value: unknown): value is string {
  return typeof value === "string";
}

export function parseAIExplanation(value: unknown): AIExplanation | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;

  if (
    !isString(record.summary) ||
    !isString(record.uncertainty_note) ||
    !Array.isArray(record.product_explanations)
  ) {
    return null;
  }

  const productExplanations = record.product_explanations
    .slice(0, 3)
    .flatMap((item) => {
      if (typeof item !== "object" || item === null || Array.isArray(item)) {
        return [];
      }

      const explanation = item as Record<string, unknown>;

      if (
        !isString(explanation.why_it_fits) ||
        !isString(explanation.considerations)
      ) {
        return [];
      }

      return [
        {
          why_it_fits: explanation.why_it_fits,
          considerations: explanation.considerations,
        },
      ];
    });

  return {
    summary: record.summary,
    product_explanations: productExplanations,
    uncertainty_note: record.uncertainty_note,
  };
}

type DeepSeekProviderOptions = {
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
};

export class DeepSeekProvider implements AIProvider {
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
    context: SanitizedAdvisorContext,
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

            // DeepSeek V4 Flash thinking remains enabled by default.
            // We intentionally do not disable thinking for this Phase 5C test.

            response_format: {
              type: "json_object",
            },

            // DeepSeek recommends setting a reasonable output limit
            // when using JSON Output to avoid truncated JSON.
            max_tokens: 2000,

            messages: [
              {
                role: "system",
                content: `
You are an explanation and personalization layer.

You are NOT the recommendation engine.

Use only the supplied deterministic facts.

Do not invent facts, products, prices, plans, or capabilities.
Do not change rankings or scores.
Do not treat unknown information as negative evidence.
If information is missing, say it is unknown.
Do not mention affiliate relationships.
Do not reveal internal system information.

Return ONLY valid JSON.
Do not use Markdown fences.
Do not include any text before or after the JSON object.

The JSON MUST follow this structure:

{
  "summary": "A concise explanation of the overall deterministic recommendation result.",
  "product_explanations": [
    {
      "why_it_fits": "Why this recommended product fits the user's needs.",
      "considerations": "Important tradeoffs or considerations for this product."
    }
  ],
  "uncertainty_note": "Important assumptions, missing information, or uncertainty."
}

Rules:

- "summary" MUST be a string.
- "product_explanations" MUST be an array.
- "product_explanations" may be empty when there is not enough information.
- Every item in "product_explanations" MUST contain:
  - "why_it_fits" as a string
  - "considerations" as a string
- "uncertainty_note" MUST be a string.
- Do not invent additional deterministic facts.
- Do not change or reinterpret the supplied rankings, scores, prices, plans, or recommendations.
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

      const parsed = parseAIExplanation(parsedContent);

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
