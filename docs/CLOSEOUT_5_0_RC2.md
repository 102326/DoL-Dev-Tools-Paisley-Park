# Paisley Park 5.0.0-rc.2：本地候选收口

## 本轮 Done

将 RC.1 后的 C 接续与辅助工程规范收入新候选，整理包内容和首次使用说明；固定源码生成 ZIP、SHA-256、manifest，验证实际导出集合、依赖隔离、安装入口、文档链接和自有 Runtime smoke。保留 RC.1 原制品，不修改 GER、Schema 或游戏状态。

## Delivered

版本为 `5.0.0-rc.2 — Paisley Park`。包清单由 [导出规则](../.gitattributes) 控制；旧文档在源码仓库保留，包内引用改为固定历史来源。必要测试夹具保留的理由见 [包内容与验货](RELEASE_PACKAGE.md)。公告和 README 按已验证事实用 PRP Technical Writing 整理，再按 Humanizer 检查表达；这不构成写作质量的独立测评。

## Validated

新候选实际检查以随附 `candidate-validation.json` 为准，固定源码与 ZIP 字节见 `artifact-manifest.json`。原始验货输出保留在本地 ignored `artifacts/paisley-park-5.0.0-rc.2-20261014/`。生成包与检查通过分别记录，不预先将未运行项目记为通过。

复用 [RC.1](CLOSEOUT_5_0_RC1.md) 的 Windows Node 412 通过、Python 2 通过/2 可选跳过，以及 A/B 有限原型、C 平板只读身份与制品核验结果。本轮生产代码与测试未改，没有重复执行全量 Node/Python 或实机实验。

## Not validated

完整 Android Mod 自主修复、更多组件/设备/Provider/业务与全部 Debug/GER 组合未覆盖。未更新平板 UI 包，未重演打赏、操作存档或重新连接设备。Python 两项可选覆盖仍未运行。

## Known limitations

历史引用需要联网；C 原始调查缺逐阶段文档身份，不能事后补造。平板同名 UI 包与当前源码制品字节不同，该差异保留。新候选未公开发布，全局安装仍为 4.0.1；本轮不推送、合并、Tag/Release 或替换它。
