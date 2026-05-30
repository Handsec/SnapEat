const { request } = require("../../utils/request");

Page({
  data: {
    menuId: "",
    menu: null,
    categories: [],
    activeCat: 0,
    expanded: {},      // { itemId: true } 展开详情
    quantities: {},    // { itemId: number } 选菜数量
    selectedCount: 0,
    selectedTotalCny: 0,
    loading: true
  },

  onLoad(options) {
    const menuId = options.menuId || "";
    this.setData({ menuId });

    const cached = getApp().globalData.currentMenu;
    if (cached && cached.menu_id === menuId) {
      this.initMenu(cached);
    } else {
      this.fetchMenu(menuId);
    }
  },

  fetchMenu(menuId) {
    this.setData({ loading: true });
    request(`/menu/${menuId}`)
      .then((menu) => {
        getApp().globalData.currentMenu = menu;
        this.initMenu(menu);
      })
      .catch((err) => {
        this.setData({ loading: false });
        wx.showToast({ title: err.message || "加载失败", icon: "none" });
      });
  },

  initMenu(menu) {
    // 从全局恢复已选数量
    const app = getApp();
    const sel = app.getSelections(menu.menu_id);
    const quantities = {};
    Object.keys(sel).forEach((itemId) => {
      quantities[itemId] = sel[itemId].quantity;
    });

    // 给每个分类带上数量标签
    const categories = (menu.categories || []).map((c) => ({
      ...c,
      count: (c.items || []).length
    }));

    this.setData(
      { menu, categories, quantities, loading: false },
      () => this.recalc()
    );
  },

  switchCat(e) {
    this.setData({ activeCat: e.currentTarget.dataset.index });
  },

  toggleExpand(e) {
    const id = e.currentTarget.dataset.id;
    const expanded = { ...this.data.expanded };
    expanded[id] = !expanded[id];
    this.setData({ expanded });
  },

  inc(e) {
    const item = e.currentTarget.dataset.item;
    const q = (this.data.quantities[item.item_id] || 0) + 1;
    this.updateQty(item, q);
  },

  dec(e) {
    const item = e.currentTarget.dataset.item;
    const q = (this.data.quantities[item.item_id] || 0) - 1;
    this.updateQty(item, Math.max(0, q));
  },

  updateQty(item, quantity) {
    const app = getApp();
    app.setSelection(this.data.menuId, item, quantity);
    const quantities = { ...this.data.quantities };
    if (quantity <= 0) {
      delete quantities[item.item_id];
    } else {
      quantities[item.item_id] = quantity;
    }
    this.setData({ quantities }, () => this.recalc());
  },

  recalc() {
    const app = getApp();
    const sel = app.getSelections(this.data.menuId);
    let count = 0;
    let totalCny = 0;
    Object.keys(sel).forEach((id) => {
      const s = sel[id];
      count += s.quantity;
      totalCny += (s.item.cny_price || 0) * s.quantity;
    });
    this.setData({
      selectedCount: count,
      selectedTotalCny: Math.round(totalCny * 100) / 100
    });
  },

  goOrder() {
    if (this.data.selectedCount === 0) {
      wx.showToast({ title: "请先选择菜品", icon: "none" });
      return;
    }
    wx.navigateTo({ url: `/pages/order/order?menuId=${this.data.menuId}` });
  }
});
