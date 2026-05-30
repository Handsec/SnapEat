import { Injectable } from "@nestjs/common";

@Injectable()
export class TtsService {
  /**
   * Generate speech audio for the given text.
   * Uses Google Translate TTS (free, no API key required).
   */
  async speak(text: string, lang = "en"): Promise<Buffer> {
    const encoded = encodeURIComponent(text.slice(0, 200));
    // Map language to Youdao voice type: 0=EN, 1=ZH, etc.
    const type = lang === "zh" || lang === "zh-CN" ? 1 : 0;
    const url = `https://dict.youdao.com/dictvoice?audio=${encoded}&type=${type}`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "audio/mpeg,*/*",
      },
    });

    if (!res.ok) throw new Error(`TTS failed: ${res.status}`);

    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}
