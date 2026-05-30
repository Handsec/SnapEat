/** Prompt 模板定义 */
export interface PromptTemplate {
  readonly name: string;
  readonly version: string;
  readonly system: string;
  /** JSON Schema 描述 — 用于 LLM structured output */
  readonly outputSchema: string;
}

/** OCR 纠错 prompt */
export interface OcrCorrectionInput {
  readonly rawText: string;
}

export interface OcrCorrectionOutput {
  readonly corrected_text: string;
}

/** 菜单结构化 prompt */
export interface MenuStructuringInput {
  readonly correctedText: string;
}

/** 翻译 prompt */
export interface TranslationInput {
  readonly text: string;
  readonly from: string;
  readonly to: string;
}

export interface TranslationOutput {
  readonly translated: string;
  readonly explanation?: string;
}

/** 点菜单生成 prompt */
export interface WaiterOrderInput {
  readonly items: ReadonlyArray<{
    readonly original_name: string;
    readonly quantity: number;
    readonly note?: string;
  }>;
  readonly currency: string;
}
