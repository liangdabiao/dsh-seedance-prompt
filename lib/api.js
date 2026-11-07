// 面板数据面：/seedance-prompt 前缀路由（方法论目录 + 技能元信息）。
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readDir } from './skills.js'
import { listPacks } from './data.js'

const BASE = '/seedance-prompt'
const SKILL_DIRS = [join(dirname(fileURLToPath(import.meta.url)), '..', 'skills')]

function json(res, status, value) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(JSON.stringify(value))
}

export function requestRejection(ctx, req) {
  const connection = ctx.get('connection')
  if (typeof connection?.requestRejection !== 'function') return false // dsh 0.2.x 宿主已 token 鉴权，服务缺席时放行（fail-closed 会把面板永久 403）
  return connection.requestRejection({ headers: req.headers })
}

const METHOD_NAMES = {
  'ecommerce-douyin.md': '电商带货（抖音/TikTok）',
  'ecommerce-playbook.md': '电商带货 playbook（图片反推玩法）',
  'general-storyboard.md': '通用分镜（叙事/风景/剧情）',
  'realperson-video.md': '真人感视频（种草/探店/口播）',
  'tvc-ad.md': 'TVC 品牌广告',
  'realperson-supplement.md': '真人感补充规则',
}

export function registerApi(ctx, config) {
  const skillDirs = config?.skillDirs || SKILL_DIRS
  return ctx.webServer.register({
    kind: 'prefix',
    path: BASE,
    async handler(req, res) {
      try {
        const rejection = requestRejection(ctx, req)
        if (typeof rejection === 'number') return json(res, rejection, { error: '未授权' })
        const url = new URL(req.url, 'http://x')
        const path = url.pathname.slice(BASE.length) || '/'

        if (path === '/api/health' && req.method === 'GET') {
          return json(res, 200, { ok: true })
        }
        if (path === '/api/methods' && req.method === 'GET') {
          const skills = skillDirs.flatMap((dir) => readDir(dir))
          const refsDir = skills[0] ? join(skills[0].dir, 'references') : ''
          const methods = []
          try {
            for (const f of readdirSync(join(refsDir)).filter((f) => f.endsWith('.md') && !f.includes('ads-prompt'))) {
              methods.push({ file: f, label: METHOD_NAMES[f] || f.replace('.md', '') })
            }
          } catch { /* references 目录不存在时跳过 */ }
          return json(res, 200, { methods })
        }
        if (path === '/api/packs' && req.method === 'GET') {
          return json(res, 200, { packs: listPacks() })
        }
        if (path === '/api/skills' && req.method === 'GET') {
          const skills = readDir(skillDirs).map((s) => ({ name: s.name, description: s.description }))
          return json(res, 200, { count: skills.length, skills })
        }
        json(res, 404, { error: 'not found' })
      } catch (err) {
        json(res, 500, { error: err?.message || '内部错误' })
      }
    },
  })
}

import { readdirSync } from 'node:fs'
