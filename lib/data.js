// Seedance 分镜提示词 · 提示词包历史持久化（$DSH_HOME/seedance-prompt/）。
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

export const DATA_DIR = join(process.env.DSH_HOME || join(homedir(), '.dsh'), 'seedance-prompt')
const HIST_FILE = join(DATA_DIR, 'packs.json')
const MAX_PACKS = 100

export function ensureDirs() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
}

function load() {
  try {
    const raw = JSON.parse(readFileSync(HIST_FILE, 'utf8'))
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

function save(packs) {
  ensureDirs()
  const tmp = `${HIST_FILE}.tmp`
  writeFileSync(tmp, JSON.stringify(packs, null, 2), 'utf8')
  renameSync(tmp, HIST_FILE)
}

export function listPacks() {
  return load()
}

export function savePack({ product, style, text, stats }) {
  const packs = load()
  const pack = {
    id: `pack-${Date.now()}`,
    product: String(product || '').slice(0, 100),
    style: String(style || '').slice(0, 100),
    text: String(text || '').slice(0, 30000),
    stats: stats || {},
    ts: new Date().toISOString(),
  }
  packs.unshift(pack)
  if (packs.length > MAX_PACKS) packs.length = MAX_PACKS
  save(packs)
  return pack
}

export function deletePack(id) {
  const packs = load()
  const next = packs.filter((p) => p.id !== id)
  if (next.length === packs.length) return false
  save(next)
  return true
}
