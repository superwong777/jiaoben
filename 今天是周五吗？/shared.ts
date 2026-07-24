import { Script, type DynamicShapeStyle, type ShapeStyle } from "scripting"

export type ThemeMode = "auto" | "light" | "dark"
export type LayoutStyle = "center" | "leading" | "hero" | "minimal" | "split"
export type QuoteMode = "daily" | "onRefresh" | "manual"
export type ReloadMode = "midnight" | "hourly"
export type WidgetFamilyName = "systemSmall" | "systemMedium" | "systemLarge"

export type Settings = {
  themeMode: ThemeMode
  layoutStyle: LayoutStyle
  quoteMode: QuoteMode
  reloadMode: ReloadMode
  showParticles: boolean
  /** 手动换文案时使用的种子 */
  quoteSeed: number
}

export type ResolvedTheme = {
  mode: ThemeMode
  background: DynamicShapeStyle
  foreground: ShapeStyle | DynamicShapeStyle
  secondary: ShapeStyle | DynamicShapeStyle
  tertiary: ShapeStyle | DynamicShapeStyle
  particle: ShapeStyle | DynamicShapeStyle
  preferredColorScheme?: "light" | "dark"
}

export type FridaySnapshot = {
  now: Date
  isFriday: boolean
  answer: "是！" | "不是"
  /** 小组件短日期：7月24日 · 周五 */
  dateLine: string
  /** 全屏完整日期 */
  fullDateLine: string
  weekday: string
  /** 主副文案：周五顺口溜，非周五期待文案 */
  quote: string
  daysUntilFriday: number
  nextReloadAt: Date
  debugLine: string
}

const STORAGE_KEY = "IsItFridaySettings"
const SCRIPT_NAME = "今天是周五吗？"

export const DEFAULT_SETTINGS: Settings = {
  themeMode: "auto",
  layoutStyle: "center",
  quoteMode: "daily",
  reloadMode: "midnight",
  showParticles: true,
  quoteSeed: 0,
}

/** 对仗式周五顺口溜 */
export const FRIDAY_QUOTES = [
  "周五周五，摸鱼为主",
  "周五周五，烦恼全无",
  "周五周五，摆烂为主",
  "熬过周五，周末做主",
  "熬过周五，生龙活虎",
  "周五一到，快乐报到",
  "周五一到，烦恼逃跑",
  "今日周五，先歇一歇",
  "今日周五，快乐有余",
  "摸到周五，周末无阻",
  "摸到周五，快乐满屋",
  "周报先放，快乐登场",
] as const

/** 对仗式非周五期待文案 */
export const WAITING_QUOTES = [
  "周一周一，盼着周五",
  "周二周二，离周五近",
  "周三周三，半周已过",
  "周四周四，周五在望",
  "周末周末，先歇一歇",
  "再熬几天，周五见面",
  "再熬几天，快乐提前",
  "日子再苦，周五做主",
  "工作再忙，周五不慌",
  "前路再远，周五不远",
  "周一到四，周五招手",
  "先把活干，周五再玩",
] as const

export const LAYOUT_OPTIONS: Array<{
  id: LayoutStyle
  title: string
  subtitle: string
}> = [
  {
    id: "center",
    title: "居中海报",
    subtitle: "全部居中，层次清晰，适合小中大尺寸",
  },
  {
    id: "leading",
    title: "居左海报",
    subtitle: "全部左对齐，留白克制，阅读感更强",
  },
  {
    id: "hero",
    title: "杂志大字",
    subtitle: "答案超大压顶，日期与顺口溜沉在下方",
  },
  {
    id: "minimal",
    title: "极简答案",
    subtitle: "提问 + 答案 + 一句文案，大量留白",
  },
  {
    id: "split",
    title: "分栏横排",
    subtitle: "中/大尺寸：左答案右文案；小尺寸自动回退居中",
  },
]

export const THEME_OPTIONS: Array<{ id: ThemeMode; title: string; subtitle: string }> = [
  { id: "auto", title: "跟随系统", subtitle: "浅色 / 深色随系统切换" },
  { id: "light", title: "强制浅色", subtitle: "纯白底 + 纯黑字" },
  { id: "dark", title: "强制深色", subtitle: "纯黑底 + 纯白字" },
]

