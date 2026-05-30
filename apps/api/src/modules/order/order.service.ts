import { Injectable } from "@nestjs/common";
import { LlmClient } from "@menu/ai-sdk";
import { waiterOrderPrompt } from "@menu/prompts";
import { PrismaService } from "../../prisma/prisma.service";
import type { OrderSheet, SelectedDish } from "@menu/shared-types";

@Injectable()
export class OrderService {
  constructor(
    private readonly llm: LlmClient,
    private readonly prisma: PrismaService
  ) {}

  async generateOrder(
    menuId: string,
    selectedDishes: readonly SelectedDish[]
  ): Promise<OrderSheet> {
    const menu = await this.prisma.menuScan.findUnique({
      where: { id: menuId },
    });
    if (!menu) throw new Error("Menu not found");

    const menuData = menu.structuredJson as Record<string, unknown>;
    const categories = menuData["categories"] as Array<Record<string, unknown>> ?? [];
    const allItems: Array<Record<string, unknown>> = [];
    for (const cat of categories) {
      const items = cat["items"] as Array<Record<string, unknown>> ?? [];
      for (const item of items) allItems.push(item);
    }

    const orderItems = selectedDishes
      .map((d) => {
        const found = allItems.find((i) => i["item_id"] === d.item_id);
        if (!found) return null;
        return {
          original_name: String(found["original_name"] ?? ""),
          translated_name: String(
            found["translated_name"] ?? found["original_name"] ?? ""
          ),
          quantity: d.quantity,
          unit_price: Number(found["price"]) || 0,
          unit_cny_price: Number(found["cny_price"]) || 0,
          note: d.note,
        };
      })
      .filter((i): i is NonNullable<typeof i> => i !== null);

    const totalOriginal = orderItems.reduce(
      (s, i) => s + i.unit_price * i.quantity,
      0
    );
    const totalCny = orderItems.reduce(
      (s, i) => s + i.unit_cny_price * i.quantity,
      0
    );

    // Generate waiter text
    let waiterText = "";
    try {
      const itemsDesc = orderItems
        .map(
          (i) =>
            `- ${i.quantity}x ${i.original_name}${i.note ? ` (note: ${i.note})` : ""}`
        )
        .join("\n");
      waiterText = await this.llm.chatWithPrompt(
        waiterOrderPrompt,
        `${itemsDesc}\nCurrency: ${menu.currency}\nTotal: ${totalOriginal} (≈ ¥${totalCny})`
      );
    } catch {
      waiterText = orderItems
        .map(
          (i) =>
            `${i.quantity}x ${i.original_name}${i.note ? ` (${i.note})` : ""}`
        )
        .join("\n");
    }

    const sheet: OrderSheet = {
      order_id: "",
      waiter_text: waiterText,
      chinese_text: orderItems
        .map(
          (i) =>
            `${i.translated_name} x${i.quantity}${i.note ? ` (${i.note})` : ""}`
        )
        .join("\n"),
      items: orderItems.map(i => ({
        original_name: i.original_name,
        translated_name: i.translated_name,
        quantity: i.quantity,
        unit_price: i.unit_price,
        note: i.note,
      })),
      total_cny: Math.round(totalCny * 100) / 100,
      total_original: Math.round(totalOriginal * 100) / 100,
      currency: menu.currency,
    };

    const saved = await this.prisma.orderSheet.create({
      data: {
        menuScanId: menuId,
        itemsJson: orderItems as unknown as object,
        waiterText,
        chineseText: sheet.chinese_text,
        totalCny: sheet.total_cny,
        totalOriginal,
        currency: sheet.currency,
      },
    });

    return { ...sheet, order_id: saved.id };
  }
}
