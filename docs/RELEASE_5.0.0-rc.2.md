# DoL Dev Tools 5.0.0-rc.2 — Paisley Park

这是供本地验货的 5.0 候选包，尚未发布。DoL Dev Tools 帮助 Mod 作者和 Agent 查看真实 Android / WebView，调查问题，并结合项目源码、构建包和实际加载结果验证判断。

5.0 提供三个研发入口：

- 选定 UI 组件可以关联当前源码。首轮支持商店 Toolbar；源码变化、不支持或缺失时保留对应状态，不猜位置。
- 接入的 UI 项目可以用自己的 Vite Component Lab 编辑真实 Vue 组件并热更新。Lab 不包含在 Tools 包里，也不证明真实购买、存档或游戏兼容性。
- Skill 和按需 Recipe 帮助 Agent 接续现场、源码和制品证据。同版本号仍需核对实际字节，普通诊断无需创建 Gameplay Goal。

RC.2 收入 RC.1 后的接续经验与辅助写作规范，并整理安装包内容：旧发布说明、废弃设计与内部计划留在源码仓库，包内历史引用指向固定来源。保留当前使用文档、许可证和离线测试需要的资源。CLI、GER、预算、执行回执及 Unknown 合同没有改动。

首次使用请看 [快速开始](../README.md#快速开始)。需要公开稳定版时使用 [4.0.1](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/releases/tag/v4.0.1)。候选包单独解压验货，保留原 Tools 与 Skill；来源 manifest 用于核对源码与文件摘要，不需要安装进游戏。

已有验收覆盖 A/B 有限原型和 C 的代表性只读接续。完整 Android Mod 自主修复、更多组件、设备和游戏业务仍未验证。RC.2 没有新增实机实验，具体检查和证据复用见 [候选收口](CLOSEOUT_5_0_RC2.md)。
