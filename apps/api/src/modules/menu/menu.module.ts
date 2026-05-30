import { Module } from "@nestjs/common";
import { MenuController } from "./menu.controller";
import { MenuService } from "./menu.service";
import { UploadModule } from "../upload/upload.module";
import { TranslateModule } from "../translate/translate.module";
import { ExchangeModule } from "../exchange/exchange.module";

@Module({
  imports: [UploadModule, TranslateModule, ExchangeModule],
  controllers: [MenuController],
  providers: [MenuService],
})
export class MenuModule {}
