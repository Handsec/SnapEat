// ---- 点餐类型 ----

/** 用户选中的菜品 */
export interface SelectedDish {
  readonly item_id: string;
  readonly quantity: number;
  /** 用户备注（忌口、特殊要求等） */
  readonly note?: string;
}

/** POST /api/order/generate 请求 */
export interface OrderGenerateRequest {
  readonly menu_id: string;
  readonly selected_dishes: readonly SelectedDish[];
}

/** 点菜单单个菜品 */
export interface OrderSheetItem {
  readonly original_name: string;
  readonly translated_name: string;
  readonly quantity: number;
  readonly unit_price: number;
  readonly note?: string;
}

/** 双语点菜单 */
export interface OrderSheet {
  readonly order_id: string;
  /** 面向服务员的展示文本 */
  readonly waiter_text: string;
  /** 中文版本 */
  readonly chinese_text: string;
  readonly items: readonly OrderSheetItem[];
  readonly total_cny: number;
  readonly total_original: number;
  readonly currency: string;
}

export type OrderGenerateResponse = {
  readonly success: true;
  readonly data: OrderSheet;
} | {
  readonly success: false;
  readonly error: { readonly code: string; readonly message: string };
};
