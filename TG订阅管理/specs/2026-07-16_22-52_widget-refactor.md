# Spec: TG订阅管理 样式/结构/API 优化

## Goal
- 要解决什么问题：修复现有 index.tsx 的交互缺陷（HStack 内多 Button 命中冲突）、安全缺陷（敏感源信息存 Storage）、样式 bug（VStack.cornerRadius 不存在）、结构可维护性差（单文件全塞）。
- 验收结果：TS 诊断 0 error；主题切换/查询交互正确；t.me 源标识改存 Keychain；圆角正确渲染；结构分层清晰。

## Done Contract
- 什么算完成：重构后 `get_typescript_diagnostics` 0 error；三处核心缺陷（命中冲突/敏感存储/圆角）均按方案修复；用户确认方案后实施。
- 由什么证明：TS 诊断结果 + 代码 diff + 用户确认。
- 哪些情况仍算未完成：仍有 error；主题切换或查询逻辑回归；Keychain 未真正生效。

## Scope
- In: index.tsx 重构（样式、结构、API 选型）；必要时拆分文件。
- Out: 更换数据来源（仍用 t.me 公开页爬取）；新增频道多订阅管理功能（本轮不做，除非用户要求）。

## Facts / Constraints（已用 ScriptingReference 核实的 API）
- `Picker` 支持 `pickerStyle="segmented"`，value/onChanged/子项 tag —— 用于替代三并排 Button 的主题切换，消除命中冲突。
- `clipShape={{ type: "rect", cornerRadius: N }}` 是圆角正确写法；`VStack` 无 `cornerRadius` 属性（当前 L274 报错根因）。
- `buttonStyle` 支持 `borderless`/`plain`；List/Section 内如需并排可点元素，须显式 `buttonStyle="borderless"` 才能各自独立命中（SwiftUI Form/List 默认整行命中，导致 HStack 多 Button 点谁都触发）。
- `Keychain.set/get/remove(key,value)` 全局可用，无需 import；是敏感数据唯一存储位置（全局记忆硬规则）。
- `Storage` 当前代码未 import 但直接使用 —— 依赖全局注入，需确认；缓存类非敏感数据可留 Storage。
- **【开发指南核实】`widget.tsx` 是官方独立 widget 入口能力文件，映射到独立 `Script.env`（值为 `widget`）；当前项目把 widget 渲染塞进 index.tsx 的 `Script.env !== "index"` 分支属非规范写法，应拆出 `widget.tsx`。**
- **【开发指南核实】widget 入口内不得使用 `useState/useEffect`；可 `fetch` 后再 `Widget.present(<View/>)`；组件/helper/store 可作为任意 `.ts/.tsx` 文件被正常 import。**
- **【开发指南核实】index.tsx 呈现 UI 后 dismiss 才 `Script.exit()`；纯逻辑（如 refresh 分支）做完即 exit，避免泄漏。**

## 缺陷清单与优化方案

### A. 交互缺陷：HStack 内三个主题 Button 命中冲突
- 现状 L228-247：`<HStack><Button/><Button/><Button/></HStack>` 放在 List/Section 内，SwiftUI 会把整行当单一命中区，点任意位置可能触发非预期按钮 / 无法精确选择。
- 方案：改用 `<Picker pickerStyle="segmented" value={themeMode} onChanged={handleThemeChange}>` + 三个 `<Text tag="auto|light|dark">`。语义正确、命中独立、无冲突，且天然体现「单选」。

### B. 安全缺陷：源标识存 Storage
- 现状：`Storage.set(CONFIG_KEY, data.source)`。t.me 公开用户名本身不算高敏，但按项目安全基线（Keychain 是敏感/身份类数据唯一存储处）应迁移；缓存快照（title/头像/人数）属公开可展示数据，留 Storage。
- 方案：源标识（CONFIG_KEY）改用 `Keychain.set/get/remove`；CACHE_KEY / THEME_KEY 保持 Storage。封装 `getSource()/setSource()/clearSource()`，路由与 UI 统一走封装，避免散落。
- 约束：Script.exit / 聊天输出永不回传源之外的任何敏感串（本项目无密码，主要是规范落位）。

### C. 样式 bug：VStack.cornerRadius（L274 唯一 error）
- 方案：删除 `cornerRadius={22}`，改 `clipShape={{ type: "rect", cornerRadius: 22 }}`（去掉现有 `clipShape="rect"`）。

### D. 结构模块化（按开发指南重构目录）

目标：符合 Scripting 项目布局（index.tsx = run 入口，widget.tsx = widget 入口），业务逻辑与 UI 分层，组件粒度合理。

