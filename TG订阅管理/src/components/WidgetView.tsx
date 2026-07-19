import { HStack, Image, Spacer, Text, VStack, type Color, type VirtualNode } from "scripting"
import type { TelegramAudience, ThemeMode, WidgetLayout } from "../types"
import { resolveTheme, TELEGRAM_BLUE, type ThemeColors } from "../theme"
import { formatAudienceCompact, formatUpdateTime } from "../format"

export const SETTINGS_URL = "scripting://run"

type WidgetViewProps = {
  data: TelegramAudience | null
  error?: string
  theme: ThemeMode
  layout?: WidgetLayout
  /** Widget 环境传入交互按钮；App 内预览不传，渲染纯图标 */
  refreshButton?: VirtualNode
}

function RefreshIcon() {
  return (
    <Image
      systemName="paperplane.fill"
      font={10}
      fontWeight="semibold"
      foregroundStyle="#FFFFFF"
      frame={{ width: 22, height: 22 }}
      background={{ style: TELEGRAM_BLUE, shape: "circle" }}
      clipShape="circle"
    />
  )
}

function Avatar({
  url,
  size,
  accent,
}: {
  url?: string
  size: number
  accent: Color
}) {
  if (url) {
    return (
      <Image
        imageUrl={url}
        resizable
        scaleToFill
        frame={{ width: size, height: size }}
        clipShape="circle"
        placeholder={
          <Image
            systemName="paperplane.circle.fill"
            foregroundStyle={accent}
            font={size}
            frame={{ width: size, height: size }}
          />
        }
      />
    )
  }
  return (
    <Image
      systemName="paperplane.circle.fill"
      foregroundStyle={accent}
      font={size}
      frame={{ width: size, height: size }}
    />
  )
}

function EmptyState({
  colors,
  error,
}: {
  colors: ThemeColors
  error?: string
}) {
  return (
    <VStack
      alignment="center"
      spacing={10}
      padding={14}
      frame={{ maxWidth: Infinity, maxHeight: Infinity, alignment: "center" }}
      background={colors.background}
      widgetURL={SETTINGS_URL}
    >
      <Image systemName="paperplane.circle.fill" foregroundStyle={colors.accent} font={34} />
      <Text font={15} fontWeight="semibold" foregroundStyle={colors.text}>
        尚未配置
      </Text>
      <Text font="caption2" foregroundStyle={colors.subText} multilineTextAlignment="center">
        {error ?? "点击此处运行脚本配置"}
      </Text>
    </VStack>
  )
}

/** 经典：顶部标题 + 大数字 + 右下更新时间 */
function ClassicLayout({
  data,
  error,
  colors,
  refreshControl,
}: {
  data: TelegramAudience
  error?: string
  colors: ThemeColors
  refreshControl: VirtualNode
}) {
  return (
    <VStack
      alignment="leading"
      spacing={0}
      padding={{ horizontal: 15, top: 14, bottom: 12 }}
      frame={{ maxWidth: Infinity, maxHeight: Infinity, alignment: "topLeading" }}
      background={colors.background}
      widgetURL={SETTINGS_URL}
    >
      <HStack frame={{ maxWidth: Infinity }} alignment="center">
        <HStack spacing={6} alignment="center">
          <Avatar url={data.avatarURL} size={22} accent={colors.accent} />
          <Text font={12} fontWeight="bold" lineLimit={1} foregroundStyle={colors.text}>
            {data.title}
          </Text>
        </HStack>
        <Spacer />
        {error ? (
          <Text font="caption2" foregroundStyle="orange" padding={{ trailing: 4 }}>
            ⚠️
          </Text>
        ) : null}
        {refreshControl}
      </HStack>

      <Spacer />

      <Text
        font={38}
        fontWeight="heavy"
        fontDesign="rounded"
        monospacedDigit
        lineLimit={1}
        minScaleFactor={0.5}
        foregroundStyle={colors.text}
      >
        {data.audienceText}
      </Text>

      <Spacer />

      <HStack frame={{ maxWidth: Infinity }} alignment="bottom">
        <Text font={9} fontWeight="medium" foregroundStyle={colors.subText}>
          {data.audienceType}
        </Text>
        <Spacer />
        <Text font={9} fontWeight="semibold" foregroundStyle={colors.subText}>
          {"已更新 " + formatUpdateTime(data.fetchedAt)}
        </Text>
      </HStack>
    </VStack>
  )
}

/**
 * 焦点：参考 LIVE 卡片
 * 左上 LIVE 点 + 右上飞机按钮
 * 中间大头像 + 紧凑数字 + 底部标题
 */
