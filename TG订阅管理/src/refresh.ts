import { Widget } from "scripting"
import type { TelegramAudience } from "./types"
import { getCache, getSource, isCacheFresh, setCache } from "./store"
import { fetchTelegramAudience } from "./telegram"

// ==========================================
// 统一刷新服务
// 供 index / widget / AppIntent 复用，避免三处逻辑漂移。
// ==========================================

export type RefreshOptions = {
  /** 忽略缓存 TTL，强制网络请求（手动刷新） */
  force?: boolean
  /** 成功或失败后是否 reload 小组件 */
  reloadWidget?: boolean
}

export type RefreshResult = {
  data: TelegramAudience | null
  fromCache: boolean
  error?: string
}

/**
 * 刷新受众数据。
 * - 未配置源：返回现有缓存
 * - 缓存未过期且非 force：直接返回缓存
 * - 否则请求网络；失败时回退旧缓存并附带 error
 */
export async function refreshAudience(
  options: RefreshOptions = {}
): Promise<RefreshResult> {
  const { force = false, reloadWidget = false } = options
  const source = getSource()
  const cached = getCache()

  if (!source) {
    if (reloadWidget) Widget.reloadAll()
    return { data: cached, fromCache: true }
  }

  if (!force && isCacheFresh(cached)) {
    return { data: cached, fromCache: true }
  }

  try {
    const data = await fetchTelegramAudience(source)
    setCache(data)
    if (reloadWidget) Widget.reloadAll()
    return { data, fromCache: false }
  } catch (cause) {
    const error = cause instanceof Error ? cause.message : String(cause)
    // 失败时也 reload，确保 Widget 能展示警告态（若入口需要）
    if (reloadWidget) Widget.reloadAll()
    return { data: cached, fromCache: true, error }
  }
}
