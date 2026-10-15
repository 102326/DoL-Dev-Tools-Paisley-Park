# 5.1.0 — Paisley Park

5.1 保留 5.0 的开发与诊断能力，让 Agent 更容易选对工具，让安装失败更容易判断和处理。正式包、SHA-256 与来源清单见 [5.1.0 Release](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/releases/tag/v5.1.0)。

- **按任务使用 Skill。** 布局调查、点击复现、源码修改、Gameplay 和安装排障各有入口，详细规则按需阅读；普通 Debug 不强制创建 GER Goal。
- **错误提示更清楚。** 已知输入和安装错误给出固定分类与处理建议，Node/SQLite 前提和 Help 示例与实际行为一致；超时不会被当作设备故障或操作未发生。
- **安装失败保留边界。** 文件先暂存并核验，最后才发布 Skill 入口；已有目标不覆盖，残缺安装会被拒绝，归属不明或被占用的文件不会被擅自清理。处理步骤见 [安装说明](SKILL_INSTALL.md#安装失败与重试)。
- **修复 Windows Node 22 安装清理。** 统一文件身份读取方式，避免把自己的临时文件误判为外来文件。中文/空格路径、NTFS 硬链接、真实文件占用、中断后态及两个启动器均已实际验证。
- **明确 Integration 证据边界。** 多次采集属于顺序观察，相同 URL、目录或 manifest 不证明它们来自同一个文档。

最低 Node 22.12.0。普通诊断、help/version 和 Skill 安装不需要 XState；Gameplay 仍需按锁文件安装 XState 5.33.2，并在 Node 22 使用 `--experimental-sqlite`，两个 Windows 启动器已包含该参数。向尚不存在的新 Skill 目标安装，保留旧 Tools、Skill 和 Store；见 [安装指南](SKILL_INSTALL.md)。

Windows Node 24 完整套件 **429 通过、1 跳过**，Node 22.12 定向套件 **24 通过、1 跳过**，Python **3 通过、1 跳过**，均无失败。独立包、隔离安装及选定 Codex CLI 新进程的项目 Skill 发现通过；不保证桌面 GUI 热更新或所有宿主自动触发。

本轮未重跑 Android 或真实 DoL。GER schema、预算、Effect Ledger、历史 Unknown 和 Android 目标身份合同未改变；不迁移私人数据。安装清理不是目录事务，不提供断电或持续并发替换路径的原子保护；其它文件系统与更多设备未覆盖。

Mac 自动化与隔离 Chrome 的原始验收范围见 [5.1 维护记录](MAINTENANCE_5_1.md)；Windows 修复、实际结果和验货包身份见 [Windows 验收](WINDOWS_5_1.md)。正式包来自包含文档收口的最终提交，身份以 Release 随附的 artifact-manifest.json 为准，不沿用早期验货 ZIP 的摘要。打包规则见 [固定提交验货规范](RELEASE_PACKAGE.md)。
