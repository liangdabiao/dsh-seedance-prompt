// ============================================================================
// Seedance 分镜提示词 · 浏览器半边（最小面板）。
// 两块：📖 使用指南 + 📋 方法论目录（6 篇参考文档浏览）。
// ============================================================================
const h = require('react').createElement
const { useState, useEffect } = require('react')

const PANEL_ID = 'seedance-prompt'
const BASE = 'seedance-prompt'

function PanelIcon(props) {
  return h('svg', { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', ...props },
    h('rect', { x: 2.5, y: 2.5, width: 19, height: 19, rx: 5, fill: '#e8734a' }),
    h('path', { d: 'M8 7l8 5-8 5V7z', fill: '#fff' }),
    h('circle', { cx: 18, cy: 7, r: 2.5, fill: '#ffd24a' }))
}

async function fetchJson(path) {
  const res = await fetch(BASE + path)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `请求失败（${res.status}）`)
  return data
}

function GuideTab() {
  return h('div', null,
    h('div', { style: styles.card },
      h('div', { style: styles.sectionTitle }, '怎么生成分镜提示词'),
      h('div', { style: styles.stepList },
        '在对话里一句话即可：',
        h('div', { style: styles.quote }, '「帮我写一个保温杯的带货视频提示词」'),
        h('div', { style: styles.quote }, '「写一个科技感产品展示的 TVC 分镜」'),
        h('div', { style: styles.quote }, '「帮我做一个真人探店的口播视频提示词」'),
        '模型会：路由到正确方法论 → 收集必要信息 → 生成可直接复制到即梦/小云雀使用的完整提示词。')),
    h('div', { style: styles.card },
      h('div', { style: styles.sectionTitle }, '5 套互斥方法论'),
      h('div', { style: { ...styles.muted, lineHeight: 2 } },
        '电商带货（抖音/TikTok） · TVC 品牌广告 · 通用分镜（叙事/风景/剧情） · 真人感视频（种草/探店/口播） · 剧情短剧')),
    h('div', { style: styles.card },
      h('div', { style: styles.sectionTitle }, '零 API 成本'),
      h('div', { style: styles.muted }, '纯技能零 API key。生成的提示词直接复制到 Seedance 2.0（即梦/小云雀/豆包）使用，不需要调用任何 API。')))
}

function MethodsTab() {
  const [methods, setMethods] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    fetchJson('/api/methods').then((d) => setMethods(d.methods)).catch((e) => setError(e.message))
  }, [])
  return h('div', null,
    error ? h('div', { style: styles.error }, error) : null,
    methods === null ? h('div', { style: styles.muted }, '加载中…') : null,
    methods?.map((m) => h('div', { key: m.file, style: styles.card },
      h('div', { style: styles.skillName }, m.label),
      h('div', { style: styles.muted }, m.file))))
}


// ---------- 提示词包历史 ----------
function fmtTime(iso) {
  try {
    const d = new Date(iso)
    return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
  } catch { return iso || '' }
}

function PacksTab() {
  const [packs, setPacks] = useState(null)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(null)
  useEffect(() => {
    fetchJson('/api/packs').then((d) => setPacks(d.packs)).catch((e) => setError(e.message))
  }, [])
  if (error) return h('div', { style: styles.error }, error)
  if (packs === null) return h('div', { style: styles.muted }, '加载中…')
  if (!packs.length) {
    return h('div', { style: styles.muted },
      '还没有提示词包。在对话里说「给保温杯写一条 5 镜头的 Seedance 提示词包」，模型会 build 并保存到这里。')
  }
  const pack = open ? packs.find((p) => p.id === open) : null
  if (pack) {
    return h('div', null,
      h('div', { style: styles.row },
        h('button', { style: styles.chip, onClick: () => setOpen(null) }, '← 返回列表'),
        h('span', { style: styles.packTitle }, pack.product || pack.id),
        h('span', { style: styles.mutedSmall }, (pack.stats?.shots ?? '?') + ' 镜 · ' + fmtTime(pack.ts))),
      h('pre', { style: styles.body }, pack.text))
  }
  return h('div', null, packs.map((p) => h('div', {
    key: p.id, style: styles.card, onClick: () => setOpen(p.id), title: '点击展开提示词包',
  },
    h('div', { style: styles.packTitle }, p.product || p.id),
    h('div', { style: styles.mutedSmall }, (p.stats?.shots ?? '?') + ' 镜' + (p.style ? ' · ' + p.style : '') + ' · ' + fmtTime(p.ts)))))
}

function Panel() {
  const [tab, setTab] = useState('guide')
  return h('div', { style: styles.wrap },
    h('div', { style: styles.row },
      h('button', { style: tab === 'packs' ? styles.tabActive : styles.tab, onClick: () => setTab('packs') }, '📦 提示词包'),
      h('button', { style: tab === 'guide' ? styles.tabActive : styles.tab, onClick: () => setTab('guide') }, '📖 使用指南'),
      h('button', { style: tab === 'methods' ? styles.tabActive : styles.tab, onClick: () => setTab('methods') }, '📋 方法论目录')),
    tab === 'packs' ? h(PacksTab) : tab === 'guide' ? h(GuideTab) : h(MethodsTab))
}

const styles = {
  chip: { padding: '4px 12px', border: '1px solid #d9d9de', borderRadius: 999, background: '#fff', cursor: 'pointer', fontSize: 12 },
  packTitle: { fontWeight: 700, color: '#e8734a' },
  mutedSmall: { color: '#a0a0a8', fontSize: 12, lineHeight: 1.7 },
  body: { background: '#f7f7f8', borderRadius: 8, padding: 12, fontSize: 12, overflow: 'auto', maxHeight: '65vh', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.7 },
  wrap: { padding: 16, overflow: 'auto', height: '100%', boxSizing: 'border-box', fontFamily: '-apple-system, "Segoe UI", "Microsoft YaHei", sans-serif', fontSize: 13, color: '#1a1a1a' },
  row: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 },
  button: { padding: '6px 14px', border: 'none', borderRadius: 8, background: '#e8734a', color: '#fff', cursor: 'pointer', fontSize: 13 },
  tab: { padding: '8px 16px', border: '1px solid #d9d9de', borderRadius: 8, background: '#fff', color: '#1a1a1a', cursor: 'pointer', fontSize: 13 },
  tabActive: { padding: '8px 16px', border: '1px solid #e8734a', borderRadius: 8, background: '#fdeee8', color: '#8a3a10', cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  card: { background: '#fff', border: '1px solid #e3e3e6', borderRadius: 10, padding: 12, marginBottom: 10 },
  sectionTitle: { fontWeight: 700, marginBottom: 6 },
  stepList: { lineHeight: 1.9 },
  quote: { background: '#fdeee8', borderRadius: 6, padding: '4px 10px', margin: '4px 0', color: '#8a3a10' },
  muted: { color: '#8a8a92' },
  error: { color: '#c0392b' },
  skillName: { fontWeight: 700, color: '#8a3a10' },
}

function apply(ctx) {
  ctx.slots.inject('sidebar.panellist', () =>
    ctx.slots.register({ name: 'sidebar.panellist', id: PANEL_ID, order: 13, label: () => 'Seedance 提示词' }, PanelIcon))
  ctx.slots.inject('main', () =>
    ctx.slots.register({ name: 'main', key: PANEL_ID }, Panel))
}

exports.isPlugin = true
exports.inject = ['slots']
exports.apply = apply
