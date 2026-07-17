// ==========================================
// 类型定义
// ==========================================

/** 主题模式 */
export type ThemeMode = "auto" | "light" | "dark"

/**
 * 小组件排版方案
 * - classic: 顶部标题 + 大数字 + 更新时间（默认）
 * - spotlight: 居中头像 + 紧凑数字 + 底部标题（参考 LIVE 样式）
 * - metric: 极简大数字，强调人数
 * - card: 左侧大头像 + 右侧信息
 */
export type WidgetLayout = "classic" | "spotlight" | "metric" | "card"

/** 受众类型 */
export type AudienceType = "订阅者" | "成员"

/** Telegram 频道/群组受众数据快照（公开可展示，非敏感） */
export type TelegramAudience = {
  /** 归一化后的展示用源标识（@username 或 t.me 链接） */
  source: string
  /** 抓取用的 t.me URL */
  url: string
  /** 频道/群组标题 */
  title: string
  /** 受众人数 */
  audience: number
  /** 千分位格式化后的人数文本 */
  audienceText: string
  /** 受众类型：订阅者 / 成员 */
  audienceType: AudienceType
  /** 头像 URL（可选） */
  avatarURL?: string
  /** 简介（可选） */
  description?: string
  /** 抓取时间戳 */
  fetchedAt: number
}

/** 设置页状态（结构化，避免用文案字符串判断） */
export type StatusState =
  | { type: "idle"; message: string }
  | { type: "loading"; message: string }
  | { type: "success"; message: string }
  | { type: "error"; message: string }
