# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目定位

面向海外中文用户的 AI 菜单识别与点餐辅助微信小程序。核心目标：解决用户在非中文地区看不懂菜单、无法理解菜品、不会向服务员准确表达点餐需求的问题。

核心用户流程：拍照或上传菜单 → AI 结构化识别 → 双语菜单展示 → 用户选择菜品 → 添加备注 → 生成点菜单 → 展示给服务员。

## 核心原则

1. 优先复用成熟服务（OCR、LLM、翻译、汇率、TTS），不重复造轮子
2. MVP 先解决"拍菜单 → 翻译 → 选菜 → 给服务员看"闭环
3. AI 输出必须结构化，不能只返回自然语言
4. 所有涉及过敏原、忌口、价格、食材的信息都要标注不确定性（confidence score + risk notes）
5. 小程序端只做轻逻辑，复杂 AI 编排放后端
6. 所有菜单识别结果都要支持用户纠错
7. 弱网和海外场景必须优先考虑
8. 生成内容要适合直接展示给外国服务员，表达礼貌、清晰、无歧义

## 推荐技术栈

- 前端：Taro + React + TypeScript，Zustand 状态管理，TDesign MiniProgram 或 NutUI
- 后端：Node.js / NestJS，PostgreSQL，Redis，腾讯云 COS / Cloudflare R2
- AI：OCR 接入第三方 → 多模态 LLM 做结构化 + 翻译 → RAG 补充菜品解释
- 其他：汇率 API、微信同声传译 TTS

## MVP 范围

必须做：拍照上传 → 图片压缩 → OCR → LLM 结构化 + 翻译 → 双语菜单展示 → 选菜下单 → 双语点菜单（大字体） → 历史缓存。

暂不做：实时摄像头扫描、离线识别、复杂推荐、商家入驻、支付闭环、AR。

## AI 调用链

图片上传 → 图片压缩 → 图片质量检测 → OCR 初步识别 → LLM 修复 OCR 错误 → LLM 菜单结构化 → LLM 翻译菜名和描述 → RAG 补充常见菜品解释 → 汇率换算 → 返回前端菜单 JSON → 用户选择菜品 → LLM 生成服务员展示文本

## 菜品结构 JSON Schema

```json
{
  "menu_id": "string",
  "language": "string",
  "currency": "string",
  "categories": [
    {
      "category_id": "string",
      "original_name": "string",
      "translated_name": "string",
      "items": [
        {
          "item_id": "string",
          "original_name": "string",
          "translated_name": "string",
          "original_description": "string",
          "translated_description": "string",
          "explanation_zh": "string",
          "ingredients": ["string"],
          "allergens": [
            { "name": "string", "confidence": 0.8, "note": "string" }
          ],
          "taste_tags": ["辣", "甜", "酸", "油炸"],
          "cooking_method": "string",
          "spice_level": 0,
          "price": 12.5,
          "currency": "EUR",
          "cny_price": 98.2,
          "confidence_score": 0.86,
          "risk_notes": ["可能含乳制品"],
          "image_crop_url": "string"
        }
      ]
    }
  ]
}
```
