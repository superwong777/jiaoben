import { Section, Text, VStack } from "scripting"
import type { TelegramAudience, ThemeMode, WidgetLayout } from "../../types"
import { WidgetView } from "../WidgetView"

// ==========================================
// App 内实时小组件预览
// 直接还原小组件样式（比 Widget.preview() 稳定精准）。
// ==========================================
export function WidgetPreviewCard({
  data,
  theme,
  layout,
}: {
  data: TelegramAudience | null
  theme: ThemeMode
  layout: WidgetLayout
}) {
  return (
    <Section header={<Text>实时小组件预览</Text>}>
      <VStack alignment="center" frame={{ maxWidth: Infinity }} padding={{ vertical: 12 }}>
        <VStack
          frame={{ width: 155, height: 155 }}
          clipShape={{ type: "rect", cornerRadius: 22 }}
          shadow={{ color: "rgba(0,0,0,0.15)", radius: 10, x: 0, y: 4 }}
        >
          <WidgetView data={data} error={undefined} theme={theme} layout={layout} />
        </VStack>
      </VStack>
    </Section>
  )
}
