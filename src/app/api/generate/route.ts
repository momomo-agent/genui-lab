import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `你是 GenUI 引擎。用户输入意图，你返回严格 JSON（不要 markdown）。

生成 json-render spec（flat format: root + elements map）。

可用组件：
- Card(title) — 卡片容器
- Stack(direction:vertical|horizontal, gap:sm|md|lg) — 布局
- Heading(text, level) — 标题
- Text(text, size:sm|md|lg, color:default|muted, weight:normal|semibold) — 文本
- Badge(text) — 标签
- Button(label, action) — 按钮
- Radio(name, options:[{label,value}]) — 单选
- Separator() — 分隔线
- Image(src, alt) — 图片占位
- Input(placeholder, type:text|number|email) — 输入框
- Toggle(label, checked:boolean) — 开关
- Progress(value:0-100, label) — 进度条

每个 element 必须有 type, props, children 三个字段。props 是对象。

返回格式：{"spec":{"root":"id","elements":{...}}}

设计原则：简洁实用，用 emoji 增加表现力，中文界面。`;

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { input } = await req.json();
    if (!input?.trim()) {
      return NextResponse.json({ error: "empty input" }, { status: 400 });
    }

    const baseUrl = process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com";
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";

    if (!apiKey) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 500 });
    }

    const res = await fetch(`${baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: input }],
      }),
    });

    const raw = await res.text();
    if (!res.ok) throw new Error(`API ${res.status}: ${raw.slice(0, 300)}`);

    const json = JSON.parse(raw);
    if (!json.content?.[0]?.text) throw new Error(`No content in response`);

    let text = json.content[0].text.trim();
    text = text.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
    const parsed = JSON.parse(text);

    return NextResponse.json(parsed);
  } catch (e: any) {
    return NextResponse.json({
      spec: {
        root: "err",
        elements: {
          err: { type: "Card", props: { title: "⚠️ 出错了" }, children: ["msg"] },
          msg: { type: "Text", props: { text: e.message || String(e), size: "md" }, children: [] },
        },
      },
    });
  }
}
