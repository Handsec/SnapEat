import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { MenuService } from "./menu.service";

@Controller("menu")
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Post("scan")
  @UseInterceptors(FileInterceptor("image"))
  async scanMenu(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException({
        code: "NO_IMAGE",
        message: "未收到图片文件",
      });
    }
    return this.menuService.scanMenu(file.buffer, file.originalname ?? "menu.jpg");
  }

  @Get("history")
  async getHistory(
    @Query("page") page = "1",
    @Query("pageSize") pageSize = "20"
  ) {
    return this.menuService.getHistory(+page, +pageSize);
  }

  @Get(":id")
  async getById(@Param("id") id: string) {
    const menu = await this.menuService.getMenuById(id);
    if (!menu) {
      throw new NotFoundException({ code: "MENU_NOT_FOUND", message: "菜单不存在" });
    }
    return menu;
  }

  @Delete(":id")
  async deleteById(@Param("id") id: string) {
    await this.menuService.deleteMenuById(id);
    return { deleted: id };
  }
}
