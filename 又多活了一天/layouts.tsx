import { HStack, Image, Rectangle, Spacer, Text, VStack, ZStack } from "scripting"
import {
  BACKGROUND_SCRIM_OPACITY,
  HERO_PREFIX,
  HERO_UNIT,
  isBackgroundImageValid,
  type LayoutStyle,
  type LifeSnapshot,
  type ResolvedTheme,
} from "./shared"

export type WidgetFamilyName = "systemSmall" | "systemMedium" | "systemLarge" | string

type SizeTokens = {
  days: number
  unit: number
  prefix: number
  tagline: number
  insight: number
  meta: number
  padding: number
  gap: number
}

function sizeTokensForFamily(family: WidgetFamilyName, style: LayoutStyle): SizeTokens {
  const bigNumber = style === "quiet" || style === "anchor"

  if (family === "systemLarge") {
    return {
      days: bigNumber ? 78 : 68,
      unit: 20,
      prefix: 14,
      tagline: 15,
      insight: 14,
      meta: 12,
      padding: 22,
      gap: 8,
    }
  }

  if (family === "systemMedium") {
    return {
      days: bigNumber ? 56 : 48,
      unit: 17,
      prefix: 13,
      tagline: 13,
      insight: 12,
      meta: 11,
      padding: 16,
      gap: 6,
    }
  }

  // Small square — keep type hierarchy readable, not crowded
  return {
    days: bigNumber ? 36 : 32,
    unit: 13,
    prefix: 11,
    tagline: 11,
    insight: 10,
    meta: 10,
    padding: 14,
    gap: 4,
  }
}

export function LifeWidgetView({
  snapshot,
  theme,
  family,
  layoutStyle = "quiet",
  backgroundImagePath = "",
  frameWidth,
  frameHeight,
  widgetURL,
}: {
  snapshot: LifeSnapshot
  theme: ResolvedTheme
  family: WidgetFamilyName
  layoutStyle?: LayoutStyle
  /** App Group local image path; empty means solid theme background. */
  backgroundImagePath?: string
  /** Explicit width for in-app previews (keeps small from stretching full-width). */
  frameWidth?: number
  frameHeight?: number
  widgetURL?: string
}) {
  const tokens = sizeTokensForFamily(family, layoutStyle)
  const filled = snapshot.hasBirthDate && snapshot.daysLived != null
  const photoPath = isBackgroundImageValid(backgroundImagePath) ? backgroundImagePath : ""
  const hasPhoto = photoPath.length > 0

  return (
    <ZStack
      frame={{
        width: frameWidth,
        height: frameHeight,
        maxWidth: frameWidth ? undefined : "infinity",
        maxHeight: frameHeight ? undefined : "infinity",
      }}
      widgetBackground={theme.background}
      preferredColorScheme={theme.preferredColorScheme}
      widgetURL={widgetURL}
      clipShape={
        frameWidth || frameHeight
          ? {
              type: "rect",
              cornerRadius: 22,
            }
          : undefined
      }
    >
      {hasPhoto ? (
        <Image
          filePath={photoPath}
          resizable
          scaleToFill
          frame={{ maxWidth: "infinity", maxHeight: "infinity" }}
          widgetAccentedRenderingMode="fullColor"
        />
      ) : null}
      {hasPhoto ? (
        <Rectangle
          fill="rgb(0, 0, 0)"
          opacity={BACKGROUND_SCRIM_OPACITY}
          frame={{ maxWidth: "infinity", maxHeight: "infinity" }}
        />
      ) : null}

      {filled ? (
        layoutStyle === "folio" ? (
          <FolioLayout snapshot={snapshot} theme={theme} tokens={tokens} family={family} />
        ) : layoutStyle === "rail" ? (
          <RailLayout snapshot={snapshot} theme={theme} tokens={tokens} family={family} />
        ) : layoutStyle === "anchor" ? (
          <AnchorLayout snapshot={snapshot} theme={theme} tokens={tokens} family={family} />
        ) : (
          <QuietLayout snapshot={snapshot} theme={theme} tokens={tokens} family={family} />
        )
      ) : (
        <EmptyLayout
          snapshot={snapshot}
          theme={theme}
          tokens={tokens}
          style={layoutStyle}
          family={family}
        />
      )}
    </ZStack>
  )
}

