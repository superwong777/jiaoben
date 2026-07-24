import {
  Button,
  DatePicker,
  HStack,
  List,
  Navigation,
  NavigationStack,
  Picker,
  Script,
  Section,
  Spacer,
  Text,
  VStack,
  Widget,
  useState,
} from "scripting"
import { LifeWidgetView, type WidgetFamilyName } from "./layouts"
import {
  DEFAULT_SETTINGS,
  LAYOUT_OPTIONS,
  THEME_OPTIONS,
  clampBirthTimestamp,
  clearBackgroundImage,
  clearBirthDate,
  getLifeSnapshot,
  getSettings,
  layoutStyleLabel,
  pickAndSaveBackgroundImage,
  rerollInsight,
  resolveBackgroundImagePath,
  resolveDisplayTheme,
  timestampFromISODate,
  toISODateLocal,
  updateSettings,
  type LayoutStyle,
  type Settings,
  type ThemeMode,
} from "./shared"

type PreviewSize = "small" | "medium" | "large"

/**
 * Approximate home-screen widget frames for in-app preview.
 * Small is a square; medium/large stay full-width of the list card.
 */
const PREVIEW_SIZES: Array<{
  id: PreviewSize
  title: string
  family: WidgetFamilyName
  width?: number
  height: number
}> = [
  { id: "small", title: "小", family: "systemSmall", width: 158, height: 158 },
  { id: "medium", title: "中", family: "systemMedium", height: 158 },
  { id: "large", title: "大", family: "systemLarge", height: 340 },
]

function PreviewCard({
  settings,
  size,
}: {
  settings: Settings
  size: PreviewSize
}) {
  const backgroundImagePath = resolveBackgroundImagePath(settings)
  const theme = resolveDisplayTheme(settings.themeMode, backgroundImagePath.length > 0)
  const snapshot = getLifeSnapshot(new Date(), settings)
  const option = PREVIEW_SIZES.find((item) => item.id === size) ?? PREVIEW_SIZES[1]

  return (
    <VStack spacing={10} padding={{ vertical: 6 }} frame={{ maxWidth: "infinity" }}>
      <HStack frame={{ maxWidth: "infinity" }}>
        {option.width ? <Spacer /> : null}
        <LifeWidgetView
          snapshot={snapshot}
          theme={theme}
          family={option.family}
          layoutStyle={settings.layoutStyle}
          backgroundImagePath={backgroundImagePath}
          frameWidth={option.width}
          frameHeight={option.height}
        />
        {option.width ? <Spacer /> : null}
      </HStack>
      <Text font={12} foregroundStyle="secondaryLabel">
        小 = 正方形预览；中 / 大按真实比例拉宽。桌面仍需手动添加。
      </Text>
    </VStack>
  )
}

function HelpPage() {
  return (
    <List navigationTitle="使用说明" navigationBarTitleDisplayMode="inline">
      <Section header={<Text>如何添加到主屏幕</Text>}>
        <VStack alignment="leading" spacing={8} padding={{ vertical: 6 }}>
          <Text font={14}>1. 回到 iPhone 主屏幕，长按空白处</Text>
          <Text font={14}>2. 点左上角「编辑」→「添加小组件」</Text>
          <Text font={14}>3. 搜索「Scripting」或「又多活了一天」</Text>
          <Text font={14}>4. 选择小 / 中 / 大尺寸后添加</Text>
        </VStack>
      </Section>
      <Section
        header={<Text>说明</Text>}
        footer={<Text>打开脚本只会进入设置页；桌面小组件需要手动添加一次。</Text>}
      >
        <Text font={13} foregroundStyle="secondaryLabel">
          天数按自然日计算，出生当天计为第 1 天。小组件会在每天 0 点后自动刷新。自定义背景会存到本机
          App Group，桌面小组件可直接读取。
        </Text>
      </Section>
    </List>
  )
}

