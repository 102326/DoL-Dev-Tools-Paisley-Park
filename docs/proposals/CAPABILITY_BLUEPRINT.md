> 用户提交的长期需求，2026-10-05。能力蓝图，不是当前实现或验收清单。当前入口见上级 DIAGNOSTICS.md，落地状态见上级 BLUEPRINT.md。原文的 Markdown 行末双空格换行改为反斜杠换行，其余内容保持。

# DoL Dev Tools：最终能力蓝图与架构定位

## 0. 最终目标

DoL Dev Tools 不应该只被理解成：

- 日志工具
- 测试工具
- 截图工具
- Android 调试脚本
- Soft & Wet 的配套工具

它最终希望解决的是更完整的问题：

> 让 Agent 不再只能“读源码、看截图、猜问题”，而是能够真正进入正在运行的 DoL 开发现场，看见、理解、操作、修改、部署并重新验证。

可以把整套能力理解成给 Agent 补齐一套真正的开发身体：

- **Brain / 脑子**：Skill、诊断策略、风险判断、工具选择、证据解释
- **Eyes / 眼睛**：Android CLI、Chrome Inspect / CDP、Screenshot、DOM、CSS
- **Ears / 耳朵**：Console、Logcat、Runtime Exception、Network、系统事件
- **Hands / 双手**：Action Layer、点击、输入、CDP 操作、UIAutomator
- **Legs / 双腿**：启动、重启、导航、前后台、旋转、Journey
- **Memory / 记忆**：Evidence、Known Good、Snapshot、Diff、Session / Incident
- **Instruments / 仪器**：gfxinfo、meminfo、Perfetto、bugreport、thermal
- **Workshop / 工坊**：源码定位、修改、构建、部署、重新运行、真机验收

最终希望形成完整闭环：

> Reproduce\
> → Observe\
> → Understand\
> → Diagnose\
> → Act\
> → Modify\
> → Deploy\
> → Verify\
> → Preserve Evidence

DoL Dev Tools 的核心价值不是“收集很多文件”。

而是：

> 让 Agent 真正拥有进入、理解和操作真实 DoL 运行现场的能力。

---

# 1. 项目定位

DoL Dev Tools 面向的是：

> 整个 DoL Mod 开发生态。

它不是 Soft & Wet 私人工具。

以下项目都应该可以直接使用 Generic Diagnostics：

- 原版 DoL 开发 / 整合环境
- Soft & Wet
- MapleBirch
- ModHub
- UI Mod
- 内容 Mod
- 框架 Mod
- 管理器 Mod
- Android 包装环境
- 其它第三方 DoL Mod

即使完全没有安装 Soft & Wet：

> DoL Dev Tools 的通用能力仍然应该正常工作。

Soft & Wet 只是最早、最深的真实使用者之一。

它催生了很多需求，但不应该成为整个工具体系的硬依赖。

---

# 2. 三大王牌：Live Device Access

整个 DoL Dev Tools 的最核心能力应该明确是：

- Android CLI
- Chrome Inspect / CDP
- ADB

这三者共同让 Agent 直接进入真实现场。

其它所有：

- Evidence
- DOM Diff
- Runtime Inspector
- Golden Screenshot
- Perfetto
- Skill
- Journey
- Integration

都建立在它们之上。

---

# 3. Android CLI：Agent 的眼睛

Android CLI 主要负责：

- Screenshot
- Annotated Screenshot
- Layout JSON
- Screen Resolve
- 控件标注
- 坐标解析
- Android UI 结构
- 当前屏幕现场

它的意义不只是截图。

更重要的是：

> Agent 可以直接看到设备当前到底显示了什么。

它可以帮助回答：

- 当前页面有没有打开
- 系统弹窗有没有挡住
- 控件实际在哪里
- 屏幕布局是否正常
- 点击目标是否存在
- 当前真机画面和预期是否一致

Android CLI 负责：

> 设备视觉现场。

---

# 4. Chrome Inspect / CDP：Agent 进入 WebView 的入口

Chrome Inspect / CDP 是整套体系里的核心大招之一。

人工开发者可以直接使用：

`chrome://inspect/#devices`

但更重要的是：

> Agent 可以通过 CDP 直接进入真实 Android WebView 的实时运行现场。

通过 CDP 可以读取：