function isSmall(family: WidgetFamilyName): boolean {
  return family !== "systemMedium" && family !== "systemLarge"
}

function isLarge(family: WidgetFamilyName): boolean {
  return family === "systemLarge"
}

/**
 * Small is tight: keep meaning first (prefix + days + 天 + tagline).
 * Insight only as a single compressed line when the composition has room.
 * Medium/large can breathe more.
 */
function densityFor(family: WidgetFamilyName) {
  const small = isSmall(family)
  return {
    small,
    showTagline: true,
    showInsight: true,
    insightLines: small ? 1 : isLarge(family) ? 2 : 1,
    showMeta: isLarge(family),
  }
}

function PrefixLine({
  theme,
  tokens,
  align = "center",
}: {
  theme: ResolvedTheme
  tokens: SizeTokens
  align?: "leading" | "center" | "trailing"
}) {
  return (
    <Text
      font={tokens.prefix}
      fontWeight="regular"
      foregroundStyle={theme.secondary}
      multilineTextAlignment={align}
      frame={{ maxWidth: "infinity", alignment: align }}
      opacity={0.82}
      lineLimit={1}
    >
      {HERO_PREFIX}
    </Text>
  )
}

function DaysWithUnit({
  snapshot,
  theme,
  tokens,
  align = "center",
}: {
  snapshot: LifeSnapshot
  theme: ResolvedTheme
  tokens: SizeTokens
  align?: "leading" | "center" | "trailing"
}) {
  return (
    <HStack
      spacing={4}
      alignment="lastTextBaseline"
      frame={{ maxWidth: "infinity", alignment: align }}
    >
      <Text
        font={tokens.days}
        fontWeight="bold"
        fontDesign="monospaced"
        monospacedDigit
        foregroundStyle={theme.foreground}
        lineLimit={1}
        minScaleFactor={0.28}
      >
        {snapshot.daysLabel}
      </Text>
      <Text
        font={tokens.unit}
        fontWeight="semibold"
        foregroundStyle={theme.foreground}
        opacity={0.92}
      >
        {HERO_UNIT}
      </Text>
    </HStack>
  )
}

function TaglineLine({
  snapshot,
  theme,
  tokens,
  align = "center",
}: {
  snapshot: LifeSnapshot
  theme: ResolvedTheme
  tokens: SizeTokens
  align?: "leading" | "center" | "trailing"
}) {
  return (
    <Text
      font={tokens.tagline}
      fontWeight="regular"
      foregroundStyle={theme.secondary}
      multilineTextAlignment={align}
      frame={{ maxWidth: "infinity", alignment: align }}
      opacity={0.78}
      lineLimit={1}
      minScaleFactor={0.78}
    >
      {snapshot.tagline}
    </Text>
  )
}

function InsightLine({
  snapshot,
  theme,
  tokens,
  align = "center",
  lines = 1,
}: {
  snapshot: LifeSnapshot
  theme: ResolvedTheme
  tokens: SizeTokens
  align?: "leading" | "center" | "trailing"
  lines?: number
}) {
  return (
    <Text
      font={tokens.insight}
      fontWeight="medium"
      foregroundStyle={theme.secondary}
      multilineTextAlignment={align}
      frame={{ maxWidth: "infinity", alignment: align }}
      opacity={0.62}
      lineLimit={lines}
      minScaleFactor={0.72}
    >
      {snapshot.insight}
    </Text>
  )
}

