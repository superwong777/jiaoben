# Music Player 开发规则

## 文档管理

- **plan.md**: 总体进度和完成记录
- **rules.md**: 开发规范和代码标准
- **plans/phaseX_xxx.md**: 各阶段详细记录

---

## 代码规范

### 命名约定

- **文件名**: `snake_case`
- **变量/函数**: `camelCase`
- **类/类型**: `PascalCase`
- **常量/枚举**: `UPPER_SNAKE_CASE`

### 代码风格

- 优先使用 `const`，使用箭头函数
- 所有变量和函数必须声明类型，避免 `any`
- 两空格缩进，仅在必要时使用分号
- 只编写完成需求所需的最少代码

### 错误处理

- 所有异步操作必须有 `try-catch`
- 提供清晰的错误信息和关键操作日志

---

## 测试规范

- 测试文件放在 `tests/` 目录，命名 `test_<module>.tsx`
- 测试时临时修改 `index.tsx` 导入并执行，完成后恢复
- 测试代码必须有 `try-catch`，完成后调用 `Script.exit()`

---

## 交互设计规范

### 标准交互模式

- **上下文菜单**: 收藏/取消收藏、添加到播放列表、删除（destructive）
- **滑动操作**: 右滑收藏（systemPink）、左滑删除（systemRed）
- **批量操作**: 列表顶部放置"播放全部"和"随机播放"
- **排序**: 导航栏右侧 `topBarTrailing`（注意不是 `trailing`）

### 状态组件

统一使用 `page/components/` 下的共享组件：
- `empty_state.tsx` - 空状态
- `loading_state.tsx` - 加载状态
- `error_state.tsx` - 错误状态

### 性能

- 搜索防抖 300ms
- 搜索结果缓存 5 分钟（Map 结构）
- 搜索历史最多 20 条

---

## Widget 规范

- 播放状态通过 `Storage.set("now_playing", ...)` 共享
- 播放/暂停/切歌后调用 `Widget.reloadUserWidgets()` 刷新
- AppIntent 定义在 `app_intents.tsx`，使用 `AppIntentManager.register`
- 播放控制使用 `AudioPlaybackIntent` 协议

---

**最后更新**: 2026/02/18