// Vercel Edge Runtime — /api/generate
// SSE streaming for GenUI spec generation

export const config = { runtime: 'edge' }

const ANTHROPIC_BASE_URL = 'https://code.newcli.com/claude/aws'
const ANTHROPIC_API_KEY = 'sk-ant-oat01-3WzGV9aOWyGZTVnUu4LVnuyNFn5Au2EAGDfXhRybBZlc2pD5v7rjUBhcCJgWEiCzPLxWk6DI3r73hq-kd2ihX9rvFqJ_QAA'
const ANTHROPIC_MODEL = 'claude-opus-4-6'

const SYSTEM_PROMPT = `你是 GenUI 引擎。用户输入意图，你返回严格 JSON（不要 markdown、不要代码块）。

生成 json-render 风格的 spec（flat format: root + elements map）。

可用组件：
- Card(title, description?) — 卡片容器，可嵌套子组件
- Stack(direction:vertical|horizontal, gap:xs|sm|md|lg|xl, align?:start|center|end|stretch, wrap?:boolean) — 弹性布局
- Heading(text, level:1|2|3|4) — 标题
- Text(text, size:xs|sm|md|lg, color:default|muted|accent|success|warning|error, weight:normal|medium|semibold|bold) — 文本
- Badge(text, variant:default|success|warning|error|info|outline) — 标签
- Button(label, action?, variant:primary|secondary|outline|ghost|danger, size:sm|md|lg, icon?) — 按钮
- Radio(name, options:[{label,value}], defaultValue?) — 单选组
- Checkbox(name, options:[{label,value,checked?}]) — 多选组
- Select(name, placeholder?, options:[{label,value}], defaultValue?) — 下拉选择
- Input(name?, placeholder?, type:text|number|email|password|url, label?, defaultValue?) — 输入框
- Textarea(name?, placeholder?, rows?:number, label?) — 多行输入
- Toggle(label, checked?:boolean, description?) — 开关
- Slider(label, min:number, max:number, step?:number, defaultValue?:number, unit?) — 滑块
- Progress(value:0-100, label?, variant:default|success|warning|error) — 进度条
- Image(src, alt?, width?, height?, rounded?:boolean) — 图片
- Avatar(src?, name, size:sm|md|lg) — 头像
- Separator(label?) — 分隔线，可带文字
- Alert(title, message, variant:info|success|warning|error) — 提示框
- Stat(label, value, change?, changeType?:up|down|neutral, icon?) — 数据指标
- Table(columns:[{key,label,align?}], rows:[Record<string,string|number>]) — 数据表格
- Tabs(tabs:[{label,value}], defaultValue?) — 标签页容器（children 对应每个 tab 内容）
- Accordion(items:[{title,content}]) — 折叠面板
- Rating(value:1-5, max?:number, label?) — 评分
- Tag(items:[{text, color?}]) — 标签组
- Stepper(steps:[{label,description?,status:done|active|pending}]) — 步骤条
- Divider() — 纯分隔线
- Spacer(size:sm|md|lg|xl) — 间距占位
- Code(code, language?) — 代码块
- Quote(text, author?) — 引用块
- Metric(label, value, prefix?, suffix?, trend?:up|down|flat) — 指标卡

每个 element 必须有 type, props, children 三个字段。children 是 string[]（子元素 ID 列表）。

返回格式：{"spec":{"root":"id","elements":{...}}}

设计原则：
1. 布局合理，善用 Stack 的 direction/gap/align 控制排版
2. 信息层次清晰，用 Heading/Text/Badge/Separator 建立视觉层级
3. 交互丰富，根据场景选择最合适的输入控件
4. 用 emoji 增加表现力
5. 中文界面`

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type' },
    })
  }
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const { input } = await req.json()
  if (!input?.trim()) return new Response(JSON.stringify({ error: 'empty input' }), { status: 400 })

  const base = ANTHROPIC_BASE_URL.replace(/\/+$/, '')
  const endpoint = base.endsWith('/v1') ? `${base}/messages` : `${base}/v1/messages`

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: input }],
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`API ${res.status}: ${err.slice(0, 300)}`)
    }

    const data = await res.json()
    if (!data.content?.[0]?.text) throw new Error('No content in response')

    let text = data.content[0].text.trim()
    text = text.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
    const parsed = JSON.parse(text)

    return new Response(JSON.stringify(parsed), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  } catch (e) {
    return new Response(JSON.stringify({
      spec: {
        root: 'err',
        elements: {
          err: { type: 'Alert', props: { title: '出错了', message: String(e.message || e), variant: 'error' }, children: [] },
        },
      },
    }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
}