/** 静默：居中，语义完整但呼吸感强 */
function QuietLayout({
  snapshot,
  theme,
  tokens,
  family,
}: {
  snapshot: LifeSnapshot
  theme: ResolvedTheme
  tokens: SizeTokens
  family: WidgetFamilyName
}) {
  const density = densityFor(family)

  return (
    <VStack
      spacing={tokens.gap}
      padding={tokens.padding}
      frame={{ maxWidth: "infinity", maxHeight: "infinity", alignment: "center" }}
    >
      <Spacer minLength={2} />
      <PrefixLine theme={theme} tokens={tokens} align="center" />
      <DaysWithUnit snapshot={snapshot} theme={theme} tokens={tokens} align="center" />
      <TaglineLine snapshot={snapshot} theme={theme} tokens={tokens} align="center" />
      {/* Small: skip insight so center stack stays calm; medium+ get one line. */}
      {!density.small ? (
        <InsightLine
          snapshot={snapshot}
          theme={theme}
          tokens={tokens}
          align="center"
          lines={density.insightLines}
        />
      ) : null}
      {density.showMeta ? (
        <Text
          font={tokens.meta}
          fontWeight="regular"
          foregroundStyle={theme.secondary}
          multilineTextAlignment="center"
          opacity={0.42}
          lineLimit={1}
        >
          {snapshot.metaLabel}
        </Text>
      ) : null}
      <Spacer minLength={2} />
    </VStack>
  )
}

/** 页码：角标轻提，数字落在右下，语义仍完整 */
function FolioLayout({
  snapshot,
  theme,
  tokens,
  family,
}: {
  snapshot: LifeSnapshot
  theme: ResolvedTheme
  tokens: SizeTokens
  family: WidgetFamilyName
}) {
  const density = densityFor(family)

  return (
    <VStack
      spacing={0}
      padding={tokens.padding}
      frame={{ maxWidth: "infinity", maxHeight: "infinity", alignment: "leading" }}
    >
      <HStack frame={{ maxWidth: "infinity" }}>
        <Text
          font={tokens.meta}
          fontWeight="semibold"
          fontDesign="monospaced"
          foregroundStyle={theme.secondary}
          opacity={0.5}
        >
          DAY
        </Text>
        <Spacer />
        {!density.small && snapshot.ageLabel ? (
          <Text font={tokens.meta} fontWeight="regular" foregroundStyle={theme.secondary} opacity={0.42}>
            {snapshot.ageLabel}
          </Text>
        ) : null}
      </HStack>

      <Spacer />

      <VStack spacing={tokens.gap} frame={{ maxWidth: "infinity", alignment: "trailing" }}>
        <PrefixLine theme={theme} tokens={tokens} align="trailing" />
        <DaysWithUnit snapshot={snapshot} theme={theme} tokens={tokens} align="trailing" />
        <TaglineLine snapshot={snapshot} theme={theme} tokens={tokens} align="trailing" />
        {/* Small gets one compressed insight under the right-aligned stack. */}
        <InsightLine
          snapshot={snapshot}
          theme={theme}
          tokens={tokens}
          align="trailing"
          lines={density.insightLines}
        />
      </VStack>
    </VStack>
  )
}

/** 刻度：顶栏 + 细线 + 数字，像时间刻度 */
function RailLayout({
  snapshot,
  theme,
  tokens,
  family,
}: {
  snapshot: LifeSnapshot
  theme: ResolvedTheme
  tokens: SizeTokens
  family: WidgetFamilyName
}) {
  const density = densityFor(family)

  return (
    <VStack
      spacing={0}
      padding={tokens.padding}
      frame={{ maxWidth: "infinity", maxHeight: "infinity", alignment: "leading" }}
    >
      <PrefixLine theme={theme} tokens={tokens} align="leading" />

      <Rectangle
        fill={theme.secondary}
        frame={{ maxWidth: "infinity", height: 1 }}
        opacity={0.2}
        padding={{ top: 7, bottom: density.small ? 7 : 9 }}
      />

      <DaysWithUnit snapshot={snapshot} theme={theme} tokens={tokens} align="leading" />

      <VStack spacing={4} padding={{ top: tokens.gap + 2 }} frame={{ maxWidth: "infinity", alignment: "leading" }}>
        <TaglineLine snapshot={snapshot} theme={theme} tokens={tokens} align="leading" />
        {/* Small: keep insight — rail has vertical room after the number. */}
        <InsightLine
          snapshot={snapshot}
          theme={theme}
          tokens={tokens}
          align="leading"
          lines={density.insightLines}
        />
        {density.showMeta ? (
          <Text
            font={tokens.meta}
            fontWeight="regular"
            foregroundStyle={theme.secondary}
            opacity={0.42}
            lineLimit={1}
          >
            {snapshot.metaLabel}
          </Text>
        ) : null}
      </VStack>

      {density.small ? <Spacer /> : null}
    </VStack>
  )
}

