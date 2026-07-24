import { Script, type DynamicShapeStyle, type ShapeStyle } from "scripting"

export type ThemeMode = "auto" | "light" | "dark"

/**
 * Distinct composition systems — not just alignment variants.
 * quiet / folio / rail / anchor each rearrange hierarchy and density.
 */
export type LayoutStyle = "quiet" | "folio" | "rail" | "anchor"

export type Settings = {
  themeMode: ThemeMode
  layoutStyle: LayoutStyle
  /** ISO date string yyyy-MM-dd, empty when not set */
  birthDate: string
  /** Manual bump to refresh daily insight without changing birthday */
  quoteSeed: number
  /** Absolute path under App Group for widget-readable custom background */
  backgroundImagePath: string
}

export type ResolvedTheme = {
  mode: ThemeMode
  background: DynamicShapeStyle
  foreground: ShapeStyle | DynamicShapeStyle
  secondary: ShapeStyle | DynamicShapeStyle
  tertiary: ShapeStyle | DynamicShapeStyle
  preferredColorScheme?: "light" | "dark"
}

export type LifeSnapshot = {
  now: Date
  hasBirthDate: boolean
  birthDate: string
  birthLabel: string
  ageYears: number | null
  ageLabel: string
  metaLabel: string
  daysLived: number | null
  /** Poster-style digits for the widget hero (no grouping separators) */
  daysLabel: string
  /** Human-readable digits for settings / debug */
  daysLabelReadable: string
  tagline: string
  insight: string
  emptyGuide: string
  emptyAction: string
  nextReloadAt: Date
  debugLine: string
}

const STORAGE_KEY = "LivedOneMoreDaySettings"
const SCRIPT_NAME = "又多活了一天"

export const DEFAULT_SETTINGS: Settings = {
  themeMode: "auto",
  layoutStyle: "quiet",
  birthDate: "",
  quoteSeed: 0,
  backgroundImagePath: "",
}

const BACKGROUND_DIR_NAME = "lived-one-more-day"
const BACKGROUND_FILE_NAME = "background.jpg"
/** Soft dark scrim so white text stays readable on any photo. */
export const BACKGROUND_SCRIM_OPACITY = 0.46

export const THEME_OPTIONS: Array<{ id: ThemeMode; title: string; subtitle: string }> = [
  { id: "auto", title: "跟随系统", subtitle: "浅色 / 深色随系统切换" },
  { id: "light", title: "强制浅色", subtitle: "纯白底 + 纯黑字" },
  { id: "dark", title: "强制深色", subtitle: "纯黑底 + 纯白字" },
]

export const LAYOUT_OPTIONS: Array<{ id: LayoutStyle; title: string; subtitle: string }> = [
  {
    id: "quiet",
    title: "静默",
    subtitle: "居中：你已经活了 + 大数字 + 副文",
  },
  {
    id: "folio",
    title: "页码",
    subtitle: "像书页：角标轻提，数字落在右下",
  },
  {
    id: "rail",
    title: "刻度",
    subtitle: "顶栏 + 细线 + 大数字，像时间刻度",
  },
  {
    id: "anchor",
    title: "留白",
    subtitle: "上留空气，文字轻轻落在下方",
  },
]

export const EMPTY_GUIDE = "输入你的生日，看看生命的刻度"
export const EMPTY_ACTION = "点此设置生日"
export const FIXED_TAGLINE = "又多活了一天，真好"
export const HERO_PREFIX = "你已经活了"
export const HERO_UNIT = "天"

/** Short reflections that stay stable for the same day + birthday + seed */
export const INSIGHTS = [
  "每一天都算数，轻轻地。",
  "日子不响，但一直在走。",
  "活着本身，就是一种回答。",
  "慢一点也没关系，你还在。",
  "平凡的一天，也值得被数。",
  "时间很轻，你很真实。",
  "今天也在，就已经很好。",
  "生命的刻度，从不着急。",
] as const

