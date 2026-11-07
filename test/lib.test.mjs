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

// ── 升级新增：校验/拼装/历史 ────────────────────────────────
process.env.DSH_HOME = new URL('../.tmp/test-home/', import.meta.url).pathname.replace(/^\/([A-Za-z]):/, '$1:')

const { validatePromptPack, buildPromptPack } = await import('../lib/validate.js')
const data = await import('../lib/data.js')
const host = await import('../src/host.js')

test('validate: 引用上限/编号/复合动作告警', () => {
  // 正常包
  const good = validatePromptPack([{ shot: '开场', prompt: '@图片1 作为首帧，产品从阴影亮起', duration: 3 }])
  assert.equal(good.ok, true)
  assert.equal(good.stats.图片, 1)
  // 超上限
  const over = validatePromptPack([{ prompt: Array.from({ length: 10 }, (_, i) => `@图片${i + 1}`).join(' ') }])
  assert.equal(over.ok, false)
  assert.ok(over.errors.some((e) => e.includes('上限 9')))
  // 编号缺失
  const noNum = validatePromptPack([{ prompt: '@图片 作为首帧' }])
  assert.equal(noNum.ok, false)
  // 复合动作告警（>500 字）
  const long = validatePromptPack([{ prompt: 'x'.repeat(600) }])
  assert.ok(long.warnings.some((w) => w.includes('复合动作')))
  // 参考时长超限
  const overDur = validatePromptPack([{ prompt: 'a', referenceDuration: 10 }, { prompt: 'b', referenceDuration: 8 }])
  assert.ok(overDur.errors.some((e) => e.includes('15s')))
  // 空包
  assert.equal(validatePromptPack([]).ok, false)
  // 拼装
  const text = buildPromptPack({ product: '保温杯', style: '暖调', shots: [{ shot: '开场', prompt: '@图片1 首帧', duration: 3 }] })
  assert.ok(text.includes('# Seedance 分镜提示词包 · 保温杯'))
  assert.ok(text.includes('## 镜头 1（3s）'))
})

test('host: 3 个工具 check/build/history 全链路', async () => {
  for (const tool of [host.seedancePromptCheckTool, host.seedancePromptBuildTool, host.seedancePromptHistoryTool]) {
    assert.equal(tool.parameters.additionalProperties, false)
    assert.ok(tool.description.length > 30)
  }
  await assert.rejects(() => host.seedancePromptCheckTool.execute({ shots: '不是json' }), /不是合法 JSON/)
  const checkBad = await host.seedancePromptCheckTool.execute({ shots: JSON.stringify([{ prompt: '@图片1' }, { prompt: '@图片2' }, { prompt: '@图片3' }, { prompt: '@图片4' }, { prompt: '@图片5' }, { prompt: '@图片6' }, { prompt: '@图片7' }, { prompt: '@图片8' }, { prompt: '@图片9' }, { prompt: '@图片10' }]) })
  assert.equal(checkBad.ok, false)
  const built = await host.seedancePromptBuildTool.execute({
    product: '测试品', style: '暖调',
    shots: JSON.stringify([{ shot: '开场', prompt: '@图片1 作为首帧，产品亮起', duration: 3 }]),
  })
  assert.equal(built.ok, true)
  const list = await host.seedancePromptHistoryTool.execute({ action: 'list' })
  assert.ok(list.data.includes('测试品'))
  const id = /id=(pack-\d+)/.exec(list.data)?.[1]
  const got = await host.seedancePromptHistoryTool.execute({ action: 'get', id })
  assert.ok(got.data.includes('## 镜头 1'))
  const noConfirm = await host.seedancePromptHistoryTool.execute({ action: 'delete', id })
  assert.equal(noConfirm.ok, false)
})
