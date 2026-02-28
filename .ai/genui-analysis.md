# GenUI 协议与产品分析报告

*2026-02-28 | Momo for kenefe*

## 一、当前主要协议/方案

### 1. json-render (Vercel)

- **出品**: Vercel Labs (Guillermo Rauch)
- **状态**: 早期研究原型，已开源
- **核心思路**: LLM 生成 flat JSON spec → 前端用预注册组件渲染
- **数据格式**: `{ root: "id", elements: { id: { type, props, children } } }`
- **特点**:
  - Flat adjacency list（不是嵌套树），LLM 生成更容易
  - 组件注册制：开发者预定义组件集，LLM 只能用已注册的
  - 支持 React / React Native
  - 有 shadcn/ui 预置组件包
- **局限**: 无流式渲染、无状态管理、无事件回传机制

### 2. A2UI (Google)

- **出品**: Google
- **状态**: v0.8 稳定版，v0.9 草案中
- **核心思路**: JSONL 流式传输，UI 结构与数据分离，渐进式渲染
- **数据格式**: JSONL 流，四种消息类型：
  - `surfaceUpdate` — 组件定义
  - `dataModelUpdate` — 数据更新（不重发 UI 结构）
  - `beginRendering` — 通知客户端开始渲染
  - `deleteSurface` — 删除 UI 区域
- **特点**:
  - 流式设计（SSE），LLM 边生成边渲染
  - UI 结构和数据解耦：改文字不需要重发整个 UI
  - 平台无关：同一 spec 可渲染到 Flutter/Web/Native
  - Flat component list（同 json-render）
  - 有事件回传机制（通过 A2A 消息）
- **局限**: 复杂度高，需要完整的 surface/data model 管理

### 3. Open-JSON-UI (OpenAI)

- **出品**: OpenAI
- **状态**: 开放标准化中
- **核心思路**: 利用 Structured Outputs 保证 JSON schema 合规
- **数据格式**: 嵌套组件树 `{ type, properties, children }`
- **特点**:
  - 与 OpenAI Structured Outputs 深度绑定
  - Schema 约束保证 LLM 输出 100% 合法
  - 组件枚举：`div, button, header, section, field, form`
- **局限**: 组件集偏基础，强依赖 OpenAI 生态

### 4. MCP-UI (Shopify / MCP 官方)

- **出品**: Shopify 提出，MCP 官方采纳为 MCP Apps
- **状态**: 已进入 MCP 规范
- **核心思路**: MCP tool 返回 UI 资源，host 渲染
- **数据格式**: `UIResource { uri: "ui://...", mimeType, text/blob }`
- **特点**:
  - 嵌入 MCP 生态，tool call 直接返回 UI
  - 支持 HTML / Remote DOM / URI list 三种渲染模式
  - 模型在 loop 里：看到用户操作，继续响应
  - 适合电商等需要富交互的场景（Shopify 的产品卡片）
- **局限**: 依赖 MCP host 支持，渲染能力受 host 限制

### 5. AG-UI (CopilotKit)

- **出品**: CopilotKit
- **状态**: 开放协议，活跃开发中
- **核心思路**: Agent↔User 双向交互协议，GenUI 的传输层
- **定位**: 不是 UI spec 本身，而是承载各种 UI spec 的运行时协议
- **特点**:
  - 双向通信：agent 推 UI，用户事件回传 agent
  - 协议无关：可以承载 A2UI / Open-JSON-UI / MCP-UI / 自定义 spec
  - 提供统一的 agent↔app 连接层
- **局限**: 是胶水层不是 UI 层，本身不定义组件

### 6. Vercel AI SDK streamUI

- **出品**: Vercel
- **状态**: 生产可用
- **核心思路**: LLM 调用 tool → tool 返回 React Server Component → 流式推送到客户端
- **特点**:
  - 不走 JSON spec，直接返回 RSC（React Server Component）
  - 类型安全，组件就是代码
  - 流式渲染天然支持
  - 与 Next.js 深度集成
- **局限**: 强绑 React/Next.js，不跨平台

## 二、协议对比

| 维度 | json-render | A2UI | Open-JSON-UI | MCP-UI | AG-UI | streamUI |
|------|------------|------|-------------|--------|-------|----------|
| 出品方 | Vercel | Google | OpenAI | Shopify/MCP | CopilotKit | Vercel |
| 数据格式 | JSON | JSONL 流 | JSON | HTML/DOM | 事件流 | RSC |
| 流式渲染 | ✗ | ✓ | ✗ | ✓ | ✓ | ✓ |
| 事件回传 | ✗ | ✓(A2A) | ✗ | ✓ | ✓ | ✓(RSC) |
| 状态管理 | ✗ | ✓(dataModel) | ✗ | ✓ | ✓ | ✓(React) |
| 跨平台 | React/RN | 任意 | 任意 | MCP host | 任意 | React only |
| LLM 友好度 | 高(flat) | 高(flat+流) | 高(schema) | 中 | N/A | 低(代码) |
| 复杂度 | 低 | 高 | 低 | 中 | 中 | 中 |
| 成熟度 | 原型 | v0.8 稳定 | 早期 | 已入规范 | 活跃 | 生产级 |

