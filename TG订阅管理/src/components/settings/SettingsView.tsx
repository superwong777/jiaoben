import {
  Button,
  List,
  Navigation,
  NavigationStack,
  Section,
  Text,
  TextField,
  useState,
  Widget,
} from "scripting"
import type { StatusState, TelegramAudience, ThemeMode, WidgetLayout } from "../../types"
import {
  clearAllConfig,
  getCache,
  getLayout,
  getSource,
  getTheme,
  setCache,
  setLayout,
  setSource,
  setTheme,
} from "../../store"
import { fetchTelegramAudience } from "../../telegram"
import { ThemePicker } from "./ThemePicker"
import { LayoutPicker } from "./LayoutPicker"
import { StatusSection } from "./StatusSection"
import { WidgetPreviewCard } from "./WidgetPreviewCard"

// confirm 为 Scripting 全局 API；部分类型环境未声明，这里做最小兼容
declare function confirm(options: {
  message: string
  title?: string
  cancelLabel?: string
  confirmLabel?: string
}): Promise<boolean>

// ==========================================
// 配置页面：组合数据配置 / 主题 / 排版 / 状态 / 预览各 Section
// ==========================================
export function SettingsView() {
  const dismiss = Navigation.useDismiss()
  const savedSource = getSource() ?? ""
  const initialResult = getCache()

  const [source, setSourceInput] = useState(savedSource)
  const [result, setResult] = useState<TelegramAudience | null>(initialResult)
  const [themeMode, setThemeMode] = useState<ThemeMode>(getTheme())
  const [layout, setLayoutState] = useState<WidgetLayout>(getLayout())
  const [status, setStatus] = useState<StatusState>(
    savedSource
      ? { type: "idle", message: "已读取配置" }
      : { type: "idle", message: "等待配置" }
  )
  const [isLoading, setIsLoading] = useState(false)

  const save = async () => {
    if (isLoading) return
    setIsLoading(true)
    setStatus({ type: "loading", message: "正在查询 Telegram..." })
    try {
      const data = await fetchTelegramAudience(source)
      setSource(data.source)
      setCache(data)
      setSourceInput(data.source)
      setResult(data)
      setStatus({ type: "success", message: "保存成功，小组件已刷新" })
      Widget.reloadAll()
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : String(error),
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleThemeChange = (mode: ThemeMode) => {
    setThemeMode(mode)
    setTheme(mode)
    Widget.reloadAll()
  }

  const handleLayoutChange = (next: WidgetLayout) => {
    setLayoutState(next)
    setLayout(next)
    Widget.reloadAll()
  }

  const handleClear = async () => {
    if (isLoading) return
    const confirmed = await confirm({
      title: "清除配置",
      message: "将删除已保存的频道/群组与缓存数据，主题和排版偏好会保留。",
      confirmLabel: "清除",
      cancelLabel: "取消",
    })
    if (!confirmed) return

    clearAllConfig()
    setSourceInput("")
    setResult(null)
    setStatus({ type: "idle", message: "配置已清除" })
    Widget.reloadAll()
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
        <Section
          header={<Text>数据配置</Text>}
          footer={<Text>支持 @username 或 t.me 公开链接。私有群与内部链接无法查询。</Text>}
        >
          <TextField
            title="链接或 ID"
            prompt="例如 @telegram"
            value={source}
            onChanged={setSourceInput}
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

        <ThemePicker value={themeMode} onChanged={handleThemeChange} />

        <LayoutPicker value={layout} onChanged={handleLayoutChange} />

        <StatusSection status={status} result={result} />

        <WidgetPreviewCard data={result} theme={themeMode} layout={layout} />

        <Section footer={<Text>清除后将删除已保存的频道/群组与缓存数据，主题和排版偏好会保留。</Text>}>
          <Button
            title="清除配置"
            systemImage="trash"
            role="destructive"
            action={handleClear}
            disabled={isLoading || (!source.trim() && !result && !getSource())}
          />
        </Section>
      </List>
    </NavigationStack>
  )
}