function SpotlightLayout({
  data,
  error,
  colors,
  refreshControl,
}: {
  data: TelegramAudience
  error?: string
  colors: ThemeColors
  refreshControl: VirtualNode
}) {
  return (
    <VStack
      alignment="center"
      spacing={0}
      padding={{ horizontal: 12, top: 12, bottom: 12 }}
      frame={{ maxWidth: Infinity, maxHeight: Infinity, alignment: "center" }}
      background={colors.background}
      widgetURL={SETTINGS_URL}
    >
      <HStack frame={{ maxWidth: Infinity }} alignment="center">
        <HStack spacing={4} alignment="center">
          <VStack
            frame={{ width: 7, height: 7 }}
            background={{ style: TELEGRAM_BLUE, shape: "circle" }}
            clipShape="circle"
          />
          <Text font={10} fontWeight="bold" foregroundStyle={colors.subText}>
            LIVE
          </Text>
        </HStack>
        <Spacer />
        {error ? (
          <Text font="caption2" foregroundStyle="orange" padding={{ trailing: 4 }}>
            ⚠️
          </Text>
        ) : null}
        {refreshControl}
      </HStack>

      <Spacer />

      <Avatar url={data.avatarURL} size={48} accent={colors.accent} />

      <Text
        font={30}
        fontWeight="heavy"
        fontDesign="rounded"
        monospacedDigit
        lineLimit={1}
        minScaleFactor={0.6}
        foregroundStyle={colors.text}
        padding={{ top: 8 }}
      >
        {formatAudienceCompact(data.audience)}
      </Text>

      <Spacer />

      <Text
        font={12}
        fontWeight="medium"
        lineLimit={1}
        minScaleFactor={0.7}
        foregroundStyle={colors.subText}
      >
        {data.title}
      </Text>
    </VStack>
  )
}

/** 指标：极简大数字，弱化标题 */
function MetricLayout({
  data,
  error,
  colors,
  refreshControl,
}: {
  data: TelegramAudience
  error?: string
  colors: ThemeColors
  refreshControl: VirtualNode
}) {
  return (
    <VStack
      alignment="leading"
      spacing={0}
      padding={{ horizontal: 14, top: 12, bottom: 12 }}
      frame={{ maxWidth: Infinity, maxHeight: Infinity, alignment: "topLeading" }}
      background={colors.background}
      widgetURL={SETTINGS_URL}
    >
      <HStack frame={{ maxWidth: Infinity }} alignment="center">
        <Text font={11} fontWeight="semibold" foregroundStyle={colors.subText} lineLimit={1}>
          {data.audienceType}
        </Text>
        <Spacer />
        {error ? (
          <Text font="caption2" foregroundStyle="orange" padding={{ trailing: 4 }}>
            ⚠️
          </Text>
        ) : null}
        {refreshControl}
      </HStack>

      <Spacer />

      <Text
        font={42}
        fontWeight="heavy"
        fontDesign="rounded"
        monospacedDigit
        lineLimit={1}
        minScaleFactor={0.45}
        foregroundStyle={colors.text}
      >
        {formatAudienceCompact(data.audience)}
      </Text>

      <Text
        font={12}
        fontWeight="semibold"
        lineLimit={1}
        foregroundStyle={colors.text}
        padding={{ top: 2 }}
      >
        {data.title}
      </Text>

      <Spacer />

      <Text font={9} fontWeight="medium" foregroundStyle={colors.subText}>
        {"已更新 " + formatUpdateTime(data.fetchedAt)}
      </Text>
    </VStack>
  )
}

/** 卡片：左侧大头像 + 右侧信息 */
function CardLayout({
  data,
  error,
  colors,
  refreshControl,
}: {
  data: TelegramAudience
  error?: string
  colors: ThemeColors
  refreshControl: VirtualNode
}) {
  return (
    <VStack
      alignment="leading"
      spacing={0}
      padding={12}
      frame={{ maxWidth: Infinity, maxHeight: Infinity, alignment: "topLeading" }}
      background={colors.background}
      widgetURL={SETTINGS_URL}
    >
      <HStack frame={{ maxWidth: Infinity }} alignment="center">
        <Spacer />
        {error ? (
          <Text font="caption2" foregroundStyle="orange" padding={{ trailing: 4 }}>
            ⚠️
          </Text>
        ) : null}
        {refreshControl}
      </HStack>

      <Spacer />

      <HStack spacing={10} alignment="center" frame={{ maxWidth: Infinity }}>
        <Avatar url={data.avatarURL} size={52} accent={colors.accent} />
        <VStack alignment="leading" spacing={2} frame={{ maxWidth: Infinity, alignment: "leading" }}>
          <Text font={12} fontWeight="bold" lineLimit={2} foregroundStyle={colors.text}>
            {data.title}
          </Text>
          <Text
            font={26}
            fontWeight="heavy"
            fontDesign="rounded"
            monospacedDigit
            lineLimit={1}
            minScaleFactor={0.55}
            foregroundStyle={colors.text}
          >
            {formatAudienceCompact(data.audience)}
          </Text>
          <Text font={10} fontWeight="medium" foregroundStyle={colors.subText}>
            {data.audienceType + " · " + formatUpdateTime(data.fetchedAt)}
          </Text>
        </VStack>
      </HStack>

      <Spacer />
    </VStack>
  )
}

export function WidgetView({
  data,
  error,
  theme,
  layout = "classic",
  refreshButton,
}: WidgetViewProps) {
  const colors = resolveTheme(theme)
  const refreshControl = refreshButton ?? <RefreshIcon />

  if (!data) {
    return <EmptyState colors={colors} error={error} />
  }

  switch (layout) {
    case "spotlight":
      return (
        <SpotlightLayout
          data={data}
          error={error}
          colors={colors}
          refreshControl={refreshControl}
        />
      )
    case "metric":
      return (
        <MetricLayout
          data={data}
          error={error}
          colors={colors}
          refreshControl={refreshControl}
        />
      )
    case "card":
      return (
        <CardLayout
          data={data}
          error={error}
          colors={colors}
          refreshControl={refreshControl}
        />
      )
    case "classic":
    default:
      return (
        <ClassicLayout
          data={data}
          error={error}
          colors={colors}
          refreshControl={refreshControl}
        />
      )
  }
}
