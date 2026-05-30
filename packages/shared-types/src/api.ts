import type { MenuResult } from "./menu";

// ---- 通用 API 包装 ----

export interface ApiSuccess<T> {
  readonly success: true;
  readonly data: T;
}

export interface ApiError {
  readonly success: false;
  readonly error: {
    readonly code: string;
    readonly message: string;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ---- 菜单扫描 ----

export interface MenuScanRequest {
  /** 图片文件 (multipart) */
  readonly image: File;
  /** 目标翻译语言，默认 zh-CN */
  readonly target_language?: string;
}

export type MenuScanResponse = ApiResponse<MenuResult>;

// ---- 历史记录 ----

export interface MenuHistoryItem {
  readonly menu_id: string;
  readonly language: string;
  readonly created_at: string;
  readonly thumbnail_url?: string;
  readonly item_count: number;
}

export interface MenuHistoryData {
  readonly items: readonly MenuHistoryItem[];
  readonly total: number;
}

export type MenuHistoryResponse = ApiResponse<MenuHistoryData>;

// ---- 汇率 ----

export interface ExchangeRateData {
  readonly from: string;
  readonly to: string;
  readonly rate: number;
  readonly updated_at: string;
}

export type ExchangeRateResponse = ApiResponse<ExchangeRateData>;
