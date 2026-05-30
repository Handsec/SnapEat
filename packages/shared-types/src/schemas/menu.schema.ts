import { z } from "zod";

export const AllergenSchema = z.object({
  name: z.string().min(1),
  confidence: z.number().min(0).max(1),
  note: z.string(),
});

export const MenuItemSchema = z.object({
  item_id: z.string().min(1),
  original_name: z.string().min(1),
  translated_name: z.string(),
  original_description: z.string(),
  translated_description: z.string(),
  explanation_zh: z.string(),
  ingredients: z.array(z.string()),
  allergens: z.array(AllergenSchema),
  taste_tags: z.array(z.string()),
  cooking_method: z.string(),
  spice_level: z.number().int().min(0).max(5),
  price: z.number().min(0),
  currency: z.string().length(3),
  cny_price: z.number().min(0),
  confidence_score: z.number().min(0).max(1),
  risk_notes: z.array(z.string()),
  image_crop_url: z.string().optional(),
});

export const MenuCategorySchema = z.object({
  category_id: z.string().min(1),
  original_name: z.string().min(1),
  translated_name: z.string(),
  items: z.array(MenuItemSchema),
});

export const MenuResultSchema = z.object({
  menu_id: z.string().min(1),
  language: z.string().min(1),
  currency: z.string().length(3),
  categories: z.array(MenuCategorySchema),
  metadata: z.object({
    processing_time_ms: z.number(),
    ocr_raw_text: z.string().optional(),
    model_used: z.string(),
    image_url: z.string().optional(),
  }).optional(),
});
