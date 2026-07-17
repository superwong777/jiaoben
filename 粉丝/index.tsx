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
  THEME_KEY,
  TelegramAudience,
  fetchTelegramAudience,
  formatUpdateTime,
} from "./telegram"

function SettingsView() {
  const dismiss = Navigation.useDismiss()
  const savedSource = Storage.get<string>(CONFIG_KEY) ?? ""
  const savedCache = Storage.get<TelegramAudience>(CACHE_KEY)
  const savedTheme = Storage.get<string>(THEME_KEY) ?? "auto"

  const [source, setSource] = useState(savedSource)
  const [result, setResult] = useState<TelegramAudience | null>(savedCache)
  const [themeMode, setThemeMode] = useState<string>(savedTheme)
  const [status, setStatus] = useState(savedSource ? "已读取配置" : "等待配置")
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

  const handleThemeChange = (mode: string) => {
    setThemeMode(mode)
    Storage.set(THEME_KEY, mode)
    Widget.reloadAll() // 切换主题后立即刷新桌面小组件外观
  }

  return (
    <NavigationStack>
      <List
        navigationTitle="TG 订阅配置"
        navigationBarTitleDisplayMode="inline"
        toolbar={{
          cancellationAction: <Button title="关闭" action={dismiss} />,
        }}
      >
        <Section header={<Text>数据配置</Text>}>
          <TextField
            title="链接或 ID"
            prompt="例如 @telegram"
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

        <Section header={<Text>小组件外观（暗色/浅色选择）</Text>}>
          <HStack spacing={12} padding={{ vertical: 4 }}>
            <Button
              title="跟随系统"
              systemImage={themeMode === "auto" ? "circle.hexagongrid.fill" : "circle.hexagongrid"}
              action={() => handleThemeChange("auto")}
              foregroundStyle={themeMode === "auto" ? "#229ED9" : "label"}
            />
            <Button
              title="强制浅色"
              systemImage={themeMode === "light" ? "sun.max.fill" : "sun.max"}
              action={() => handleThemeChange("light")}
              foregroundStyle={themeMode === "light" ? "#229ED9" : "label"}
            />
            <Button
              title="强制深色"
              systemImage={themeMode === "dark" ? "moon.fill" : "moon"}
              action={() => handleThemeChange("dark")}
              foregroundStyle={themeMode === "dark" ? "#229ED9" : "label"}
            />
          </HStack>
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
            </VStack>
          ) : null}
        </Section>

        <Section title="预览">
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