# White Snake 6.1：跨电脑验收与发布交接

**后续状态：** Windows已完成本页约定的接续，见[Windows验收](WINDOWS_6_1.md)。用户另行授权无阻塞后发布6.1；以下“不创建Release”“缺少CE输入”等保留Mac交接时的范围和事实，不再作为当前状态。

2026-10-16。用户要求当前工作提交到 `test/paisley-park-6.1`，回家后由另一台电脑处理后续至发布的任务。本机仅交付测试分支，不合并main、不建Tag/Release。下一执行者先核实远端、工作区与实际授权，再推进剩余工作，保留未提交内容与旧候选。

## 固定身份与随附材料

- 仓库：`102326/DoL-Dev-Tools-Paisley-Park`。
- 正式6.0基线：`c98ac280f13e9f4820c919fcf97c8d9281a526e4`。
- M1：`98cbe5ae89a58aca2344c9618a686d3befa019cc`；M3：`7835a5798e329f5c27dd07078fa753e08346d16c`。
- RC复核维护：`fae92a640b5a67a289da753da4566c8444e92f4e`；工具链入口修正/RC03源码：`c09e45b2708fc6343bf6833dde2207276013e5e6`。
- RC03产品ZIP：`DoL-Dev-Tools-6.1.0.zip`，SHA256 `07424d2a862559a6ae2f0745427e2afa5125b636c081d1bb7213890790e8ebd7`，295文件。
- 脱敏逐文件[manifest](handoff/6.1-rc03/artifact-manifest.json)与[validation](handoff/6.1-rc03/validation.json)随测试分支保存。记录中的 `pushed:false` 等是当时候选验货快照，不是测试分支后续推送状态。

RC03二进制及原始记录留在Mac本地；Git交接包含源码和脱敏证据，不包含候选ZIP、运行时、Profile、Store、日志、第三方Mod或派生源码。可从公开等价RC03提交按打包规范重新导出并核对原manifest；ZIP容器摘要还受提交身份、Git/压缩实现影响，必须实测，不预先承诺另一平台重建ZIP同摘要。

未推送提交原先带有自动生成的本机提交身份；公开交接链沿用既有GitHub noreply身份，保留原本地分支，未改远端历史。[提交对应表](handoff/6.1-rc03/commit-map.json)记录原本地SHA、公开等价SHA及完全相同的Git tree。RC03原本地源码 `c09e45b2708fc6343bf6833dde2207276013e5e6` 的公开等价提交为 `a177f7f3510a21eb8d899fb29c4d5ee4a76ec224`；可用它审查原manifest的全部文件blob。旧SHA和验货记录保留原始身份，不声称这些原本地提交已公开。

本交接提交仅更新文档、源码交接材料及导出排除规则，分支最新HEAD会晚于RC03源码。后续修复或发布必须生成对应新提交的新包与manifest，不能将RC03摘要套用到新包。交接材料仅留源码仓库，不进入产品ZIP。

## Delivered

MSV与按任务选路、固定历史Hook行为保持配方、局部维护处置详见[收口](CLOSEOUT_6_1.md)及[阶段记录](WHITE_SNAKE_6_1.md)。独立RC01复核的七个维护点均已局部处理；正式scripts、GER、Schema、安装器/resolver算法及依赖未改。新增行为修改位于可选示例与验证辅助，测试已扩展，不能再声称全部示例/原测试字节未变。

最新工具链维护让CE `verify.cjs` 优先使用已有 `DOL_PYTHON`。显式解释器路径无效时失败，不静默换解释器；未设置才按平台寻找 `python` / `python3`。未引入工具管理器或新的Runtime。

## Validated：本次Mac证据

macOS ARM64；项目隔离Node24.22.0、npm11.19.1、Python3.14.8、pip26.2.1，XState5.33.2。没有升级系统解释器、全局Skill或用户浏览器数据。

实际执行：

```sh
node --experimental-sqlite --test tests/install-skill.test.cjs tests/cli-errors.test.cjs tests/patch-observe.test.cjs tests/patch-startup.test.cjs tests/patch-observation-integration.test.cjs tests/game-receipts.test.cjs tests/game-execution-window.test.cjs
python -m unittest discover -s tests -p 'test_*.py' -v
node examples/behavior-preservation/deep-proxy.cjs REVIEWED_CE_HOOK_FILE NEW_OUTPUT_DIRECTORY
```

最后一行中的路径按本轮受审固定输入与自有新输出目录替换；是配方调用形式，不应原样执行占位符。前两行在已选择的解释器环境执行；Python测试中的Backup使用替身，不调用设备。

