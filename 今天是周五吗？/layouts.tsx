import {
  Circle,
  HStack,
  Spacer,
  Text,
  VStack,
  ZStack,
} from "scripting"
import type {
  FridaySnapshot,
  LayoutStyle,
  ResolvedTheme,
  WidgetFamilyName,
} from "./shared"

type TextAlign = "leading" | "center"
type FontWeight = "regular" | "medium" | "semibold" | "bold" | "heavy" | "black"

export type SizeTokens = {
  answer: number
  eyebrow: number
  date: number
  quote: number
  padding: number
  /** 问题与答案之间：紧 */
  gapQuestionAnswer: number
  /** 答案组与下方信息组：松 */
  gapAnswerGroup: number
  /** 日期与文案：稍紧 */
  gapDateQuote: number
  particleCount: number
  showDate: boolean
}

export function sizeTokensForFamily(family: WidgetFamilyName | string): SizeTokens {
  switch (family) {
    case "systemLarge":
      return {
        answer: 84,
        eyebrow: 13,
        date: 13,
        quote: 16,
        padding: 22,
        gapQuestionAnswer: 6,
        gapAnswerGroup: 16,
        gapDateQuote: 6,
        particleCount: 5,
        showDate: true,
      }
    case "systemMedium":
      return {
        answer: 58,
        eyebrow: 12,
        date: 12,
        quote: 14,
        padding: 18,
        gapQuestionAnswer: 4,
        gapAnswerGroup: 12,
        gapDateQuote: 5,
        particleCount: 4,
        showDate: true,
      }
    default:
      return {
        answer: 42,
        eyebrow: 11,
        date: 11,
        quote: 12,
        padding: 14,
        gapQuestionAnswer: 3,
        gapAnswerGroup: 8,
        gapDateQuote: 4,
        particleCount: 3,
        showDate: false,
      }
  }
}

export function resolveLayoutStyle(
  style: LayoutStyle,
  family: WidgetFamilyName | string
): LayoutStyle {
  if (style === "split" && family === "systemSmall") {
    return "center"
  }
  return style
}

/** 周五答案略放大，非周五略收敛 */
function answerFontSize(base: number, isFriday: boolean, boost = 1): number {
  const scale = isFriday ? 1.06 : 0.96
  return Math.round(base * scale * boost)
}

function answerWeight(isFriday: boolean): FontWeight {
  return isFriday ? "heavy" : "bold"
}

/**
 * 角落粒子：不对称、更淡、避开中央文字。
 * 相对中心的偏移（point）。
 */
function cornerParticleSpecs(count: number) {
  const pool = [
    { x: -52, y: -38, size: 3.5, opacity: 0.28 },
    { x: -38, y: -50, size: 2.2, opacity: 0.18 },
    { x: 48, y: -42, size: 2.8, opacity: 0.22 },
    { x: 58, y: 40, size: 3.2, opacity: 0.26 },
    { x: 42, y: 52, size: 2, opacity: 0.16 },
    { x: -46, y: 46, size: 2.5, opacity: 0.2 },
    { x: -58, y: 30, size: 1.8, opacity: 0.14 },
  ]
  return pool.slice(0, Math.max(0, Math.min(count, pool.length)))
}

function FridayParticles({
  count,
  theme,
}: {
  count: number
  theme: ResolvedTheme
}) {
  if (count <= 0) {
    return <ZStack />
  }

  const specs = cornerParticleSpecs(count)

  return (
    <ZStack frame={{ maxWidth: "infinity", maxHeight: "infinity" }}>
      {specs.map((spec, index) => (
        <Circle
          key={`p-${index}`}
          fill={theme.particle}
          frame={{ width: spec.size, height: spec.size }}
          offset={{ x: spec.x, y: spec.y }}
          opacity={spec.opacity}
        />
      ))}
    </ZStack>
  )
}

function LineText({
  text,
  font,
  color,
  align,
  weight = "regular",
  lineLimit = 2,
  minScaleFactor = 0.8,
  opacity,
}: {
  text: string
  font: number
  color: ResolvedTheme["secondary"] | ResolvedTheme["foreground"]
  align: TextAlign
  weight?: FontWeight
  lineLimit?: number
  minScaleFactor?: number
  opacity?: number
}) {
  return (
    <Text
      font={font}
      fontWeight={weight}
      foregroundStyle={color}
      multilineTextAlignment={align}
      frame={{ maxWidth: "infinity", alignment: align }}
      lineLimit={lineLimit}
      minScaleFactor={minScaleFactor}
      opacity={opacity}
    >
      {text}
    </Text>
  )
}

function AnswerText({
  text,
  font,
  color,
  align,
  isFriday,
}: {
  text: string
  font: number
  color: ResolvedTheme["foreground"]
  align: TextAlign
  isFriday: boolean
}) {
  return (
    <Text
      font={font}
      fontWeight={answerWeight(isFriday)}
      foregroundStyle={color}
      multilineTextAlignment={align}
      frame={{ maxWidth: "infinity", alignment: align }}
      lineLimit={1}
      minScaleFactor={0.5}
    >
      {text}
    </Text>
  )
}

