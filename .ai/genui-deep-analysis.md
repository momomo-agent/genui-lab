# GenUI 协议与产品深度分析报告

*2026-02-28 | Momo for kenefe*
*基于源码、官方文档、Spec 原文的一手调研*

---

## 一、协议全景：谁在做，做到什么程度了

当前 GenUI 领域有 6 个主要方案，分属三个层次。不是竞品关系，而是分层互补。

### 分层架构

```
┌─────────────────────────────────────────────┐
│  渲染层: React / Flutter / SwiftUI / Web     │  ← 你的组件代码
├─────────────────────────────────────────────┤
│  UI Spec 层:                                 │
│    json-render (Vercel)                      │  ← "长什么样"
│    A2UI (Google)                             │
│    Open-JSON-UI (OpenAI)                     │
├─────────────────────────────────────────────┤
│  传输层:                                     │
│    AG-UI (CopilotKit)                        │  ← "怎么传"
│    SSE / WebSocket / A2A                     │
├─────────────────────────────────────────────┤
│  生成层: LLM (Claude / GPT / Gemini)         │  ← "谁来想"
└─────────────────────────────────────────────┘

特殊路线:
  MCP-UI (Shopify) — 横跨 Spec + 传输两层
  streamUI (Vercel AI SDK) — 跳过 JSON spec，直接用 RSC
```

---

## 二、六大方案逐个拆解

### 1. json-render (Vercel Labs)

**出品**: Vercel Labs, Guillermo Rauch 主导
**状态**: 开源，11k stars，活跃开发中
**包生态**: core / react / vue / react-native / remotion(视频) / react-pdf / image(OG图) / shadcn(36个预置组件) / redux+zustand+jotai+xstate(状态适配器)

**核心架构**: Catalog → Spec → Registry → Renderer

```
开发者定义 Catalog (组件+动作的 schema)
    ↓
LLM 生成 Spec (flat JSON, 受 catalog 约束)
    ↓
Registry 映射 (catalog type → 真实组件)
    ↓
Renderer 渲染 (自动解析 spec → 调用组件)
```

**Spec 格式** (flat adjacency list):
```json
{
  "root": "card-1",
  "elements": {
    "card-1": {
      "type": "Card",
      "props": { "title": "Hello" },
      "children": ["btn-1"]
    },
    "btn-1": {
      "type": "Button",
      "props": { "label": "Click" },
      "children": []
    }
  }
}
```

**五大能力（比想象中强）**:

1. **流式渲染** — SpecStream 格式，JSONL + RFC 6902 JSON Patch。LLM 边生成边渲染，每行是一个 patch 操作（add/remove/replace/move/copy）
2. **数据绑定** — `$state`(读状态)、`$item`(循环项)、`$index`(循环索引)、`$bindState`(双向绑定)、`$template`(模板字符串)、`$computed`(计算值)
3. **条件可见性** — `visibility` 字段支持 `$state`/`$item`/`$index` 条件，支持 eq/neq/gt/gte/lt/lte 比较，支持 AND/OR 组合，支持 not 取反
4. **循环渲染** — `repeat` 字段，指定 statePath 和 key，自动遍历数组渲染子组件
5. **Action 系统** — catalog 声明 action，registry 实现 handler，组件通过 `emit("press")` 触发。handler 接收 `(params, setState, state)`，可以修改状态

**状态管理适配器**: 内置 StateStore，也可以接入 Redux / Zustand / Jotai / XState

**跨平台**: React(Web) / Vue / React Native(Mobile) / Remotion(Video) / react-pdf(PDF) / Satori(Image)

**局限**:
- 无动画/过渡描述能力
- 无手势交互（只有 click/press）
- 无布局系统（依赖组件内部实现）
- Action 是声明式的，不能描述复杂业务逻辑流

---

### 2. A2UI (Google)

**出品**: Google
**状态**: v0.8 稳定版(生产推荐)，v0.9 草案中
**仓库**: github.com/google/A2UI

**核心哲学**: 三层解耦 — Component Tree(结构) + Data Model(状态) + Widget Registry(渲染)

**v0.8 消息类型** (JSONL 流):
- `surfaceUpdate` — 组件定义（flat list，同 json-render）
- `dataModelUpdate` — 只更新数据，不重发 UI 结构
- `beginRendering` — 通知客户端开始渲染
- `deleteSurface` — 删除 UI 区域