- DOM
- CSS
- Computed Style
- Console
- Runtime Exception
- Network
- Storage
- Performance Entry
- 当前 URL / Title
- viewport
- JS Runtime
- 页面内部状态
- 自定义 Probe
- 项目 Runtime Integration

这样 Agent 不需要只依赖：

- 用户截图
- 静态源码
- 人工描述
- 零散日志

而可以直接检查：

> 当前正在运行的真实网页内部究竟发生了什么。

Chrome Inspect / CDP 负责：

> WebView 内部事实。

可以简单理解成：

> Android CLI 让 Agent 看见页面。\
> CDP 让 Agent 直接进入页面的大脑。

---

# 5. ADB：Agent 接触 Android 身体

ADB 负责：

- device
- shell
- package
- process
- PID
- port forward
- WebView debug socket
- logcat
- dumpsys
- screencap
- screenrecord
- run-as
- app lifecycle
- bugreport
- 应用文件和环境状态
- Android 系统状态

它主要帮助回答：

- App 有没有崩
- WebView 有没有异常
- Activity 有没有重建
- 进程是不是被杀了
- 内存怎么样
- 有没有 ANR
- WebView 调试口是否存在
- 安装的版本是不是对的

ADB 负责：

> Android / App 真实系统现场。

---

# 6. 三大核心组合

最终 Agent 可以同时知道：

### Android CLI

> 用户现在看到了什么？

### CDP

> WebView 里面实际上发生了什么？

### ADB

> Android / App 自己发生了什么？

这三者组成：

> DoL Dev Tools 的 Live Device Access。

这是整套工具真正最重要的核心。

---

# 7. scrcpy

scrcpy 作为人工开发辅助非常值得纳入标准工作流。

用途：

- PC 实时操控 Android
- 键鼠输入
- 复制粘贴
- 快速复现
- 录屏
- 与 Chrome Inspect 并排工作

典型开发方式：

> 左侧 scrcpy 操作真机\
> 右侧 Chrome DevTools 看 DOM / Console\
> 后台 DoL Dev Tools 自动采集现场

不需要打包 scrcpy 本体。

只需要：

- Doctor 检测
- 可选启动辅助
- README 推荐流程

---

# 8. Generic Diagnostics

DoL Dev Tools 的通用诊断能力全部保持项目无关。

包括：

- Android
- WebView
- DOM
- CSS
- Console
- Network
- Storage
- Performance
- Visual
- Lifecycle
- Evidence
- Automation

任何 Mod 作者都可以使用。

---

# 9. CDP Automation

现有 CDP 执行能力可以继续增强。

建议支持：

- Console error / warning
- Runtime exception
- DOM snapshot
- Computed Style
- Current URL
- Current title
- viewport
- Network summary
- Storage metadata
- Performance entry
- Runtime Integration
- Project Probe

定位：

> Chrome Inspect 用于人工调查。\
> CDP Automation 用于 Agent 自动观察、采证和验证。

---

# 10. Screenshot

支持：

- Android CLI screenshot
- ADB screenshot
- 时间戳
- Session ID
- 不覆盖旧制品

Screenshot 是最基础的视觉证据。

---

# 11. Screenrecord

用于记录：

- Drawer
- Modal
- 动画
- Scroll
- 页面切换
- 状态反馈
- Journey
- 偶发问题

因为很多问题：

> 静态截图根本看不出来。

默认：

- 短时
- 有明确时限
- 本地保存
- 不自动上传

---

# 12. Animation Capture

针对短动画提供关键帧采集。

例如：

- Drawer Open
- Modal Open
- Tab Transition
- Glass Button Press
- Status Shake
- Page Transition

可以：

- 录制短视频
- 固定间隔抽帧
- 输出关键帧
- 和 Known Good 比较

---

# 13. Action Layer

DoL Dev Tools 是开发 / 测试工具，因此不需要永远保持只读。

应该明确区分：

### Inspect

观察，不操作。

### Action

执行一个明确动作。

例如：

- tap
- input
- back
- home
- rotate
- launch
- restart
- open page
- toggle setting

这样 Agent 不只是能看，还能：

> 自己去复现问题。

---

# 14. Android Action

Android 层操作可以使用：

- Android CLI
- ADB
- UIAutomator

适合：

