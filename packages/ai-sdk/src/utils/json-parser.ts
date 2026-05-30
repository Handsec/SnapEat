import { z } from "zod";

/** JSON 解析错误 */
export class JsonParseError extends Error {
  constructor(
    message: string,
    public readonly rawContent: string,
    public readonly attemptNumber: number
  ) {
    super(message);
    this.name = "JsonParseError";
  }
}

/**
 * 从 LLM 响应中提取并解析 JSON
 * 处理常见格式问题：
 * - markdown code block 包裹
 * - 前后多余空白
 * - 嵌套 JSON 修复尝试
 */
export function extractJson(raw: string): string {
  // Try markdown code block first
  const codeBlockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch?.[1]) {
    return codeBlockMatch[1].trim();
  }

  // Try to find the outermost { } or [ ]
  const trimmed = raw.trim();
  const firstBrace = trimmed.indexOf("{");
  const firstBracket = trimmed.indexOf("[");

  if (firstBrace === 0 || firstBracket === 0) {
    return trimmed;
  }

  // Extract from first { or [ to last } or ]
  const start = Math.min(
    firstBrace >= 0 ? firstBrace : Infinity,
    firstBracket >= 0 ? firstBracket : Infinity
  );
  if (start === Infinity) {
    throw new JsonParseError("No JSON structure found in response", raw, 0);
  }

  const endChar = trimmed[start] === "{" ? "}" : "]";
  const end = trimmed.lastIndexOf(endChar);
  if (end <= start) {
    throw new JsonParseError("Unclosed JSON structure", raw, 0);
  }

  return trimmed.slice(start, end + 1);
}

/**
 * 修复被截断的 JSON（输出超 max_tokens 被砍断时）。
 * 策略：从开头扫描，跟踪括号/引号栈，在最后一个合法位置截断并补全闭合符号。
 * 尽量抢救已经完整的部分（如已识别的若干菜品）。
 */
export function repairTruncatedJson(raw: string): string | null {
  const s = extractJsonLoose(raw);
  if (!s) return null;

  const stack: string[] = [];
  let inStr = false;
  let escaped = false;
  // 记录"最后一个安全可截断位置"：即某个完整 value 之后（逗号或闭合符处）
  let lastSafe = -1;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i]!;
    if (inStr) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inStr = false;
        // 字符串结束是一个相对安全的位置
        lastSafe = i;
      }
      continue;
    }
    if (ch === '"') {
      inStr = true;
    } else if (ch === "{" || ch === "[") {
      stack.push(ch === "{" ? "}" : "]");
    } else if (ch === "}" || ch === "]") {
      stack.pop();
      lastSafe = i;
    } else if (ch === "," ) {
      lastSafe = i - 1; // 逗号前是完整 value 结尾
    }
  }

  if (lastSafe < 0) return null;

  // 截到最后一个完整 value，丢弃半截内容
  let head = s.slice(0, lastSafe + 1);

  // 重新计算需要补全的闭合符号
  const closeStack: string[] = [];
  let inStr2 = false;
  let esc2 = false;
  for (let i = 0; i < head.length; i++) {
    const ch = head[i]!;
    if (inStr2) {
      if (esc2) esc2 = false;
      else if (ch === "\\") esc2 = true;
      else if (ch === '"') inStr2 = false;
      continue;
    }
    if (ch === '"') inStr2 = true;
    else if (ch === "{") closeStack.push("}");
    else if (ch === "[") closeStack.push("]");
    else if (ch === "}" || ch === "]") closeStack.pop();
  }

  // 去掉可能的尾随逗号
  head = head.replace(/,\s*$/, "");
  while (closeStack.length) head += closeStack.pop();

  // 验证修复结果可解析
  try {
    JSON.parse(head);
    return head;
  } catch {
    return null;
  }
}

/** 宽松提取 JSON 起始片段（不要求闭合，用于修复截断场景） */
function extractJsonLoose(raw: string): string | null {
  const codeBlockMatch = raw.match(/```(?:json)?\s*([\s\S]*)/);
  const body = codeBlockMatch?.[1] ?? raw;
  const trimmed = body.trim();
  const firstBrace = trimmed.indexOf("{");
  const firstBracket = trimmed.indexOf("[");
  const start = Math.min(
    firstBrace >= 0 ? firstBrace : Infinity,
    firstBracket >= 0 ? firstBracket : Infinity
  );
  if (start === Infinity) return null;
  return trimmed.slice(start);
}

/**
 * 带重试的 JSON 解析
 * @param raw LLM 原始响应
 * @param maxRetries 最大重试次数
 * @param onRetry 每次重试前的回调（调用方在这里重新请求 LLM）
 */
export async function parseWithRetry<T>(
  raw: string,
  maxRetries: number,
  onRetry: (error: string, attempt: number) => Promise<string>
): Promise<T> {
  let attempt = 0;
  let currentRaw = raw;

  while (attempt <= maxRetries) {
    try {
      const json = extractJson(currentRaw);
      return JSON.parse(json) as T;
    } catch (e) {
      if (attempt >= maxRetries) {
        // 最后兜底：尝试修复被截断的 JSON（输出超长被砍断的常见情况）
        const repaired = repairTruncatedJson(currentRaw);
        if (repaired) {
          try {
            return JSON.parse(repaired) as T;
          } catch {
            // 修复后仍失败，落入下方抛错
          }
        }
        if (e instanceof JsonParseError) throw e;
        throw new JsonParseError(
          `Failed to parse JSON after ${maxRetries + 1} attempts`,
          currentRaw,
          attempt
        );
      }
      const errorMsg = e instanceof Error ? e.message : String(e);
      currentRaw = await onRetry(errorMsg, attempt + 1);
      attempt++;
    }
  }

  throw new JsonParseError("Unreachable", raw, attempt);
}

/**
 * 用 zod schema 验证解析后的 JSON
 */
export function validateWithZod<T>(
  data: unknown,
  schema: z.ZodSchema<T>,
  label: string
): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(
      `${label} validation failed:\n${result.error.errors.map((e) => `  - ${e.path.join(".")}: ${e.message}`).join("\n")}`
    );
  }
  return result.data;
}