/** Exact day milestones only — no multi-week hangover window */
export const MILESTONE_INSIGHTS: Array<{ day: number; text: string }> = [
  { day: 100, text: "一百天了，已经很了不起" },
  { day: 365, text: "满一年了，每一天都算数" },
  { day: 1000, text: "一千天，是个很好的开始" },
  { day: 2000, text: "两千天，足够记住很多光" },
  { day: 3000, text: "三千天，像一条安静的河" },
  { day: 3650, text: "十年不止，日子还在温柔地长" },
  { day: 5000, text: "五千天了，故事才刚起头" },
  { day: 8000, text: "八千多天，足够写一本自己的书" },
  { day: 10000, text: "10000 天，是个了不起的里程碑" },
]

const WHITE = "rgb(255, 255, 255)" as ShapeStyle
const BLACK = "rgb(0, 0, 0)" as ShapeStyle
const GRAY = "rgb(134, 134, 139)" as ShapeStyle
const LIGHT_TERTIARY = "rgb(210, 210, 215)" as ShapeStyle
const DARK_TERTIARY = "rgb(29, 29, 31)" as ShapeStyle

function pad(value: number): string {
  return value < 10 ? `0${value}` : String(value)
}

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

export function clearBirthDate(): Settings {
  return updateSettings({ birthDate: "", quoteSeed: Date.now() })
}

/** Manually refresh the daily insight while keeping birthday fixed. */
export function rerollInsight(settings = getSettings()): Settings {
  return updateSettings({ quoteSeed: settings.quoteSeed + 1 })
}

function backgroundDirectory(): string {
  return FileManager.appGroupDocumentsDirectory + "/" + BACKGROUND_DIR_NAME
}

function backgroundFilePath(): string {
  return backgroundDirectory() + "/" + BACKGROUND_FILE_NAME
}

function ensureBackgroundDirectory(): void {
  const dir = backgroundDirectory()
  if (!FileManager.existsSync(dir)) {
    FileManager.createDirectorySync(dir, true)
  }
}

/** Whether a stored background file is still readable by the widget. */
export function isBackgroundImageValid(path: string | undefined | null): path is string {
  return !!path && FileManager.existsSync(path) && FileManager.isFileSync(path)
}

/** Resolved path for rendering; empty string means solid theme background. */
export function resolveBackgroundImagePath(settings = getSettings()): string {
  return isBackgroundImageValid(settings.backgroundImagePath) ? settings.backgroundImagePath : ""
}

/**
 * Pick one photo, downscale lightly, save into App Group so the Home Screen widget can read it.
 * Returns updated settings, or null if the user cancelled.
 */
export async function pickAndSaveBackgroundImage(
  settings = getSettings()
): Promise<Settings | null> {
  const picked = await Photos.pickPhotos(1)
  const source = picked?.[0]
  if (!source) {
    return null
  }

  const maxSide = 1400
  let image = source
  const longSide = Math.max(source.width, source.height)
  if (longSide > maxSide) {
    const scale = maxSide / longSide
    const thumb = source.preparingThumbnail({
      width: Math.max(1, Math.round(source.width * scale)),
      height: Math.max(1, Math.round(source.height * scale)),
    })
    if (thumb) {
      image = thumb
    }
  }

  const data = image.toJPEGData(0.86)
  if (!data || data.size === 0) {
    throw new Error("无法处理所选图片")
  }

  ensureBackgroundDirectory()
  const path = backgroundFilePath()

  // Drop previous file if it lived elsewhere
  if (
    isBackgroundImageValid(settings.backgroundImagePath) &&
    settings.backgroundImagePath !== path
  ) {
    try {
      FileManager.removeSync(settings.backgroundImagePath)
    } catch {
      // ignore cleanup failure
    }
  }

  await FileManager.writeAsData(path, data)
  return updateSettings({ backgroundImagePath: path })
}

/** Remove custom background and fall back to solid theme color. */
export function clearBackgroundImage(settings = getSettings()): Settings {
  if (isBackgroundImageValid(settings.backgroundImagePath)) {
    try {
      FileManager.removeSync(settings.backgroundImagePath)
    } catch {
      // ignore cleanup failure
    }
  }

  const dir = backgroundDirectory()
  if (FileManager.existsSync(dir)) {
    try {
      FileManager.removeSync(dir)
    } catch {
      // ignore cleanup failure
    }
  }

  return updateSettings({ backgroundImagePath: "" })
}

/**
 * Photo backgrounds always force light type for contrast over the dark scrim.
 * Solid backgrounds keep the normal black/white theme.
 */
