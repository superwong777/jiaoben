import { Widget } from "scripting"
import type { TelegramAudience } from "./types"
import { attachCachedAvatar } from "./avatar"
import {
  clearLastError,
  getCache,
  getSource,
  isCacheFresh,
  setCache,
  setLastError,
  setSource,
} from "./store"
import { fetchTelegramAudience } from "./telegram"

// ==========================================
// 统一刷新服务
// 供 index / AppIntent / 设置页复用；
// 失败时回退旧缓存（含本地头像），并持久化 lastError 给 Widget。
// ==========================================

export type RefreshOptions = {
  /** 忽略缓存 TTL，强制网络请求（手动刷新） */
  force?: boolean
  /** 成功或失败后是否 reload 小组件 */
  reloadWidget?: boolean
  /**
   * 临时覆盖源标识（设置页输入框）。
   * 成功后会把归一化后的 source 写入 Keychain。
   */
  sourceOverride?: string
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
 * - 否则请求网络；成功清 lastError，失败写 lastError 并回退旧缓存
 */
export async function refreshAudience(
  options: RefreshOptions = {}
): Promise<RefreshResult> {
  const { force = false, reloadWidget = false, sourceOverride } = options
  const source = (sourceOverride ?? getSource() ?? "").trim()
  const cached = getCache()

  if (!source) {
    if (reloadWidget) Widget.reloadAll()
    return {
      data: cached,
      fromCache: true,
      error: sourceOverride !== undefined ? "请输入频道或群组链接/公开 ID" : undefined,
    }
  }

  // 设置页带 sourceOverride 时总是强制请求，避免误用旧源缓存
  if (!force && sourceOverride === undefined && isCacheFresh(cached)) {
    return { data: cached, fromCache: true }
  }

  try {
    const fresh = await fetchTelegramAudience(source)
    const data = await attachCachedAvatar(fresh, cached)
    setSource(data.source)
    setCache(data)
    clearLastError()
    if (reloadWidget) Widget.reloadAll()
    return { data, fromCache: false }
  } catch (cause) {
    const error = cause instanceof Error ? cause.message : String(cause)
    setLastError(error)
    // 失败时也 reload，让 Widget 能展示警告态
    if (reloadWidget) Widget.reloadAll()
    return { data: cached, fromCache: true, error }
  }
}