- App 启动
- Back
- Home
- Rotate
- 系统弹窗
- 权限
- Activity
- WebView 外壳

---

# 15. WebView Action

WebView 内部操作优先使用 CDP。

优先使用：

- selector
- DOM identity
- click
- input
- focus
- event

而不是纯坐标操作。

因为 CDP 可以知道：

> 点到的到底是谁。

---

# 16. Journey Recorder / Replay

Journey 是最终 Agent 自动复现能力的重要组成部分。

目标：

> 把一次人工操作变成可重复的开发实验。

Journey 可以包含：

- action
- selector
- coordinate
- input
- wait condition
- timeout
- checkpoint
- evidence capture

例如：

1. 启动 App
2. 打开设置
3. 打开目标页面
4. 点击按钮
5. 等待 Drawer
6. 截图
7. 抓 DOM
8. 抓 Console
9. 抓性能
10. 生成 Evidence

---

# 17. Journey Plan / Dry Run

支持：

`journey --plan`

真正执行前显示：

- 将点击什么
- selector 是否唯一
- 会输入什么
- 等待什么
- 哪些步骤采证
- 是否涉及高风险数据动作

方便 Agent / 开发者先确认 Journey。

---

# 18. UIAutomator

UIAutomator 主要用于 Android 原生层。

建议支持：

- hierarchy dump
- system dialog
- permission
- activity
- orientation
- return
- basic navigation

不需要把 WebView 内业务全部交给 UIAutomator。

---

# 19. App Lifecycle Journey

支持：

- cold start
- warm start
- foreground
- background
- return
- Home
- Back
- lock / unlock
- rotate
- Activity recreate
- WebView recreate
- restart

DoL 是 WebView 应用，这类问题非常值得测试。

---

# 20. DOM Snapshot

保存当前页面结构摘要。

用于了解：

> 页面现在到底是什么结构。

---

# 21. DOM Contract Snapshot

保存真正有兼容意义的 DOM 契约，而不是整个 HTML。

例如：

- tag
- id
- class
- data-*
- hidden
- parent
- children
- relationship
- order

目标：

> 第三方 Mod 更新以后，能够知道哪些结构契约变了。

---

# 22. DOM Contract Diff

比较两次 Snapshot：

- 节点新增
- 节点删除
- id 变化
- class 变化
- data 变化
- hidden 变化
- parent 变化
- order 变化
- relationship 变化

用途：

> 新版本到底改了什么？

---

# 23. Computed Style Snapshot

保存关键节点最终实际生效的 CSS：

- display
- visibility
- position
- width
- height
- margin
- padding
- background
- color
- border
- opacity
- filter
- backdrop-filter
- z-index
- transform

这可以解决：

> DOM 没变，为什么界面突然变了？

---

# 24. CSS Contract Diff

用于发现：

- Acrylic 变成实底
- border 变重
- hidden 被覆盖
- z-index 漂移
- layout 变化
- Visual Tier 变化
- spacing 明显漂移

---

# 25. Golden Screenshot

任何项目都可以保存已知正确视觉基线。

例如：

- Native
- Soft & Wet
- MapleBirch
- ModHub
- 其它 UI Mod

---

# 26. Visual Diff

支持：

- Current vs Golden
- 差异图
- 差异统计
- 大面积视觉变化

用途：

> 快速发现视觉回退。

不建议第一阶段做严格像素发布门禁。

---

# 27. Region Diff

允许只比较：

- Sidebar
- Combat
- Drawer
- Modal
- Toolbar
- Content
- Custom Region

减少整页 Diff 的无意义噪声。

---

# 28. DOM Event Trace

短时记录：

- click
- pointer
- change
- input
- focus
- blur
- submit
- custom event

记录：

- timestamp
- target
- event order
- propagation
- preventDefault

用于回答：

> 按钮点了，为什么没有反应？

---

# 29. Mutation Timeline

记录指定时间窗口：

- node insert
- node remove
- attribute change
- class change
- hidden change
- text update

主要排查：

- SugarCube 更新
- Vue 重渲染
- 第三方 Mod 插入节点
- Adapter 修改
- DOM ownership 冲突

---

# 30. Observer Timeline

按需跟踪：

- MutationObserver
- ResizeObserver
- IntersectionObserver

用于：

