import { Label, Section, Text, VStack, type Color } from "scripting"
import type { StatusState, TelegramAudience } from "../../types"
import { TELEGRAM_BLUE } from "../../theme"

// ==========================================
// 状态 + 结果摘要 Section
// ==========================================
function statusMeta(status: StatusState): { systemImage: string; color: Color } {
  switch (status.type) {
    case "success":
      return { systemImage: "checkmark.circle.fill", color: "green" }
    case "error":
      return { systemImage: "exclamationmark.triangle.fill", color: "orange" }
    case "loading":
      return { systemImage: "arrow.triangle.2.circlepath", color: TELEGRAM_BLUE }
    case "idle":
    default:
      return { systemImage: "info.circle", color: "secondaryLabel" }
  }
}

export function StatusSection({
  status,
  result,
}: {
  status: StatusState
  result: TelegramAudience | null
}) {
  const meta = statusMeta(status)
  return (
    <Section header={<Text>状态</Text>}>
      <Label
        title={status.message}
        systemImage={meta.systemImage}
        foregroundStyle={meta.color}
      />
      {result ? (
        <VStack alignment="leading" spacing={6} padding={{ vertical: 4 }}>
          <Text fontWeight="semibold">{result.title}</Text>
          <Text font={28} bold monospacedDigit foregroundStyle={TELEGRAM_BLUE}>
            {result.audienceText}
          </Text>
          <Text font="caption" foregroundStyle="secondaryLabel">
            {result.audienceType}
          </Text>
        </VStack>
      ) : null}
    </Section>
  )
}
