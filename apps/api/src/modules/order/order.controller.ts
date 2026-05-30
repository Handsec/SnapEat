import { Controller, Post, Body } from "@nestjs/common";
import { OrderService } from "./order.service";
import type { SelectedDish } from "@menu/shared-types";

interface OrderBody {
  menu_id: string;
  selected_dishes: readonly SelectedDish[];
}

@Controller("order")
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post("generate")
  async generate(@Body() body: OrderBody) {
    if (!body.menu_id || !body.selected_dishes?.length) {
      throw new Error("menu_id and selected_dishes are required");
    }
    return this.orderService.generateOrder(body.menu_id, body.selected_dishes);
  }
}
