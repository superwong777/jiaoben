import {
  Button,
  Circle,
  Navigation,
  NavigationStack,
  Spacer,
  Text,
  VStack,
  ZStack,
} from "scripting"
import {
  getFridaySnapshot,
  getSettings,
  resolveTheme,
  type FridaySnapshot,
  type ResolvedTheme,
} from "./shared"

function CornerParticles({ theme, enabled }: { theme: ResolvedTheme; enabled: boolean }) {
  if (!enabled) {
    return null
  }

  // 角落不对称，避开中央大字
  const dots = [
    { key: "a", x: -110, y: -180, size: 4, opacity: 0.22 },
    { key: "b", x: -86, y: -210, size: 2.5, opacity: 0.14 },
    { key: "c", x: 120, y: -190, size: 3.2, opacity: 0.18 },
    { key: "d", x: 96, y: -150, size: 2, opacity: 0.12 },
    { key: "e", x: 118, y: 170, size: 3.6, opacity: 0.2 },
    { key: "f", x: 88, y: 205, size: 2.2, opacity: 0.13 },
    { key: "g", x: -102, y: 188, size: 2.8, opacity: 0.16 },
  ]

  return (
    <ZStack frame={{ maxWidth: "infinity", maxHeight: "infinity" }} allowsHitTesting={false}>
      {dots.map((dot) => (
        <Circle
          key={dot.key}
          fill={theme.particle}
          frame={{ width: dot.size, height: dot.size }}
          offset={{ x: dot.x, y: dot.y }}
          opacity={dot.opacity}
        />
      ))}
    </ZStack>
  )
}

function ShowcaseContent({
  snapshot,
  theme,
  showParticles,
}: {
  snapshot: FridaySnapshot
  theme: ResolvedTheme
  showParticles: boolean
}) {
  const answerSize = snapshot.isFriday ? 102 : 90
  const answerWeight = snapshot.isFriday ? "heavy" : "bold"

  return (
    <ZStack
      frame={{ maxWidth: "infinity", maxHeight: "infinity" }}
      background={theme.background}
      preferredColorScheme={theme.preferredColorScheme}
    >
      {snapshot.isFriday ? (
        <CornerParticles theme={theme} enabled={showParticles} />
      ) : null}

      <VStack
        spacing={0}
        padding={{ horizontal: 32, vertical: 28 }}
        frame={{ maxWidth: "infinity", maxHeight: "infinity", alignment: "center" }}
      >
        <Spacer />

        {/* 问题 + 答案：紧 */}
        <VStack spacing={8} frame={{ maxWidth: "infinity", alignment: "center" }}>
          <Text
            font={15}
            fontWeight="regular"
            foregroundStyle={theme.secondary}
            multilineTextAlignment="center"
            opacity={0.9}
          >
            今天是周五吗？
          </Text>
          <Text
            font={answerSize}
            fontWeight={answerWeight}
            foregroundStyle={theme.foreground}
            multilineTextAlignment="center"
            minScaleFactor={0.45}
            lineLimit={1}
          >
            {snapshot.answer}
          </Text>
        </VStack>

        {/* 答案组与下方信息：松 */}
        <VStack
          spacing={8}
          padding={{ top: 28 }}
          frame={{ maxWidth: "infinity", alignment: "center" }}
        >
          <Text
            font={15}
            fontWeight="regular"
            foregroundStyle={theme.secondary}
            multilineTextAlignment="center"
            opacity={0.7}
          >
            {snapshot.fullDateLine}
          </Text>
          <Text
            font={18}
            fontWeight="medium"
            foregroundStyle={theme.secondary}
            multilineTextAlignment="center"
            lineLimit={3}
            padding={{ horizontal: 16 }}
            opacity={0.92}
          >
            {snapshot.quote}
          </Text>
        </VStack>

        <Spacer />
      </VStack>
    </ZStack>
  )
}

/** 作为 NavigationStack 内的 destination 使用 */
export function ShowcasePage() {
  const settings = getSettings()
  const theme = resolveTheme(settings.themeMode)
  const snapshot = getFridaySnapshot(new Date(), settings)

  return (
    <VStack
      spacing={0}
      frame={{ maxWidth: "infinity", maxHeight: "infinity" }}
      navigationTitle="全屏展示"
      navigationBarTitleDisplayMode="inline"
    >
      <ShowcaseContent
        snapshot={snapshot}
        theme={theme}
        showParticles={settings.showParticles}
      />
    </VStack>
  )
}

/** 独立 present 使用 */
export function ShowcaseView() {
  const dismiss = Navigation.useDismiss()
  const settings = getSettings()
  const theme = resolveTheme(settings.themeMode)
  const snapshot = getFridaySnapshot(new Date(), settings)

  return (
    <NavigationStack>
      <VStack
        spacing={0}
        frame={{ maxWidth: "infinity", maxHeight: "infinity" }}
        navigationTitle="今天是周五吗？"
        navigationBarTitleDisplayMode="inline"
        toolbar={{
          cancellationAction: (
            <Button
              title="关闭"
              action={() => {
                dismiss()
              }}
            />
          ),
        }}
      >
        <ShowcaseContent
          snapshot={snapshot}
          theme={theme}
          showParticles={settings.showParticles}
        />
      </VStack>
    </NavigationStack>
  )
}

export async function presentShowcase() {
  await Navigation.present({
    element: <ShowcaseView />,
  })
}
