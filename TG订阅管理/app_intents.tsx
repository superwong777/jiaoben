import { AppIntentManager, AppIntentProtocol } from "scripting"
import { refreshAudience } from "./src/refresh"

// ==========================================
// AppIntents（Script.env === "app_intents"）
// 供 Widget 内 Button/Toggle 触发；运行在后台环境，可发起网络请求。
// ==========================================

/**
 * 一键刷新：在后台拉取最新受众数据、写入缓存并刷新小组件。
 * 点击 Widget 内的刷新按钮触发，全程不打开 App。
 */
export const RefreshAudienceIntent = AppIntentManager.register({
  name: "RefreshAudienceIntent",
  protocol: AppIntentProtocol.AppIntent,
  perform: async () => {
    await refreshAudience({ force: true, reloadWidget: true })
  },
})