export const QUOTE_MODE_OPTIONS: Array<{ id: QuoteMode; title: string; subtitle: string }> = [
  { id: "daily", title: "每日固定", subtitle: "同一天内文案不变，跨日再换" },
  { id: "onRefresh", title: "每次刷新", subtitle: "系统或手动刷新时重新随机" },
  { id: "manual", title: "仅手动", subtitle: "只有点「重新随机」才换" },
]

export const RELOAD_MODE_OPTIONS: Array<{ id: ReloadMode; title: string; subtitle: string }> = [
  { id: "midnight", title: "每天午夜", subtitle: "跨日更新「是 / 不是」" },
  { id: "hourly", title: "每小时", subtitle: "更常刷新，顺口溜也可能更常换" },
]

const WEEKDAYS = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"] as const
const WEEKDAYS_SHORT = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"] as const

const WHITE = "rgb(255, 255, 255)" as ShapeStyle
const BLACK = "rgb(0, 0, 0)" as ShapeStyle
const GRAY = "rgb(134, 134, 139)" as ShapeStyle
const LIGHT_TERTIARY = "rgb(210, 210, 215)" as ShapeStyle
const DARK_TERTIARY = "rgb(29, 29, 31)" as ShapeStyle
const PARTICLE_LIGHT = "rgba(0, 0, 0, 0.18)" as ShapeStyle
const PARTICLE_DARK = "rgba(255, 255, 255, 0.22)" as ShapeStyle

export function getSettings(): Settings {
  const raw = Storage.get<Partial<Settings>>(STORAGE_KEY)
  return normalizeSettings(raw)
}

export function setSettings(next: Settings): void {
  Storage.set(STORAGE_KEY, normalizeSettings(next))
}

export function updateSettings(patch: Partial<Settings>): Settings {
  const next = normalizeSettings({
    ...getSettings(),
    ...patch,
  })
  setSettings(next)
  return next
}

export function resetSettings(): Settings {
  setSettings(DEFAULT_SETTINGS)
  return getSettings()
}

export function themeModeLabel(mode: ThemeMode): string {
  return THEME_OPTIONS.find((item) => item.id === mode)?.title ?? mode
}

export function layoutStyleLabel(style: LayoutStyle): string {
  return LAYOUT_OPTIONS.find((item) => item.id === style)?.title ?? style
}

export function quoteModeLabel(mode: QuoteMode): string {
  return QUOTE_MODE_OPTIONS.find((item) => item.id === mode)?.title ?? mode
}

export function reloadModeLabel(mode: ReloadMode): string {
  return RELOAD_MODE_OPTIONS.find((item) => item.id === mode)?.title ?? mode
}

export function resolveTheme(mode: ThemeMode = "auto"): ResolvedTheme {
  if (mode === "light") {
    return {
      mode,
      background: { light: WHITE, dark: WHITE },
      foreground: BLACK,
      secondary: GRAY,
      tertiary: LIGHT_TERTIARY,
      particle: PARTICLE_LIGHT,
      preferredColorScheme: "light",
    }
  }

  if (mode === "dark") {
    return {
      mode,
      background: { light: BLACK, dark: BLACK },
      foreground: WHITE,
      secondary: GRAY,
      tertiary: DARK_TERTIARY,
      particle: PARTICLE_DARK,
      preferredColorScheme: "dark",
    }
  }

  return {
    mode: "auto",
    background: { light: WHITE, dark: BLACK },
    foreground: { light: BLACK, dark: WHITE },
    secondary: { light: GRAY, dark: GRAY },
    tertiary: { light: LIGHT_TERTIARY, dark: DARK_TERTIARY },
    particle: { light: PARTICLE_LIGHT, dark: PARTICLE_DARK },
  }
}

/** 小组件用短日期，更干净 */
export function formatDateLine(date: Date): string {
  return `${date.getMonth() + 1}月${date.getDate()}日 · ${WEEKDAYS_SHORT[date.getDay()]}`
}

/** 全屏用完整日期 */
export function formatFullDateLine(date: Date): string {
  return `${date.getFullYear()}年${pad(date.getMonth() + 1)}月${pad(date.getDate())}日 · ${WEEKDAYS[date.getDay()]}`
}

