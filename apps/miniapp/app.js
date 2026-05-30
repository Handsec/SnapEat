App({
  globalData: {
    // 真机调试：手机与电脑连同一 WiFi，指向电脑局域网 IP（http，需在 DevTools 勾选"不校验合法域名"并用"真机调试"模式）
    // 模拟器本地调试可改回 http://localhost:3000/api
    apiBase: "http://192.168.1.172:3000/api",
    currentMenu: null,
    // 每个菜单独立存储选菜：_selections[menuId] = { [itemId]: { item, quantity, note } }
    _selections: {}
  },
  onLaunch() {
    console.log("MenuAI launched");
  },

  // 获取某菜单的选菜表
  getSelections(menuId) {
    if (!this.globalData._selections[menuId]) {
      this.globalData._selections[menuId] = {};
    }
    return this.globalData._selections[menuId];
  },

  // 设置某道菜的数量（0 则移除）
  setSelection(menuId, item, quantity, note) {
    const sel = this.getSelections(menuId);
    if (quantity <= 0) {
      delete sel[item.item_id];
    } else {
      sel[item.item_id] = {
        item,
        quantity,
        note: note || (sel[item.item_id] ? sel[item.item_id].note : "")
      };
    }
  },

  clearSelections(menuId) {
    delete this.globalData._selections[menuId];
  }
});
