import {
  Button,
  HStack,
  List,
  Navigation,
  NavigationStack,
  Picker,
  Script,
  Section,
  Text,
  Toggle,
  VStack,
  Widget,
  useState,
} from "scripting"
import { FridayWidgetView } from "./layouts"
import { ShowcasePage, ShowcaseView } from "./showcase"
import {
  DEFAULT_SETTINGS,
  LAYOUT_OPTIONS,
  QUOTE_MODE_OPTIONS,
  RELOAD_MODE_OPTIONS,
  THEME_OPTIONS,
  getFridaySnapshot,
  getSettings,
  isShowcaseLaunch,
  layoutStyleLabel,
  quoteModeLabel,
  reloadModeLabel,
  rerollManualQuote,
  resetSettings,
  resolveTheme,
  themeModeLabel,
  updateSettings,
  type LayoutStyle,
  type QuoteMode,
  type ReloadMode,
  type Settings,
  type ThemeMode,
} from "./shared"

function PreviewCard({ settings }: { settings: Settings }) {
  const theme = resolveTheme(settings.themeMode)
  const snapshot = getFridaySnapshot(new Date(), settings)

  return (
    <VStack spacing={10} padding={{ vertical: 4 }}>
      <FridayWidgetView
        snapshot={snapshot}
        theme={theme}
        layoutStyle={settings.layoutStyle}
        family="systemMedium"
        showParticles={settings.showParticles}
        frameHeight={168}
      />
      <Text font={12} foregroundStyle="secondaryLabel">
        预览按当前主题与排版渲染（中号近似）
      </Text>
    </VStack>
  )
}

