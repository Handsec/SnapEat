import { Controller, Get, Query, Res } from "@nestjs/common";
import type { Response } from "express";
import { TtsService } from "./tts.service";

@Controller("tts")
export class TtsController {
  constructor(private readonly tts: TtsService) {}

  @Get("speak")
  async speak(
    @Query("text") text: string,
    @Query("lang") lang: string,
    @Res() res: Response,
  ) {
    if (!text) {
      res.status(400).json({ error: "text required" });
      return;
    }
    const buffer = await this.tts.speak(text, lang || "en");
    res.set({
      "Content-Type": "audio/mpeg",
      "Content-Length": buffer.length.toString(),
      "Cache-Control": "public, max-age=86400",
    });
    res.send(buffer);
  }
}
