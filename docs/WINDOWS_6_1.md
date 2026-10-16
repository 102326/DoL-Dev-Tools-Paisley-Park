# White Snake 6.1：Windows 验收

2026-10-16。本轮从 `test/paisley-park-6.1` 的 `a6c3295dd4f24dc7b8bdf68e100ebc8243f2d40b` 建立独立工作树，完成交接要求的 Windows 离线、原包验证和宿主发现。用户已授权验收无阻塞后直接发布 6.1；正式制品的最终提交与摘要以 Release 四件套为准。

## Delivered

Windows 补验及一处测试断言修正。正式 CLI、Runtime、GER、Schema、安装器、resolver、预算和 Unknown 合同未改。保留 Mac 原验货材料及旧候选，不把它们改写为 Windows 结果。

首轮在实际命令进程设置 `DOL_PYTHON` 后，450 项 Node 中 448 通过、1 失败、1 跳过。失败位于 Perfetto 的替身测试：生产实现正确选择指定解释器，断言仍要求字面命令 `python`。`845459d3b523a3e05fe2efdc737c7c67424699f9` 仅让断言匹配既有环境合同；默认与显式解释器分别定向通过，再执行全套。未改生产行为、吞错误或重复重跑至绿。

## Validated

Windows 10.0.26340 / PowerShell 7.6.7，Node 26.12.0、npm 11.20.0、Python 3.14.7。另复用已留存并核对来源的 Node 22.12.0 便携版本，不升级全局工具。

| 本轮实际检查 | 结果与范围 |
| --- | --- |
| Windows 完整 Node 套件 | 449 通过、1 项 macOS 权限专属跳过、0 失败。实际设置 `DOL_PYTHON`，清除本轮无关的 ADB 路径覆盖。 |
| 最低 Node 22.12 定向 | 48 通过、1 项 macOS 专属跳过、0 失败；覆盖安装/失败保全、CLI、Patch 观测与时钟回拨、回执和执行窗口，以及解释器选择断言。 |
| Python | 初次 7 通过、2 跳过；复用本机隔离的 CI 固定校验依赖后，8 通过、1 项可选 Pillow 跳过、0 失败。未全局安装依赖。 |
| 实际 CE 原附件 | 原包 SHA-256 固定为 `16da93387fc026ef6a5fe402e032bd4fd3794cae6487f959b9b85b701d02ac1e`；完整输入/输出成员字节校验与 16 项原消费者表达式场景通过。Node 26 与最低 Node 22 分别运行。 |
| Windows 解释器路径 | `DOL_PYTHON` 指向包含中文/空格的真实 Python 路径可执行；无效显式路径返回 ENOENT，不回退为另一解释器。该路径是本轮自有目录别名，原 Python 未移动。 |
| 固定历史 Hook 配方 | 输入 `c36b23a6ab1899c7f780faa63945fe6e199a6355` 的文件摘要匹配；8 组保持、3 组有意修复、2 个坏候选控制符合预期。1 项 Unknown 未执行，不计为通过。 |
| 独立解压包 | 295 个文件逐一对应候选提交的 Git blob；中文/空格路径下两个 launcher 的 version/help、真实缺少祖先 XState 时的生产拒绝、隔离 Skill 安装/resolver、自有 SQLite 创建/关闭/重开/清理通过。包内相关 Node 测试 40 通过、1 跳过。 |
| 新宿主自动发现 | Codex CLI 0.162.0-alpha.17.2 的独立只读进程自动读取本项目 Skill，再实际调用 resolver、CLI version/help；7 条命令 exit 0，版本 6.1.0，6 个项目输入字节未变。没有提供 Skill 文件路径或工具位置答案，没有继承本开发会话。 |

候选固定于 `845459d3b523a3e05fe2efdc737c7c67424699f9`，ZIP SHA-256 为 `21b544489dc749d0644ecba9f48bcd0cdc37caf9ab3f9ec0540cdbc88870c509`。随后发布说明和 Windows 记录收口属于文档变更，正式包另从最终提交生成，不能沿用此摘要。有效的代码、配方及宿主证据按对应输入复用，正式包仍核对全部文件集合、字节和链接。

新宿主使用既有模型/推理配置，没有覆盖；服务端实际后端未独立证明。PowerShell 快照与既有插件图标警告保留，未阻止本次命令完成；不以此证明所有宿主功能。

## Not validated

- 本轮未启动 Android、WebView、真实 DoL、Chrome 或任何游戏业务。正式 Runtime/身份绑定未修改，按各原版本复用既有证据；这不是新增设备支持声明。
- Pillow 图像测试跳过；其它文件系统、更多设备、Mod 组合、真实 SugarCube 克隆/存读档和全部 CE 功能未验证。
- 新 CLI 进程的项目 Skill 发现不等于桌面 GUI 自动热刷新或所有宿主均可发现。

## Known limitations

M3 仍是固定历史 Hook 与合成宿主的研究配方，不是可安装的 CE R1 修复或通用行为等价引擎。保留 Unknown、失败、许可与来源，不随 Tools 分发原包、派生切片或原始宿主事件。详细边界见[配方](../examples/behavior-preservation/README.md)与[6.1 收口](CLOSEOUT_6_1.md)。

**Windows 交接范围达到 Scoped Done。** 本轮无尚需修复的生产阻塞；其余覆盖不自动升级为发布前置条件。