function SettingsView() {
  const dismiss = Navigation.useDismiss()
  const [settings, setLocalSettings] = useState<Settings>(getSettings())
  const [toastMessage, setToastMessage] = useState("")
  const [showToast, setShowToast] = useState(false)
  const [showShowcase, setShowShowcase] = useState(false)

  const snapshot = getFridaySnapshot(new Date(), settings)

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

  function openShowcase() {
    setShowShowcase(true)
  }

  return (
    <NavigationStack>
      <List
        navigationTitle="今天是周五吗？"
        navigationBarTitleDisplayMode="inline"
        toast={{
          message: toastMessage,
          isPresented: showToast,
          onChanged: (presented: boolean) => setShowToast(presented),
          duration: 2.2,
          position: "bottom",
        }}
        navigationDestination={{
          isPresented: showShowcase,
          onChanged: (presented: boolean) => setShowShowcase(presented),
          content: <ShowcasePage />,
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
                Widget.reloadAll()
                setLocalSettings(getSettings())
                notify("已请求刷新所有小组件")
              }}
            />
          ),
        }}
      >
        <Section header={<Text>实时预览</Text>} footer={<Text>{snapshot.debugLine}</Text>}>
          <PreviewCard settings={settings} />
          <Button title="打开全屏展示" action={openShowcase} />
        </Section>

        <Section
          header={<Text>外观主题</Text>}
          footer={<Text>强制浅色 / 强制深色只作用于本脚本小组件与展示页。</Text>}
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

        <Section
          header={<Text>排版风格</Text>}
          footer={<Text>同一风格内对齐方式一致。分栏横排在小尺寸会自动回退居中。</Text>}
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

        <Section header={<Text>文案策略</Text>} footer={<Text>周五显示押韵顺口溜；非周五显示等待文案与倒计时。</Text>}>
          <Picker
            title="随机方式"
            value={settings.quoteMode}
            onChanged={(value: string) => {
              apply({ quoteMode: value as QuoteMode })
            }}
            pickerStyle="navigationLink"
          >
            {QUOTE_MODE_OPTIONS.map((item) => (
              <Text key={item.id} tag={item.id}>
                {item.title}
              </Text>
            ))}
          </Picker>
          <Text font={13} foregroundStyle="secondaryLabel">
            {QUOTE_MODE_OPTIONS.find((item) => item.id === settings.quoteMode)?.subtitle ?? ""}
          </Text>
          <Button
            title="重新随机文案并刷新"
            action={() => {
              if (settings.quoteMode === "manual") {
                const next = rerollManualQuote(settings)
                setLocalSettings(next)
              } else if (settings.quoteMode === "daily") {
                // 每日固定时，临时切到 manual seed 不够；改为 bump seed 并提示改模式
                const next = updateSettings({
                  quoteMode: "manual",
                  quoteSeed: settings.quoteSeed + 1 + Math.floor(Math.random() * 11),
                })
                setLocalSettings(next)
                notify("已切到「仅手动」并换了一条文案")
                Widget.reloadAll()
                return
              } else {
                setLocalSettings(getSettings())
              }
              Widget.reloadAll()
              notify("已刷新，文案按当前策略更新")
            }}
          />
        </Section>

        <Section header={<Text>刷新与动效</Text>}>
          <Picker
            title="刷新频率"
            value={settings.reloadMode}
            onChanged={(value: string) => {
              apply({ reloadMode: value as ReloadMode })
            }}
            pickerStyle="navigationLink"
          >
            {RELOAD_MODE_OPTIONS.map((item) => (
              <Text key={item.id} tag={item.id}>
                {item.title}
              </Text>
            ))}
          </Picker>
          <Toggle
            title="周五粒子装饰"
            value={settings.showParticles}
            onChanged={(value: boolean) => {
              apply({ showParticles: value }, value ? "已开启粒子" : "已关闭粒子")
            }}
          />
          <Text font={13} foregroundStyle="secondaryLabel">
            {RELOAD_MODE_OPTIONS.find((item) => item.id === settings.reloadMode)?.subtitle ?? ""}
          </Text>
        </Section>

        <Section header={<Text>当前状态</Text>}>
          <HStack>
            <Text>判定</Text>
            <Text foregroundStyle="secondaryLabel">{snapshot.answer}</Text>
          </HStack>
          <HStack>
            <Text>日期</Text>
            <Text foregroundStyle="secondaryLabel">{snapshot.dateLine}</Text>
          </HStack>
          <HStack>
            <Text>文案</Text>
            <Text foregroundStyle="secondaryLabel" lineLimit={2}>
              {snapshot.quote}
            </Text>
          </HStack>
          <HStack>
            <Text>主题</Text>
            <Text foregroundStyle="secondaryLabel">{themeModeLabel(settings.themeMode)}</Text>
          </HStack>
          <HStack>
            <Text>排版</Text>
            <Text foregroundStyle="secondaryLabel">{layoutStyleLabel(settings.layoutStyle)}</Text>
          </HStack>
          <HStack>
            <Text>文案策略</Text>
            <Text foregroundStyle="secondaryLabel">{quoteModeLabel(settings.quoteMode)}</Text>
          </HStack>
          <HStack>
            <Text>刷新</Text>
            <Text foregroundStyle="secondaryLabel">{reloadModeLabel(settings.reloadMode)}</Text>
          </HStack>
        </Section>

        <Section
          header={<Text>维护</Text>}
          footer={<Text>恢复默认不会删除脚本，只会重置主题、排版、文案与刷新选项。</Text>}
        >
          <Button
            title="恢复默认设置"
            role="destructive"
            action={() => {
              const next = resetSettings()
              setLocalSettings(next)
              Widget.reloadAll()
              notify("已恢复默认设置")
            }}
          />
          <Text font={12} foregroundStyle="secondaryLabel">
            默认：{themeModeLabel(DEFAULT_SETTINGS.themeMode)} ·{" "}
            {layoutStyleLabel(DEFAULT_SETTINGS.layoutStyle)} ·{" "}
            {quoteModeLabel(DEFAULT_SETTINGS.quoteMode)}
          </Text>
        </Section>
      </List>
    </NavigationStack>
  )
}

async function run() {
  if (isShowcaseLaunch()) {
    await Navigation.present(<ShowcaseView />)
  } else {
    await Navigation.present(<SettingsView />)
  }
  Script.exit()
}

run().catch((error) => {
  console.error(error)
  Script.exit()
})
