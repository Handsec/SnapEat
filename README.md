# SnapEat (MenuAI)

面向海外中文用户的 AI 菜单识别与点餐辅助微信小程序。

拍照菜单 → OCR → LLM 结构化 → 翻译 → 汇率换算 → 双语菜单 → 选菜 → 生成可直接出示给服务员的双语点菜单。

> 更详细的产品与架构说明见 [`PROJECT.md`](./PROJECT.md)。

## 技术栈

- **后端**：NestJS + Prisma + PostgreSQL + Redis
- **小程序**：原生微信小程序（WXML / WXSS / JS）
- **调试台**：Vite + React（playground）
- **共享包**：shared-types（类型 + Zod）、prompts、ai-sdk
- **Monorepo**：pnpm workspace

## 环境要求

- Node.js >= 18
- pnpm >= 8（`npm i -g pnpm`）
- Docker（用于本地 PostgreSQL + Redis）
- 微信开发者工具（调试小程序）

## 快速开始（clone 后照此操作）

```bash
# 1. 安装依赖
pnpm install

# 2. 配置后端环境变量
cp apps/api/.env.example apps/api/.env
#   按需填写 OPENAI_API_KEY / COS_* 等。
#   OPENAI_API_KEY 留空时后端自动使用 Mock 数据，可直接跑通流程。

# 3. 启动基础服务（PostgreSQL + Redis）
pnpm docker:up

# 4. 初始化数据库
pnpm db:migrate

# 5. 启动后端 API（http://localhost:3000）
pnpm dev:api
```

小程序端：用微信开发者工具打开 `apps/miniapp` 目录即可。

## 常用命令

| 命令 | 说明 |
|---|---|
| `pnpm dev:api` | 启动 NestJS 后端（watch 模式） |
| `pnpm dev:playground` | 启动 AI 调试台（http://localhost:5173） |
| `pnpm build:shared` | 编译共享包 |
| `pnpm db:migrate` | Prisma 数据库迁移 |
| `pnpm db:studio` | 打开 Prisma Studio |
| `pnpm docker:up` / `pnpm docker:down` | 启停 PostgreSQL + Redis |

## 说明

- `apps/api/.env` 含密钥，已被 `.gitignore` 排除，不会进入仓库。clone 后需自行创建。
- `project.private.config.json`（微信开发者工具私有配置）同样被忽略。
