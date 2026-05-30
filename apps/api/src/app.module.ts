import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { UploadModule } from "./modules/upload/upload.module";
import { LlmModule } from "./modules/llm/llm.module";
import { TranslateModule } from "./modules/translate/translate.module";
import { ExchangeModule } from "./modules/exchange/exchange.module";
import { MenuModule } from "./modules/menu/menu.module";
import { OrderModule } from "./modules/order/order.module";
import { TtsModule } from "./modules/tts/tts.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    UploadModule,
    LlmModule,
    TranslateModule,
    ExchangeModule,
    MenuModule,
    OrderModule,
    TtsModule,
  ],
})
export class AppModule {}
