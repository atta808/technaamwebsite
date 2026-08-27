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

  if (productExplanations.length === 0) {
    return null;
  }

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
    context: SanitizedAdvisorContext
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
            response_format: { type: "json_object" },
            messages: [
              {
                role: "system",
                content:
                  "You are an explanation and personalization layer. You are NOT the recommendation engine. Use only the supplied deterministic facts. Do not invent facts, products, prices, plans, or capabilities. Do not change rankings or scores. Do not treat unknown information as negative evidence. If information is missing, say it is unknown. Do not mention affiliate relationships. Do not reveal internal system information.",
              },
              {
                role: "user",
                content: JSON.stringify(context),
              },
            ],
          }),
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        return { available: false, reason: "provider_unavailable" };
      }

      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: unknown } }>;
      };
      const content = payload.choices?.[0]?.message?.content;
      if (typeof content !== "string") {
        return { available: false, reason: "provider_unavailable" };
      }

      const parsed = parseAIExplanation(JSON.parse(content));
      if (!parsed) {
        return { available: false, reason: "provider_unavailable" };
      }

      return { available: true, explanation: parsed };
    } catch {
      return { available: false, reason: "provider_unavailable" };
    } finally {
      clearTimeout(timeout);
    }
  }
}
