import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import { ExchangeController } from "./exchange.controller";
import { ExchangeService } from "./exchange.service";

@Module({
  controllers: [ExchangeController],
  providers: [
    {
      provide: "REDIS",
      useFactory: (config: ConfigService) =>
        new Redis(config.get("REDIS_URL", "redis://127.0.0.1:6379"), {
          maxRetriesPerRequest: 3,
          retryStrategy: (times) => Math.min(times * 200, 2000),
        }),
      inject: [ConfigService],
    },
    ExchangeService,
  ],
  exports: [ExchangeService, "REDIS"],
})
export class ExchangeModule {}
