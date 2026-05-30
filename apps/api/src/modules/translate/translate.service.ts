import { Injectable } from "@nestjs/common";
import { LlmClient } from "@menu/ai-sdk";
import { translationPrompt } from "@menu/prompts";
import type { TranslationOutput } from "@menu/prompts";
import { z } from "zod";

const TranslationSchema = z.object({
  translated: z.string(),
  explanation: z.string().default(""),
});

@Injectable()
export class TranslateService {
  constructor(private readonly llm: LlmClient) {}

  async translate(
    text: string,
    from: string,
    to: string
  ): Promise<TranslationOutput> {
    if (!text.trim()) {
      return { translated: text, explanation: "" };
    }

    try {
      return await this.llm.chatJsonWithPrompt(
        translationPrompt,
        `${text}`,
        TranslationSchema
      );
    } catch {
      return { translated: text, explanation: "" };
    }
  }
}
