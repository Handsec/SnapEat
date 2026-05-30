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

## 小程序端（微信开发者工具）

小程序是这个项目的主体，需在**微信开发者工具**里运行。

1. 打开微信开发者工具 → **导入项目**
2. **目录**选择 `apps/miniapp`（注意：是这个子目录，不是仓库根目录）
3. **AppID** 填 `wxffa775ca6d100298`（你自己的账号可改成自己的 AppID）
4. 导入后即可在模拟器中预览

### 连接后端 API

小程序通过 `apps/miniapp/app.js` 里的 `globalData.apiBase` 连接后端，需按你的调试方式修改：

| 调试方式 | `apiBase` 设置 | 备注 |
|---|---|---|
| 模拟器本地调试 | `http://localhost:3000/api` | 后端跑在本机即可 |
| 真机调试 | `http://<电脑局域网IP>:3000/api` | 手机与电脑连同一 WiFi，IP 如 `192.168.1.172` |

> 用 `http` 或局域网 IP 时，需在开发者工具右上角 **详情 → 本地设置** 勾选
> **「不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书」**，否则请求会被拦截。
> 正式发布时后端要换成 **HTTPS 合法域名**，并在小程序后台配置 request 合法域名。

> `apps/miniapp/project.private.config.json`（开发者工具私有配置）已被 `.gitignore` 忽略，
> 每个人导入项目后由工具自动生成，不进仓库。

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