**v0.9 重大变化**:
- 从 Structured Output 优化转向 "prompt-first" — schema 直接嵌入 prompt，LLM 按示例生成
- 消息类型重命名: `createSurface` / `updateComponents` / `updateDataModel` / `deleteSurface`
- Schema 拆分为三个独立文件: common_types.json / basic_catalog.json / server_to_client.json
- 引入 DynamicString/DynamicNumber/DynamicBoolean — 属性可以是字面值、JSON Pointer 路径、或函数调用

**传输无关**: A2UI 不绑定传输层，可以跑在:
- A2A (Agent-to-Agent) — Google 自家 agent 通信协议
- AG-UI (CopilotKit) — 通用 agent↔user 协议
- MCP — 作为 tool output 或 resource subscription
- SSE + JSON RPC — 标准 Web 方案
- WebSocket — 双向实时
- REST — 简单场景（无流式）

**事件回传**: 用户操作通过 A2A 消息回传 server，两种类型:
- `userAction` — 用户触发的动作
- `error` — 客户端错误

**vs json-render**:
- A2UI 的 dataModel 分离更彻底（改数据不重发结构）
- A2UI 有 surface 概念（多区域 UI），json-render 只有单 root
- A2UI 传输无关，json-render 绑 React/Vue 生态
- json-render 的数据绑定表达式更丰富（$computed, $template, $cond）
- json-render 有成熟的组件库（36个 shadcn），A2UI 只定义协议不提供组件

**局限**:
- 复杂度高，实现一个完整的 A2UI 客户端工作量大
- 无动画/手势
- v0.9 放弃 Structured Output 约束，LLM 输出合法性需要后验证

---

### 3. Open-JSON-UI (OpenAI)

**出品**: OpenAI
**状态**: 开放标准化中，从内部 schema 演化而来

**核心思路**: 利用 Structured Outputs 保证 JSON 100% 合法

```json
{
  "type": "card",
  "properties": {
    "title": "Data Visualization",
    "content": { ... }
  }
}
```

**组件枚举**: `div, button, header, section, field, form`（偏基础）

**关键优势**: Schema 约束 = 零幻觉。LLM 不可能生成不存在的组件类型。这是 A2UI v0.9 主动放弃的能力。

**局限**:
- 组件集最基础，表达力最弱
- 无流式渲染
- 无状态管理
- 无事件回传
- 强依赖 OpenAI 生态（Structured Outputs 是 OpenAI 特有能力）

---

### 4. MCP-UI (Shopify → MCP 官方)

**出品**: Shopify 提出，已进入 MCP 规范（MCP Apps）
**状态**: 生产使用中（Shopify 自家电商 agent）
**规范**: mcpui.dev + modelcontextprotocol.io

**核心思路**: MCP tool 返回不只是数据，还返回可交互的 UI 资源

**三种渲染模式**:
1. **Inline HTML** — srcDoc 嵌入 sandboxed iframe
2. **Remote Resource** — URL 加载到 sandboxed iframe
3. **Remote DOM** — Shopify 自研的客户端直接渲染方案

**Intent 系统**（最独特的设计）:
组件不直接修改状态，而是冒泡 intent 给 agent 解释：
- `view_details` — 用户想看详情
- `checkout` — 用户准备结账
- `notify` — 组件执行了动作（如购物车更新）
- `ui-size-change` — 组件需要调整尺寸

这保证了 agent 始终在 loop 里，看到用户操作并决定下一步。

**自适应样式**: 通过 render data 传入 CSS，组件适配宿主环境的品牌风格。

**vs 其他方案的本质区别**:
MCP-UI 不是让 LLM 生成 UI spec，而是让 MCP server（开发者写的）返回完整的 UI 组件。LLM 的角色是决定"调用哪个 tool"，而不是"生成什么 UI"。这意味着 UI 质量完全由开发者控制，不受 LLM 生成能力限制。

**局限**:
- 依赖 MCP host 支持渲染（目前只有少数 host 支持）
- iframe 隔离带来通信开销
- 不是真正的"生成式"UI — 更像是"选择式"UI

---

### 5. AG-UI (CopilotKit)

**出品**: CopilotKit
**状态**: 开放协议，活跃开发中
**定位**: Agent↔User 双向交互的传输层协议，不是 UI spec

**关键洞察**: AG-UI 不定义"UI 长什么样"，它定义"agent 和 app 之间怎么通信"。它可以承载任何 UI spec（A2UI / Open-JSON-UI / MCP-UI / 自定义）。