function MainView() {
  const dismiss = Navigation.useDismiss()
  const [settings, setLocalSettings] = useState<Settings>(getSettings())
  const [previewSize, setPreviewSize] = useState<PreviewSize>("medium")
  const [showHelp, setShowHelp] = useState(false)
  const [toastMessage, setToastMessage] = useState("")
  const [showToast, setShowToast] = useState(false)
  const [isPickingBackground, setIsPickingBackground] = useState(false)

  const snapshot = getLifeSnapshot(new Date(), settings)
  const hasBackground = resolveBackgroundImagePath(settings).length > 0
  const todayEnd = new Date().setHours(23, 59, 59, 999)
  const minDate = new Date(1900, 0, 1).getTime()
  const pickerValue = settings.birthDate
    ? timestampFromISODate(settings.birthDate)
    : clampBirthTimestamp(Date.now())

  function notify(message: string) {
    setToastMessage(message)
    setShowToast(true)
  }

  function apply(patch: Partial<Settings>, message = "已保存并刷新小组件") {
    const next = updateSettings(patch)
    setLocalSettings(next)
    Widget.reloadAll()
    notify(message)
  }

  function handleBirthDateChanged(value: number) {
    const clamped = clampBirthTimestamp(value)
    const iso = toISODateLocal(new Date(clamped))
    apply(
      {
        birthDate: iso,
      },
      "已更新生日并刷新小组件"
    )
  }

  function handleReset() {
    const next = clearBirthDate()
    setLocalSettings(next)
    Widget.reloadAll()
    notify("已重置，可重新选择生日")
  }

  function handleReroll() {
    const next = rerollInsight(settings)
    setLocalSettings(next)
    Widget.reloadAll()
    notify("已换一句感悟")
  }

  async function handlePickBackground() {
    if (isPickingBackground) {
      return
    }
    setIsPickingBackground(true)
    try {
      const next = await pickAndSaveBackgroundImage(settings)
      if (!next) {
        notify("已取消选择")
        return
      }
      setLocalSettings(next)
      Widget.reloadAll()
      notify("背景已更新并刷新小组件")
    } catch (error) {
      console.error(error)
      notify("选择背景失败，请重试")
    } finally {
      setIsPickingBackground(false)
    }
  }

  function handleClearBackground() {
    const next = clearBackgroundImage(settings)
    setLocalSettings(next)
    Widget.reloadAll()
    notify("已恢复纯色背景")
  }

  return (
    <NavigationStack>
      <List
        navigationTitle="又多活了一天"
        navigationBarTitleDisplayMode="inline"
        toast={{
          message: toastMessage,
          isPresented: showToast,
          onChanged: (presented: boolean) => setShowToast(presented),
          duration: 2.2,
          position: "bottom",
        }}
        navigationDestination={{
          isPresented: showHelp,
          onChanged: (presented: boolean) => setShowHelp(presented),
          content: <HelpPage />,
        }}
        toolbar={{
          cancellationAction: (
            <Button
              title="关闭"
              action={() => {
                dismiss()
              }}
            />
          ),
          primaryAction: (
            <Button
              title="刷新"
              action={() => {
                setLocalSettings(getSettings())
                Widget.reloadAll()
                notify("已请求刷新所有小组件")
              }}
            />
          ),
        }}
      >
        <Section
          header={<Text>小组件预览</Text>}
          footer={<Text>{snapshot.debugLine}</Text>}
        >
          <Picker
            title="预览尺寸"
            value={previewSize}
            onChanged={(value: string) => setPreviewSize(value as PreviewSize)}
            pickerStyle="segmented"
          >
            {PREVIEW_SIZES.map((item) => (
              <Text key={item.id} tag={item.id}>
                {item.title}
              </Text>
            ))}
          </Picker>
          <PreviewCard settings={settings} size={previewSize} />
        </Section>

        <Section
          header={<Text>生日</Text>}
          footer={
            <Text>
              从出生当天算到今天（含出生当天）。改完会同步到桌面小组件。
            </Text>
          }
        >
          <DatePicker
            title="出生日期"
            value={pickerValue}
            onChanged={handleBirthDateChanged}
            displayedComponents={["date"]}
            datePickerStyle="compact"
            startDate={minDate}
            endDate={todayEnd}
          />
          {settings.birthDate ? (
            <Button title="重置生日" role="destructive" action={handleReset} />
          ) : (
            <Text font={13} foregroundStyle="secondaryLabel">
              尚未设置生日
            </Text>
          )}
        </Section>

        <Section
          header={<Text>背景</Text>}
          footer={
            <Text>
              从相册选一张图做背景。会自动加一层浅遮罩，保证「你已经活了」和天数可读。
            </Text>
          }
        >
          <Text font={14} foregroundStyle="secondaryLabel">
            {hasBackground ? "已设置自定义背景" : "当前为纯色背景"}
          </Text>
          <Button
            title={isPickingBackground ? "处理中…" : hasBackground ? "更换背景图" : "从相册选择背景"}
            action={() => {
              handlePickBackground().catch((error) => {
                console.error(error)
              })
            }}
          />
          {hasBackground ? (
            <Button title="清除背景图" role="destructive" action={handleClearBackground} />
          ) : null}
        </Section>

        <Section
          header={<Text>排版风格</Text>}
          footer={
            <Text>
              都会保留「你已经活了 / 天」。静默居中、页码右下、刻度有细线、留白下沉。
            </Text>
          }
        >
          <Picker
            title="排版"
            value={settings.layoutStyle}
            onChanged={(value: string) => {
              apply({ layoutStyle: value as LayoutStyle })
            }}
            pickerStyle="navigationLink"
          >
            {LAYOUT_OPTIONS.map((item) => (
              <Text key={item.id} tag={item.id}>
                {item.title}
              </Text>
            ))}
          </Picker>
          <VStack alignment="leading" spacing={4} padding={{ vertical: 4 }}>
            <Text fontWeight="semibold">{layoutStyleLabel(settings.layoutStyle)}</Text>
            <Text font={13} foregroundStyle="secondaryLabel">
              {LAYOUT_OPTIONS.find((item) => item.id === settings.layoutStyle)?.subtitle ?? ""}
            </Text>
          </VStack>
        </Section>

        <Section
          header={<Text>主题</Text>}
          footer={
            <Text>
              {hasBackground
                ? "有背景图时文字会自动用浅色以保证对比；纯色背景仍跟随主题。"
                : "强制浅色 / 深色只作用于本脚本页面与小组件。"}
            </Text>
          }
        >
          <Picker
            title="主题模式"
            value={settings.themeMode}
            onChanged={(value: string) => {
              apply({ themeMode: value as ThemeMode })
            }}
            pickerStyle="segmented"
          >
            {THEME_OPTIONS.map((item) => (
              <Text key={item.id} tag={item.id}>
                {item.title}
              </Text>
            ))}
          </Picker>
        </Section>

        {snapshot.hasBirthDate ? (
          <Section
            header={<Text>感悟</Text>}
            footer={<Text>同一天默认固定一句；点「换一句」才会刷新。</Text>}
          >
            <Text font={14} foregroundStyle="secondaryLabel">
              {snapshot.insight}
            </Text>
            <Button title="换一句" action={handleReroll} />
          </Section>
        ) : null}

        <Section header={<Text>更多</Text>}>
          <Button title="使用说明" action={() => setShowHelp(true)} />
          <Button
            title="恢复默认设置"
            role="destructive"
            action={() => {
              clearBackgroundImage(settings)
              const next = updateSettings({
                ...DEFAULT_SETTINGS,
                quoteSeed: Date.now(),
              })
              setLocalSettings(next)
              Widget.reloadAll()
              notify("已恢复默认设置")
            }}
          />
        </Section>
      </List>
    </NavigationStack>
  )
}

async function run() {
  await Navigation.present({
    element: <MainView />,
    modalPresentationStyle: "pageSheet",
  })
  Script.exit()
}

run().catch((error) => {
  console.error(error)
  Script.exit()
})