function QuestionLine({
  theme,
  tokens,
  align,
}: {
  theme: ResolvedTheme
  tokens: SizeTokens
  align: TextAlign
}) {
  return (
    <LineText
      text="今天是周五吗？"
      font={tokens.eyebrow}
      color={theme.secondary}
      align={align}
      weight="regular"
      lineLimit={1}
      opacity={0.92}
    />
  )
}

function DateLine({
  text,
  theme,
  tokens,
  align,
}: {
  text: string
  theme: ResolvedTheme
  tokens: SizeTokens
  align: TextAlign
}) {
  return (
    <LineText
      text={text}
      font={tokens.date}
      color={theme.secondary}
      align={align}
      weight="regular"
      lineLimit={1}
      opacity={0.72}
    />
  )
}

function QuoteLine({
  text,
  theme,
  tokens,
  align,
  lineLimit = 2,
}: {
  text: string
  theme: ResolvedTheme
  tokens: SizeTokens
  align: TextAlign
  lineLimit?: number
}) {
  return (
    <LineText
      text={text}
      font={tokens.quote}
      color={theme.secondary}
      align={align}
      weight="medium"
      lineLimit={lineLimit}
      minScaleFactor={0.78}
      opacity={0.9}
    />
  )
}

/** 问题 + 答案：紧凑一组 */
function QuestionAnswerBlock({
  snapshot,
  theme,
  tokens,
  align,
  answerBoost = 1,
}: {
  snapshot: FridaySnapshot
  theme: ResolvedTheme
  tokens: SizeTokens
  align: TextAlign
  answerBoost?: number
}) {
  return (
    <VStack
      spacing={tokens.gapQuestionAnswer}
      alignment={align === "leading" ? "leading" : "center"}
      frame={{ maxWidth: "infinity", alignment: align }}
    >
      <QuestionLine theme={theme} tokens={tokens} align={align} />
      <AnswerText
        text={snapshot.answer}
        font={answerFontSize(tokens.answer, snapshot.isFriday, answerBoost)}
        color={theme.foreground}
        align={align}
        isFriday={snapshot.isFriday}
      />
    </VStack>
  )
}

/** 日期 + 文案：信息组 */
function MetaBlock({
  snapshot,
  theme,
  tokens,
  align,
  showDate,
  quoteLineLimit = 2,
}: {
  snapshot: FridaySnapshot
  theme: ResolvedTheme
  tokens: SizeTokens
  align: TextAlign
  showDate: boolean
  quoteLineLimit?: number
}) {
  return (
    <VStack
      spacing={tokens.gapDateQuote}
      alignment={align === "leading" ? "leading" : "center"}
      frame={{ maxWidth: "infinity", alignment: align }}
    >
      {showDate ? (
        <DateLine text={snapshot.dateLine} theme={theme} tokens={tokens} align={align} />
      ) : (
        <VStack />
      )}
      <QuoteLine
        text={snapshot.quote}
        theme={theme}
        tokens={tokens}
        align={align}
        lineLimit={quoteLineLimit}
      />
    </VStack>
  )
}

function CenterLayout({
  snapshot,
  theme,
  tokens,
}: {
  snapshot: FridaySnapshot
  theme: ResolvedTheme
  tokens: SizeTokens
}) {
  return (
    <VStack
      spacing={tokens.gapAnswerGroup}
      padding={tokens.padding}
      frame={{ maxWidth: "infinity", maxHeight: "infinity", alignment: "center" }}
    >
      <QuestionAnswerBlock snapshot={snapshot} theme={theme} tokens={tokens} align="center" />
      <MetaBlock
        snapshot={snapshot}
        theme={theme}
        tokens={tokens}
        align="center"
        showDate={tokens.showDate}
      />
    </VStack>
  )
}

function LeadingLayout({
  snapshot,
  theme,
  tokens,
}: {
  snapshot: FridaySnapshot
  theme: ResolvedTheme
  tokens: SizeTokens
}) {
  return (
    <VStack
      spacing={0}
      padding={tokens.padding}
      alignment="leading"
      frame={{ maxWidth: "infinity", maxHeight: "infinity", alignment: "leading" }}
    >
      <QuestionAnswerBlock snapshot={snapshot} theme={theme} tokens={tokens} align="leading" />
      <Spacer />
      <MetaBlock
        snapshot={snapshot}
        theme={theme}
        tokens={tokens}
        align="leading"
        showDate={tokens.showDate}
      />
    </VStack>
  )
}

