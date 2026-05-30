const { uploadFile } = require("../../utils/request");

Page({
  data: {
    scanning: false
  },

  onScan() {
    if (this.data.scanning) return;
    wx.chooseMedia({
      count: 1,
      mediaType: ["image"],
      sourceType: ["album", "camera"],
      sizeType: ["compressed"],
      success: (res) => {
        const file = res.tempFiles[0];
        this.compressThenScan(file.tempFilePath, file.size);
      }
    });
  },

  // 大图先压缩再上传，避免传输过慢/超时
  compressThenScan(filePath, size) {
    // 小于 ~800KB 直接传；大图压缩
    if (!size || size < 800 * 1024) {
      this.uploadAndScan(filePath);
      return;
    }
    wx.compressImage({
      src: filePath,
      quality: 70,
      compressedWidth: 1500, // 菜单文字 1500px 宽足够识别
      success: (r) => this.uploadAndScan(r.tempFilePath),
      fail: () => this.uploadAndScan(filePath) // 压缩失败就传原图
    });
  },

  uploadAndScan(filePath) {
    this.setData({ scanning: true });
    wx.showLoading({ title: "AI 识别中...", mask: true });

    uploadFile("/menu/scan", filePath, "image")
      .then((menu) => {
        wx.hideLoading();
        this.setData({ scanning: false });
        // 存到全局，供菜单页使用
        getApp().globalData.currentMenu = menu;
        wx.navigateTo({
          url: `/pages/menu/menu?menuId=${menu.menu_id}`
        });
      })
      .catch((err) => {
        wx.hideLoading();
        this.setData({ scanning: false });
        wx.showToast({ title: err.message || "识别失败", icon: "none", duration: 2500 });
      });
  },

  goHistory() {
    wx.navigateTo({ url: "/pages/history/history" });
  }
});
