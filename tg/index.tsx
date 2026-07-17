import {
  Button,
  HStack,
  Label,
  List,
  Navigation,
  NavigationStack,
  Script,
  Section,
  Text,
  TextField,
  VStack,
  Widget,
  useState,
} from "scripting"
import {
  CACHE_KEY,
  CONFIG_KEY,
  TelegramAudience,
  fetchTelegramAudience,
  formatUpdateTime,
} from "./telegram"

function SettingsView() {
  const dismiss = Navigation.useDismiss()
  const savedSource = Storage.get<string>(CONFIG_KEY) ?? ""
  const savedCache = Storage.get<TelegramAudience>(CACHE_KEY)
  const [source, setSource] = useState(savedSource)
  const [result, setResult] = useState<TelegramAudience | null>(savedCache)
  const [status, setStatus] = useState(savedSource ? "已读取保存的配置" : "等待配置")
  const [isLoading, setIsLoading] = useState(false)

  const save = async () => {
    if (isLoading) return
    setIsLoading(true)
    setStatus("正在查询 Telegram...")
    try {
      const data = await fetchTelegramAudience(source)
      Storage.set(CONFIG_KEY, data.source)
      Storage.set(CACHE_KEY, data)
      setSource(data.source)
      setResult(data)
      setStatus("保存成功，小组件已刷新")
      Widget.reloadAll()
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <NavigationStack>
      <List
        navigationTitle="TG 人数小组件"
        navigationBarTitleDisplayMode="inline"
        toolbar={{
          cancellationAction: <Button title="关闭" action={dismiss} />,
        }}
      >
        <Section
          header={<Text>频道或群组</Text>}
          footer={<Text>支持 @公开用户名、公开 t.me 链接和邀请链接。纯数字内部 ID 无法从 Telegram 公共网页查询。</Text>}
        >
          <TextField
            title="链接或 ID"
            prompt="例如 @telegram 或 https://t.me/telegram"
            value={source}
            onChanged={setSource}
            textInputAutocapitalization="never"
            autocorrectionDisabled
            keyboardType="URL"
            submitLabel="done"
            onSubmit={save}
          />
          <Button
            title={isLoading ? "查询中..." : "查询并保存"}
            systemImage="square.and.arrow.down"
            action={save}
            disabled={isLoading || !source.trim()}
          />
        </Section>

        <Section title="状态">
          <Label
            title={status}
            systemImage={status.includes("成功") ? "checkmark.circle.fill" : "info.circle"}
            foregroundStyle={status.includes("成功") ? "green" : "secondaryLabel"}
          />
          {result ? (
            <VStack alignment="leading" spacing={6} padding={{ vertical: 4 }}>
              <Text fontWeight="semibold">{result.title}</Text>
              <HStack>
                <Text font={28} bold monospacedDigit foregroundStyle="#229ED9">
                  {result.audienceText}
                </Text>
                <Text foregroundStyle="secondaryLabel">{result.audienceType}</Text>
              </HStack>
              <Text font="footnote" foregroundStyle="secondaryLabel">
                最近获取：{formatUpdateTime(result.fetchedAt)}
              </Text>
            </VStack>
          ) : null}
        </Section>

        <Section title="使用方法">
          <Text>1. 填写公开频道或群组链接并保存。</Text>
          <Text>2. 回到主屏幕，添加 Scripting 的 tg 小组件。</Text>
          <Text>3. 系统会定时重新请求 Telegram 公共页面；保存时也会立即请求刷新。</Text>
          <Button
            title="预览小组件"
            systemImage="rectangle.on.rectangle"
            action={async () => {
              await Widget.preview({ family: "systemSmall" })
            }}
          />
        </Section>
      </List>
    </NavigationStack>
  )
}

async function run() {
  try {
    await Navigation.present(<SettingsView />)
  } finally {
    Script.exit()
  }
}

run()