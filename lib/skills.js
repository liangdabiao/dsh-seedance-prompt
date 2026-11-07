// Seedance 分镜提示词 · 技能快照提供方。
// 纯技能零 API key——提示词生成由模型在其环境中完成，方法论在 references/ 按需加载。
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const RANK = 600
const INVOCATION = { modelInvocable: true, userInvocable: true }

function parse(file) {
  const text = readFileSync(file, 'utf8')
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  if (!m) return null
  const block = m[1]
  const name = block.match(/^name:\s*(.+)$/m)?.[1]?.trim()
  let description = block.match(/^description:\s*(.+)$/m)?.[1]?.trim().replace(/^(["'])(.*)\1$/, '$2') || null
  if (!description) {
    const lines = block.split(/\r?\n/)
    const start = lines.findIndex((l) => /^description:\s*>/.test(l))
    if (start !== -1) {
      const collected = []
      for (let i = start + 1; i < lines.length; i++) {
        if (/^\S/.test(lines[i])) break
        collected.push(lines[i].replace(/^\s+/, ''))
      }
      description = collected.join(' ').trim()
    }
  }
  return name && description ? { name, description, body: text.slice(m[0].length) } : null
}

function readDir(dir) {
  if (!existsSync(dir)) return []
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const sDir = join(dir, entry.name)
    const skillFile = join(sDir, 'SKILL.md')
    if (!existsSync(skillFile)) continue
    const parsed = parse(skillFile)
    if (!parsed) continue
    const refCount = existsSync(join(sDir, 'references'))
      ? readdirSync(join(sDir, 'references')).filter((f) => f.endsWith('.md')).length
      : 0
    out.push({ dir: sDir, file: skillFile, ...parsed, dirName: entry.name, refCount })
  }
  return out
}

function addendum(skill) {
  return [
    '',
    '---',
    '',
    '## 在 DSH 插件里使用',
    '',
    `- 本技能目录：\`${skill.dir}\`；references/ 目录下的方法论文档用文件读取工具按需加载，**不要凭记忆套模板**——先路由到正确的方法论路线，再读对应参考文档。`,
    '- 生成的提示词直接给用户复制到 Seedance 2.0（即梦 jimeng.jianying.com / 小云雀 / 豆包）使用；输出纯文本即可，不需要调用任何 API。',
    '- references/ads-prompt/ 目录有 7 篇额外广告/带货提示词模板可参考。',
    '- 生成的提示词写到当前工作区文件（如 `prompt-seedance.md`），不要往插件安装目录写文件。',
    '',
  ].join('\n')
}

export function createSkillProvider(dirs) {
  const list = [].concat(dirs)
  const candidate = (s, refCount) => ({
    name: s.name,
    description: s.description,
    path: s.file,
    invocation: INVOCATION,
    source: 'bundled',
    provider: 'seedance-prompt',
    rank: RANK,
    locator: s.dir,
    resourceBase: { kind: 'directory', path: s.dir },
    refCount,
  })

  return {
    name: 'seedance-prompt',
    async list() {
      return list.flatMap(readDir).map((s) => {
        const c = candidate(s, s.refCount)
        const { refCount, ...rest } = c
        return rest
      })
    },
    async get(c) {
      const s = list.flatMap(readDir).find((x) => x.dir === c.locator && x.name === c.name)
      if (!s) return undefined
      const content = s.body + addendum(s)
      const { rank, locator, refCount, ...summary } = candidate(s, s.refCount)
      return { ...summary, content, refCount }
    },
  }
}

export { readDir, addendum }
