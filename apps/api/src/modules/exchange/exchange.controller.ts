import { Controller, Get, Query } from "@nestjs/common";
import { ExchangeService } from "./exchange.service";

@Controller("exchange")
export class ExchangeController {
  constructor(private exchangeService: ExchangeService) {}

  @Get("rate")
  async getRate(
    @Query("from") from = "EUR",
    @Query("to") to = "CNY"
  ) {
    const rate = await this.exchangeService.getRate(from, to);
    return { from, to, rate, updated_at: new Date().toISOString() };
  }
}
