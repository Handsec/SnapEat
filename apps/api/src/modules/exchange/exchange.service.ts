import { Injectable, Inject, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type Redis from "ioredis";

@Injectable()
export class ExchangeService {
  private readonly logger = new Logger(ExchangeService.name);
  private readonly CACHE_TTL = 3600;

  constructor(
    private config: ConfigService,
    @Inject("REDIS") private redis: Redis
  ) {}

  async getRate(from: string, to: string): Promise<number> {
    const cacheKey = `exchange:${from}:${to}`;
    const cached = await this.redis.get(cacheKey);
    if (cached !== null) return parseFloat(cached);

    const apiUrl = this.config.get(
      "EXCHANGE_API_URL",
      "https://api.exchangerate-api.com/v4/latest"
    );

    try {
      const res = await fetch(`${apiUrl}/${from}`);
      const data = await res.json() as { rates: Record<string, number> };
      const rate = data.rates?.[to];

      if (rate === undefined) {
        throw new Error(`Rate not found for ${from}→${to}`);
      }

      await this.redis.setex(cacheKey, this.CACHE_TTL, rate.toString());
      return rate;
    } catch (err) {
      this.logger.warn(`Exchange rate fetch failed, using fallback`);
      const fallbacks: Record<string, number> = {
        EUR: 7.8, USD: 7.2, GBP: 9.1, JPY: 0.048,
        KRW: 0.0054, THB: 0.20,
      };
      return fallbacks[from] ?? 7.0;
    }
  }

  async convertCny(amount: number, fromCurrency: string): Promise<number> {
    if (fromCurrency === "CNY") return amount;
    const rate = await this.getRate(fromCurrency, "CNY");
    return Math.round(amount * rate * 100) / 100;
  }
}