/** 留白：上空气，文字轻轻落在下方（原「丰碑」构图，语气改暖） */
function AnchorLayout({
  snapshot,
  theme,
  tokens,
  family,
}: {
  snapshot: LifeSnapshot
  theme: ResolvedTheme
  tokens: SizeTokens
  family: WidgetFamilyName
}) {
  const density = densityFor(family)

  return (
    <VStack
      spacing={0}
      padding={tokens.padding}
      frame={{ maxWidth: "infinity", maxHeight: "infinity", alignment: "leading" }}
    >
      <Spacer />

      <VStack spacing={tokens.gap} frame={{ maxWidth: "infinity", alignment: "leading" }}>
        <PrefixLine theme={theme} tokens={tokens} align="leading" />
        <DaysWithUnit snapshot={snapshot} theme={theme} tokens={tokens} align="leading" />
        <TaglineLine snapshot={snapshot} theme={theme} tokens={tokens} align="leading" />
        {/* Small has bottom air here — one soft insight line is fine. */}
        <InsightLine
          snapshot={snapshot}
          theme={theme}
          tokens={tokens}
          align="leading"
          lines={density.insightLines}
        />
        {density.showMeta ? (
          <Text
            font={tokens.meta}
            fontWeight="regular"
            foregroundStyle={theme.secondary}
            opacity={0.42}
            lineLimit={1}
          >
            {snapshot.metaLabel}
          </Text>
        ) : null}
      </VStack>
    </VStack>
  )
}

function EmptyLayout({
  snapshot,
  theme,
  tokens,
  style,
  family,
}: {
  snapshot: LifeSnapshot
  theme: ResolvedTheme
  tokens: SizeTokens
  style: LayoutStyle
  family: WidgetFamilyName
}) {
  const align =
    style === "folio" ? "trailing" : style === "quiet" ? "center" : "leading"
  const stackAlign = align === "center" ? "center" : align === "trailing" ? "trailing" : "leading"

  return (
    <VStack
      spacing={0}
      padding={tokens.padding}
      frame={{ maxWidth: "infinity", maxHeight: "infinity", alignment: stackAlign }}
    >
      {style === "anchor" || style === "folio" ? <Spacer /> : null}

      {style === "folio" ? (
        <HStack frame={{ maxWidth: "infinity" }} padding={{ bottom: 8 }}>
          <Text
            font={tokens.meta}
            fontWeight="semibold"
            fontDesign="monospaced"
            foregroundStyle={theme.secondary}
            opacity={0.45}
          >
            DAY
          </Text>
          <Spacer />
        </HStack>
      ) : null}

      <VStack spacing={tokens.gap} frame={{ maxWidth: "infinity", alignment: stackAlign }}>
        <PrefixLine theme={theme} tokens={tokens} align={align} />
        <Text
          font={tokens.days * 0.7}
          fontWeight="semibold"
          fontDesign="monospaced"
          foregroundStyle={theme.tertiary}
          frame={{ maxWidth: "infinity", alignment: stackAlign }}
        >
          —
        </Text>
        <Text
          font={tokens.tagline}
          fontWeight="regular"
          foregroundStyle={theme.secondary}
          multilineTextAlignment={align}
          frame={{ maxWidth: "infinity", alignment: stackAlign }}
          opacity={0.78}
          lineLimit={2}
          minScaleFactor={0.8}
        >
          {isSmall(family) ? snapshot.emptyAction : snapshot.emptyGuide}
        </Text>
      </VStack>

      {style === "quiet" || style === "rail" ? <Spacer /> : null}
    </VStack>
  )
}
