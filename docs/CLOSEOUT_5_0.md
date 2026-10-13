# Paisley Park 5.0.0：正式包收口

## 本轮 Done

以已通过发布前测试的 RC.2 为基础，将当前版本、CLI/Skill 说明、安装入口和公告统一为 `5.0.0 — Paisley Park`。固定源码生成本地 ZIP、SHA-256 和 manifest；核对导出集合、内容、链接、版本、依赖隔离、锁定安装、隔离 Skill/resolver 与自有 SQLite smoke。保留既有 RC 制品与历史 Unknown，不执行公网发布。

## Delivered

本地正式包与 [更新说明](RELEASE_5.0.0.md)。生产 Runtime、Provider、Collector、Schema、测试和依赖没有修改；沿用 [导出清单与验货](RELEASE_PACKAGE.md) 的规则。普通诊断仍独立于可选 Integration，B Lab 仍由 UI 工程拥有。全局安装保留 4.0.1。

## Validated

正式包的固定源码、ZIP 摘要与逐文件身份见随附 `artifact-manifest.json`；本轮最终包的实际检查见 `package-validation.json`。原始输出保留在本地 ignored `artifacts/paisley-park-5.0.0-final-20261014/`。manifest 描述来源和字节，验货结论单独记录。

复用 RC.2 发布前在 Windows 独立解压目录实际执行的 Node 全套 412 通过、0 失败/跳过；Python 3 通过、0 失败、1 可选 Pillow 跳过。格式正反例使用专用 venv 和 CI 固定的 jsonschema 4.25.1 / rfc3339-validator 0.1.4。上述结果属于 RC.2，不冒充正式 ZIP 上的新全套运行；正式包与其生产代码、测试和依赖一致性另行核验。

A/B 有限原型、C 平板只读目标身份与制品核验继续复用。没有重新运行设备、游戏业务或 Lab 实验。RC.1/RC.2 原包不重写，原失败与证据缺口保留。

## Not validated

完整 Android Mod 自主修复、更多组件/设备/Provider/业务、全部 Debug/GER 组合和可选 Pillow 图像测试未覆盖。当前本地提交没有新的远端 CI 结果；本轮也未更新平板 UI、重演打赏或操作存档。

## Known limitations

Source Link 首轮只覆盖商店 Toolbar；Lab 内存回调不证明真实业务。C 旧调查缺逐阶段文档身份；平板同版本 UI 包与当前源码制品字节不同。历史文档引用需要联网。安装器拒绝覆盖已有 Skill，Tools 目录需要长期保留；Gameplay 需要锁定 XState。

2026-10-14 用户授权在确认无问题后本地正式打包。本轮未获公网推送、正式合并、Tag 或 GitHub Release 授权，不预先声称已发布。

## GitHub 发布材料准备

2026-10-14，用户要求准备 GitHub 发布并使用最新辅助 Skill 优化首页。已核对本机 PRP Technical Writing/Humanizer 与上游当前内容相同；README 改为用途、开始步骤、5.0 入口和证据边界，诊断说明修正遗留的当前版本标题。文档改动收入新的同版本包，保留此前本地正式 ZIP 作为旧快照；新来源与摘要见相应 manifest。

这次准备不改变生产或测试代码，复用 RC.2 的有效全套回归，新包继续验证内容、入口与隔离安装。远端状态与待执行的分支、CI、Tag/Release 操作在本地发布材料中单独列明；材料准备不宣称已经公网发布。