**CopilotKit 的三层 GenUI 模型**:
1. **Static GenUI** (高控制/低自由) — `useFrontendTool` hook，agent 只选组件+填数据
2. **Declarative GenUI** (共享控制) — agent 返回 A2UI/Open-JSON-UI spec，前端渲染
3. **Open-ended GenUI** (低控制/高自由) — MCP Apps，agent 返回完整 UI surface

**局限**:
- 是胶水层，本身不提供 UI 能力
- 依赖 CopilotKit 生态

---

### 6. Vercel AI SDK streamUI

**出品**: Vercel
**状态**: 生产级，广泛使用

**核心思路**: 完全不走 JSON spec。LLM 调用 tool → tool 函数返回 React Server Component → RSC 流式推送到客户端。

**本质区别**: 其他方案都是"LLM 生成数据描述，前端解释渲染"。streamUI 是"LLM 选择代码组件，服务端直接渲染"。

**优势**:
- 类型安全（组件就是 TypeScript 代码）
- 流式天然支持（RSC streaming）
- 无 JSON 解析/验证开销
- 组件能力无上限（就是普通 React 组件）

**局限**:
- 强绑 React + Next.js
- 不跨平台
- LLM 不"生成"UI，只"选择"预定义的 tool/组件

---

## 三、能力矩阵（修正版）

| 能力 | json-render | A2UI v0.8 | A2UI v0.9 | Open-JSON-UI | MCP-UI | streamUI |
|------|:-----------:|:---------:|:---------:|:------------:|:------:|:--------:|
| 流式渲染 | ✓ JSONL Patch | ✓ JSONL | ✓ JSON流 | ✗ | ✓ | ✓ RSC |
| 数据绑定 | ✓✓ 6种表达式 | ✓ dataModel | ✓ Dynamic* | ✗ | N/A | ✓ React |
| 双向绑定 | ✓ $bindState | ✗ | ✓ | ✗ | N/A | ✓ React |
| 条件渲染 | ✓ visibility | ✗ | ✓ | ✗ | N/A | ✓ 代码 |
| 循环渲染 | ✓ repeat | ✗ | ✓ | ✗ | N/A | ✓ 代码 |
| 事件回传 | ✓ action/emit | ✓ A2A msg | ✓ A2A msg | ✗ | ✓ intent | ✓ RSC |
| 状态管理 | ✓✓ 5种适配器 | ✓ dataModel | ✓ dataModel | ✗ | ✓ | ✓ React |
| Schema约束 | ✓ Zod catalog | ✓ structured | ✗ prompt-first | ✓✓ | N/A | ✓ TS |
| 跨平台 | ✓ 6个渲染器 | ✓ 任意 | ✓ 任意 | ✓ 任意 | △ host | ✗ React |
| 预置组件 | ✓ 36个shadcn | ✗ | ✗ | ✗ | ✓ 开发者 | ✓ 开发者 |
| 动画 | ✗ | ✗ | ✗ | ✗ | △ iframe内 | ✓ 代码 |
| 手势 | ✗ | ✗ | ✗ | ✗ | △ iframe内 | ✓ 代码 |

---

## 四、核心矛盾与设计取舍

### 矛盾一：LLM 友好 vs UI 表达力

这是所有 GenUI 协议的根本张力。

**LLM 擅长生成的**: flat 结构、有限枚举、声明式描述、短 token 序列
**好的 UI 需要的**: 精确布局、复杂状态机、丰富交互、动画过渡、手势响应

各方案的取舍位置：

```
LLM 友好 ◄──────────────────────────────► UI 表达力

Open-JSON-UI   json-render   A2UI v0.9   MCP-UI   streamUI
(最约束)        (平衡点)      (偏表达)    (全能力)  (全能力)
```

### 矛盾二：生成式 vs 选择式

仔细看会发现，"Generative UI" 这个名字有误导性。真正让 LLM "生成" UI 结构的只有三个：json-render、A2UI、Open-JSON-UI。

- **streamUI**: LLM 选择调用哪个 tool，tool 返回预写好的 React 组件。LLM 不生成 UI，只做路由。
- **MCP-UI**: MCP server 返回预写好的 UI 组件。LLM 决定调用哪个 tool，但 UI 是开发者写的。
- **Static GenUI (CopilotKit)**: 同上，`useFrontendTool` 绑定预定义组件。

