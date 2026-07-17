import { Picker, Section, Text, VStack } from "scripting"
import type { WidgetLayout } from "../../types"
import { LAYOUT_OPTIONS } from "../../layout"

// ==========================================
// 小组件排版选择
// ==========================================
export function LayoutPicker({
  value,
  onChanged,
}: {
  value: WidgetLayout
  onChanged: (layout: WidgetLayout) => void
}) {
  const selected = LAYOUT_OPTIONS.find((item) => item.id === value)

  return (
    <Section
      header={<Text>排版方案</Text>}
      footer={<Text>切换后会立即刷新小组件与下方预览。</Text>}
    >
      <Picker
        title="当前排版"
        value={value}
        onChanged={(next: string) => onChanged(next as WidgetLayout)}
      >
        <Text tag="classic">经典</Text>
        <Text tag="spotlight">焦点</Text>
        <Text tag="metric">指标</Text>
        <Text tag="card">卡片</Text>
      </Picker>
      {selected ? (
        <VStack alignment="leading" spacing={3} padding={{ vertical: 4 }}>
          <Text font="caption" foregroundStyle="secondaryLabel">
            {selected.description}
          </Text>
        </VStack>
      ) : null}
    </Section>
  )
}
