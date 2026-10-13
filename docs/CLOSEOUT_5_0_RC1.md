# Paisley Park 5.0.0-rc.1：本地候选收口

## 本轮 Done

从当前测试分支准备可验货的本地候选：版本、README、Skill、CLI 与锁文件一致；固定源码提交生成 ZIP/SHA-256/manifest；在解压包验证无依赖诊断、缺依赖拒绝、锁定 Gameplay 依赖、隔离 Skill 安装与自有 SQLite smoke。只检查本次入口与制品风险，不扩大真实业务覆盖。

不推送、合并、Tag、发布，不替换全局 4.0.1 Skill，不接触游戏/设备或旧 Store。B Lab 仍在 UI 项目，禁止整分支合并进新 UI。

## Delivered

版本定为 `5.0.0-rc.1 — Paisley Park`。补首次使用入口、A/B/C 范围与候选公告；现有 CLI 动态读取元数据，生产 Runtime/Collector/Schema 未改。A/B/C 证据见 [A/B Windows](PAISLEY_PARK_5_0_WINDOWS_AB.md)、[C 接续](PAISLEY_PARK_5_0_C_REVIEW.md)。

## Validated

2026-10-14 Windows / PowerShell 7：Node 24.19.0、npm 11.17.0、Python 3.14.7。当前候选源码实际运行 `npm test`，412 通过、0 失败、0 跳过；Python discover 共 4 项，2 通过、2 因缺可选 jsonschema/Pillow 跳过、0 失败。Skill quick_validate、CLI 版本/help 和 XState 5.33.2 已安装状态检查通过。没有为可选覆盖安装新依赖。

固定打包提交、ZIP 与 payload 文件摘要位于随附 `artifact-manifest.json`；解压包的 CLI、缺依赖拒绝、锁定依赖、隔离安装与自有 Store 结果独立记在 `candidate-validation.json`，以实际结果为准。manifest 只描述来源与字节，不替代验收结论。原始日志留在本地 ignored `artifacts/paisley-park-5.0.0-rc.1-20261014/`。

复用此前 A/B 的代表性 Windows/Mac 原型结果、Skill 安装验证和 C 平板只读接续，不将这些历史结果计为本轮新实验。5.0 的源码关联属于可选 Integration，普通 Generic Diagnostics 不依赖它。

## Not validated / Known limitations

完整 Android Mod 自主修复、全部业务/设备/Provider/组件和全部 Debug/GER 组合未覆盖；本轮未重跑 Android 或 Lab 实验。Python 可选格式 Schema 与图像像素两项没有本轮运行证明。原打赏调查缺逐阶段文档身份，不能用新记录追认。平板 UI 与最新本地 UI 包版本号相同但字节不同，尚未更新；该差异不是 Tools 运行失败。候选未公开发布，未自动安装到全局 Skill。