- Observer Loop
- 重复扫描
- 页面销毁后未释放
- 不必要重复更新

---

# 31. DOM Ownership Inspector

对关键区域标记：

- Native
- Game
- Project Runtime
- Adapter
- Third-party
- Unknown

目的是：

> 明确谁应该拥有这块 DOM。

---

# 32. Selector Health Check

自动检查 selector：

- 0 match
- multiple match
- unique match
- nth-child
- siblings
- long class chain
- text dependency
- DOM order dependency
- coordinate dependency

输出：

- stable
- moderate
- fragile

对于逆向兼容第三方 Mod 特别有价值。

---

# 33. Storage Snapshot

默认只采结构信息：

- localStorage keys
- sessionStorage keys
- IndexedDB DB
- store
- schema
- key count
- type summary

默认不采：

- 存档正文
- Credential
- Token
- 敏感用户内容

---

# 34. Storage Diff

比较：

- schema
- store
- key
- count
- structural changes

用于：

- 设置丢失
- Mod 数据变化
- 升级迁移
- Schema 漂移

---

# 35. Console Capture

采集：

- error
- warning
- selected info

默认避免把全部 Console 噪声塞进 Evidence。

---

# 36. JS Error Timeline

统一整理：

- window.onerror
- unhandled rejection
- Console error
- CDP Runtime exception

按照统一时间轴排序。

---

# 37. Network Diagnostics

通过 CDP 获取：

- method
- host
- path
- status
- duration
- resource type
- error
- timestamp

适合：

- 云存档
- 下载
- API
- 远程资源

---

# 38. Network Scenario

测试环境允许模拟：

- offline
- high latency
- slow network
- selected request failure

不用真的拔网线。

---

# 39. HAR / Network Evidence

按需导出脱敏 HAR 或等价格式。

默认过滤：

- Cookie
- Authorization
- Token
- Credential
- Sensitive Body
- 大型正文

---

# 40. Advanced Network Tools

mitmproxy / Charles 可以作为外部高级能力。

不作为 DoL Dev Tools 核心依赖。

---

# 41. Filtered Logcat

默认只抓有价值信息：

- target PID
- AndroidRuntime
- Chromium
- WebView
- crash
- ANR
- ActivityManager relevant events
- JS bridge

支持：

- 最近 N 秒
- 时间窗口
- PID

目标：

> 不要每次生成十万行垃圾日志。

---

# 42. gfxinfo / framestats

普通性能诊断第一层。

用于：

- frame time
- jank
- scroll
- animation
- modal
- drawer

日常性能问题优先看这个。

---

# 43. meminfo

记录：

- App memory
- WebView memory
- PSS
- RSS
- repeated sample

主要帮助观察：

- 内存持续上涨
- DOM 增长
- Cache 增长
- Observer 残留

不自动宣布“内存泄漏”。

---

# 44. Perfetto

Perfetto 用于深度性能调查。

分析：

- CPU
- UI Thread
- RenderThread
- Chromium / WebView
- GPU
- Frame Timeline
- scheduling
- long tasks

DoL Dev Tools 负责：

- capability check
- trace config
- capture
- metadata

不自己重做 Trace Viewer。

---

# 45. bugreport

用于：

- 偶发问题
- ANR
- WebView + Android 系统一起异常
- 难复现问题

不进入普通检查流程。

适合作为：

> Full Evidence 的重型采集项。

---

# 46. Thermal / Battery

深度性能调查时记录：

- battery
- temperature
- thermal state
- throttling

防止把：

> 设备热降频

误判成：

> 新版本性能回退。

---

# 47. JS Heap / DOM Leak Probe

支持：

1. baseline
2. 重复打开关闭页面
3. 再次采样

比较：

- JS heap
- DOM node count
- detached node
- listeners
- observers

用于发现：

- Vue 残留
- Drawer Leak
- Observer Leak
- DOM Leak

---

# 48. Performance Timeline

把：

- Action
- Event
- Mutation
- JS Error
- Long Task
- Frame Jank
- gfxinfo
- meminfo
- lifecycle event

对齐到统一时间轴。

目标：

> 问题到底是在哪个动作之后开始出现的？

---

# 49. WebView Provider Inspector

记录：

- provider package
- provider version
- Chromium version
- debugging state

以后遇到：