**目标目录树：**
```
TG订阅管理/
├── script.json
├── index.tsx                 # run 入口：解析 deep link → refresh 分支 或 呈现 SettingsView
├── widget.tsx                # 官方 widget 入口：取数据 → Widget.present(<WidgetView/>)
├── specs/                    # SDD spec（已存在）
└── src/
    ├── types.ts              # TelegramAudience 等类型
    ├── theme.ts              # TELEGRAM_BLUE、主题 token、resolveTheme(mode)→颜色集
    ├── store.ts              # 存储封装：source→Keychain；cache/theme→Storage；getSource/setSource/clearSource/getCache/setCache/getTheme/setTheme
    ├── telegram.ts           # 网络+解析：decodeHTML/meta/normalizeTelegramSource/fetchTelegramAudience
    ├── format.ts             # formatUpdateTime、人数千分位
    └── components/
        ├── WidgetView.tsx        # 小组件根视图（纯展示，无 state）
        ├── AudienceCard.tsx      # 头像+大数字+名称 展示块（WidgetView 与预览复用）
        └── settings/
            ├── SettingsView.tsx      # 组合各 Section
            ├── ThemePicker.tsx       # segmented Picker（修复缺陷 A）
            ├── StatusSection.tsx     # 状态 + 结果摘要
            └── WidgetPreviewCard.tsx # App 内小组件预览（修复缺陷 C 圆角）
```

**分层职责：**
- `src/*.ts`：纯逻辑/数据层，无 UI import，可单测。
- `src/components/**`：展示组件，props 驱动，WidgetView 复用 AudienceCard，避免与预览重复。
- `index.tsx` / `widget.tsx`：极薄入口，只做路由/取数据/present。

**注意事项：**
- 拆 `widget.tsx` 后，原 index.tsx 里 `Script.env !== "index"` 的 widget 分支移除；30 分钟 reloadPolicy 迁到 widget.tsx。
- refresh deep link（`scripting://run?action=refresh`）仍由 index.tsx 处理：取 source→fetch→setCache→`Widget.reloadAll()`→`Script.exit()`。
- WidgetView 无 state（开发指南硬约束），主题颜色由 `resolveTheme` 纯函数计算后以 props 传入。

### E. 顺带健壮性（低风险，随手做）
- `Storage` 显式说明其全局性（或确认 import 需求）。
- 主题相关颜色/尺寸抽为常量，减少 WidgetView / 预览重复。

## Open Questions
- [x] Q1：用户已明确——尽量模块化，拆必要组件，做好目录管理→ 采用 D 全量目录重构（src/ 分层 + 官方 widget.tsx）。
- [ ] Q2：Keychain 是否 iCloud 同步？默认否（仅本机 synchronizable=false），待确认。
- [ ] Q3：Scripting 项目是否支持子目录 import（src/components/...）？需先用小型验证确认（若不支持则改为平铺 `src/` 同层多文件）。

## Restated Understanding
- 我理解当前任务是：不是继续加功能，而是对现有单文件小组件脚本做「样式 + 结构 + API 选型」质量优化，重点修 3 类你点名的问题：HStack 多 Button 命中冲突、敏感数据应进 Keychain、以及用更合适的 Scripting API。
- 当前核心目标是：产出一份可执行的优化方案（本条已落盘），获批后再改代码。
- 当前边界是：沿用 t.me 爬取数据源，不引入新业务功能。
- 暂不处理：多频道管理、数据源替换、国际化文案。

## Goal Alignment Check
- 当前动作（写方案 spec）是否服务核心目标：是 —— No Spec No Code，先方案后实现。
- 是否需要调整范围：用户已选 deep（全量模块化重构），方案已按开发指南对齐。

## Checkpoint Summary
- 当前任务理解：质量优化重构，非功能新增。
- 当前核心目标：方案定稿并获批。
- 当前进度：已核实关键 API，方案已落盘，待用户选型确认。
- 下一步 1：用户确认 Q1/Q2/Q3。
- 下一步 2：按确认范围实施并跑 TS 诊断验证。
- 涉及文件 / 模块：index.tsx（必改）；可能新增 lib.ts / widget.tsx。
- 风险：拆分文件可能引入 import/env 路由回归；Picker segmented 在 Section 内的视觉需实机确认。
- 验证方式：get_typescript_diagnostics + 预览。
- Execution Approval: `Pending`

## Change Log
- 2026-07-16: 初版方案落盘，核实 Picker/clipShape/buttonStyle/Keychain API。
- 2026-07-16: 用户批准 deep 全量模块化。验证子目录 import 可用。建 src/ 分层（types/theme/store/telegram/format）+ components/（WidgetView/AudienceCard/settings/{SettingsView,ThemePicker,StatusSection,WidgetPreviewCard}）；拆出官方 widget.tsx 入口，index.tsx 瘦为 run 路由。修复 A(segmented Picker)/B(source→Keychain)/C(clipShape 圆角)。ThemeColors 字段由 string 改 Color 修复类型宽化。

## Validation
- Static checks: `get_typescript_diagnostics`（全项目）= 0 error。
- Runtime / Test: `scripting-ts widget "TG订阅管理" --family systemSmall` exit 0，验证 widget.tsx→WidgetView→AudienceCard→resolveTheme 链路可构建渲染。
- 结果汇总：重构完成，三缺陷均修复，结构已按开发指南拆分。
- 核心目标是否已由证据证明完成：是（TS 0 error + widget 预览成功）。
- 剩余风险：SettingsView 依赖交互式 Navigation.present，未做截图级视觉验证；segmented Picker 在 Section 内视觉建议实机确认。

## Resume / Handoff
- 当前状态：重构完成并通过 TS 诊断 + widget 预览。
- 当前卡点：无。
- 下一步唯一动作：（可选）用户实机验证 SettingsView 交互与 segmented 视觉。
- 下一轮核心目标：若实机发现视觉/交互问题再微调。
