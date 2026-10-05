> 用户提交的长期需求，2026-10-05。能力蓝图，不是当前实现或验收清单。当前入口见上级 DIAGNOSTICS.md，落地状态见上级 BLUEPRINT.md。

# DoL Dev Tools：重新定位为面向整个 DoL Mod 生态的公共开发工具

需要重新明确 DoL Dev Tools 的定位。

它不应该被理解成：

> Soft & Wet 的配套工具。

更准确的定位是：

> DoL Dev Tools 是面向整个 DoL Mod 生态的公共开发、调试、诊断与复现实验工具链。

Soft & Wet 只是最早、最深的实际使用者之一。

它推动了很多需求出现，但工具本身不应该围绕 Soft & Wet 建立中心化依赖。

---

## 一、核心定位

DoL Dev Tools 的目标是：

> 无论开发的是原版页面、UI Mod、框架 Mod、内容 Mod、Mod 管理器还是其它第三方扩展，都能直接拿来用。

例如：

- Soft & Wet
- MapleBirch
- ModHub
- 其它 DoL Mod
- 整合包
- Android 包装环境

都应该可以使用同一套通用工具。

如果 Soft & Wet 完全没有安装：

> DoL Dev Tools 仍然应该完整工作。

---

## 二、Soft & Wet 只是一个 Integration

Soft & Wet 可以拥有更深的诊断能力，例如：

- Runtime Inspector
- Adapter Probe
- Fingerprint
- Role Mapping
- Selector fallback
- Adaptation Level
- Surface 状态
- Compatibility Events

但这些都应该理解成：

> Soft & Wet 提供给 DoL Dev Tools 的一个可选 Integration。

不是 DoL Dev Tools 的核心假设。

以后其它项目也可以拥有自己的 Integration。

例如：

- MapleBirch Integration
- ModHub Integration
- 其它 Mod Integration

是否接入完全自愿。

---

## 三、Integration 机制本身也应该公开

DoL Dev Tools 可以公开一套轻量 Integration Contract。

例如：

- `detect`
- `describe`
- `collect`
- `redact`

目标是让其它 Mod 作者可以自己提供专属诊断。

例如 MapleBirch 作者如果愿意，可以提供：

> 当前模块状态、框架版本、加载阶段、内部诊断摘要

ModHub 作者也可以提供：

> 当前管理器状态、加载结果、内部错误摘要

DoL Dev Tools 负责统一采集和组织。

不需要我们替所有 Mod 写专属适配。

---

## 四、通用能力全部保持项目无关

这些能力属于整个生态：

- Android CLI
- ADB
- Chrome Inspect
- CDP
- scrcpy
- Screenshot
- Screenrecord
- Console
- Network
- Logcat
- gfxinfo
- framestats
- meminfo
- Perfetto
- bugreport
- DOM Snapshot / Diff
- CSS / Computed Style Diff
- Golden Screenshot
- Visual Diff
- Journey
- Event Trace
- Mutation Timeline
- Storage Snapshot
- WebView Inspector
- Environment Diff
- Mod Environment Snapshot
- Evidence Bundle
- Support Bundle
- Doctor
- Skill

这些功能不应该假设目标项目是 Soft & Wet。

---

## 五、Evidence Bundle 是公共格式

Evidence Bundle 应该成为通用诊断交付格式。

任何 Mod 都可以使用。

基础证据包括：

- 设备
- App
- WebView
- Screenshot
- Screenrecord
- DOM
- Console
- Network
- Logcat
- Performance
- Reproduction Note
- Mod Environment

如果检测到 Integration，再追加：

- Integration 自己的诊断输出

例如：

    evidence/
      manifest.json
      device.json
      app.json
      dom.json
      console.json
      performance.json
      screenshot.png

      integrations/
        soft-and-wet.json
        maplebirch.json

没有对应 Integration 时直接跳过。

---

## 六、Support Bundle 也面向整个生态

普通用户反馈任何 DoL Mod 问题时，都可以生成 Support Bundle。

例如：

> MapleBirch 某页面异常

不需要安装 Soft & Wet。

直接生成：

- 设备
- WebView
- Mod 版本
- 截图
- 精简日志
- DOM 摘要
- 复现步骤

然后发给 MapleBirch 作者即可。

这应该是 DoL Dev Tools 很重要的公共价值。

---

## 七、Skill 也应该是通用 Skill

DoL Development Skill 不应该只教 Agent 怎么调 Soft & Wet。

它应该教 Agent：

> 面对任何 DoL Mod 问题，应该先查什么。

例如：

### 页面布局异常

- Screenshot
- DOM
- CSS
- Console

### 第三方更新后失效

- DOM Contract
- Environment Diff
- Integration 状态（如果存在）

