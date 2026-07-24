import type { TelegramAudience, ThemeMode, WidgetLayout } from "./types"
import { clearAvatarCache } from "./avatar"
import { DEFAULT_LAYOUT, isWidgetLayout } from "./layout"

// ==========================================
// 存储封装层
// ------------------------------------------
// 安全基线：源标识（身份类数据）只存 Keychain；
// 缓存快照（公开可展示）与主题/排版偏好存 Storage。
// 所有读写都必须走此模块，避免键名与存储位置散落。
// ==========================================

/** Keychain：源标识（唯一敏感/身份类数据） */
const SOURCE_KEY = "tg_audience_source"
/** Storage：受众快照缓存 */
const CACHE_KEY = "tg_audience_cache"
/** Storage：主题偏好 */
const THEME_KEY = "tg_theme_mode"
/** Storage：排版方案 */
const LAYOUT_KEY = "tg_widget_layout"
/** Storage：最近一次刷新失败原因（Widget 警告态） */
const LAST_ERROR_KEY = "tg_last_error"

/** 默认缓存有效期：30 分钟 */
export const CACHE_TTL_MS = 30 * 60 * 1000

// --- 源标识（Keychain，仅本机，不 iCloud 同步）---

/** 读取已保存的源标识；未配置返回 null */
export function getSource(): string | null {
  return Keychain.contains(SOURCE_KEY) ? Keychain.get(SOURCE_KEY) : null
}

/** 保存源标识 */
export function setSource(source: string): void {
  Keychain.set(SOURCE_KEY, source)
}

/** 清除源标识 */
export function clearSource(): void {
  if (Keychain.contains(SOURCE_KEY)) {
    Keychain.remove(SOURCE_KEY)
  }
}

// --- 受众快照缓存（Storage）---

/** 读取缓存快照；无缓存返回 null */
export function getCache(): TelegramAudience | null {
  return Storage.get<TelegramAudience>(CACHE_KEY) ?? null
}

/** 写入缓存快照 */
export function setCache(data: TelegramAudience): void {
  Storage.set(CACHE_KEY, data)
}

/** 清除受众缓存、本地头像与最近错误 */
export function clearCache(): void {
  if (Storage.contains(CACHE_KEY)) {
    Storage.remove(CACHE_KEY)
  }
  clearLastError()
  clearAvatarCache()
}

// --- 最近刷新错误（Storage）---

/** 读取最近一次刷新失败原因；无则 null */
export function getLastError(): string | null {
  const value = Storage.get<string>(LAST_ERROR_KEY)
  return value?.trim() ? value : null
}

/** 写入最近一次刷新失败原因 */
export function setLastError(message: string): void {
  const text = message.trim()
  if (!text) {
    clearLastError()
    return
  }
  Storage.set(LAST_ERROR_KEY, text)
}

/** 清除最近一次刷新失败原因 */
export function clearLastError(): void {
  if (Storage.contains(LAST_ERROR_KEY)) {
    Storage.remove(LAST_ERROR_KEY)
  }
}

/** 缓存是否仍在有效期内 */
export function isCacheFresh(
  data: TelegramAudience | null,
  ttlMs: number = CACHE_TTL_MS
): boolean {
  return !!data && Number.isFinite(data.fetchedAt) && Date.now() - data.fetchedAt < ttlMs
}

/** 清除源标识与缓存（保留主题/排版偏好） */
export function clearAllConfig(): void {
  clearSource()
  clearCache()
}

// --- 主题偏好（Storage）---

/** 读取主题偏好，默认 auto */
export function getTheme(): ThemeMode {
  return Storage.get<ThemeMode>(THEME_KEY) ?? "auto"
}

/** 写入主题偏好 */
export function setTheme(mode: ThemeMode): void {
  Storage.set(THEME_KEY, mode)
}

// --- 排版偏好（Storage）---

/** 读取排版方案，默认 classic */
export function getLayout(): WidgetLayout {
  const value = Storage.get<string>(LAYOUT_KEY)
  return isWidgetLayout(value) ? value : DEFAULT_LAYOUT
}

/** 写入排版方案 */
export function setLayout(layout: WidgetLayout): void {
  Storage.set(LAYOUT_KEY, layout)
}
