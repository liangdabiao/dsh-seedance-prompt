// Seedance 分镜提示词 · Host 半边（技能 + seedance_prompt_check/build 原生工具 + 面板数据面）。
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createSkillProvider } from '../lib/skills.js'
import { registerApi } from '../lib/api.js'
import { validatePromptPack, buildPromptPack } from '../lib/validate.js'
import { listPacks, savePack, deletePack } from '../lib/data.js'

export const name = 'seedance-prompt'

export const inject = ['tools', 'skills', 'webServer', 'connection']

function check(args, spec) {
  const problems = []
  for (const key of spec.required || []) {
    if (args?.[key] === undefined) problems.push(`缺少必填参数 ${key}`)
  }
  for (const [key, rule] of Object.entries(spec.properties || {})) {
    const value = args?.[key]
    if (value === undefined) continue
    if (rule.enum && !rule.enum.includes(value)) problems.push(`${key} 只能是 ${rule.enum.join(' / ')} 之一`)
  }
  for (const key of Object.keys(args || {})) {
    if (!spec.properties || !(key in spec.properties)) problems.push(`未知参数 ${key}`)
  }
  if (problems.length) throw new Error(`参数有误：${problems.join('；')}。`)
}

const str = (description, extra = {}) => ({ type: 'string', description, ...extra })
const text = (value) => [{ type: 'text', text: value }]

const OUTPUT = {
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['ok', 'summary'],
    properties: {
      ok: { type: 'boolean' },
      summary: { type: 'string', description: '给模型看的回执' },
      data: { type: 'string', description: '可选：校验明细/提示词包正文' },
    },
  },
  render: (_args, value) => text(value.data ? `${value.summary}\n\n${value.data}` : value.summary),
}

const result = (ok, summary, data = '') => ({ ok, summary, data })

function parseShots(json) {
  try {
    const parsed = JSON.parse(json)
    return Array.isArray(parsed) ? parsed : parsed?.shots
  } catch {
    throw new Error('shots 不是合法 JSON，如 [{"shot":"开场","prompt":"@图片1 作为首帧，产品从阴影中亮起","duration":3}]。')
  }
}

// ---------------------------------------------------------------------------
// 工具 1：seedance_prompt_check —— 硬约束确定性校验
// ---------------------------------------------------------------------------
export const seedancePromptCheckTool = {
  name: 'seedance_prompt_check',
  description:
    '对分镜提示词包做技能硬约束校验（确定性规则）：@图片≤9/@视频≤3/@音频≤3 引用上限、视频音频参考总时长≤15s、' +
    '单镜头单动作（超 500 字告警）、镜头数建议 ≤12、引用编号完整。生成最终提示词前跑一遍，能提前发现会被拒生成的问题。',
  parameters: {
    type: 'object',
    additionalProperties: false,
    required: ['shots'],
    properties: {
      shots: str('分镜数组 JSON：[{"shot":"镜头名","prompt":"提示词","duration":秒数,"referenceDuration":参考素材秒数}]'),
    },
  },
  output: OUTPUT,
  async execute(args) {
    check(args, this.parameters)
    const shots = parseShots(args.shots)
    const verdict = validatePromptPack(shots)
    const lines = [
      `结果：${verdict.ok ? '✓ 通过' : '✗ 未通过'}（${verdict.stats.shots} 镜 · @图片 ${verdict.stats.图片} · @视频 ${verdict.stats.视频} · @音频 ${verdict.stats.音频} · 总时长 ${verdict.stats.totalDuration || 0}s）`,
      ...verdict.errors.map((e) => `错误：${e}`),
      ...verdict.warnings.map((w) => `提醒：${w}`),
    ]
    return result(verdict.ok, lines[0], lines.slice(1).join('\n') || '（无其他问题）')
  },
}

