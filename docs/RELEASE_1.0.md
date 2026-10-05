# 1.0.0 重置版

2026-10-05。从原有独立脚本工具包重置为“通用诊断 + Evidence + 可选 Integration + 诊断 Skill”。此版本在原目录更新；不修改 Soft & Wet Runtime 或目标 Mod。

## 使用与迁移

- Node.js 22.12+；统一入口 `DoL-Dev.cmd` / `scripts/dol-dev.cjs`，`--version` 返回 `1.0.0`。无新增 Node 运行依赖，无需 npm install。
- 旧的 `Inspect-Android.cmd`、`android-inspect.cjs`、`adb-evaluate.cjs`、Backup 及探针保持原入口。自定义原始 JS 与私有备份不属于默认只读 Evidence。
- 源码 ZIP 可解压到独立目录使用，不需要 UI 仓库或本机固定路径。设备参数、工具环境变量和输出路径由调用者提供。
- 版本号为 1.0.0；Evidence、Support、DOM JSON 的 schema 仍是 1。已有受支持的 schema 1 现场可继续用于离线投影/比较，不执行批量迁移或覆盖。
- 新包不含旧 artifacts、私有 backups、Git 元数据、游戏资源、APK 或第三方工具。原工作区证据与备份保持在本地。

## 验收边界

当前命令完整列表见 [DIAGNOSTICS](DIAGNOSTICS.md)，检查结果见 [VALIDATION](VALIDATION.md)。通用核心与可选桥分别验收；没有 Soft & Wet、未知 API 和桥异常由受控测试覆盖，真机没有为测试卸载 Mod。

Perfetto / bugreport 是显式的可选入口：包装与失败策略通过离线检查；缺官方 recorder 标为 unsupported，重型原始资料不纳入 Support。未实测的设备、系统 trace 语义与 archive 完整性仍单独列出；1.0 不代表完整兼容矩阵。

Skill 留在仓库，提供五种诊断路径；结构校验与人工路径检查不等于宿主自动发现或全局安装。

## 恢复旧版

替换前保留本地源码 ZIP（包含 0.5.0 未提交开发内容）与 Git history.bundle。需要回退时将旧源码解压到另一个目录核对后再替换；不要递归覆盖或删除当前 artifacts / backups。旧版备份含源码，不含采集现场。

本次更新与源码交付只在本机完成，不自动上传 GitHub、npm 或真实证据。
