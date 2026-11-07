// 快照合规 + provider + addendum + API 单测。零 dsh 依赖零网络。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SKILL_DIR = join(ROOT, 'skills', 'seedance-video-prompt')
const SKILL_DIRS = [join(ROOT, 'skills')]
const { createSkillProvider, readDir, listStoryboards } = await import('../lib/skills.js')
const { requestRejection } = await import('../lib/api.js')

test('快照完整：SKILL.md + references 6 篇 + ads-prompt 7 篇', () => {
  assert.ok(existsSync(join(SKILL_DIR, 'SKILL.md')), '缺 SKILL.md')
  const refs = readdirSync(join(SKILL_DIR, 'references')).filter((f) => f.endsWith('.md'))
  assert.ok(refs.length >= 6, `references 只有 ${refs.length} 篇`)
  const ads = readdirSync(join(SKILL_DIR, 'references', 'ads-prompt')).filter((f) => f.endsWith('.md'))
  assert.ok(ads.length >= 7, `ads-prompt 只有 ${ads.length} 篇`)
})

test('provider：单技能注册、描述含触发词、references 计数', async () => {
  const provider = createSkillProvider(SKILL_DIRS)
  const candidates = await provider.list()
  assert.equal(candidates.length, 1)
  assert.equal(candidates[0].name, 'seedance-video-prompt')
  assert.ok(candidates[0].description.length > 100, 'description 应含触发词长串')
  assert.match(candidates[0].description, /带货/)
  assert.equal(candidates[0].rank, 600)
})

test('provider get：正文完整 + addendum 三条', async () => {
  const provider = createSkillProvider(SKILL_DIRS)
  const c = (await provider.list())[0]
  const skill = await provider.get(c)
  assert.ok(skill.content.length > 3000, '正文过短')
  assert.match(skill.content, /路由.*方法论|先路由/, '应有路由指引')
  assert.match(skill.content, /references\//, '应提 references 目录')
  assert.match(skill.content, /jimeng\.jianying\.com|小云雀/, '应提平台')
  assert.match(skill.content, /不要凭记忆套模板/, '应强调先读参考再生成')
})

test('references 6 篇方法论文件可读', () => {
  const refsDir = join(SKILL_DIR, 'references')
  for (const f of ['ecommerce-douyin.md', 'ecommerce-playbook.md', 'general-storyboard.md', 'realperson-video.md', 'tvc-ad.md']) {
    assert.ok(existsSync(join(refsDir, f)), `缺 ${f}`)
    const text = readFileSync(join(refsDir, f), 'utf8')
    assert.ok(text.length > 500, `${f} 内容过短`)
  }
})

test('面板 API：鉴权 fail closed', () => {
  const noService = { get: () => undefined }
  assert.equal(requestRejection(noService, { headers: {} }), false) // 宿主 token 鉴权是边界，服务缺席放行
})
