const { request } = require("../../utils/request");

Page({
  data: {
    items: [],
    total: 0,
    loading: true
  },

  onShow() {
    this.fetchHistory();
  },

  fetchHistory() {
    this.setData({ loading: true });
    request("/menu/history?page=1&pageSize=50")
      .then((res) => {
        const items = (res.items || []).map((i) => ({
          ...i,
          time_label: this.formatTime(i.created_at)
        }));
        this.setData({ items, total: res.total, loading: false });
      })
      .catch((err) => {
        this.setData({ loading: false });
        wx.showToast({ title: err.message || "加载失败", icon: "none" });
      });
  },

  formatTime(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    const pad = (n) => (n < 10 ? "0" + n : "" + n);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  },

  openMenu(e) {
    const menuId = e.currentTarget.dataset.id;
    // 清掉全局缓存，强制从后端按 id 拉取
    getApp().globalData.currentMenu = null;
    wx.navigateTo({ url: `/pages/menu/menu?menuId=${menuId}` });
  },

  deleteMenu(e) {
    const menuId = e.currentTarget.dataset.id;
    wx.showModal({
      title: "删除记录",
      content: "确定删除这条菜单记录吗？关联的点单也会一并删除。",
      confirmColor: "#f05a28",
      success: (res) => {
        if (!res.confirm) return;
        request(`/menu/${menuId}`, { method: "DELETE" })
          .then(() => {
            wx.showToast({ title: "已删除", icon: "success" });
            this.fetchHistory();
          })
          .catch((err) => {
            wx.showToast({ title: err.message || "删除失败", icon: "none" });
          });
      }
    });
  }
});
