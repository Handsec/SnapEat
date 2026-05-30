// ---- 菜单核心 Schema ----

/** 过敏原信息 */
export interface Allergen {
  readonly name: string;
  /** 0-1 置信度 */
  readonly confidence: number;
  readonly note: string;
}

/** 单个菜品 */
export interface MenuItem {
  readonly item_id: string;
  readonly original_name: string;
  readonly translated_name: string;
  readonly original_description: string;
  readonly translated_description: string;
  /** 中文解释说明 */
  readonly explanation_zh: string;
  readonly ingredients: readonly string[];
  readonly allergens: readonly Allergen[];
  /** 口味标签: 辣、甜、酸、油炸 等 */
  readonly taste_tags: readonly string[];
  readonly cooking_method: string;
  /** 辣度 0-5 */
  readonly spice_level: number;
  readonly price: number;
  readonly currency: string;
  /** 人民币等价价格 */
  readonly cny_price: number;
  /** 整体置信度 0-1 */
  readonly confidence_score: number;
  /** 风险提示，如"可能含乳制品" */
  readonly risk_notes: readonly string[];
  /** 菜品图片裁剪 URL */
  readonly image_crop_url?: string;
}

/** 菜单分类 */
export interface MenuCategory {
  readonly category_id: string;
  readonly original_name: string;
  readonly translated_name: string;
  readonly items: readonly MenuItem[];
}

/** 完整菜单识别结果 */
export interface MenuResult {
  readonly menu_id: string;
  readonly language: string;
  readonly currency: string;
  readonly categories: readonly MenuCategory[];
  readonly metadata?: MenuMetadata;
}

export interface MenuMetadata {
  /** 识别耗时 ms */
  readonly processing_time_ms: number;
  /** OCR 原始文本 */
  readonly ocr_raw_text?: string;
  /** 使用模型 */
  readonly model_used: string;
  /** 图片 URL */
  readonly image_url?: string;
}
