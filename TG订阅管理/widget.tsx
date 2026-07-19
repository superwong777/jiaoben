import { Button, Image, Widget } from "scripting"
import { getCache, getLayout, getTheme } from "./src/store"
import { TELEGRAM_BLUE } from "./src/theme"
import { WidgetView } from "./src/components/WidgetView"
import { RefreshAudienceIntent } from "./app_intents"

// ==========================================
// 官方 widget 入口（Script.env === "widget"）
// 省电策略：Widget 渲染只读本地缓存，不在后台定时请求网络。
// 点击右上角按钮才会通过 AppIntent 手动刷新缓存并 reload 小组件。
// ==========================================
async function present() {
  const theme = getTheme()
  const layout = getLayout()
  const data = getCache()

  Widget.present(
    <WidgetView
      data={data}
      theme={theme}
      layout={layout}
      refreshButton={
        <Button intent={RefreshAudienceIntent(undefined)} buttonStyle="plain">
          <Image
            systemName="paperplane.fill"
            font={10}
            fontWeight="semibold"
            foregroundStyle="#FFFFFF"
            frame={{ width: 22, height: 22 }}
            background={{ style: TELEGRAM_BLUE, shape: "circle" }}
            clipShape="circle"
          />
        </Button>
      }
    />
  )
}

present()
