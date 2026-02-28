# GenUI Lab

LLM 驱动的生成式 UI 研究项目。输入意图，实时生成可交互界面。

## 核心思路

用户说一句话 → LLM 理解意图 → 生成 UI spec (JSON) → 前端实时渲染

不是模板匹配，不是 if/else 路由，是 LLM 根据语义直接生成界面结构。

## 运行

```bash
cp .env.example .env.local
# 填入 API key
npm install
npm run dev
```

## 技术栈

- Next.js 15 + React 19
- 自研轻量 GenUI Renderer（无外部 UI 库依赖）
- Anthropic Claude API

## 组件系统

Card, Stack, Heading, Text, Badge, Button, Radio, Separator, Image, Input, Toggle, Progress

所有组件通过 flat JSON spec 描述，渲染器递归解析。