export function localDayKey(date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function daysUntilFriday(date = new Date()): number {
  return (5 - date.getDay() + 7) % 7
}

export function pickQuoteFromPool(
  pool: readonly string[],
  settings: Settings,
  date = new Date(),
  salt = "quote"
): string {
  const total = pool.length
  if (total === 0) {
    return ""
  }
  if (settings.quoteMode === "manual") {
    return pool[Math.abs(settings.quoteSeed) % total]
  }
  if (settings.quoteMode === "daily") {
    return pool[hashString(`${localDayKey(date)}:${salt}`) % total]
  }
  return pool[Math.floor(Math.random() * total)]
}

export function pickFridayQuote(settings: Settings, date = new Date()): string {
  return pickQuoteFromPool(FRIDAY_QUOTES, settings, date, "friday")
}

export function pickWaitingQuote(settings: Settings, date = new Date()): string {
  return pickQuoteFromPool(WAITING_QUOTES, settings, date, "waiting")
}

export function nextReloadDate(mode: ReloadMode, from = new Date()): Date {
  if (mode === "hourly") {
    return new Date(from.getTime() + 60 * 60 * 1000)
  }
  return nextMidnight(from)
}

export function nextMidnight(from = new Date()): Date {
  const next = new Date(from)
  next.setHours(24, 0, 0, 0)
  return next
}

export function getFridaySnapshot(
  date = new Date(),
  settings: Settings = getSettings()
): FridaySnapshot {
  const isFriday = date.getDay() === 5
  const days = daysUntilFriday(date)
  const nextReloadAt = nextReloadDate(settings.reloadMode, date)
  const quote = isFriday
    ? pickFridayQuote(settings, date)
    : pickWaitingQuote(settings, date)

  return {
    now: date,
    isFriday,
    answer: isFriday ? "是！" : "不是",
    dateLine: formatDateLine(date),
    fullDateLine: formatFullDateLine(date),
    weekday: WEEKDAYS[date.getDay()],
    quote,
    daysUntilFriday: days,
    nextReloadAt,
    debugLine: `${themeModeLabel(settings.themeMode)} · ${layoutStyleLabel(settings.layoutStyle)} · ${quoteModeLabel(settings.quoteMode)} · 下次刷新 ${formatTime(nextReloadAt)}`,
  }
}

export function rerollManualQuote(settings: Settings = getSettings()): Settings {
  const nextSeed = (settings.quoteSeed + 1 + Math.floor(Math.random() * 17)) % 100000
  return updateSettings({ quoteSeed: nextSeed })
}

export function createShowcaseURL(): string {
  return Script.createRunURLScheme(SCRIPT_NAME, { mode: "showcase" })
}

export function createSettingsURL(): string {
  return Script.createRunURLScheme(SCRIPT_NAME, { mode: "settings" })
}

export function isShowcaseLaunch(): boolean {
  const mode = String(Script.queryParameters?.mode ?? "")
  return mode === "showcase" || mode === "page" || mode === "full"
}

export function hashString(input: string): number {
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

function normalizeSettings(raw: Partial<Settings> | null | undefined): Settings {
  return {
    themeMode: normalizeThemeMode(raw?.themeMode),
    layoutStyle: normalizeLayoutStyle(raw?.layoutStyle),
    quoteMode: normalizeQuoteMode(raw?.quoteMode),
    reloadMode: normalizeReloadMode(raw?.reloadMode),
    showParticles: raw?.showParticles !== false,
    quoteSeed: Number.isFinite(raw?.quoteSeed as number)
      ? Math.abs(Math.floor(raw!.quoteSeed as number))
      : DEFAULT_SETTINGS.quoteSeed,
  }
}

function normalizeThemeMode(value: unknown): ThemeMode {
  if (value === "light" || value === "dark" || value === "auto") {
    return value
  }
  return DEFAULT_SETTINGS.themeMode
}

function normalizeLayoutStyle(value: unknown): LayoutStyle {
  if (
    value === "center" ||
    value === "leading" ||
    value === "hero" ||
    value === "minimal" ||
    value === "split"
  ) {
    return value
  }
  return DEFAULT_SETTINGS.layoutStyle
}

function normalizeQuoteMode(value: unknown): QuoteMode {
  if (value === "daily" || value === "onRefresh" || value === "manual") {
    return value
  }
  return DEFAULT_SETTINGS.quoteMode
}

function normalizeReloadMode(value: unknown): ReloadMode {
  if (value === "midnight" || value === "hourly") {
    return value
  }
  return DEFAULT_SETTINGS.reloadMode
}

function pad(value: number): string {
  return value < 10 ? `0${value}` : String(value)
}

function formatTime(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}