所以实际上是两条路线：
1. **真生成**: LLM 输出 UI 结构描述 → 客户端解释渲染（json-render / A2UI / Open-JSON-UI）
2. **伪生成**: LLM 选择预定义组件 → 填入数据（streamUI / MCP-UI / Static GenUI）

"伪生成"的 UI 质量上限更高（开发者完全控制），但灵活性低（LLM 不能发明新界面）。
"真生成"的灵活性高（每次请求可以产生不同布局），但质量受 LLM 能力限制。

### 矛盾三：Schema 约束 vs Prompt 自由

A2UI v0.8→v0.9 的演进暴露了一个关键分歧：

- **v0.8**: 用 Structured Output 约束 LLM，保证输出 100% 合法。但 schema 受限于 structured output 格式的表达力。
- **v0.9**: 放弃 structured output，把 schema 嵌入 prompt，让 LLM "按示例生成"。Schema 更丰富了，但需要后验证。

json-render 用 Zod schema 定义 catalog，走的是约束路线。
Open-JSON-UI 用 OpenAI Structured Outputs，走的也是约束路线。

**Google 选择放弃约束，说明他们认为表达力比合法性更重要。** 这是一个值得关注的信号。

---

## 五、vs 传统 GUI：缺什么，为什么缺

### 已经有的（比想象中多）

| 能力 | 传统 GUI | GenUI 现状 | 差距 |
|------|---------|-----------|------|
| 声明式布局 | Flexbox/Grid/Auto Layout | Flat component tree | 有，但粗糙 |
| 数据绑定 | React state / SwiftUI @State | json-render $state 6种表达式 | 接近 |
| 条件渲染 | if/else, v-if, @ViewBuilder | json-render visibility | 接近 |
| 循环渲染 | map, v-for, ForEach | json-render repeat | 接近 |
| 事件处理 | onClick, onTap | action/emit, A2A userAction | 基础够用 |
| 双向绑定 | v-model, @Binding | json-render $bindState | 有 |
| 流式更新 | WebSocket, SSE | SpecStream, JSONL | 有 |

### 真正缺的（短期难补）

**1. 精确布局系统**
传统 GUI 有 CSS Grid、Flexbox、Auto Layout、ConstraintLayout。GenUI 只有"把组件放进容器"，没有间距、对齐、响应式断点的精确控制。json-render 的 Stack 组件有 direction/gap，但远不如 CSS Grid 的 12 列布局。

**2. 动画与过渡**
零。没有 transition、keyframe、spring physics、手势驱动动画。这是最大的体验差距。一个没有动画的 UI 感觉像 2005 年的网页。

**3. 复杂手势**
只有 click/tap。没有拖拽、缩放、旋转、长按、滑动、惯性滚动。触屏设备上的体验会很差。

**4. 状态机与业务逻辑**
json-render 的 action handler 可以 setState，但不能描述"如果用户选了 A 则显示 B 否则显示 C 并且 3 秒后自动跳转 D"这种复杂流程。传统 GUI 有 XState、Redux saga、SwiftUI 的 task/onChange。

**5. 富媒体组件**
视频播放器、音频波形、地图、图表（ECharts/D3）、3D 渲染（Three.js）、代码编辑器（Monaco）。这些在传统 GUI 里是成熟的第三方库，GenUI 里完全缺失。理论上可以封装成预注册组件，但 LLM 不知道怎么配置它们的复杂参数。

**6. 无障碍（Accessibility）**
ARIA 标签、焦点管理、键盘导航、屏幕阅读器支持。GenUI spec 里没有任何无障碍相关的字段。这不是"以后加"的问题，是架构层面的缺失。

**7. 性能优化**
虚拟滚动（万级列表）、懒加载、代码分割、离屏渲染、GPU 加速。传统 GUI 框架花了十年优化这些，GenUI 从零开始。

**8. 离线能力**
所有方案都依赖服务端 LLM。断网 = 无 UI。传统 GUI 的 PWA/本地缓存/离线优先架构在 GenUI 里不存在。

---

## 六、谁会赢？趋势判断

**短期赢家（2026）: json-render**
- 最完整的开发者体验：catalog → spec → registry → renderer 一条龙
- 36 个 shadcn 预置组件，开箱即用
- 6 个渲染器覆盖 Web/Mobile/Video/PDF/Image
- Vercel 生态加持，Next.js 用户天然迁移
- 数据绑定和状态管理已经接近传统框架水平