export function resolveDisplayTheme(
  mode: ThemeMode = "auto",
  hasBackgroundImage = false
): ResolvedTheme {
  const base = resolveTheme(mode)
  if (!hasBackgroundImage) {
    return base
  }

  return {
    ...base,
    foreground: WHITE,
    secondary: "rgb(220, 220, 224)" as ShapeStyle,
    tertiary: "rgb(255, 255, 255)" as ShapeStyle,
  }
}

export function themeModeLabel(mode: ThemeMode): string {
  return THEME_OPTIONS.find((item) => item.id === mode)?.title ?? mode
}

export function layoutStyleLabel(style: LayoutStyle): string {
  return LAYOUT_OPTIONS.find((item) => item.id === style)?.title ?? style
}

export function isLayoutStyle(value: unknown): value is LayoutStyle {
  return value === "quiet" || value === "folio" || value === "rail" || value === "anchor"
}

/** Map legacy style ids from earlier builds so old storage still works. */
export function migrateLayoutStyle(value: unknown): LayoutStyle {
  if (isLayoutStyle(value)) {
    return value
  }
  switch (value) {
    case "center":
    case "poster":
      return "quiet"
    case "leading":
      return "folio"
    case "split":
      return "rail"
    case "monument":
      return "anchor"
    default:
      return DEFAULT_SETTINGS.layoutStyle
  }
}

export function resolveTheme(mode: ThemeMode = "auto"): ResolvedTheme {
  if (mode === "light") {
    return {
      mode,
      background: { light: WHITE, dark: WHITE },
      foreground: BLACK,
      secondary: GRAY,
      tertiary: LIGHT_TERTIARY,
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
      preferredColorScheme: "dark",
    }
  }

  return {
    mode: "auto",
    background: { light: WHITE, dark: BLACK },
    foreground: { light: BLACK, dark: WHITE },
    secondary: { light: GRAY, dark: GRAY },
    tertiary: { light: LIGHT_TERTIARY, dark: DARK_TERTIARY },
  }
}

export function normalizeSettings(raw: Partial<Settings> | null | undefined): Settings {
  const themeMode =
    raw?.themeMode === "light" || raw?.themeMode === "dark" || raw?.themeMode === "auto"
      ? raw.themeMode
      : DEFAULT_SETTINGS.themeMode

  const layoutStyle = migrateLayoutStyle(raw?.layoutStyle)

  const birthDate = isValidISODate(raw?.birthDate ?? "") ? (raw?.birthDate as string) : ""
  const quoteSeed =
    typeof raw?.quoteSeed === "number" && Number.isFinite(raw.quoteSeed)
      ? Math.floor(raw.quoteSeed)
      : DEFAULT_SETTINGS.quoteSeed

  const backgroundImagePath =
    typeof raw?.backgroundImagePath === "string" && raw.backgroundImagePath.trim().length > 0
      ? raw.backgroundImagePath.trim()
      : ""

  return {
    themeMode,
    layoutStyle,
    birthDate,
    quoteSeed,
    backgroundImagePath: isBackgroundImageValid(backgroundImagePath) ? backgroundImagePath : "",
  }
}

export function isValidISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }
  const parsed = parseISODateLocal(value)
  if (!parsed) {
    return false
  }
  const today = startOfLocalDay(new Date())
  return parsed.getTime() <= today.getTime()
}

export function parseISODateLocal(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) {
    return null
  }
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null
  }
  const date = new Date(year, month - 1, day)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }
  return startOfLocalDay(date)
}

export function toISODateLocal(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/** Inclusive natural-day count: birthday itself counts as day 1. */
export function countLivedDays(birthISO: string, now = new Date()): number | null {
  const birth = parseISODateLocal(birthISO)
  if (!birth) {
    return null
  }
  const today = startOfLocalDay(now)
  if (birth.getTime() > today.getTime()) {
    return null
  }
  const ms = today.getTime() - birth.getTime()
  return Math.floor(ms / 86_400_000) + 1
}

export function countAgeYears(birthISO: string, now = new Date()): number | null {
  const birth = parseISODateLocal(birthISO)
  if (!birth) {
    return null
  }
  const today = startOfLocalDay(now)
  if (birth.getTime() > today.getTime()) {
    return null
  }

  let years = today.getFullYear() - birth.getFullYear()
  const monthDelta = today.getMonth() - birth.getMonth()
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birth.getDate())) {
    years -= 1
  }
  return Math.max(0, years)
}

