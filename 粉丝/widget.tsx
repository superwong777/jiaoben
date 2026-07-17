import { HStack, Image, Spacer, Text, VStack, Widget } from "scripting"
import {
  CACHE_KEY,
  CONFIG_KEY,
  THEME_KEY,
  TelegramAudience,
  fetchTelegramAudience,
  formatUpdateTime,
} from "./telegram"

const TELEGRAM_BLUE = "#229ED9"

function WidgetView({ data, error, theme }: { data: TelegramAudience | null; error?: string; theme: string }) {
  // 根据用户选择的外观强制输出颜色
  const isDark = theme === "dark" || (theme === "auto" && Widget.colorScheme === "dark")
  
  const bgColor = isDark ? "#1C1C1E" : "#FFFFFF"
  const textColor = isDark ? "#FFFFFF" : "#000000"
  const subTextColor = isDark ? "#8E8E93" : "#636366"

  if (!data) {
    return (
      <VStack
        alignment="center"
        spacing={12}
        padding={16}
        frame={{ maxWidth: Infinity, maxHeight: Infinity, alignment: "center" }}
        background={bgColor}
        widgetURL="scripting://run/tg"
      >
        <Image systemName="paperplane.fill" foregroundStyle={TELEGRAM_BLUE} font={32} />
        <Text font={16} fontWeight="semibold" foregroundStyle={textColor}>尚未配置</Text>
        <Text font="caption" foregroundStyle={subTextColor} multilineTextAlignment="center">
          {error ?? "请打开 App 运行脚本配置"}
        </Text>
      </VStack>
    )
  }

  return (
    <VStack
      alignment="center"
      spacing={6}
      padding={12}
      frame={{ maxWidth: Infinity, maxHeight: Infinity, alignment: "center" }}
      background={bgColor}
      widgetURL={data.url}
    >
      {/* 顶部工具栏（仅包含微型刷新状态或失败提示，符合苹果极简规范） */}
      <HStack frame={{ maxWidth: Infinity }} padding={{ horizontal: 4 }}>
        {error ? (
          <Text font="caption2" foregroundStyle="orange">⚠️</Text>
        ) : (
          <Spacer />
        )}
        <Spacer />
        {/* 优雅的刷新指示图标，提示用户这是支持刷新的组件 */}
        <Image 
          systemName="arrow.clockwise" 
          foregroundStyle={TELEGRAM_BLUE} 
          font={10} 
        />
      </HStack>

      <Spacer />

      {/* 1. 头像居中 */}
      {data.avatarURL ? (
        <Image
          imageUrl={data.avatarURL}
          resizable
          scaleToFill
          frame={{ width: 44, height: 44 }}
          clipShape="circle"
          placeholder={<Image systemName="paperplane.fill" foregroundStyle={TELEGRAM_BLUE} />}
        />
      ) : (
        <Image
          systemName="paperplane.circle.fill"
          foregroundStyle={TELEGRAM_BLUE}
          font={44}
        />
      )}

      {/* 2. 粉丝数大字居中 */}
      <VStack alignment="center" spacing={1}>
        <Text
          font={28}
          fontWeight="bold"
          fontDesign="rounded"
          monospacedDigit
          minScaleFactor={0.7}
          lineLimit={1}
          foregroundStyle={TELEGRAM_BLUE}
        >
          {data.audienceText}
        </Text>
        <Text font={10} fontWeight="medium" foregroundStyle={subTextColor}>
          {data.audienceType} • {formatUpdateTime(data.fetchedAt)}
        </Text>
      </VStack>

      <Spacer />

      {/* 3. 频道名称最下方居中，不显示链接 */}
      <Text font={12} fontWeight="semibold" lineLimit={1} foregroundStyle={textColor}>
        {data.title}
      </Text>
    </VStack>
  )
}

async function run() {
  const source = Storage.get<string>(CONFIG_KEY)
  const theme = Storage.get<string>(THEME_KEY) ?? "auto"
  let data = Storage.get<TelegramAudience>(CACHE_KEY)
  let error: string | undefined

  if (source) {
    try {
      data = await fetchTelegramAudience(source)
      Storage.set(CACHE_KEY, data)
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause)
    }
  }

  Widget.present(<WidgetView data={data} error={!source ? undefined : error} theme={theme} />, {
    reloadPolicy: {
      policy: "after",
      date: new Date(Date.now() + 30 * 60 * 1000), // 每30分钟系统自动刷新
    },
  })
}

run()