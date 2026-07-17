// ==========================================
// 数字与时间格式化
// ==========================================

const numberFormatter = new Intl.NumberFormat("zh-CN")

/** 人数千分位格式化，例如 12345 → "12,345" */
export function formatAudience(count: number): string {
  return numberFormatter.format(count)
}

/**
 * 紧凑人数格式，例如：
 * 43900 → "43.9K"
 * 1200 → "1.2K"
 * 3500000 → "3.5M"
 * 999 → "999"
 */
export function formatAudienceCompact(count: number): string {
  if (!Number.isFinite(count)) return "—"
  const abs = Math.abs(count)
  const sign = count < 0 ? "-" : ""

  const format = (value: number, suffix: string) => {
    const rounded = value >= 100 ? Math.round(value) : Math.round(value * 10) / 10
    const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
    return `${sign}${text}${suffix}`
  }

  if (abs >= 1_000_000_000) return format(abs / 1_000_000_000, "B")
  if (abs >= 1_000_000) return format(abs / 1_000_000, "M")
  if (abs >= 1_000) return format(abs / 1_000, "K")
  return `${sign}${Math.round(abs)}`
}

/** 抓取时间格式化为 HH:mm */
export function formatUpdateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

/**
 * 解析受众人数文本。
 * 支持：
 * - "12 345" / "12,345" / "12.345"（仅千分位分隔）
 * - "1.2K" / "3.4M" / "1B" 等缩写
 */
export function parseAudienceCount(raw: string): number | null {
  const cleaned = raw.replace(/[\s,\u00a0\u202f]/g, "").trim()
  if (!cleaned) return null

  // 缩写优先：1.2K / 3M / 1.5B
  const compact = cleaned.match(/^(\d+(?:\.\d+)?)([KkMmBb])$/)
  if (compact) {
    const base = Number(compact[1])
    if (!Number.isFinite(base)) return null
    const unit = compact[2].toUpperCase()
    const factor = unit === "K" ? 1_000 : unit === "M" ? 1_000_000 : 1_000_000_000
    return Math.round(base * factor)
  }

  // 纯数字 / 千分位分隔：去掉非数字
  // 欧洲写法 12.345 作为千分位时也会落到这里，统一按数字串处理
  const digits = cleaned.replace(/[^\d]/g, "")
  if (!digits) return null
  const value = Number(digits)
  return Number.isFinite(value) ? value : null
}
