# Spec: Widget 内 Button + AppIntent 一键刷新

## Goal
- 要解决什么问题：用户希望「点击小组件即刷新数据」。现状是点击整个 widget 走 deep link `scripting://run?action=refresh`，会短暂拉起 index.tsx（可能闪一下 App）。改为 widget 内放一个 Button，配合 AppIntent，在 `app_intents` 后台环境静默刷新，不打开 App。
- 验收结果：TS 0 error；widget 预览可渲染带刷新按钮；点击按钮在后台 fetch→setCache→reloadAll，不进入 App。

## Done Contract
- 什么算完成：新增 `app_intents.tsx` 注册 `RefreshAudienceIntent`；WidgetView 顶部刷新图标替换为 `Button intent={RefreshAudienceIntent()}`；TS 0 error + widget 预览 exit 0。
- 由什么证明：get_typescript_diagnostics + `scripting-ts widget` 预览 + 用户实机点击确认。
- 哪些情况仍算未完成：intent 未在 app_intents 环境触发；点击仍打开 App；Button 与 widgetURL 命中冲突导致行为异常。

## Facts / Constraints（已用 ScriptingReference 核实）
- AppIntent **必须**定义在 `app_intents.tsx`，`AppIntentManager.register({name, protocol, perform})` 返回 factory；触发时运行在 `Script.env === "app_intents"` 环境。
- `perform` 是 `async (params)=>Promise<void>`，**app_intents 环境明确支持网络请求 / Widget 刷新**（文档「Execution Environment」列了 Fetching data from the network）。→ 可在 perform 内 `fetchTelegramAudience` 后 `setCache` + `Widget.reloadAll()`。
- widget 内交互用 `<Button intent={Factory(params)} />`（注意是 `intent` 非 `action`）；`Toggle` 同理。
- Widget 渲染一次即销毁，hooks 无效；`Widget.present()` 后代码不执行。
- import factory 到 widget.tsx / 预览环境是安全的（register 幂等，官方示例即 widget.tsx import "./app_intents"）。
- `Widget.reloadAll()` 刷新全部；开发期可用 `reloadTestWidgets()`，生产用 `reloadUserWidgets()`/`reloadAll()`。

## 设计方案

### 新增 app_intents.tsx（架构入口）
```tsx
import { AppIntentManager, AppIntentProtocol, Widget } from "scripting"
import { getSource, setCache } from "./src/store"
import { fetchTelegramAudience } from "./src/telegram"

export const RefreshAudienceIntent = AppIntentManager.register({
  name: "RefreshAudienceIntent",
  protocol: AppIntentProtocol.AppIntent,
  perform: async () => {
    const source = getSource()
    if (source) {
      try {
        setCache(await fetchTelegramAudience(source))
      } catch {
        // 静默失败，保留旧缓存
      }
    }
    Widget.reloadAll()
  },
})
```
- 复用现有 store / telegram 逻辑层，零重复。perform 逻辑 = 现 index.tsx `silentRefresh()` 的后台版。

### 改 WidgetView：刷新图标 → 刷新 Button
- 现状顶部工具列右侧是静态 `Image systemName="arrow.clockwise"`（纯装饰，实际刷新靠整体 widgetURL）。
- 改为 `<Button intent={RefreshAudienceIntent()}>` 包裹该图标，`buttonStyle="plain"` 保持外观不突兀。点击此按钮 → 后台刷新，不打开 App。
- WidgetView 新增可选 prop `interactive?: boolean`（默认 true）：widget 环境用 Button；App 内预览（WidgetPreviewCard）传 `interactive={false}` 渲染纯图标，避免预览里出现无效 intent 交互。（备选：预览也可保留 Button，intent 在非 widget 环境不触发但能渲染——二选一，见 Q1）

### widgetURL 去留（关键决策）
- 方案 A（推荐）：**保留** widget 整体 `widgetURL`（点非按钮区域打开配置页 SettingsView），Button 区域独立触发后台刷新 intent。→ 「点按钮=刷新，点别处=进配置」双入口，体验最佳。**风险：Button 与 widgetURL 在 systemSmall 内共存的命中边界需实机确认。**
- 方案 B（保守）：去掉 widgetURL，widget 只靠 Button 刷新；进配置改为从 App 内打开脚本。
- 倾向 A，若实机发现冲突退回 B。

### index.tsx deep-link 刷新去留
- 现有 `?action=refresh` deep link 分支：Button+AppIntent 上线后不再需要（无组件指向它）。可保留作兜底（无害），或本轮一并移除精简。建议**保留**（deep link 仍可能被 Shortcuts / 外部调用），仅新增 Button 路径，不删旧逻辑。

