# DoL Dev Tools 5.0.0 — Paisley Park

DoL Dev Tools 是面向 DoL Mod 作者和 Agent 的本地开发工具。它帮助你查看真实 Android / WebView，调查问题，定位相关源码，并核对构建包是否实际加载。首次使用从 [快速开始](../README.md#快速开始) 进入。

5.0 让现场调查更容易接到后续开发：

- **关联组件源码**：选定 UI 组件可与当前源码对应。首轮支持商店 Toolbar；源码变动、输入缺失或组件不支持时保留对应状态。
- **编辑真实组件**：接入的 UI 项目可使用自己的 Vite Component Lab 试样式和热更新。Lab 属于 UI 工程，不包含在 Tools ZIP，也不证明真实购买、存档或游戏兼容性。
- **接续研发证据**：Skill 和按需 Recipe 帮助 Agent 区分现场、源码、构建与实际加载的包。同版本号仍需核对字节，普通诊断无需创建 Gameplay Goal。

原有 Android CLI、ADB/CDP、Debug、Action/Journey、Gameplay Runtime 与 Evidence 继续使用。通用诊断不依赖 Soft & Wet 或其它特定 Mod；Integration 是可选增强。5.0 没有改写 GER、预算、执行回执或历史 Unknown 的合同。

安装包保留当前使用文档、代码、Skill 和必要资源。旧设计与公告留在源码仓库，历史引用指向固定来源。辅助写作 Skills 单独安装，Component Lab 由目标 UI 项目接入。

RC.2 的 Windows 独立解压包已运行 Node 全套：412 通过，0 失败；Python：3 通过，1 项因缺可选 Pillow 跳过。正式包复用这些未失效的回归结果，并单独核对最终版本、内容与安装入口。A/B 是有限原型验收，C 是代表性只读接续；完整 Android Mod 自主修复、更多组件、设备与业务仍未验证。

本地正式包为 `DoL-Dev-Tools-5.0.0.zip`，附带 SHA-256 与来源 manifest。manifest 用于核对文件来源，不需要安装进游戏。保留旧 Tools/Skill，按 [安装与升级](SKILL_INSTALL.md) 使用新目录；本包不迁移、清空或结清旧执行记录。

具体证据与限制见 [5.0 收口](CLOSEOUT_5_0.md)。本轮完成本地正式打包，尚未公开发布；公网推送与 GitHub Release 另按授权执行。