function HeroLayout({
  snapshot,
  theme,
  tokens,
}: {
  snapshot: FridaySnapshot
  theme: ResolvedTheme
  tokens: SizeTokens
}) {
  return (
    <VStack
      spacing={0}
      padding={tokens.padding}
      frame={{ maxWidth: "infinity", maxHeight: "infinity", alignment: "center" }}
    >
      <QuestionLine theme={theme} tokens={tokens} align="center" />
      <Spacer />
      <AnswerText
        text={snapshot.answer}
        font={answerFontSize(tokens.answer, snapshot.isFriday, 1.14)}
        color={theme.foreground}
        align="center"
        isFriday={snapshot.isFriday}
      />
      <Spacer />
      <MetaBlock
        snapshot={snapshot}
        theme={theme}
        tokens={tokens}
        align="center"
        showDate={tokens.showDate}
      />
    </VStack>
  )
}

function MinimalLayout({
  snapshot,
  theme,
  tokens,
}: {
  snapshot: FridaySnapshot
  theme: ResolvedTheme
  tokens: SizeTokens
}) {
  return (
    <VStack
      spacing={0}
      padding={tokens.padding}
      frame={{ maxWidth: "infinity", maxHeight: "infinity", alignment: "center" }}
    >
      <Spacer />
      <VStack
        spacing={tokens.gapAnswerGroup}
        frame={{ maxWidth: "infinity", alignment: "center" }}
      >
        <QuestionAnswerBlock
          snapshot={snapshot}
          theme={theme}
          tokens={tokens}
          align="center"
          answerBoost={1.06}
        />
        <QuoteLine
          text={snapshot.quote}
          theme={theme}
          tokens={{ ...tokens, quote: Math.max(11, tokens.quote - 1) }}
          align="center"
          lineLimit={2}
        />
      </VStack>
      <Spacer />
    </VStack>
  )
}

function SplitLayout({
  snapshot,
  theme,
  tokens,
}: {
  snapshot: FridaySnapshot
  theme: ResolvedTheme
  tokens: SizeTokens
}) {
  return (
    <HStack
      spacing={14}
      padding={tokens.padding}
      frame={{ maxWidth: "infinity", maxHeight: "infinity", alignment: "center" }}
    >
      <VStack
        spacing={0}
        alignment="leading"
        frame={{ maxWidth: "infinity", maxHeight: "infinity", alignment: "leading" }}
      >
        <QuestionAnswerBlock
          snapshot={snapshot}
          theme={theme}
          tokens={tokens}
          align="leading"
          answerBoost={0.96}
        />
      </VStack>

      <VStack
        spacing={0}
        alignment="leading"
        frame={{ maxWidth: "infinity", maxHeight: "infinity", alignment: "trailing" }}
      >
        <Spacer />
        <MetaBlock
          snapshot={snapshot}
          theme={theme}
          tokens={tokens}
          align="leading"
          showDate={tokens.showDate}
          quoteLineLimit={3}
        />
      </VStack>
    </HStack>
  )
}

function LayoutBody({
  style,
  snapshot,
  theme,
  tokens,
}: {
  style: LayoutStyle
  snapshot: FridaySnapshot
  theme: ResolvedTheme
  tokens: SizeTokens
}) {
  switch (style) {
    case "leading":
      return <LeadingLayout snapshot={snapshot} theme={theme} tokens={tokens} />
    case "hero":
      return <HeroLayout snapshot={snapshot} theme={theme} tokens={tokens} />
    case "minimal":
      return <MinimalLayout snapshot={snapshot} theme={theme} tokens={tokens} />
    case "split":
      return <SplitLayout snapshot={snapshot} theme={theme} tokens={tokens} />
    case "center":
    default:
      return <CenterLayout snapshot={snapshot} theme={theme} tokens={tokens} />
  }
}

export function FridayWidgetView({
  snapshot,
  theme,
  layoutStyle,
  family,
  showParticles,
  widgetURL,
  frameHeight,
}: {
  snapshot: FridaySnapshot
  theme: ResolvedTheme
  layoutStyle: LayoutStyle
  family: WidgetFamilyName | string
  showParticles: boolean
  widgetURL?: string
  frameHeight?: number
}) {
  const tokens = sizeTokensForFamily(family)
  const style = resolveLayoutStyle(layoutStyle, family)
  const particles = snapshot.isFriday && showParticles ? tokens.particleCount : 0

  return (
    <ZStack
      frame={{
        maxWidth: "infinity",
        maxHeight: "infinity",
        height: frameHeight,
      }}
      widgetBackground={theme.background}
      preferredColorScheme={theme.preferredColorScheme}
      widgetURL={widgetURL}
      clipShape={
        frameHeight
          ? {
              type: "rect",
              cornerRadius: 22,
            }
          : undefined
      }
    >
      {particles > 0 ? <FridayParticles count={particles} theme={theme} /> : <ZStack />}
      <LayoutBody style={style} snapshot={snapshot} theme={theme} tokens={tokens} />
    </ZStack>
  )
}