> 只有这台设备有问题

时非常有价值。

---

# 50. Environment Snapshot

记录：

- Device
- Android
- WebView
- APK
- Game
- ModLoader
- viewport
- capabilities
- Mod environment

---

# 51. Environment Diff

比较两个现场：

- 设备
- Android
- WebView
- APK
- 游戏版本
- Loader
- viewport
- capabilities
- Mods

回答：

> 为什么 A 能复现、B 不能？

---

# 52. Mod Environment Snapshot

记录：

- Mod name
- version
- enabled
- load order
- optional fingerprint

不复制 Mod 包体。

用于：

> 只有某几个 Mod 组合才出问题。

---

# 53. Compatibility Matrix Runner

按需选择组合：

- Native
- Different Mods
- Runtime ON/OFF
- Visual Tier
- Phone / Tablet
- Portrait / Landscape

不要默认跑完整笛卡尔积。

---

# 54. Viewport / Device Matrix

支持快速覆盖：

- phone
- tablet
- desktop-like width
- portrait
- landscape

结合：

- Screenshot
- DOM
- Visual Diff

---

# 55. Accessibility Inspector

检查：

- touch target size
- label
- focus
- keyboard
- hidden / aria
- contrast
- semantic controls

---

# 56. Touch Target / Hitbox Overlay

直接显示：

- actual click area
- bounds
- overlap
- too-small target

尤其适合 Android UI。

---

# 57. Z-index / Overlay Inspector

分析：

- stacking context
- z-index
- Modal
- Drawer
- Tooltip
- Context Menu
- third-party overlay

---

# 58. Scroll Inspector

记录：

- scroll container
- scrollTop
- scrollHeight
- clientHeight
- nested scroll
- sticky
- overscroll

用于：

- 双层滚动
- Drawer 抢滚动
- sticky 异常
- 页面滚不动

---

# 59. Public Integration Contract

DoL Dev Tools 应该允许任何项目提供自己的诊断 Integration。

最小接口可以考虑：

- detect
- describe
- collect
- redact

例如：

- Soft & Wet Integration
- MapleBirch Integration
- ModHub Integration
- Future Runtime Integration

所有 Integration：

> 平级、公开、可选。

---

# 60. Runtime Integration

任何拥有内部 Runtime 的 Mod 都可以提供只读诊断。

例如：

- 当前 Runtime version
- 当前生命周期状态
- 当前内部模块摘要
- 当前错误摘要
- 当前 capability

DoL Dev Tools 负责：

- Detect
- Collect
- Organize

而不是强制规定业务模型。

---

# 61. Evidence Bundle

Evidence 是整个体系的统一现场交付格式。

可以包含：

- Screenshot
- Annotated Screenshot
- Screenrecord
- Device
- App
- WebView
- Layout
- DOM
- CSS
- Console
- Network
- Logcat
- gfxinfo
- meminfo
- Performance
- Mod Environment
- Reproduction Note
- Optional Integrations

---

# 62. Evidence Manifest

建议记录：

- schemaVersion
- sessionId
- incidentId
- capture time
- tool version
- device
- app
- game
- WebView
- collectors
- integrations
- result
- duration
- hashes

---

# 63. Evidence 完整性

不要只有：

`success = true`

而应该区分：

- complete
- partial
- failed

并列出：

- completed
- failed
- skipped
- unsupported

---

# 64. Session / Incident ID

同一次问题复现的：

- Screenshot
- Video
- Log
- DOM
- Performance
- Integration

全部共享同一 ID。

---

# 65. 时间对齐

记录：

- Host time
- Device time
- Capture start
- Capture end
- Time offset

方便对齐：

- Logcat
- Console
- Screenrecord
- Perfetto
- Event Trace

---

# 66. Schema Version

所有结构化证据尽量带：

`schemaVersion`

包括：

- Evidence
- DOM Contract
- CSS Contract
- Environment
- Performance
- Integration
- Journey
- Support Bundle

---

# 67. Redaction

Evidence 聚合层统一进行脱敏。

默认保护：

- Username
- File path
- Cookie
- Authorization
- Token
- Credential
- Save content
- Player text
- Cloud data

目标：

> 默认结果尽量可以直接提交 Issue。

---

# 68. Reproduction Note

支持：

