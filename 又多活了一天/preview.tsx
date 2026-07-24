import { HStack, Picker, Spacer, Text, VStack, useState } from "scripting"
import { LifeWidgetView, type WidgetFamilyName } from "./layouts"
import {
  LAYOUT_OPTIONS,
  getLifeSnapshot,
  getSettings,
  resolveBackgroundImagePath,
  resolveDisplayTheme,
  type LayoutStyle,
  type Settings,
  type ThemeMode,
} from "./shared"

type PreviewSize = "small" | "medium" | "large"

const PREVIEW_SIZES: Array<{
  id: PreviewSize
  title: string
  family: WidgetFamilyName
  width?: number
  height: number
}> = [
  { id: "small", title: "小", family: "systemSmall", width: 158, height: 158 },
  { id: "medium", title: "中", family: "systemMedium", height: 158 },
  { id: "large", title: "大", family: "systemLarge", height: 340 },
]

/**
 * Side-effect-free default export for scripting-ts preview_ui.
 */
export default function PreviewView() {
  const stored = getSettings()
  const [themeMode, setThemeMode] = useState<ThemeMode>("auto")
  const [layoutStyle, setLayoutStyle] = useState<LayoutStyle>("quiet")
  const [size, setSize] = useState<PreviewSize>("small")

  const settings: Settings = {
    themeMode,
    layoutStyle,
    birthDate: "1998-06-15",
    quoteSeed: 1,
    backgroundImagePath: stored.backgroundImagePath,
  }
  const backgroundImagePath = resolveBackgroundImagePath(settings)
  const theme = resolveDisplayTheme(themeMode, backgroundImagePath.length > 0)
  const snapshot = getLifeSnapshot(new Date(), settings)
  const option = PREVIEW_SIZES.find((item) => item.id === size) ?? PREVIEW_SIZES[0]

  return (
    <VStack
      spacing={14}
      padding={20}
      frame={{ maxWidth: "infinity", maxHeight: "infinity", alignment: "top" }}
      background={theme.background}
      preferredColorScheme={theme.preferredColorScheme}
    >
      <Picker
        title="尺寸"
        value={size}
        onChanged={(value: string) => setSize(value as PreviewSize)}
        pickerStyle="segmented"
      >
        {PREVIEW_SIZES.map((item) => (
          <Text key={item.id} tag={item.id}>
            {item.title}
          </Text>
        ))}
      </Picker>

      <Picker
        title="排版"
        value={layoutStyle}
        onChanged={(value: string) => setLayoutStyle(value as LayoutStyle)}
        pickerStyle="segmented"
      >
        {LAYOUT_OPTIONS.map((item) => (
          <Text key={item.id} tag={item.id}>
            {item.title}
          </Text>
        ))}
      </Picker>

      <HStack frame={{ maxWidth: "infinity" }}>
        {option.width ? <Spacer /> : null}
        <LifeWidgetView
          snapshot={snapshot}
          theme={theme}
          family={option.family}
          layoutStyle={layoutStyle}
          backgroundImagePath={backgroundImagePath}
          frameWidth={option.width}
          frameHeight={option.height}
        />
        {option.width ? <Spacer /> : null}
      </HStack>

      <Picker
        title="主题"
        value={themeMode}
        onChanged={(value: string) => setThemeMode(value as ThemeMode)}
        pickerStyle="segmented"
      >
        <Text tag="auto">自动</Text>
        <Text tag="light">浅色</Text>
        <Text tag="dark">深色</Text>
      </Picker>

      <Text font={12} foregroundStyle={theme.secondary} opacity={0.7}>
        {snapshot.debugLine}
        {backgroundImagePath ? " · 已使用自定义背景" : ""}
      </Text>
    </VStack>
  )
}
