import type { Color, LinearGradient } from "scripting"
import type { ThemeMode } from "./types"

export const TELEGRAM_BLUE = "#229ED9"

export type ThemeColors = {
  background: Color | LinearGradient
  text: Color
  subText: Color
  accent: Color
  controlBackground: Color
}

export function resolveTheme(mode: ThemeMode): ThemeColors {
  if (mode === "dark") {
    return {
      background: {
        colors: ["#18191B", "#111214"],
        startPoint: { x: 0.5, y: 0 },
        endPoint: { x: 0.5, y: 1 },
      },
      text: "#FFFFFF",
      subText: "#8E8E93",
      accent: TELEGRAM_BLUE,
      controlBackground: "rgba(255,255,255,0.08)",
    }
  }
  if (mode === "light") {
    return {
      background: {
        colors: ["#F9FBFC", "#F0F4F8"],
        startPoint: { x: 0.5, y: 0 },
        endPoint: { x: 0.5, y: 1 },
      },
      text: "#1C1C1E",
      subText: "#8E8E93",
      accent: TELEGRAM_BLUE,
      controlBackground: "rgba(0,0,0,0.04)",
    }
  }
  // auto：跟随系统语义色
  return {
    background: "systemBackground",
    text: "label",
    subText: "secondaryLabel",
    accent: TELEGRAM_BLUE,
    controlBackground: "quaternarySystemFill",
  }
}