- summary
- expected
- actual
- steps
- notes

哪怕第一版只是：

`repro.txt`

也非常有价值。

---

# 69. Support Bundle

面向普通用户提交问题。

比开发 Evidence：

- 更轻
- 更严格脱敏
- 更易分享

建议包含：

- versions
- device
- screenshot
- short log
- error summary
- reproduction
- compatibility state

---

# 70. Full Evidence

面向疑难开发问题。

可以追加：

- Perfetto
- bugreport
- Screenrecord
- Rich DOM / CSS
- Rich Network
- Runtime Integration

普通问题不默认生成 Full Evidence。

---

# 71. Evidence Compare

直接比较两份 Evidence：

- Environment
- DOM
- CSS
- Visual
- Runtime / Integration
- Performance
- Logs

回答：

> 两次现场之间到底变化了什么？

这是后续非常值得做的能力。

---

# 72. Known-good Baseline

允许某份 Evidence 被标记为：

> Known Good

以后可以直接：

> Current vs Known Good

而不是靠开发者记忆比较。

---

# 73. Issue Report Generator

从 Support / Evidence 自动生成 Markdown：

- Environment
- Version
- Reproduction
- Expected
- Actual
- Key findings
- Attachments
- Evidence ID

方便直接提交 GitHub Issue。

---

# 74. Collector 架构

每类采集最终尽量独立为 Collector。

例如：

- Android Collector
- Screenshot Collector
- CDP Collector
- DOM Collector
- CSS Collector
- Console Collector
- Network Collector
- Logcat Collector
- Performance Collector
- Integration Collector

Evidence Bundle 负责：

> orchestration。

而不是所有逻辑堆在一个巨大脚本里。

---

# 75. Collector 统一失败策略

所有 Collector：

- 明确 timeout
- 不无限等待
- 不偷偷无限重试
- 不自动切换设备
- 失败写明原因
- 已成功证据不删除
- 不覆盖旧 Evidence

---

# 76. Doctor

提供统一环境检查。

例如：

`dol-dev doctor`

检查：

- Node
- Python
- Android CLI
- ADB
- scrcpy
- Device
- Package
- WebView
- CDP
- run-as
- Perfetto
- Ports
- Artifact path

Doctor：

> 只检查环境。

不自动修环境，不抓大量现场。

---

# 77. Skill：Agent 的脑子

DoL Development Skill 面向整个 DoL 生态。

它的作用不是实现工具，而是告诉 Agent：

> 什么时候应该使用什么工具。

---

# 78. Skill 模式

建议第一版包括：

### quick-inspect

普通 UI / 真机问题。

优先：

- Live Device Access
- Screenshot
- CDP
- ADB

---

### compatibility-diagnose

第三方 Mod / DOM / Integration。

优先：

- DOM Contract
- Diff
- Integration
- Selector
- Runtime

---

### visual-diagnose

视觉 / CSS / Layout。

优先：

- Screenshot
- Chrome Inspect
- Computed Style
- Golden Diff

---

### performance-diagnose

卡顿 / 内存。

优先：

- gfxinfo
- meminfo
- Chrome Performance

异常再升级：

- Perfetto

---

### full-evidence

疑难杂症。

才使用：

- Full Evidence
- bugreport
- 深度 Trace

---

# 79. Skill 核心原则

## Live Site First

运行问题优先进入：

> 真实设备 + 真实 WebView。

不要只读源码猜。

---

## Evidence First

先拿证据，再下结论。

---

## 最小充分诊断

小问题：

> 小工具。

复杂问题：

> 再升级。

不要任何问题都上 Perfetto / bugreport / Full Evidence。

---

## Source Separation

明确区分：

- Android CLI：真实画面
- CDP：真实 WebView
- ADB：真实 Android / App
- Integration：目标 Mod 对自身的解释
- User Note：复现上下文

Integration 的判断不能覆盖现场事实。

---

# 80. 测试环境的操作边界

需要明确：

> DoL Dev Tools 是测试工具，不需要为了“安全”把所有自动操作都禁掉。

在明确测试环境中，可以主动：

- 点击
- 输入
- 切换页面
- 开关设置
- 重启 App
- 横竖屏
- Journey
- 普通游戏操作

真正需要保护的是：

> 不可逆地破坏真实用户数据。

---