## Open Questions
- [ ] Q1：App 内预览是否显示刷新 Button？倾向「预览显示纯图标（interactive=false）」，更贴近静态观感。
- [ ] Q2：widgetURL 采方案 A（双入口，需实机验证命中）还是 B（仅 Button）？倾向 A。
- [ ] Q3：是否移除 index.tsx 的 deep-link refresh 分支？倾向保留（兜底，无害）。

## Restated Understanding
- 我理解当前任务是：给小组件加一个「刷新按钮」，用 Scripting 官方 Button+AppIntent 机制，在后台 app_intents 环境静默拉取最新 TG 数据并 `Widget.reloadAll()`，避免现有 deep-link 方案闪一下 App。
- 当前核心目标是：产出可执行方案（本条已落盘），获批后新增 app_intents.tsx + 改 WidgetView。
- 当前边界是：复用现有逻辑层；不改数据源；不动 settings/store 结构。
- 暂不处理：多按钮（如切换频道）、Toggle、Live Activity。

## Goal Alignment Check
- 当前动作（写方案）服务核心目标：是（No Spec No Code）。
- 是否调整范围：待 Q1/Q2/Q3 定夺，均不影响主链路。

## Checkpoint Summary
- 当前任务理解：新增交互式刷新按钮（Button+AppIntent）。
- 当前核心目标：方案定稿并获批。
- 当前进度：文档已核实，方案已落盘。
- 下一步 1：用户确认 Q1/Q2/Q3。
- 下一步 2：新增 app_intents.tsx，改 WidgetView + widget.tsx + WidgetPreviewCard，跑 TS 诊断 + widget 预览。
- 涉及文件：新增 app_intents.tsx；改 src/components/WidgetView.tsx、src/components/settings/WidgetPreviewCard.tsx；widget.tsx 无需改（仍复用 WidgetView）。
- 风险：Button 与 widgetURL 命中边界（需实机）；app_intents 环境 fetch 超时预算。
- 验证方式：get_typescript_diagnostics + scripting-ts widget 预览 + 用户实机点击。
- Execution Approval: `Pending`

## Change Log
- 2026-07-16: 方案落盘，核实 AppIntentManager/perform 环境/Button intent API。
- 2026-07-16: 用户批准并追加 UI 需求，一并实施并验证完成。
  - 新增 `app_intents.tsx`：`RefreshAudienceIntent`（AppIntent 协议，perform 后台 fetch→setCache→reloadAll）。
  - WidgetView：左上改圈底飞机 `paperplane.circle.fill`；右上原静态图标→原生 `Button`（bordered + circle + mini + tint）携 `RefreshAudienceIntent()`；新增 `interactive` prop（预览传 false 渲染纯图标）。保留整体 widgetURL（方案 A 双入口）。
  - AudienceCard：头像 44→60；去掉「订阅者/成员」字样，副标题改为「更新 HH:mm」。
  - 全局繁体→简体：types.AudienceType、telegram 错误文案、SettingsView/StatusSection/ThemePicker 所有文案。
  - index.tsx deep-link refresh 分支保留（方案 A/Q3，兼底）。
- 2026-07-16 (尾): screenshot 验证发现顶部工具栏溢出到 widget 卡片外（固定内容超高，双 Spacer 压不动固定元素）。修复：头像 60→48、数字 28→26、名称 12→11+minScaleFactor、根 VStack frame alignment=top、padding 收紧（top10/bottom12/h12）；刷新按钮改 borderless + `arrow.clockwise.circle.fill`。StatusSection 去掉残留的 audienceType 标签（“订阅者/成员”彻底不再显示）。screenshot 复验：工具栏回到卡片内，布局均衡。

## Validation
- Static checks: `get_typescript_diagnostics`（全项目）= 0 error。
- Runtime: `scripting-ts widget "TG订阅管理" --family systemSmall` exit 0，验证 widget→WidgetView→Button(intent import app_intents)→AudienceCard 链路可构建。
- 结果汇总：交互刷新按钮 + 全部 UI 需求已实现。
- 核心目标是否已由证据证明完成：静态层面是（TS + 预览）；交互效果需用户实机点击确认。
- 剩余风险：Button 与 widgetURL 在 systemSmall 内命中边界；原生按钮视觉尺寸；均需实机确认，若冲突退回方案 B（去 widgetURL）。

## Resume / Handoff
- 当前状态：实现完成，TS 0 error + widget 预览通过。
- 当前卡点：无。
- 下一步唯一动作：用户实机验证——点刷新按钮是否后台刷新不开 App；Button/widgetURL 命中是否冲突。
- 下一轮核心目标：若实机命中冲突则退回方案 B。