export function formatBirthLabel(birthISO: string): string {
  const birth = parseISODateLocal(birthISO)
  if (!birth) {
    return ""
  }
  return `${birth.getFullYear()}年${birth.getMonth() + 1}月${birth.getDate()}日`
}

/** Widget hero digits — no grouping separators, more poster-like. */
export function formatDaysLabel(days: number): string {
  return String(Math.max(0, Math.floor(days)))
}

export function formatDaysLabelReadable(days: number): string {
  return Math.max(0, Math.floor(days)).toLocaleString("zh-CN")
}

export function formatAgeLabel(years: number): string {
  return `约 ${years} 岁`
}

export function formatMetaLabel(birthISO: string, now = new Date()): string {
  const years = countAgeYears(birthISO, now)
  const birthLabel = formatBirthLabel(birthISO)
  if (years == null || !birthLabel) {
    return ""
  }
  return `${formatAgeLabel(years)} · 出生于 ${birthLabel}`
}

export function pickInsight(days: number, settings: Settings, now = new Date()): string {
  for (const item of MILESTONE_INSIGHTS) {
    if (days === item.day) {
      return item.text
    }
  }

  // Exact thousand-day milestones beyond the curated list
  if (days >= 1000 && days % 1000 === 0) {
    return `${formatDaysLabelReadable(days)} 天，是个了不起的里程碑`
  }

  // Same birthday + same calendar day + same seed => same insight
  const key = `${toISODateLocal(now)}|${settings.birthDate}|${settings.quoteSeed}`
  const index = stableHash(key) % INSIGHTS.length
  return INSIGHTS[index]
}

function stableHash(input: string): number {
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0
  }
  return hash
}

export function nextMidnight(from = new Date()): Date {
  return new Date(from.getFullYear(), from.getMonth(), from.getDate() + 1, 0, 0, 1)
}

export function getLifeSnapshot(now = new Date(), settings = getSettings()): LifeSnapshot {
  const hasBirthDate = isValidISODate(settings.birthDate)
  const daysLived = hasBirthDate ? countLivedDays(settings.birthDate, now) : null
  const ageYears = hasBirthDate ? countAgeYears(settings.birthDate, now) : null
  const birthLabel = hasBirthDate ? formatBirthLabel(settings.birthDate) : ""
  const daysLabel = daysLived != null ? formatDaysLabel(daysLived) : "—"
  const daysLabelReadable = daysLived != null ? formatDaysLabelReadable(daysLived) : "—"
  const ageLabel = ageYears != null ? formatAgeLabel(ageYears) : ""
  const metaLabel =
    hasBirthDate && daysLived != null ? formatMetaLabel(settings.birthDate, now) : ""
  const insight = daysLived != null ? pickInsight(daysLived, settings, now) : EMPTY_GUIDE

  return {
    now,
    hasBirthDate: hasBirthDate && daysLived != null,
    birthDate: settings.birthDate,
    birthLabel,
    ageYears,
    ageLabel,
    metaLabel,
    daysLived,
    daysLabel,
    daysLabelReadable,
    tagline: FIXED_TAGLINE,
    insight,
    emptyGuide: EMPTY_GUIDE,
    emptyAction: EMPTY_ACTION,
    nextReloadAt: nextMidnight(now),
    debugLine:
      hasBirthDate && daysLived != null
        ? `出生：${birthLabel} · 已活 ${daysLabelReadable} 天`
        : "尚未设置生日",
  }
}

export function createAppURL(): string {
  return Script.createRunURLScheme(SCRIPT_NAME)
}

export function dateFromTimestamp(value: number): Date {
  return new Date(value)
}

export function timestampFromISODate(value: string): number {
  const parsed = parseISODateLocal(value)
  if (parsed) {
    return parsed.getTime()
  }
  const today = startOfLocalDay(new Date())
  return today.getTime()
}

export function clampBirthTimestamp(value: number): number {
  const date = startOfLocalDay(new Date(value))
  const today = startOfLocalDay(new Date())
  if (date.getTime() > today.getTime()) {
    return today.getTime()
  }
  const min = new Date(1900, 0, 1).getTime()
  if (date.getTime() < min) {
    return min
  }
  return date.getTime()
}
