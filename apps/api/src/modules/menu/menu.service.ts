import { Injectable, Logger, ServiceUnavailableException, UnprocessableEntityException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { z } from "zod";
import { LlmClient } from "@menu/ai-sdk";
import { menuVisionPrompt } from "@menu/prompts";
import type { MenuResult, MenuCategory, MenuItem, Allergen } from "@menu/shared-types";
import { UploadService } from "../upload/upload.service";
import { TranslateService } from "../translate/translate.service";
import { ExchangeService } from "../exchange/exchange.service";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class MenuService {
  private readonly logger = new Logger(MenuService.name);

  constructor(
    private readonly upload: UploadService,
    private readonly llm: LlmClient,
    private readonly translate: TranslateService,
    private readonly exchange: ExchangeService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService
  ) {}

  /** 是否配置了可用的视觉 LLM（key 非空） */
  private hasLlm(): boolean {
    const key = this.config.get<string>("OPENAI_API_KEY");
    return !!key && key.trim().length > 0;
  }

  /** Buffer → data URL，按文件名/magic bytes 推断 mime */
  private toDataUrl(buffer: Buffer, filename: string): string {
    let mime = "image/jpeg";
    const lower = filename.toLowerCase();
    if (buffer.length >= 2 && buffer[0] === 0x89 && buffer[1] === 0x50) {
      mime = "image/png";
    } else if (lower.endsWith(".png")) {
      mime = "image/png";
    } else if (lower.endsWith(".webp")) {
      mime = "image/webp";
    } else if (lower.endsWith(".gif")) {
      mime = "image/gif";
    }
    return `data:${mime};base64,${buffer.toString("base64")}`;
  }

  async scanMenu(
    buffer: Buffer,
    filename: string,
    targetLang = "zh-CN"
  ): Promise<MenuResult> {
    const start = Date.now();

    // Step 1: Upload
    const { url: imageUrl } = await this.upload.uploadImage(buffer, filename);

    // Step 2: 视觉识别（看图直接出结构化 JSON + 中文翻译）
    if (!this.hasLlm()) {
      throw new ServiceUnavailableException({
        code: "LLM_NOT_CONFIGURED",
        message: "未配置识别模型，请在服务端配置 OPENAI_API_KEY 后重试",
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let language: string;
    let currency: string;
    let categories: any[];

    try {
      const dataUrl = this.toDataUrl(buffer, filename);
      const raw = await this.llm.chatJsonWithImage(
        menuVisionPrompt,
        dataUrl,
        VisionRawSchema,
        undefined,
        { timeoutMs: 120_000, maxTokens: 12000 }
      );
      const normalized = normalizeVision(raw);
      language = normalized.language;
      currency = normalized.currency;
      categories = normalized.categories;
      this.logger.log(
        `Vision recognized ${categories.length} categories, lang=${language}`
      );
    } catch (e) {
      this.logger.error(`Vision recognition failed: ${(e as Error).message}`);
      throw new UnprocessableEntityException({
        code: "MENU_RECOGNITION_FAILED",
        message: "菜单识别失败，请换一张更清晰的照片重试",
      });
    }

    if (categories.length === 0) {
      throw new UnprocessableEntityException({
        code: "NO_MENU_DETECTED",
        message: "未能从图片中识别出菜单内容，请确认拍摄的是菜单并重试",
      });
    }

    // Step 5: 翻译已由视觉模型一并产出（mock 同样自带翻译）。
    // 此处只做：缺失翻译时按需补翻 + 汇率换算。
    const enrichedCategories: MenuCategory[] = [];
    for (const cat of categories) {
      let translatedCatName = String(cat.translated_name ?? "").trim();
      if (!translatedCatName) {
        translatedCatName = (
          await this.translate.translate(String(cat.original_name ?? ""), language!, targetLang)
        ).translated || String(cat.original_name ?? "");
      }

      const enrichedItems: MenuItem[] = [];
      for (const item of cat.items ?? []) {
        let nameTr = String(item.translated_name ?? "").trim();
        let descTr = String(item.translated_description ?? "").trim();
        let explanation = String(item.explanation_zh ?? "").trim();

        // 视觉模型未给出翻译时，回退到独立翻译服务
        if (!nameTr) {
          const [tr, desc, exp] = await Promise.all([
            this.translate.translate(String(item.original_name ?? ""), language!, targetLang),
            item.original_description
              ? this.translate.translate(String(item.original_description), language!, targetLang)
              : Promise.resolve({ translated: "", explanation: "" }),
            this.translate.translate(String(item.original_name ?? ""), language!, "zh-CN"),
          ]);
          nameTr = tr.translated || String(item.original_name ?? "");
          if (!descTr) descTr = desc.translated;
          if (!explanation) explanation = exp.explanation ?? "";
        }

        const cnyPrice =
          Number(item.price) > 0
            ? await this.exchange.convertCny(Number(item.price), String(item.currency ?? currency))
            : 0;

        enrichedItems.push({
          item_id: String(item.item_id ?? ""),
          original_name: String(item.original_name ?? ""),
          translated_name: nameTr,
          original_description: String(item.original_description ?? ""),
          translated_description: descTr,
          explanation_zh: explanation,
          ingredients: (item.ingredients ?? []) as string[],
          allergens: (item.allergens ?? []) as Allergen[],
          taste_tags: (item.taste_tags ?? []) as string[],
          cooking_method: String(item.cooking_method ?? ""),
          spice_level: Number(item.spice_level ?? 0),
          price: Number(item.price ?? 0),
          currency: String(item.currency ?? currency),
          cny_price: cnyPrice,
          confidence_score: Number(item.confidence_score ?? 0),
          risk_notes: (item.risk_notes ?? []) as string[],
          image_crop_url: item.image_crop_url as string | undefined,
        });
      }

      enrichedCategories.push({
        category_id: String(cat.category_id ?? ""),
        original_name: String(cat.original_name ?? ""),
        translated_name: translatedCatName,
        items: enrichedItems,
      });
    }

    const processingTime = Date.now() - start;
    this.logger.log(`Menu structured in ${processingTime}ms`);

    const modelUsed = this.hasLlm()
      ? this.config.get<string>("OPENAI_MODEL", "doubao-vision")
      : "mock";

    // Step 6: Persist
    const count = enrichedCategories.reduce(
      (s, c) => s + c.items.length,
      0
    );
    const saved = await this.prisma.menuScan.create({
      data: {
        imageUrl,
        ocrRawText: null,
        structuredJson: { language, currency, categories: enrichedCategories } as unknown as object,
        language,
        currency,
        itemCount: count,
        processingTimeMs: processingTime,
        modelUsed,
      },
    });

    return {
      menu_id: saved.id,
      language,
      currency,
      categories: enrichedCategories,
      metadata: {
        processing_time_ms: processingTime,
        model_used: modelUsed,
        image_url: imageUrl,
      },
    };
  }

  async getHistory(page = 1, pageSize = 20) {
    const [items, total] = await Promise.all([
      this.prisma.menuScan.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          imageUrl: true,
          language: true,
          currency: true,
          itemCount: true,
          createdAt: true,
        },
      }),
      this.prisma.menuScan.count(),
    ]);

    return {
      items: items.map((i: { id: string; imageUrl: string; language: string; itemCount: number; createdAt: Date }) => ({
        menu_id: i.id,
        language: i.language,
        created_at: i.createdAt.toISOString(),
        thumbnail_url: i.imageUrl,
        item_count: i.itemCount,
      })),
      total,
    };
  }

  async getMenuById(id: string): Promise<MenuResult | null> {
    const record = await this.prisma.menuScan.findUnique({ where: { id } });
    if (!record) return null;
    const structured = record.structuredJson as unknown as MenuResult;
    // structuredJson 不含 menu_id/metadata，回填以保证响应完整、与 scan 返回一致
    return {
      ...structured,
      menu_id: record.id,
      language: structured.language ?? record.language,
      currency: structured.currency ?? record.currency,
      metadata: structured.metadata ?? {
        processing_time_ms: record.processingTimeMs ?? 0,
        ocr_raw_text: record.ocrRawText ?? "",
        model_used: record.modelUsed ?? "",
        image_url: record.imageUrl,
      },
    };
  }

  async deleteMenuById(id: string) {
    const record = await this.prisma.menuScan.findUnique({ where: { id } });
    if (!record) throw new Error("记录不存在");
    await this.prisma.orderSheet.deleteMany({ where: { menuScanId: id } });
    await this.prisma.menuScan.delete({ where: { id } });
  }
}

// ---- 视觉模型输出容错解析 ----
// 模型可能不严格遵循字段名/类型，这里用宽松 schema 接收，再归一化为标准结构。

const VisionRawSchema = z.object({}).passthrough();

type RawObj = Record<string, unknown>;

function pick(obj: RawObj, keys: string[]): unknown {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return undefined;
}

function toStr(v: unknown, fallback = ""): string {
  if (v === undefined || v === null) return fallback;
  if (typeof v === "string") return v;
  return String(v);
}

function toNum(v: unknown, fallback = 0): number {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v.replace(/[^0-9.]/g, ""));
    if (!Number.isNaN(n)) return n;
  }
  return fallback;
}

