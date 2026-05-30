/** 多模态消息内容块 */
export type LlmContentPart =
  | { readonly type: "text"; readonly text: string }
  | { readonly type: "image_url"; readonly image_url: { readonly url: string } };

/** LLM 消息 — content 支持纯文本或多模态内容块数组 */
export interface LlmMessage {
  readonly role: "system" | "user" | "assistant";
  readonly content: string | readonly LlmContentPart[];
}

/** Token 用量 */
export interface TokenUsage {
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
}

/** LLM 原始响应 */
export interface LlmResponse {
  readonly content: string;
  readonly model: string;
  readonly usage: TokenUsage;
}

/** LLM 调用选项 */
export interface LlmOptions {
  readonly temperature?: number;
  /** 是否启用 JSON mode */
  readonly jsonMode?: boolean;
  /** 最大重试次数 (JSON 解析失败时) */
  readonly maxRetries?: number;
  /** 最大输出 token 数 */
  readonly maxTokens?: number;
  /** 超时 ms */
  readonly timeoutMs?: number;
}

/** Provider 抽象接口 */
export interface LlmProvider {
  readonly name: string;
  readonly defaultModel: string;
  chat(
    messages: readonly LlmMessage[],
    options?: LlmOptions
  ): Promise<LlmResponse>;
}