## 三、能力边界分析

### GenUI 协议们能做什么

1. **声明式布局** — 卡片、列表、表单、文本、按钮等基础 UI 结构
2. **数据绑定** — 动态文本、列表渲染（A2UI 的 dataModel 最完善）
3. **简单交互** — 按钮点击、表单提交、单选/多选
4. **流式渲染** — 边生成边显示（A2UI、MCP-UI、streamUI）
5. **主题适配** — 客户端自定义组件样式（组件注册制）

### GenUI 协议们做不到什么（vs 传统 GUI）

1. **复杂布局系统** — 没有 CSS Grid/Flexbox 级别的精确布局控制，不支持 z-index 层叠、绝对定位、响应式断点
2. **动画与过渡** — 零动画能力。没有 transition、keyframe、手势驱动动画、弹簧物理。传统 GUI 的微交互全部缺失
3. **手势交互** — 不支持拖拽、缩放、旋转、长按、滑动等复杂手势。只有最基础的 click/tap
4. **实时状态同步** — 表单验证、输入联动、条件显隐、乐观更新等前端状态管理能力极弱。A2UI 的 dataModel 是最接近的，但远不如 React state
5. **富媒体** — 视频播放器、音频波形、地图、图表、3D 渲染等复杂媒体组件完全缺失
6. **无障碍** — ARIA 标签、焦点管理、键盘导航、屏幕阅读器支持基本为零
7. **性能优化** — 虚拟滚动、懒加载、代码分割、离屏渲染等传统 GUI 的性能手段不存在
8. **离线能力** — 所有方案都依赖服务端，断网即不可用
9. **撤销/重做** — 没有操作历史栈
10. **组件间通信** — 没有 props drilling、context、event bus 等组件通信机制

## 四、协议分层关系

```
┌─────────────────────────────────────────┐
│           用户看到的 UI                   │
├─────────────────────────────────────────┤
│  渲染层: React / Flutter / SwiftUI / Web │  ← 客户端实现
├─────────────────────────────────────────┤
│  UI Spec: json-render / A2UI /           │  ← 描述"长什么样"
│           Open-JSON-UI / MCP-UI          │
├─────────────────────────────────────────┤
│  传输层: AG-UI / SSE / WebSocket         │  ← 描述"怎么传"
├─────────────────────────────────────────┤
│  生成层: LLM (Claude/GPT/Gemini)         │  ← 描述"谁来想"
└─────────────────────────────────────────┘
```

关键洞察：
- json-render / A2UI / Open-JSON-UI 是同一层的竞品（UI Spec 层）
- AG-UI 是下面一层（传输层），可以承载上面任何一个 spec
- MCP-UI 横跨两层（既定义 spec 又定义传输）
- streamUI 是另一条路线，跳过 JSON spec 直接用代码组件

## 五、核心矛盾

**LLM 友好 vs UI 表达力，是所有 GenUI 协议的根本矛盾。**

- LLM 擅长生成：flat 结构、有限枚举、声明式描述
- 好的 UI 需要：精确布局、复杂状态、丰富交互、动画过渡

当前所有协议都选择了 LLM 友好一侧，牺牲了 UI 表达力。这不是 bug，是有意的 trade-off — 先让 LLM 能生成，再逐步扩展能力。

**三个演进方向正在浮现：**

1. **组件能力上移** — 把复杂交互封装进预注册组件（json-render 路线）。LLM 只说"我要一个日期选择器"，复杂逻辑在组件内部。瓶颈：组件集有限，LLM 不能发明新组件
2. **协议能力下沉** — 在协议层加状态管理和事件系统（A2UI 路线）。让 spec 本身能描述更复杂的行为。瓶颈：协议越复杂，LLM 越难生成正确的 spec
3. **混合渲染** — LLM 生成骨架，客户端补全细节（streamUI 路线）。用代码组件而非 JSON 描述。瓶颈：失去跨平台能力

## 六、对 GenUI Lab 的建议

### 短期（研究验证）
- 实现 A2UI 的流式渲染，对比 json-render 的一次性渲染体验差异
- 加入事件回传：按钮点击 → 通知 LLM → LLM 更新 UI（多轮对话编辑）
- 测试组件集边界：找到"LLM 能可靠生成的最复杂 UI"的天花板在哪

### 中期（能力扩展）
- 实现 dataModel 分离：UI 结构只发一次，后续只更新数据
- 加入条件渲染：`{ visible: "{{data.showDetails}}" }`
- 加入列表渲染：`{ type: "ForEach", data: "{{items}}", template: "..." }`
- 探索动画描述：能否用声明式 JSON 描述简单过渡？

### 长期（产品方向）
- GenUI 不会替代传统 GUI，但会成为 agent 交互的标准界面层
- 最终形态可能是：LLM 生成 80% 的 UI 骨架 + 开发者预置 20% 的复杂组件
- 关注 A2UI v0.9 和 MCP-UI 的演进，这两个最有可能成为事实标准