- Node33通过、0失败、0跳过；Python9项中7通过、0失败、2跳过（缺可选jsonschema/rfc3339-validator及Pillow）。没有全量测试声明。
- M3：8组保持、3组有意修复、2个负对照符合预期，1项Unknown未执行。仅合成宿主与固定真实源码切片，不是游戏或完整Mod验收。
- 独立解压Tools：CLI help/version、resolver、自有SQLite创建/关闭/重开/读取及清理通过。Doctor仅用受控runner实际检查Python版本，其余外部/设备检查未执行。
- 真实新Codex宿主 `0.163.0-alpha.10.2` 自动读取隔离项目Skill，并实际使用resolver/CLI；夹具保持不变。最初尝试因外层sandbox初始化失败，经允许的read-only ephemeral调用成功。没有绕过只读执行或启动游戏。
- 宿主普通命令使用Node24.22，但login shell重新找到旧24.18；逐命令激活后确认24.22/Python3.14.8。不能把单个进程选对版本当成全局更新。已有插件配置启动时的marketplace更新尝试超时；不据此声称第三方Skill已更新。

这次交接仅改文档与脱敏材料，复用以上未失效证据，检查新增链接、导出规则及待推送历史，不为推送重跑业务测试。

## 接续顺序与验收边界

1. **同步并检查环境**：从官方仓库获取测试分支，确认HEAD和本地修改；不要覆盖家中电脑的工作。核实Windows、Node（最低22.12.0）、Python、Git、Chrome及所需工具实际版本。只对当前任务必要的工具作处理，不盲目升级所有软件。
2. **Windows定向验证**：核实实际命令进程的PATH与 `DOL_PYTHON`，检查带空格路径、失效显式路径拒绝、Windows启动器、CLI错误、隔离安装与已有安装保全。解压到新目录，避免复用源码依赖；安装XState仅用于Gameplay相关验证。验证实际Agent宿主发现正确Skill，resolver成功不能替代宿主发现。
3. **补齐具体缺失证据**：若复核CE验证器，按[配方](../examples/cheat-extended-optional-probe/README.md)使用原附件SHA256 `16da93387fc026ef6a5fe402e032bd4fd3794cae6487f959b9b85b701d02ac1e` 与已有TypeScript模块，执行完整字节和16项AST/场景验证。当前Mac缺这两个输入，没有执行；合成ZIP回归不能替代。原附件/生成包不提交Git，不因同名或同版本号放宽身份检查。
4. **按风险安排真实环境**：Windows Chrome隔离夹具、Android/WebView、真实DoL均未在本轮执行。只在用户授权的设备、App和数据范围中作必要验证。未变的GER可复用有效旧证据，但涉及目标绑定、加载、输入或探针的新声明须有对应真实证据；若不能执行，明确它对发布合同是否阻断及理由。无需为了收口增加全游戏/任意Mod组合回归。
5. **处理发现的实际问题**：按最小充分验证修复，保留失败与Unknown。CE R1.2跨存档、完整Mod兼容、M4与Weather Report不因交接自动变成本版功能；不得为消除未验证标签扩展大型架构。
6. **正式收口与发布**：按[发布包规范](RELEASE_PACKAGE.md)从实际最终固定提交构建新包，检查版本/锁文件、允许文件集合、Git blob字节、相对链接、许可、独立安装、宿主发现和自有SQLite。逐项记录通过/失败/跳过与未验证平台，提供ZIP、manifest、validation及SHA256SUMS。核实Scoped Done与剩余风险后，依用户发布授权推进main、正式Tag/Release并读取远端核对。未达到准入时先修复或明确报告阻断，不把测试分支当正式发布。

## Known limitations与不可改变的边界

RC03结论是交付方的 `RC Accepted with Limitations`。独立复核的Conditional Accept只属于RC01；复核者未执行项目测试，也未独立验收RC03，不能移用其结论。已公布源码便于后续直接审源码、差异及Git blob，而非仅相信交付报告。

不删旧Store/Effect Ledger、不清Unknown、不重放未知副作用、不凭相似标题换Tab、不把新Store当数据授权。设备、文档、运行代次变化按原合同重新绑定。原始日志、存档、截图、官方工具原始输出和私人路径不自动上传。

没有证明普遍提效、全平台通过或全生态兼容。可选Pillow/schema-validator业务路径未执行；需要相关能力时补验，否则保持明确限制。真实固定CE验证输入缺失应独立列出，不误写成代码失败或已经通过。