// ---------------------------------------------------------------------------
// 工具 2：seedance_prompt_build —— 拼装提示词包并入历史
// ---------------------------------------------------------------------------
export const seedancePromptBuildTool = {
  name: 'seedance_prompt_build',
  description:
    '把分镜数组拼装成可直接投喂 Seedance 的分段提示词包（镜头编号+时长+统一约束头），自动过一遍硬约束校验并保存进历史（侧栏面板可回看）。',
  parameters: {
    type: 'object',
    additionalProperties: false,
    required: ['shots'],
    properties: {
      shots: str('分镜数组 JSON：[{"shot":"镜头名","prompt":"提示词","duration":秒数}]'),
      product: str('可选：产品名/主题'),
      style: str('可选：风格基调'),
      global_constraints: str('可选：全片统一约束（如「暖调、浅景深、Logo 常驻左下」）'),
    },
  },
  output: OUTPUT,
  async execute(args) {
    check(args, this.parameters)
    const shots = parseShots(args.shots)
    const verdict = validatePromptPack(shots)
    const text_ = buildPromptPack({ product: args.product, style: args.style, globalConstraints: args.global_constraints, shots })
    const pack = savePack({ product: args.product, style: args.style, text: text_, stats: verdict.stats })
    const lines = [
      `${verdict.ok ? '硬约束校验通过 ✓' : `硬约束校验未通过 ✗：${verdict.errors.join('；')}`}`,
      ...verdict.warnings.map((w) => `提醒：${w}`),
    ]
    return result(true, `提示词包已生成并保存（id=${pack.id}，${verdict.stats.shots} 镜）。${lines[0]}`, text_)
  },
}

// ---------------------------------------------------------------------------
// 工具 3：seedance_prompt_history —— 提示词包历史
// ---------------------------------------------------------------------------
export const seedancePromptHistoryTool = {
  name: 'seedance_prompt_history',
  description: '查询/删除已生成的提示词包历史：每包含产品、风格、镜头数、生成时间与完整文本。',
  parameters: {
    type: 'object',
    additionalProperties: false,
    required: ['action'],
    properties: {
      action: str('list 列历史；get 取正文；delete 删除', { enum: ['list', 'get', 'delete'] }),
      id: str('get/delete：提示词包 id（list 里能看到）'),
      confirm: str('delete 必须传 "yes"', { enum: ['yes'] }),
    },
  },
  output: OUTPUT,
  async execute(args) {
    check(args, this.parameters)
    if (args.action === 'list') {
      const packs = listPacks()
      if (!packs.length) return result(true, '还没有提示词包。用 seedance_prompt_build 生成即可。')
      return result(true, `共 ${packs.length} 个提示词包：`,
        packs.map((p) => `- ${p.product || p.id}（${p.stats?.shots ?? '?'} 镜${p.style ? `，${p.style}` : ''}，${p.ts}，id=${p.id}）`).join('\n'))
    }
    if (!args.id) throw new Error(`${args.action} 需要 id（先 list 找到）。`)
    const pack = listPacks().find((p) => p.id === args.id)
    if (!pack) return result(false, `没有提示词包 ${args.id}。`)
    if (args.action === 'get') return result(true, `提示词包 ${pack.id}：`, pack.text)
    if (args.confirm !== 'yes') return result(false, '删除请用 confirm:"yes"。')
    return deletePack(args.id) ? result(true, `提示词包 ${args.id} 已删除。`) : result(false, `没有提示词包 ${args.id}。`)
  },
}

export function apply(ctx) {
  const skillDirs = [join(dirname(fileURLToPath(import.meta.url)), '..', 'skills')]

  ctx.effect(() => ctx.tools.register(seedancePromptCheckTool), `${name}: tool check`)
  ctx.effect(() => ctx.tools.register(seedancePromptBuildTool), `${name}: tool build`)
  ctx.effect(() => ctx.tools.register(seedancePromptHistoryTool), `${name}: tool history`)
  ctx.effect(() => ctx.skills.registerProvider(() => createSkillProvider(skillDirs)), `${name}: skills`)
  ctx.effect(() => registerApi(ctx, { skillDirs }), `${name}: routes`)
}
