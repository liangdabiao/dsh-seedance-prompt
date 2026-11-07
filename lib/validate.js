// Seedance 分镜提示词 · 结构校验与拼装（确定性规则，来自技能「通用硬约束」），工具与面板 API 共用。

// 提取多模态引用：@图片N / @视频N / @音频N
const REF_RE = /@(图片|视频|音频)\s*(\d{1,2})/g

// 校验一个分镜提示词包（{ shots: [{ shot, prompt, duration }] } 或数组）。
// 硬约束（技能原文）：单镜头单动作；@图片≤9、@视频≤3、@音频≤3；视频/音频参考总时长≤15s；镜头间连贯。
export function validatePromptPack(pack) {
  const errors = []
  const warnings = []
  const shots = Array.isArray(pack) ? pack : (pack?.shots || [])
  if (!Array.isArray(shots) || !shots.length) {
    return { ok: false, errors: ['没有 shots 分镜数组'], warnings, stats: {} }
  }
  const counts = { 图片: 0, 视频: 0, 音频: 0 }
  let videoAudioDuration = 0
  let shotDuration = 0
  shots.forEach((s, i) => {
    const prompt = String(s.prompt || s.text || '')
    const label = `镜头 ${i + 1}${s.shot ? `「${s.shot}」` : ''}`
    if (!prompt.trim()) errors.push(`${label}：prompt 为空`)
    if (prompt.length > 500) warnings.push(`${label}：prompt ${prompt.length} 字，疑似复合动作/细节堆砌——技能要求单镜头单动作、写意图不写细节`)
    for (const m of prompt.matchAll(REF_RE)) {
      counts[m[1]]++
      const n = Number(m[2])
      if (!n) errors.push(`${label}：@${m[1]} 缺编号（应为 @${m[1]}N）`)
    }
    // 裸引用（@图片/@视频/@音频 后面没跟数字）也是错
    for (const m of prompt.matchAll(/@(图片|视频|音频)(?!\s*\d)/g)) {
      errors.push(`${label}：@${m[1]} 缺编号（应为 @${m[1]}N，如 @${m[1]}1）`)
    }
    const dur = Number(s.duration)
    if (dur) shotDuration += dur
    const refDur = Number(s.referenceDuration)
    if (refDur) videoAudioDuration += refDur
  })
  if (counts.图片 > 9) errors.push(`@图片 引用 ${counts.图片} 处，超过上限 9`)
  if (counts.视频 > 3) errors.push(`@视频 引用 ${counts.视频} 处，超过上限 3`)
  if (counts.音频 > 3) errors.push(`@音频 引用 ${counts.音频} 处，超过上限 3`)
  if (videoAudioDuration > 15) errors.push(`视频/音频参考总时长 ${videoAudioDuration}s，超过上限 15s`)
  if (shots.length > 12) warnings.push(`${shots.length} 个镜头偏多，一次生成建议 ≤12 镜`)
  return {
    ok: errors.length === 0,
    errors,
    warnings,
    stats: { shots: shots.length, 图片: counts.图片, 视频: counts.视频, 音频: counts.音频, totalDuration: shotDuration },
  }
}

// 拼装成可直接投喂 Seedance 的分段提示文本。
export function buildPromptPack({ product, style, globalConstraints, shots }) {
  const list = Array.isArray(shots) ? shots : (shots?.shots || [])
  const header = [
    `# Seedance 分镜提示词包${product ? ` · ${product}` : ''}`,
    style ? `风格基调：${style}` : '',
    globalConstraints ? `全片统一约束：${globalConstraints}` : '',
    `镜头数：${list.length}`,
  ].filter(Boolean).join('\n')
  const body = list.map((s, i) => {
    const dur = Number(s.duration) ? `（${Number(s.duration)}s）` : ''
    return `## 镜头 ${i + 1}${dur}${s.shot ? ` · ${s.shot}` : ''}\n${String(s.prompt || s.text || '').trim()}`
  }).join('\n\n')
  return `${header}\n\n${body}`
}