**中期标准（2027）: A2UI**
- Google 背书，传输无关设计最有可能成为行业标准
- v0.9 的 prompt-first 方向说明 Google 在押注 LLM 能力持续提升
- 与 A2A（Agent-to-Agent）协议配合，覆盖 agent 全链路
- 但实现复杂度高，需要成熟的客户端 SDK 才能普及

**暗马: MCP-UI**
- 借 MCP 生态的分发优势（每个 MCP server 都可以返回 UI）
- Shopify 的电商场景证明了"开发者写组件 + LLM 选组件"模式的可行性
- Intent 系统设计优雅，保证 agent 始终在 loop 里
- 但"伪生成"的本质限制了灵活性

**不会赢: Open-JSON-UI**
- 组件集太基础，表达力最弱
- 强绑 OpenAI 生态，其他 LLM 用不了 Structured Outputs
- 没有流式、没有状态、没有事件——功能最少

---

## 七、GenUI Lab 的研究方向

基于以上分析，GenUI Lab 作为独立研究项目，有几个值得深挖的方向：

### 方向 1：LLM 生成 UI 的复杂度天花板

**核心问题**: LLM 能可靠生成多复杂的 UI？

实验设计：
- 定义 10 个递增复杂度的 UI 任务（从单卡片到多步表单到仪表盘）
- 每个任务跑 20 次，统计"可用率"（渲染成功 + 交互正确）
- 对比不同模型（Claude / GPT / Gemini）的天花板差异
- 对比有无 schema 约束的差异

预期发现：复杂度到某个点后可用率会断崖下降，这个点就是"真生成"的实际边界。

### 方向 2：动画描述层

**核心问题**: 能否用声明式 JSON 描述 UI 过渡动画？

这是所有 GenUI 协议的最大空白。可以探索：
```json
{
  "type": "Card",
  "transition": {
    "enter": { "from": { "opacity": 0, "y": 20 }, "duration": 300, "easing": "ease-out" },
    "exit": { "to": { "opacity": 0 }, "duration": 200 }
  }
}
```
难点在于：LLM 能否可靠生成合理的动画参数？还是说动画应该由客户端预设，LLM 只选择"fade-in"/"slide-up"这种语义标签？

### 方向 3：多轮 UI 编辑

**核心问题**: 用户能否通过对话迭代修改已生成的 UI？

场景：
1. 用户："帮我做个咖啡点单"→ LLM 生成 UI
2. 用户："把杯型改成下拉菜单"→ LLM 生成 patch，只改变化的部分
3. 用户："加个备注输入框"→ LLM 追加组件

这需要：
- UI spec 的 diff/patch 能力（json-render 的 SpecStream 已经支持 RFC 6902 patch）
- LLM 理解当前 UI 状态（把当前 spec 放进 context）
- 增量更新而非全量重生成

### 方向 4：混合架构（真生成 + 伪生成）

**核心问题**: 能否让 LLM 生成布局骨架，同时引用预注册的复杂组件？

```json
{
  "root": "page",
  "elements": {
    "page": { "type": "Stack", "children": ["header", "map", "list"] },
    "header": { "type": "Text", "props": { "text": "附近的咖啡店" } },
    "map": { "type": "@MapView", "props": { "center": "current", "zoom": 14 } },
    "list": { "type": "Stack", "repeat": { "statePath": "/shops" }, "children": ["card"] },
    "card": { "type": "@ShopCard", "props": { "name": { "$item": "name" } } }
  }
}
```

`@MapView` 和 `@ShopCard` 是预注册的复杂组件（有动画、手势、富媒体），LLM 只负责组合和布局。这可能是"真生成"和"伪生成"的最佳结合点。

---

## 八、结论

**GenUI 不是一个协议之争，是一个分层生态在形成。**

json-render 做得最完整（spec + 渲染 + 状态 + 组件库），是当前最实用的选择。A2UI 设计最优雅（传输无关 + 数据分离），最有可能成为行业标准。MCP-UI 借 MCP 生态有天然分发优势。三者不矛盾——A2UI 定义协议，json-render 提供实现，MCP-UI 提供分发渠道。

**跟传统 GUI 比，GenUI 在数据绑定和条件渲染上已经接近，但在动画、手势、布局精度、无障碍、性能优化上差距巨大。** 这些差距不是协议层能解决的，需要客户端渲染层的成熟。

**最值得研究的问题不是"哪个协议好"，而是"LLM 能可靠生成多复杂的 UI"。** 这个天花板决定了"真生成"路线的实际价值。如果天花板很低，那 MCP-UI 的"伪生成"路线反而是正确答案。