### Android 卡顿

- gfxinfo
- meminfo
- Chrome Performance
- 必要时 Perfetto

### 网络问题

- CDP Network
- Network Evidence
- 必要时深度抓包

Soft & Wet 只是其中一种特殊诊断路径。

---

## 八、Runtime Inspector 也不必是 Soft & Wet 专属概念

可以把“Runtime Inspector Integration”理解成一种通用能力。

任何 Mod 如果本身有运行时，都可以选择暴露只读诊断。

例如：

- Soft & Wet UI Runtime
- MapleBirch Runtime
- 其它框架 Runtime

DoL Dev Tools 只负责读取、组织和展示。

---

## 九、Journey 也应该通用

Journey 不应该写成：

> Soft & Wet 自动化。

而应该是通用真机操作流程。

例如：

- 启动 App
- 打开菜单
- 点击目标
- 等待 DOM
- 截图
- 抓 Console
- 记录性能

任何 Mod 都可以定义自己的 Journey。

---

## 十、Golden Screenshot 也不限于 UI Mod

视觉基线可以用于：

- Soft & Wet
- MapleBirch
- ModHub
- 原版
- 其它 UI / 页面 Mod

任何项目都可以保存自己的 Golden Reference。

DoL Dev Tools 提供比较能力即可。

---

## 十一、DOM Contract 是公共能力

DOM Contract 的核心结构应该完全中立：

- tag
- id
- class
- data
- hidden
- parent
- children
- relationship

项目专属语义放 Integration 扩展字段。

例如 Soft & Wet 可以增加：

- role
- adapter
- fingerprint

MapleBirch 也可以增加自己的字段。

---

## 十二、工具包应该支持“谁来都能舒服用”

这应该成为设计目标之一。

新用户不应该必须理解我们的项目结构。

理想流程：

1. Clone DoL Dev Tools
2. 运行 `doctor`
3. 连接设备
4. 运行 `inspect` / `evidence`
5. 得到有用结果

如果安装了支持 Integration 的 Mod：

> 自动获得更多诊断信息。

没有 Integration：

> 通用能力照常工作。

---

## 十三、不要让 Integration 成为依赖

Integration 永远是增强项。

不能出现：

> 因为 Soft & Wet Integration 失败，所以 Evidence 失败。

或者：

> 因为没有 MapleBirch Integration，所以 DOM 工具不能用。

统一规则：

> Integration 可以失败，Generic 必须继续。

---

## 十四、公开 Schema 和格式

如果条件允许，可以公开：

- Evidence manifest schema
- DOM Contract schema
- Integration Contract
- Journey format
- Support Bundle format

这样第三方作者可以：

- 自己生成兼容数据
- 自己写 Integration
- 自己写分析工具

不必依赖我们的内部实现。

---

## 十五、DoL Dev Tools 不属于某个 Mod

长期最好明确：

> DoL Dev Tools 是独立项目。

DoL Game UI 可以依赖它进行开发。

MapleBirch 也可以使用它。

ModHub 也可以使用它。

其它作者也可以使用。

但它不属于任何一个 Mod 的私有基础设施。

---

## 十六、Soft & Wet 的角色

Soft & Wet 对 DoL Dev Tools 的意义更像：

> 第一个重度真实用户。

它帮助暴露了：

- Android 调试
- WebView 诊断
- Adapter 兼容
- Visual Diff
- Runtime Inspector
- Evidence

这些需求。

但最终沉淀出来的工具应该尽可能泛化给整个生态。

---

## 十七、最终架构

可以理解为：

    DoL Dev Tools
    │
    ├─ Generic Diagnostics
    │  ├─ Android
    │  ├─ WebView / CDP
    │  ├─ DOM / CSS
    │  ├─ Console / Network
    │  ├─ Performance
    │  ├─ Visual
    │  ├─ Journey
    │  └─ Evidence
    │
    ├─ Public Integration Contract
    │
    └─ Optional Integrations
       ├─ Soft & Wet
       ├─ MapleBirch
       ├─ ModHub
       └─ Others

所有 Integration 都是平级、可选的。

Soft & Wet 不拥有特殊地位。

---

# 最终定位

DoL Dev Tools 最终应该是：

> 整个 DoL Mod 生态都能使用的本地开发与诊断工具链。

它提供：

- 真机调试
- WebView 检查
- 性能分析
- DOM / CSS 对比
- 自动复现
- Evidence
- Support
- Integration

Soft & Wet 只是其中一个深度接入案例。

一句话：

> 不是给 Soft & Wet 做工具，而是 Soft & Wet 顺手催生了一套整个 DoL Mod 生态都能舒服使用的开发基础设施。