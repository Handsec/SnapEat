const { request } = require("../../utils/request");

Page({
  data: {
    menuId: "",
    order: null,
    bigMode: false,
    loading: true
  },

  onLoad(options) {
    const menuId = options.menuId || "";
    this.setData({ menuId });
    this.generate(menuId);
  },

  generate(menuId) {
    const app = getApp();
    const sel = app.getSelections(menuId);
    const selected_dishes = Object.keys(sel).map((id) => ({
      item_id: id,
      quantity: sel[id].quantity,
      note: sel[id].note || ""
    }));

    if (!selected_dishes.length) {
      this.setData({ loading: false });
      wx.showToast({ title: "没有选中的菜品", icon: "none" });
      return;
    }

    this.setData({ loading: true });
    request("/order/generate", {
      method: "POST",
      data: { menu_id: menuId, selected_dishes }
    })
      .then((order) => {
        this.setData({ order, loading: false });
      })
      .catch((err) => {
        this.setData({ loading: false });
        wx.showToast({ title: err.message || "生成失败", icon: "none" });
      });
  },

  toggleBig() {
    this.setData({ bigMode: !this.data.bigMode });
  },

  goBack() {
    wx.navigateBack();
  }
});
