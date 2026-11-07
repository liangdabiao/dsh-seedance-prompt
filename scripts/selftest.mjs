// 离线自检：快照完整 + provider + 面板 API + 方法论文件。零网络零 key。
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SKILL_DIR = join(ROOT, 'skills', 'seedance-video-prompt')
const { createSkillProvider } = await import('../lib/skills.js')

let failed = 0
const step = async (name, fn) => {
  process.stdout.write(`- ${name} … `)
  try {
    await fn()
    console.log('ok')
  } catch (err) {
    failed++
    console.log('失败')
    console.error(`  ${err.message}`)
  }
}

await step('快照完整（SKILL.md + references 6 篇 + ads-prompt）', () => {
  for (const p of ['SKILL.md', 'references/ecommerce-douyin.md', 'references/general-storyboard.md', 'references/tvc-ad.md', 'references/ads-prompt/structured-prompt.md']) {
    if (!existsSync(join(SKILL_DIR, p))) throw new Error(`缺 ${p}`)
  }
})

const provider = createSkillProvider([join(ROOT, 'skills')])
let candidates
await step('provider 注册 + 正文完整 + addendum', async () => {
  candidates = await provider.list()
  if (candidates.length !== 1) throw new Error(`候选 ${candidates.length} ≠ 1`)
  const skill = await provider.get(candidates[0])
  if (skill.content.length < 3000) throw new Error('正文过短')
  if (!skill.content.includes('在 DSH 插件里使用')) throw new Error('缺 addendum')
  if (!skill.content.includes('工作区')) throw new Error('缺工作区约定')
})

await step('方法论 references 6 篇可读', () => {
  const refsDir = join(SKILL_DIR, 'references')
  const refs = readdirSync(refsDir).filter((f) => f.endsWith('.md'))
  if (refs.length < 6) throw new Error(`references 只有 ${refs.length} 篇`)
})

await step('结构化指南 + 广告提示词模板存在', () => {
  if (!existsSync(join(SKILL_DIR, 'references', 'structured-prompt-guide.md'))) throw new Error('缺 structured-prompt-guide.md')
  const adsDir = join(SKILL_DIR, 'references', 'ads-prompt')
  const ads = readdirSync(adsDir).filter((f) => f.endsWith('.md'))
  if (ads.length < 7) throw new Error(`ads-prompt 只有 ${ads.length} 篇`)
})

await step('面板 API 健康与方法论目录（内存 ctx 模拟）', async () => {
  const { registerApi } = await import('../lib/api.js')
  const captured = []
  const fakeRes = { writeHead() { return this }, end(chunk) { captured.push(String(chunk)) } }
  const fakeCtx = {
    get: () => ({ requestRejection: () => false }),
    webServer: { register: async ({ handler }) => { globalThis.__sdHandler = handler } },
  }
  await registerApi(fakeCtx, { skillDirs: [join(ROOT, 'skills')] })
  const handler = globalThis.__sdHandler
  if (!handler) throw new Error('路由未注册')
  await handler({ method: 'GET', url: '/seedance-prompt/api/health', headers: {} }, fakeRes)
  if (!JSON.parse(captured.at(-1)).ok) throw new Error('health 语义错误')
  captured.length = 0
  await handler({ method: 'GET', url: '/seedance-prompt/api/methods', headers: {} }, fakeRes)
  const methods = JSON.parse(captured.at(-1)).methods
  if (methods.length < 5) throw new Error(`方法论目录只有 ${methods.length} 条`)
})

if (failed > 0) {
  console.error(`\n自检失败 ${failed} 项`)
  process.exit(1)
}
console.log('\n全部通过。')