// 语言名 → ISO 639-1
function normalizeLang(v: unknown): string {
  const s = toStr(v, "en").trim().toLowerCase();
  if (s.length === 2) return s;
  const map: Record<string, string> = {
    english: "en", italian: "it", french: "fr", german: "de",
    spanish: "es", chinese: "zh", japanese: "ja", korean: "ko",
    thai: "th", portuguese: "pt", russian: "ru",
    "中文": "zh", "英语": "en", "日语": "ja", "韩语": "ko",
  };
  return map[s] ?? (s.slice(0, 2) || "en");
}

// 货币符号/名 → ISO 4217（3 位）
function normalizeCurrency(v: unknown): string {
  const s = toStr(v, "EUR").trim().toUpperCase();
  const map: Record<string, string> = {
    "€": "EUR", EURO: "EUR", EUROS: "EUR",
    "$": "USD", DOLLAR: "USD", USD$: "USD",
    "£": "GBP", POUND: "GBP",
    "¥": "CNY", RMB: "CNY", YUAN: "CNY", YEN: "JPY",
    "₩": "KRW", WON: "KRW", "฿": "THB", BAHT: "THB",
  };
  if (map[s]) return map[s];
  if (s.length === 3) return s;
  return "EUR";
}

function normalizeAllergens(v: unknown): Allergen[] {
  if (!Array.isArray(v)) return [];
  return v.map((a) => {
    if (typeof a === "string") {
      return { name: a, confidence: 0.6, note: "" };
    }
    const o = a as RawObj;
    return {
      name: toStr(pick(o, ["name", "allergen", "type"]), "unknown"),
      confidence: Math.max(0, Math.min(1, toNum(pick(o, ["confidence", "score"]), 0.6))),
      note: toStr(pick(o, ["note", "reason"]), ""),
    };
  }).filter((a) => a.name && a.name !== "unknown");
}

function normalizeStrArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => toStr(x)).filter(Boolean);
}

interface NormalizedVision {
  language: string;
  currency: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  categories: any[];
}

function normalizeVision(raw: unknown): NormalizedVision {
  const root = (raw ?? {}) as RawObj;
  const language = normalizeLang(pick(root, ["language", "lang", "menu_language"]));
  const topCurrency = normalizeCurrency(pick(root, ["currency", "currency_code"]));
  const rawCats = pick(root, ["categories", "sections", "menu", "items"]);
  const cats = Array.isArray(rawCats) ? rawCats : [];

  let catIdx = 0;
  const categories = cats.map((c) => {
    const co = (c ?? {}) as RawObj;
    catIdx += 1;
    const catName = toStr(
      pick(co, ["original_name", "name", "category", "category_name", "title"]),
      `Category ${catIdx}`
    );
    const rawItems = pick(co, ["items", "dishes", "products"]);
    const items = Array.isArray(rawItems) ? rawItems : [];
    let itemIdx = 0;
    const normItems = items.map((it) => {
      const io = (it ?? {}) as RawObj;
      itemIdx += 1;
      const name = toStr(
        pick(io, ["original_name", "name", "dish_name", "title"]),
        ""
      );
      const itemCurrency = normalizeCurrency(
        pick(io, ["currency", "currency_code"]) ?? topCurrency
      );
      return {
        item_id: toStr(pick(io, ["item_id", "id"]), `c${catIdx}-i${itemIdx}`),
        original_name: name,
        translated_name: toStr(pick(io, ["translated_name", "translation", "name_zh", "chinese_name"]), ""),
        original_description: toStr(pick(io, ["original_description", "description", "desc"]), ""),
        translated_description: toStr(pick(io, ["translated_description", "description_zh"]), ""),
        explanation_zh: toStr(pick(io, ["explanation_zh", "explanation", "note_zh"]), ""),
        ingredients: normalizeStrArray(pick(io, ["ingredients", "ingredient_list"])),
        allergens: normalizeAllergens(pick(io, ["allergens", "allergen_list"])),
        taste_tags: normalizeStrArray(pick(io, ["taste_tags", "tags", "flavors"])),
        cooking_method: toStr(pick(io, ["cooking_method", "method"]), ""),
        spice_level: Math.max(0, Math.min(5, Math.round(toNum(pick(io, ["spice_level", "spiciness"]), 0)))),
        price: toNum(pick(io, ["price", "amount", "cost"]), 0),
        currency: itemCurrency,
        confidence_score: Math.max(0, Math.min(1, toNum(pick(io, ["confidence_score", "confidence"]), 0.7))),
        risk_notes: normalizeStrArray(pick(io, ["risk_notes", "notes", "warnings"])),
      };
    }).filter((i) => i.original_name); // 丢弃没名字的项

    return {
      category_id: toStr(pick(co, ["category_id", "id"]), `cat-${catIdx}`),
      original_name: catName,
      translated_name: toStr(pick(co, ["translated_name", "name_zh"]), ""),
      items: normItems,
    };
  }).filter((c) => c.items.length > 0); // 丢弃空分类

  return { language, currency: topCurrency, categories };
}
