// GenUI Lab — App Logic

const EXAMPLES = [
  '📊 做一个项目管理看板，3个任务不同状态',
  '☕ 咖啡点单：杯型、奶类、甜度、加料',
  '👤 用户个人资料卡片，带头像和统计数据',
  '📋 团队周报模板，带进度条和评分',
  '🏠 智能家居控制面板，灯光/空调/窗帘',
  '💰 SaaS 定价页，三档对比',
  '📝 问卷调查表单，多种输入类型',
  '🎯 OKR 追踪器，目标和关键结果',
]

let loading = false
const messagesEl = document.getElementById('messages')
const welcomeEl = document.getElementById('welcome')
const examplesEl = document.getElementById('examples')
const form = document.getElementById('form')
const input = document.getElementById('input')
const sendBtn = document.getElementById('sendBtn')

// Render examples
examplesEl.innerHTML = EXAMPLES.map(e =>
  `<button class="example-btn" onclick="submitPrompt('${e.replace(/'/g, "\\'")}')">${e}</button>`
).join('')

// Theme switcher
document.getElementById('themeSwitcher').addEventListener('click', e => {
  const btn = e.target.closest('.theme-btn')
  if (!btn) return
  document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'))
  btn.classList.add('active')
  document.body.setAttribute('data-theme', btn.dataset.theme)
})

// Form submit
form.addEventListener('submit', e => {
  e.preventDefault()
  const text = input.value.trim()
  if (!text || loading) return
  submitPrompt(text)
})

async function submitPrompt(text) {
  if (loading) return
  input.value = ''
  welcomeEl.style.display = 'none'
  loading = true
  sendBtn.disabled = true

  // Add user message
  addMessage('user', text)

  // Add loading indicator
  const loadingEl = document.createElement('div')
  loadingEl.className = 'msg-loading'
  loadingEl.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div><span>生成中...</span>'
  messagesEl.appendChild(loadingEl)
  scrollToBottom()

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: text }),
    })
    const data = await res.json()
    loadingEl.remove()

    if (data.spec) {
      addMessage('ai', null, data.spec)
    } else if (data.error) {
      addMessage('ai', `错误: ${data.error}`)
    }
  } catch (err) {
    loadingEl.remove()
    addMessage('ai', `请求失败: ${err.message}`)
  } finally {
    loading = false
    sendBtn.disabled = false
    input.focus()
  }
}

function addMessage(role, text, spec) {
  const div = document.createElement('div')
  if (role === 'user') {
    div.className = 'msg-user'
    div.textContent = text
  } else {
    div.className = 'msg-ai'
    if (spec) {
      div.innerHTML = renderSpec(spec)
    } else {
      div.innerHTML = `<p class="genui-text genui-color-muted">${esc(text)}</p>`
    }
  }
  messagesEl.appendChild(div)
  scrollToBottom()
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
  })
}