# 81. 高风险数据操作

默认禁止或要求显式授权：

- 删除真实存档
- 覆盖真实存档
- 删除云存档
- 覆盖云端数据
- 删除真实 Mod
- 清空正式用户数据
- 修改真实 Credential

如果明确运行于：

- 测试档
- 测试账号
- 隔离 App
- 临时数据目录

则可以允许更激进自动化。

---

# 82. Generic 与 Integration 分离

最终结构建议：

    DoL Dev Tools
    │
    ├─ Live Device Access
    │  ├─ Android CLI
    │  ├─ Chrome Inspect / CDP
    │  └─ ADB
    │
    ├─ Generic Diagnostics
    ├─ Action / Journey
    ├─ Performance
    ├─ Evidence
    ├─ Skill
    └─ Optional Integrations

任何项目都可以直接使用 Generic。

Integration 只是增强。

---

# 83. 项目独立

DoL Dev Tools 不要求：

- Soft & Wet
- DoL Game UI
- MapleBirch
- ModHub
- 特定源码目录

任何 DoL Mod 作者 clone 后：

> Generic Diagnostics 应该直接能用。

---

# 84. 公开格式

适合公开：

- Evidence Schema
- DOM Contract Schema
- CSS Contract Schema
- Integration Contract
- Journey Format
- Support Bundle Format
- Collector Convention

这样第三方作者可以：

- 自己接入
- 自己写 Integration
- 自己写分析工具

---

# 85. 不应该演变成什么

即使做得很强，也不要变成：

- 云端遥测平台
- 中央数据库
- 常驻用户监控
- 自动上传日志
- 第二个 ModLoader
- 通用游戏 Runtime
- 全局 DOM 虚拟化
- 自动修改未知 Mod
- 自动修复第三方代码

继续保持：

> Local-first Development Environment。

---

# 86. 最终 CLI 形态

长期可以考虑统一：

    dol-dev doctor
    dol-dev inspect
    dol-dev capture
    dol-dev record

    dol-dev action
    dol-dev journey
    dol-dev journey --plan

    dol-dev dom-snapshot
    dol-dev dom-diff
    dol-dev css-snapshot
    dol-dev css-diff

    dol-dev events
    dol-dev mutations
    dol-dev ownership
    dol-dev selector-health

    dol-dev storage
    dol-dev network
    dol-dev logcat

    dol-dev perf
    dol-dev perf --deep

    dol-dev visual-diff
    dol-dev evidence
    dol-dev evidence --full
    dol-dev support

    dol-dev compare

不需要一次性全部实现。

现有工作脚本也不需要为了统一 CLI 全部推翻重写。

---

# 87. Agent 开发闭环

最终最理想的工作方式是：

    Agent
      ↓
    读取任务 / Issue
      ↓
    Skill 判断问题类型
      ↓
    Android CLI + CDP + ADB
      ↓
    直接查看真实现场
      ↓
    必要时执行 Action / Journey
      ↓
    复现问题
      ↓
    Evidence / Diff / Performance
      ↓
    找到问题
      ↓
    定位源码
      ↓
    修改代码
      ↓
    Build
      ↓
    Deploy
      ↓
    真机重新运行
      ↓
    再次 Inspect
      ↓
    Verify
      ↓
    保存 Evidence / Report

这才是 DoL Dev Tools 最终真正想达到的效果。

---

# 88. 最终定位

DoL Dev Tools 最终不是：

> 一组调试脚本。

也不是：

> 一个日志采集器。

甚至不只是：

> 一个测试框架。

它最终应该成为：

> 面向整个 DoL Mod 生态的 Agent 本地开发执行环境。

它让 Agent 拥有：

- 脑子
- 眼睛
- 耳朵
- 双手
- 双腿
- 记忆
- 测量仪器
- 开发工坊

最终 Agent 不再只是：

> “你把错误贴给我，我帮你猜。”

而应该逐步做到：

> “我自己去现场看。”\
> “我自己复现。”\
> “我自己看日志和 DOM。”\
> “我自己定位代码。”\
> “我自己修改。”\
> “我自己部署。”\
> “我自己重新跑一遍确认。”

最终核心闭环：

> Observe → Understand → Act → Modify → Deploy → Verify

这就是 DoL Dev Tools 的最终目标。