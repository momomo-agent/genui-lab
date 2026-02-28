// GenUI Renderer — 纯 JS，无框架依赖
// 支持 28 种组件类型

function renderElement(id, spec) {
  const el = spec.elements[id]
  if (!el) return ''
  const p = el.props || {}
  const kids = (el.children || []).map(cid => renderElement(cid, spec)).join('')

  switch (el.type) {
    case 'Card': {
      const desc = p.description ? `<div class="genui-card-desc">${esc(p.description)}</div>` : ''
      return `<div class="genui-card">${p.title ? `<div class="genui-card-title">${esc(p.title)}</div>` : ''}${desc}${kids}</div>`
    }
    case 'Stack': {
      const dir = p.direction || 'vertical'
      const gap = p.gap || 'md'
      const align = p.align ? ` genui-align-${p.align}` : ''
      return `<div class="genui-stack-${dir} genui-gap-${gap}${align}">${kids}</div>`
    }
    case 'Heading':
      return `<div class="genui-h${p.level || 2}">${esc(p.text)}</div>`
    case 'Text': {
      const cls = ['genui-text']
      if (p.size) cls.push(`genui-text-${p.size}`)
      if (p.color && p.color !== 'default') cls.push(`genui-color-${p.color}`)
      if (p.weight && p.weight !== 'normal') cls.push(`genui-weight-${p.weight}`)
      return `<p class="${cls.join(' ')}">${esc(p.text)}</p>`
    }
    case 'Badge': {
      const v = p.variant && p.variant !== 'default' ? ` genui-badge-${p.variant}` : ''
      return `<span class="genui-badge${v}">${esc(p.text)}</span>`
    }
    case 'Button': {
      const v = p.variant || 'primary'
      const s = p.size && p.size !== 'md' ? ` genui-btn-${p.size}` : ''
      return `<button class="genui-btn genui-btn-${v}${s}">${p.icon ? p.icon + ' ' : ''}${esc(p.label)}</button>`
    }
    case 'Separator':
      return p.label
        ? `<div class="genui-separator-label">${esc(p.label)}</div>`
        : '<hr class="genui-separator">'
    case 'Divider':
      return '<hr class="genui-separator">'
    case 'Spacer':
      return `<div class="genui-spacer-${p.size || 'md'}"></div>`

    case 'Radio': {
      const opts = (p.options || []).map((o, i) =>
        `<label class="genui-radio"><input type="radio" name="${esc(p.name)}" value="${esc(o.value)}"${o.value === p.defaultValue ? ' checked' : ''}><span>${esc(o.label)}</span></label>`
      ).join('')
      return `<div class="genui-radio-group">${opts}</div>`
    }
    case 'Checkbox': {
      const opts = (p.options || []).map(o =>
        `<label class="genui-checkbox"><input type="checkbox" name="${esc(p.name)}" value="${esc(o.value)}"${o.checked ? ' checked' : ''}><span>${esc(o.label)}</span></label>`
      ).join('')
      return `<div class="genui-checkbox-group">${opts}</div>`
    }
    case 'Select': {
      const label = p.label ? `<label class="genui-field-label">${esc(p.label)}</label>` : ''
      const opts = (p.options || []).map(o =>
        `<option value="${esc(o.value)}"${o.value === p.defaultValue ? ' selected' : ''}>${esc(o.label)}</option>`
      ).join('')
      const ph = p.placeholder ? `<option value="" disabled selected>${esc(p.placeholder)}</option>` : ''
      return `${label}<select class="genui-select">${ph}${opts}</select>`
    }
    case 'Input': {
      const label = p.label ? `<label class="genui-field-label">${esc(p.label)}</label>` : ''
      return `${label}<input class="genui-input" type="${p.type || 'text'}" placeholder="${esc(p.placeholder || '')}" value="${esc(p.defaultValue || '')}">`
    }
    case 'Textarea': {
      const label = p.label ? `<label class="genui-field-label">${esc(p.label)}</label>` : ''
      return `${label}<textarea class="genui-textarea" rows="${p.rows || 3}" placeholder="${esc(p.placeholder || '')}">${esc(p.defaultValue || '')}</textarea>`
    }
    case 'Toggle': {
      const desc = p.description ? `<span class="genui-color-muted genui-text-sm">${esc(p.description)}</span>` : ''
      return `<div class="genui-toggle${p.checked ? ' checked' : ''}" onclick="this.classList.toggle('checked')"><div class="genui-toggle-track"></div><div><span>${esc(p.label)}</span>${desc}</div></div>`
    }
    case 'Slider': {
      const val = p.defaultValue ?? p.min ?? 0
      const unit = p.unit || ''
      const sid = 's' + Math.random().toString(36).slice(2, 6)
      return `<div class="genui-slider"><div class="genui-slider-header"><span>${esc(p.label)}</span><span id="${sid}">${val}${unit}</span></div><input type="range" min="${p.min}" max="${p.max}" step="${p.step || 1}" value="${val}" oninput="document.getElementById('${sid}').textContent=this.value+'${unit}'"></div>`
    }
    case 'Progress': {
      const v = p.variant && p.variant !== 'default' ? ` ${p.variant}` : ''
      return `<div class="genui-progress">${p.label ? `<div class="genui-progress-label"><span>${esc(p.label)}</span><span>${p.value}%</span></div>` : ''}<div class="genui-progress-bar"><div class="genui-progress-fill${v}" style="width:${p.value}%"></div></div></div>`
    }
    case 'Image':
      return `<img class="genui-image${p.rounded ? ' rounded' : ''}" src="${esc(p.src)}" alt="${esc(p.alt || '')}"${p.width ? ` width="${p.width}"` : ''}${p.height ? ` height="${p.height}"` : ''}>`
    case 'Avatar': {
      const sz = p.size || 'md'
      const inner = p.src ? `<img src="${esc(p.src)}" alt="${esc(p.name)}">` : esc((p.name || '?').slice(0, 2).toUpperCase())
      return `<div class="genui-avatar genui-avatar-${sz}">${inner}</div>`
    }
    case 'Alert': {
      const v = p.variant || 'info'
      return `<div class="genui-alert genui-alert-${v}"><div class="genui-alert-title">${esc(p.title)}</div><div class="genui-alert-msg">${esc(p.message)}</div></div>`
    }
    case 'Stat': {
      const arrow = p.changeType === 'up' ? '↑' : p.changeType === 'down' ? '↓' : ''
      const change = p.change ? `<span class="genui-stat-change ${p.changeType || 'neutral'}">${arrow} ${esc(p.change)}</span>` : ''
      return `<div class="genui-stat">${p.icon ? `<span>${p.icon}</span>` : ''}<span class="genui-stat-label">${esc(p.label)}</span><span class="genui-stat-value">${esc(String(p.value))}</span>${change}</div>`
    }
    case 'Metric': {
      const trend = p.trend === 'up' ? '↑' : p.trend === 'down' ? '↓' : '→'
      const trendCls = p.trend === 'up' ? 'up' : p.trend === 'down' ? 'down' : 'neutral'
      return `<div class="genui-stat"><span class="genui-stat-label">${esc(p.label)}</span><span class="genui-stat-value">${esc(p.prefix || '')}${esc(String(p.value))}${esc(p.suffix || '')}</span><span class="genui-stat-change ${trendCls}">${trend}</span></div>`
    }
    case 'Table': {
      const cols = p.columns || []
      const rows = p.rows || []
      const ths = cols.map(c => `<th${c.align ? ` style="text-align:${c.align}"` : ''}>${esc(c.label)}</th>`).join('')
      const trs = rows.map(r => '<tr>' + cols.map(c => `<td>${esc(String(r[c.key] ?? ''))}</td>`).join('') + '</tr>').join('')
      return `<table class="genui-table"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`
    }
    case 'Tabs': {
      const tabs = p.tabs || []
      const def = p.defaultValue || tabs[0]?.value || ''
      const tid = 't' + Math.random().toString(36).slice(2, 6)
      const btns = tabs.map((t, i) =>
        `<button class="genui-tab${t.value === def ? ' active' : ''}" onclick="switchTab('${tid}',${i},this)">${esc(t.label)}</button>`
      ).join('')
      const panels = (el.children || []).map((cid, i) =>
        `<div class="genui-tab-panel" data-tabgroup="${tid}" style="${i === tabs.findIndex(t => t.value === def) ? '' : 'display:none'}">${renderElement(cid, spec)}</div>`
      ).join('')
      return `<div><div class="genui-tabs-header">${btns}</div>${panels}</div>`
    }
    case 'Accordion': {
      const items = (p.items || []).map((item, i) =>
        `<div class="genui-accordion-item${i === 0 ? ' open' : ''}" onclick="this.classList.toggle('open')"><button class="genui-accordion-trigger">${esc(item.title)}</button><div class="genui-accordion-content">${esc(item.content)}</div></div>`
      ).join('')
      return `<div>${items}</div>`
    }
    case 'Rating': {
      const val = p.value || 0
      const max = p.max || 5
      const stars = Array.from({length: max}, (_, i) =>
        `<span class="genui-star${i < val ? ' filled' : ''}">★</span>`
      ).join('')
      const label = p.label ? `<span class="genui-text-sm genui-color-muted">${esc(p.label)}</span>` : ''
      return `<div class="genui-rating"><div class="genui-stars">${stars}</div>${label}</div>`
    }
    case 'Tag': {
      const tags = (p.items || []).map(t =>
        `<span class="genui-tag"${t.color ? ` style="background:${t.color}20;color:${t.color}"` : ''}>${esc(t.text)}</span>`
      ).join('')
      return `<div class="genui-tags">${tags}</div>`
    }
    case 'Stepper': {
      const steps = (p.steps || []).map((s, i) =>
        `<div class="genui-step ${s.status}"><div class="genui-step-dot">${s.status === 'done' ? '✓' : i + 1}</div><div class="genui-step-label">${esc(s.label)}</div>${s.description ? `<div class="genui-step-desc">${esc(s.description)}</div>` : ''}</div>`
      ).join('')
      return `<div class="genui-stepper">${steps}</div>`
    }
    case 'Code':
      return `<pre class="genui-code">${esc(p.code)}</pre>`
    case 'Quote': {
      const author = p.author ? `<div class="genui-quote-author">— ${esc(p.author)}</div>` : ''
      return `<blockquote class="genui-quote">${esc(p.text)}${author}</blockquote>`
    }
    default:
      return `<div class="genui-text genui-color-muted">[${esc(el.type)}]</div>`
  }
}

function esc(s) {
  if (!s) return ''
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

function switchTab(groupId, idx, btn) {
  btn.parentElement.querySelectorAll('.genui-tab').forEach(b => b.classList.remove('active'))
  btn.classList.add('active')
  document.querySelectorAll(`[data-tabgroup="${groupId}"]`).forEach((p, i) => {
    p.style.display = i === idx ? '' : 'none'
  })
}

function renderSpec(spec) {
  if (!spec?.root || !spec?.elements) return '<div class="genui-text genui-color-error">Invalid spec</div>'
  return `<div class="genui-root">${renderElement(spec.root, spec)}</div>`
}
