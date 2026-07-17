import { HStack, Image, Spacer, Text, VStack, Widget } from "scripting"
import {
  CACHE_KEY,
  CONFIG_KEY,
  TelegramAudience,
  fetchTelegramAudience,
  formatUpdateTime,
} from "./telegram"

const TELEGRAM_BLUE = "#229ED9"

function WidgetView({ data, error }: { data: TelegramAudience | null; error?: string }) {
  const compact = Widget.family === "systemSmall"

  if (!data) {
    return (
      <VStack
        alignment="leading"
        spacing={10}
        padding={16}
        frame={{ maxWidth: Infinity, maxHeight: Infinity, alignment: "topLeading" }}
        background="systemBackground"
        widgetURL="scripting://run/tg"
      >
        <Image systemName="paperplane.fill" foregroundStyle={TELEGRAM_BLUE} font={28} />
        <Spacer />
        <Text font={17} fontWeight="semibold" foregroundStyle="label">尚未配置</Text>
        <Text font="caption" foregroundStyle="secondaryLabel" lineLimit={3}>
          {error ?? "请打开 App 运行 tg 脚本，配置公开频道或群组链接"}
        </Text>
      </VStack>
    )
  }

  return (
    <VStack
      alignment="leading"
      spacing={compact ? 7 : 10}
      padding={compact ? 14 : 18}
      frame={{ maxWidth: Infinity, maxHeight: Infinity, alignment: "topLeading" }}
      background="systemBackground"
      widgetURL={data.url}
    >
      <HStack spacing={9}>
        {data.avatarURL ? (
          <Image
            imageUrl={data.avatarURL}
            resizable
            scaleToFill
            frame={{ width: compact ? 34 : 42, height: compact ? 34 : 42 }}
            clipShape="circle"
            placeholder={<Image systemName="paperplane.fill" foregroundStyle={TELEGRAM_BLUE} />}
          />
        ) : (
          <Image
            systemName="paperplane.circle.fill"
            foregroundStyle={TELEGRAM_BLUE}
            font={compact ? 34 : 42}
          />
        )}
        <VStack alignment="leading" spacing={2}>
          <Text font={compact ? 14 : 17} fontWeight="semibold" lineLimit={1} foregroundStyle="label">
            {data.title}
          </Text>
          <Text font="caption2" foregroundStyle="secondaryLabel" lineLimit={1}>
            {data.source}
          </Text>
        </VStack>
      </HStack>

      <Spacer />

      <Text
        font={compact ? 31 : 42}
        fontWeight="bold"
        fontDesign="rounded"
        monospacedDigit
        minScaleFactor={0.65}
        lineLimit={1}
        foregroundStyle={TELEGRAM_BLUE}
      >
        {data.audienceText}
      </Text>
      <HStack>
        <Text font={compact ? "caption" : "subheadline"} foregroundStyle="secondaryLabel">
          {data.audienceType}
        </Text>
        <Spacer />
        <Text font="caption2" foregroundStyle="tertiaryLabel">
          {formatUpdateTime(data.fetchedAt)}
        </Text>
      </HStack>
      {error ? (
        <Text font="caption2" foregroundStyle="orange" lineLimit={1} padding={{ top: 2 }}>
          更新失败 · 显示缓存
        </Text>
      ) : null}
    </VStack>
  )
}

async function run() {
  const source = Storage.get<string>(CONFIG_KEY)
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

  Widget.present(<WidgetView data={data} error={!source ? undefined : error} />, {
    reloadPolicy: {
      policy: "after",
      date: new Date(Date.now() + 30 * 60 * 1000), // 每 30 分钟后台自刷新一次
    },
  })
}

run()