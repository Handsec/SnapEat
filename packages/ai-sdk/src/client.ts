import type { LlmProvider, LlmMessage, LlmOptions, LlmContentPart } from "./types";
import type { PromptTemplate } from "@menu/prompts";
import { parseWithRetry, validateWithZod, JsonParseError } from "./utils/json-parser";
import { z } from "zod";

export interface LlmClientOptions {
  readonly provider: LlmProvider;
  readonly defaultRetries?: number;
  readonly logger?: (msg: string) => void;
}

/**
 * LLM 客户端 — 在 Provider 之上提供：
 * - prompt 模板组装
 * - JSON 模式调用
 * - 自动重试 + JSON 修复
 * - zod schema 校验
 */
export class LlmClient {
  private readonly provider: LlmProvider;
  private readonly defaultRetries: number;
  private readonly logger?: (msg: string) => void;

  constructor(options: LlmClientOptions) {
    this.provider = options.provider;
    this.defaultRetries = options.defaultRetries ?? 2;
    this.logger = options.logger;
  }

  /** 简单对话 — 返回原始文本 */
  async chat(
    messages: readonly LlmMessage[],
    options?: LlmOptions
  ): Promise<string> {
    const res = await this.provider.chat(messages, options);
    this.logger?.(
      `[LlmClient] chat: ${res.model} tokens=${res.usage.totalTokens}`
    );
    return res.content;
  }

  /** 使用 prompt 模板 + 用户输入，返回原始文本 */
  async chatWithPrompt(
    template: PromptTemplate,
    userInput: string,
    options?: LlmOptions
  ): Promise<string> {
    const messages: LlmMessage[] = [
      { role: "system", content: template.system },
      { role: "user", content: userInput },
    ];
    return this.chat(messages, options);
  }

  /**
   * JSON 模式对话 — 返回经过 zod 校验的结构化数据
   * 自动启用 JSON mode、解析失败自动重试
   */
  async chatJson<T>(
    messages: readonly LlmMessage[],
    schema: z.ZodSchema<T>,
    options?: LlmOptions
  ): Promise<T> {
    const jsonOptions: LlmOptions = {
      ...options,
      jsonMode: true,
      maxRetries: options?.maxRetries ?? this.defaultRetries,
    };

    const res = await this.provider.chat(messages, jsonOptions);
    this.logger?.(
      `[LlmClient] chatJson: ${res.model} tokens=${res.usage.totalTokens}`
    );

    try {
      const data = await parseWithRetry<unknown>(
        res.content,
        jsonOptions.maxRetries ?? 0,
        async (error, attempt) => {
          this.logger?.(
            `[LlmClient] JSON parse failed (attempt ${attempt}): ${error}`
          );
          // Retry: re-call the provider
          const retryRes = await this.provider.chat(
            [
              ...messages,
              {
                role: "assistant",
                content: res.content,
              },
              {
                role: "user",
                content: `Your previous response was not valid JSON. Error: ${error}. Please return ONLY valid JSON matching the required schema. Do not wrap in markdown. Do not add commentary.`,
              },
            ],
            jsonOptions
          );
          return retryRes.content;
        }
      );

      return validateWithZod(data, schema, "LLM response");
    } catch (e) {
      if (e instanceof JsonParseError) {
        throw new Error(
          `LLM JSON parsing failed: ${e.message}. Raw content (first 200 chars): ${e.rawContent.slice(0, 200)}`
        );
      }
      throw e;
    }
  }

  /** 使用 prompt 模板 + JSON 模式 */
  async chatJsonWithPrompt<T>(
    template: PromptTemplate,
    userInput: string,
    schema: z.ZodSchema<T>,
    options?: LlmOptions
  ): Promise<T> {
    const messages: LlmMessage[] = [
      { role: "system", content: template.system },
      { role: "user", content: userInput },
    ];
    return this.chatJson(messages, schema, options);
  }

  /**
   * 多模态 JSON 模式 — 看图直接输出结构化数据
   * @param template 视觉 prompt 模板（含 system 指令）
   * @param imageDataUrl 图片 data URL（data:image/jpeg;base64,...）或公网图片 URL
   * @param schema zod 校验 schema
   * @param userText 可选的附加文字说明
   */
  async chatJsonWithImage<T>(
    template: PromptTemplate,
    imageDataUrl: string,
    schema: z.ZodSchema<T>,
    userText?: string,
    options?: LlmOptions
  ): Promise<T> {
    const parts: LlmContentPart[] = [
      { type: "image_url", image_url: { url: imageDataUrl } },
    ];
    if (userText && userText.trim()) {
      parts.unshift({ type: "text", text: userText });
    }
    const messages: LlmMessage[] = [
      { role: "system", content: template.system },
      { role: "user", content: parts },
    ];
    return this.chatJson(messages, schema, options);
  }
}
