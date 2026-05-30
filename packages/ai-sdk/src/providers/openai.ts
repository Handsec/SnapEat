import type { LlmProvider, LlmMessage, LlmResponse, LlmOptions } from "../types";

export interface OpenAiConfig {
  readonly apiKey: string;
  readonly baseUrl?: string;
  readonly defaultModel?: string;
}

export class OpenAiProvider implements LlmProvider {
  readonly name = "openai";
  readonly defaultModel: string;

  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: OpenAiConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || "https://api.openai.com/v1";
    this.defaultModel = config.defaultModel ?? "gpt-4o";
  }

  async chat(
    messages: readonly LlmMessage[],
    options?: LlmOptions
  ): Promise<LlmResponse> {
    const url = `${this.baseUrl}/chat/completions`;
    const model = this.defaultModel;

    const body: Record<string, unknown> = {
      model,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature: options?.temperature ?? 0.3,
    };

    if (options?.maxTokens) {
      body.max_tokens = options.maxTokens;
    }

    if (options?.jsonMode) {
      body.response_format = { type: "json_object" };
    }

    const controller = new AbortController();
    const timeout = options?.timeoutMs ?? 60_000;
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        throw new Error(
          `OpenAI API error ${res.status}: ${res.statusText}${errBody ? ` — ${errBody.slice(0, 200)}` : ""}`
        );
      }

      const json = await res.json() as Record<string, unknown>;
      const choice = (
        json.choices as Array<{
          message: { content: string };
        }>
      )[0];

      if (!choice?.message?.content) {
        throw new Error("OpenAI returned empty response");
      }

      const usage = json.usage as {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
      } | undefined;

      return {
        content: choice.message.content,
        model: (json.model as string) ?? model,
        usage: {
          promptTokens: usage?.prompt_tokens ?? 0,
          completionTokens: usage?.completion_tokens ?? 0,
          totalTokens: usage?.total_tokens ?? 0,
        },
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
