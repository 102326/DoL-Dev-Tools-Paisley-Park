# DoL Dev Tools 7.2.0 — Gold Experience

7.2 整理了 Android 调试、安装升级和开发接续，让现有工具更容易选对、装对、接着用。

## 这次有什么变化

- **Android 工具更好选。** 指南补齐官方 CLI 的原生输入、性能分析和设备镜像入口；查 WebView 的 DOM、样式和运行状态时继续使用 CDP，系统和进程问题交给 ADB。日常采集不会自动升级工具。
- **新旧安装识别更一致。** 修复英文显示名的识别问题，保留旧 Skill 标识和启动命令。包内只有一份项目 Skill，旧公告和过程实验不再混入日常使用文件。
- **已授权测试可以接着做。** 授权和隔离事实未变时继续复用；目标、数据或云边界变化时只核对变化项。普通启动和只读观察按实际风险判断，清数据、写存档等操作仍需要对应范围与恢复条件。
- **产物清理有明确范围。** Recipe 说明如何核对归属、引用和恢复来源，再清理本轮自有生成物。源码、唯一证据、真实存档和历史未决记录不会被当成可丢弃缓存。

Windows 完成了工具链和独立安装包核对；现有 Android 测试 App 完成真实 WebView 只读连接、DOM 和环境观察。这些结果支持日常调查，不扩大为全部 Android 操作都已验证。

## 下载与首次安装

下载 **`DoL-Dev-Tools-7.2.0.zip`**。`SHA256SUMS.txt` 用于核对下载完整性；`artifact-manifest.json` 记录源码提交和包内文件，普通使用不需要打开它。GitHub 自动生成的 Source code 压缩包不是这里验货的成品。

准备 Node.js **26.0.0 或更新版本**，将 ZIP 解压到长期保留的目录，在工具包根目录运行：

```powershell
.\DoL-Dev.cmd --version
.\DoL-Dev.cmd --help
```

版本应为 `7.2.0`。普通诊断和 Skill 安装无需先装 npm 依赖。需要 Gameplay 时，再在同一目录执行：

```powershell
npm ci --ignore-scripts --no-audit --no-fund
```

需要 Agent Skill 时，安装到尚不存在的目标目录：

```powershell
.\DoL-Dev.cmd install-skill --out "$env:USERPROFILE/.codex/skills/dol-dev-tools-paisley-park"
node "$env:USERPROFILE/.codex/skills/dol-dev-tools-paisley-park/scripts/resolve.cjs"
```

确认 resolver 返回 `7.2.0`，且 root 指向刚解压的包。随后按宿主方式刷新或开启新会话。连接 Android 还需要已有 ADB、USB 调试及明确的设备和包名；工具包不包含游戏、SDK、ADB 或 Android CLI。

## 从旧版升级

保留旧 Tools、旧 Skill 和现有执行记录，将新 ZIP 解压到新目录。安装器不会覆盖旧 Skill：先将旧 Skill 备份到宿主扫描范围外，再从新包向空的原目标安装。不要只改旧版的位置记录。

`Paisley-Park.cmd` 和 `dol-dev-tools-paisley-park` 标识继续可用。升级不要求迁移账本，也不会替旧未决动作补造结果；保留旧包作回退，已有数据的版本兼容条件见安装文档。

## 已知限制

- 这轮主要覆盖 Windows；Mac/Linux 和最低 Windows Node 26.0 没有新增本机验收。其它平台可用同一 Node 入口，具体工具条件仍需核对。
- 平板 App 由用户打开。本轮没有 Agent 启动派发、重载、App 重建、存档或 Mod 写入；Android CLI 的输入、截图和性能采集也未新增实机验证。
- 一条子 Codex 工具启动通路仍受宿主限制，不能用正常命令行或 CDP 连接成功替代；宿主中的 Skill 自动发现仍需单独确认。
- 缺失的历史账本和旧 Unknown 不会因升级恢复。完整自主 Mod 修复及“7.2 比 7.0 更聪明”没有验证结论。
