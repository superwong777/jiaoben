import type { WidgetLayout } from "./types"

export type LayoutOption = {
  id: WidgetLayout
  title: string
  description: string
}

/** 设置页可选排版列表 */
export const LAYOUT_OPTIONS: LayoutOption[] = [
  {
    id: "classic",
    title: "经典",
    description: "顶部标题，中间大数字，右下角更新时间",
  },
  {
    id: "spotlight",
    title: "焦点",
    description: "居中头像 + 紧凑数字，类似 LIVE 卡片",
  },
  {
    id: "metric",
    title: "指标",
    description: "极简大数字，弱化标题，强调人数",
  },
  {
    id: "card",
    title: "卡片",
    description: "左侧大头像，右侧标题与人数",
  },
]

export const DEFAULT_LAYOUT: WidgetLayout = "classic"

export function isWidgetLayout(value: unknown): value is WidgetLayout {
  return (
    value === "classic" ||
    value === "spotlight" ||
    value === "metric" ||
    value === "card"
  )
}
