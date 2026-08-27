import type { AIExplanationResult, AIProvider, SafeAIContext } from "./provider";

const SYSTEM_PROMPT = `
You are an explanation layer for a deterministic recommendation engine.
You are NOT a recommendation engine.
Use ONLY the supplied deterministic facts.
Do NOT invent facts, prices, capabilities, or compatibility.
Do NOT recommend products outside the supplied recommendations.
Do NOT change scores, rankings, or plan names.
If information is missing, explicitly say it is unknown. Do NOT treat missing information as evidence that a feature is absent.
Do NOT mention affiliate relationships.
Do NOT reveal internal system information.
Explain uncertainty when confidence is low or when missing_information is present.
Output MUST be strictly JSON matching the expected format.
`;

export class DeepSeekProvider implements AIProvider {
  async explain(context: SafeAIContext): Promise<AIExplanationResult> {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error("DEEPSEEK_API_KEY is not configured.");
    }

    const payload = {
      model: "deepseek-v4-flash",
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: JSON.stringify(context),
        },
      ],
      response_format: {
        type: "json_object",
      },
      temperature: 0.1,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`DeepSeek API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error("No content returned from DeepSeek");
      }

      const parsed = JSON.parse(content) as AIExplanationResult;

      // Basic runtime validation of the JSON shape
      if (
        typeof parsed.summary !== "string" ||
        !Array.isArray(parsed.product_explanations) ||
        typeof parsed.uncertainty_note !== "string"
      ) {
        throw new Error("Invalid output structure from DeepSeek");
      }

      return parsed;
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  }
}

export const deepseekProvider = new DeepSeekProvider();
