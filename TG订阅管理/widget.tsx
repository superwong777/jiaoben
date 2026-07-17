import { Button, Image, Widget } from "scripting"
import { getLayout, getTheme } from "./src/store"
import { refreshAudience } from "./src/refresh"
import { TELEGRAM_BLUE } from "./src/theme"
import { WidgetView } from "./src/components/WidgetView"
import { RefreshAudienceIntent } from "./app_intents"

// ==========================================
// 官方 widget 入口（Script.env === "widget"）
// 后台定时渲染：优先用新鲜缓存，过期再刷新；30 分钟后自更新。
// 注意：widget 入口内不得使用 useState/useEffect。
// ==========================================
async function present() {
  const theme = getTheme()
  const layout = getLayout()
  const { data, error } = await refreshAudience()

  Widget.present(
    <WidgetView
      data={data}
      error={error}
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
    />,
    {
      reloadPolicy: {
        policy: "after",
        date: new Date(Date.now() + 30 * 60 * 1000),
      },
    }
  )
}

present()
