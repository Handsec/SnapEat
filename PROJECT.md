# MenuAI — AI 菜单识别与点餐辅助微信小程序

## 项目概述

面向海外中文用户的 AI 菜单识别与点餐助手。用户拍照菜单后，AI 自动识别文字、结构化菜品、翻译注释、换算价格，最终生成双语点菜单可直接出示给外国服务员。

**核心流程**: 拍照 → OCR → LLM 结构化 → 翻译 → 汇率换算 → 双语菜单 → 选菜 → 点菜单

---

## 技术架构

```
menu/
├── apps/
│   ├── api/          NestJS 后端 (port 3000)
│   ├── miniapp/      微信小程序 (原生 WXML/WXSS/JS)
│   └── playground/   AI 调试工作台 (Vite + React, port 5173)
├── packages/
│   ├── shared-types/ TypeScript 类型定义 + Zod 校验 Schema
│   ├── prompts/      AI Prompt 模板 (版本化)
│   └── ai-sdk/       LLM 调用封装 (OpenAI Provider + JSON 重试)
├── docker-compose.yml    PostgreSQL 15 + Redis 7
└── pnpm-workspace.yaml   Monorepo 声明
```

### 模块分层

| 层 | 位置 | 职责 |
|---|---|---|
| **类型层** | `packages/shared-types` | `MenuResult`, `MenuItem`, `Allergen` 等 TS 类型 + Zod schema，前后端共享 |
| **Prompt 层** | `packages/prompts` | OCR 修正 / 菜单结构化 / 翻译 / 点菜 四个 prompt，带版本号 |
| **AI SDK 层** | `packages/ai-sdk` | `LlmClient` 封装：JSON mode 调用 + Zod 校验 + 失败重试 + 多 Provider 抽象 |
| **API 层** | `apps/api` | NestJS REST API，编排完整 AI workflow |
| **小程序层** | `apps/miniapp` | 原生 WeChat Mini Program，纯 UI + 状态管理 |
| **调试层** | `apps/playground` | Vite + React，可视化测试 AI 链路、查看/编辑 Prompt |

---

## 后端 API

### 基础服务

| 服务 | 端口 | 启动 |
|---|---|---|
| PostgreSQL | 5432 | `docker compose up -d` |
| Redis | 6379 | 同上 |
| NestJS | 3000 | `pnpm dev:api` |

### API 端点

| 方法 | 路径 | 说明 |
|---|---|---|
| `POST` | `/api/menu/scan` | 上传菜单图片，返回结构化 MenuResult JSON |
| `GET` | `/api/menu/history` | 历史菜单列表（分页） |
| `GET` | `/api/menu/:id` | 查询单条菜单详情 |
| `DELETE` | `/api/menu/:id` | 删除历史记录（级联删除关联订单） |
| `POST` | `/api/order/generate` | 根据已选菜品生成双语点菜单 |
| `GET` | `/api/exchange/rate` | 汇率查询（Redis 缓存 1 小时） |

### AI 调用链

```
图片上传 → UploadService (COS)
  → OcrService (OCR 识别)
  → LlmClient (OCR 文本纠错) 
  → LlmClient (菜单结构化, Zod 校验)
  → TranslateService (逐项翻译)
  → ExchangeService (价格换算)
  → Prisma 持久化
  → 返回 MenuResult JSON
```

当未配置 `OPENAI_API_KEY` 时，自动降级为 Mock 数据（7 道菜，3 个分类）。

### 数据库模型 (Prisma)

- **MenuScan** — 菜单扫描记录（图片 URL、OCR 原文、结构化 JSON、语言、货币）
- **OrderSheet** — 点菜单记录（关联 MenuScan、双语文案、金额）

---

## 小程序页面

### 首页 `pages/index/index`

- 🌍 旋转轨道 + 漂浮食物粒子 + 脉冲光点网格背景
- 品牌字标 "MenuAI"
- 三步引导卡片（毛玻璃效果 + 错落入场动画）
- 拍照按钮（橙红渐变 + 光晕呼吸动效）
- 历史记录入口

### 菜单页 `pages/menu/menu`

- 药丸式分类标签（带数量 + 缩放选中动效）
- 食物卡片（渐变色图片区 + 辣度角标 + AI 置信度标签）
- 点击展开/收起详情（菜品解释、食材、过敏原、风险提示）
- 圆形加/减按钮（橙色主色调、按压缩放反馈）
- 底部深色悬浮栏（选中计数徽章 + 脉冲动画）
- 每道菜单独存储 `_selections`（切换菜单不串数据）

### 点菜单 `pages/order/order`

- 普通模式：卡片式双语展示（English / 中文），纸条锯齿装饰
- 大字体模式：全屏粗黑卡片，字号 52rpx，适合直接给服务员看
- 底部操作：大字体模式 / 返回修改
- Ripple 加载动画

### 历史记录 `pages/history/history`

- 列表式展示（语言、菜品数、时间）
- 点击进入对应菜单
- 右滑/点击删除按钮（确认弹窗后调用 DELETE API）

### 全局状态

通过 `getApp().globalData` 管理：
- `_selections[menuId]` — 每个菜单独立的选菜数据
- `currentMenu` — 当前查看的菜单
- `apiBase` — API 地址

---

## 常用命令

```bash
# 基础环境
docker compose up -d              # 启动 PostgreSQL + Redis
pnpm install                       # 安装所有依赖

# 后端开发
pnpm dev:api                       # NestJS watch 模式 (localhost:3000)
pnpm db:migrate                    # Prisma 数据库迁移

# 小程序开发
pnpm build:miniapp                 # 编译 Taro → dist/ 输出

# Playground
pnpm dev:playground                # Vite dev server (localhost:5173)

# 共享包编译
pnpm build:shared                  # 编译 shared-types/prompts/ai-sdk
```

---

## 配置项

`apps/api/.env` 关键变量：

| 变量 | 说明 |
|---|---|
| `DATABASE_URL` | PostgreSQL 连接字符串 |
| `REDIS_URL` | Redis 连接字符串 |
| `OPENAI_API_KEY` | OpenAI API Key（为空时使用 Mock 数据） |
| `OPENAI_BASE_URL` | 自定义 API 端点（兼容国内中转） |
| `OPENAI_MODEL` | 模型名称，默认 `gpt-4o` |
| `COS_SECRET_ID/KEY` | 腾讯云 COS（图片存储） |

---

## 设计规范

- **色彩**: 暖橙主色 `#f05a28`，深色文字 `#1a1a1a`，浅灰背景 `#faf9f7`
- **字体**: SF Pro Display / PingFang SC，字重 400/500/600/700/800/900
- **圆角**: 卡片 20-24rpx，按钮 28-32rpx，标签 8rpx
- **动效**: 轨道旋转/粒子浮动/卡片滑入/缩放反馈/脉冲徽章/涟漪按钮
- **间距**: 24-32rpx 内边距，14-20rpx 卡片间距
