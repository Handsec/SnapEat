// 统一请求封装：自动拼接 apiBase、解析 { success, data, error } 信封
function getBase() {
  return getApp().globalData.apiBase;
}

// 普通 JSON 请求
function request(path, options = {}) {
  const { method = "GET", data = {}, header = {} } = options;
  return new Promise((resolve, reject) => {
    wx.request({
      url: getBase() + path,
      method,
      data,
      header: { "content-type": "application/json", ...header },
      success: (res) => {
        const body = res.data;
        if (body && body.success) {
          resolve(body.data);
        } else {
          const err = (body && body.error) || { message: "请求失败" };
          reject(new Error(err.message || "请求失败"));
        }
      },
      fail: (e) => reject(new Error(e.errMsg || "网络错误")),
    });
  });
}

// 上传文件（multipart）—— 用于菜单图片扫描
function uploadFile(path, filePath, name = "image") {
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: getBase() + path,
      filePath,
      name,
      timeout: 120000, // 真机大图 + AI 识别耗时，放宽到 120s
      success: (res) => {
        let body;
        try {
          body = JSON.parse(res.data);
        } catch (e) {
          reject(new Error("响应解析失败"));
          return;
        }
        if (body && body.success) {
          resolve(body.data);
        } else {
          const err = (body && body.error) || { message: "上传失败" };
          reject(new Error(err.message || "上传失败"));
        }
      },
      fail: (e) => reject(new Error(e.errMsg || "上传失败")),
    });
  });
}

module.exports = { request, uploadFile };
