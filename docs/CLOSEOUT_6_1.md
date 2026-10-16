# 6.1 — White Snake：范围与本地RC验收

**当前状态：** [Windows 补验](WINDOWS_6_1.md)已完成，包含真实 CE 原附件、最低 Node、新宿主发现与独立包验货；用户已授权无阻塞后正式发布。下文 Mac RC 的“未执行 Windows / 缺少原包”保留当时范围，不再表示当前缺口。最终制品见 [v6.1.0 Release](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/releases/tag/v6.1.0) 的 manifest、validation 与 SHA256SUMS，不沿用旧候选摘要。

2026-10-16。6.1承接正式6.0提交 `c98ac280f13e9f4820c919fcf97c8d9281a526e4`；M1为 `98cbe5ae89a58aca2344c9618a686d3befa019cc`，M3为 `7835a5798e329f5c27dd07078fa753e08346d16c`。本页固定交付范围；每个本地RC的最终提交、ZIP摘要与实际验货结论，单独写入随附manifest和validation，不以本文替代制品验货。2026-10-16已获授权提交到6.1测试分支；后续验收与发布由家中电脑接续，本机不创建正式Tag或Release。本文旧本地SHA与公开等价提交的对应关系见[跨电脑交接](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/blob/test/paisley-park-6.1/docs/HANDOFF_6_1.md)，两者源码tree相同；原始验货身份不改写。

## Delivered

- 原Skill与[开发流程](DEVELOPMENT_FLOW.md#验证选择与停止)中的MSV指导：当前声明、风险、证据有效输入、工具定位复用、停止与Blocked/Inconclusive。普通Debug无需Goal，Unknown分析不能改变GER历史Unknown。
- [按需行为保持](DEVELOPMENT_FLOW.md#重构行为保持按需)与[问题入口](MOD_KNOWLEDGE.md)：保持正确行为，有意修复按规范验收，不能只比较最终数字。
- [固定Hook配方](../examples/behavior-preservation/README.md)随包提供。它需要另行取得、审查固定CE-R0源码，不捆绑完整Mod、原始源码、派生切片或游戏资源；许可和输出边界写在配方中。运行后生成的派生代码不按Tools的MIT重新授权。
- 版本元数据、README、安装入口与本版说明更新到6.1.0 / White Snake。本轮没有修改生产CLI/Runtime、SQLite Schema、安装器、resolver算法或XState依赖，也没有迁移Store。

M0/M1已Scoped Done，M2必要能力保全已做，M3在单一受控案例范围内Scoped Done。M4与Weather Report为独立研究候选，不是未交付的本版功能或自动发布阻断。

## Validated：可复用的研发证据

- M1：五次真实Codex隔离合成任务均通过独立行为断言；最终安装/CLI定向回归9通过，受影响文档链接与关键路由有静态保全。构建任务中消除了一次具体的重复未变输入哈希，未证明通用效率或成本收益。
- M3：实际历史DeepProxyHook切片在合成State/事件宿主中执行。8组Preserved、3组Intentional Change、2个受控坏候选符合预期；1项Unknown明确未执行。注销后旧实现把7变为14，研究候选保留7；重新注册的最终值均为10，但after回调为2/1。首版候选遗漏配置覆盖后注销，已由反例发现并改为代次失效。
- 独立限定复审与M3重跑未发现阻塞。以上证明夹具范围，不等于浏览器、真实SugarCube、DoL或Android。
- 既有GER预算、pendingEffects、fencing、目标身份和恢复语义保持；普通Debug、源码构建、安装及条件化专业知识入口保留。原生产代码与合同文档未改，不重跑全部历史Gameplay实机任务。既有平台证据按原版本保留在[6.0验收](CLOSEOUT_6_0.md)与[5.1 Windows记录](WINDOWS_5_1.md)，不计为6.1新测试。

## 本地RC验货记录

每个候选按[打包约定](RELEASE_PACKAGE.md)从固定Git提交导出，并在独立目录检查：

1. 导出允许集合、实际ZIP路径和文件字节对应Git blob；排除阶段长报告、artifacts、Profile、Store、私有数据和未授权第三方内容。
2. 版本/锁文件、许可证、文档链接/锚点与原有关键入口。
3. 无祖先XState的独立解压目录中执行help/version、缺依赖拒绝、Skill安装与resolver；按锁安装后使用自有SQLite，关闭句柄再清理本轮文件。
4. 包内受影响的安装/CLI现有测试，以及随包M3配方的定向执行。

实际命令、通过/失败/跳过、环境、当前ZIP摘要与RC Accepted / Accepted with Limitations / Blocked结论记录在候选旁的 `validation.json`。manifest只说明来源和字节；resolver只证明安装完整性及位置，不能冒充新宿主实际自动发现Skill。未替换全局Skill。

## Known limitations

- MSV是使用指导，不是强制验证调度器；模型和宿主行为仍有不确定性，不承诺普遍加速。
- 行为案例只研究历史R0的一段Hook生命周期；候选不代表CE R1，不恢复原始对象身份或回滚正在执行的回调。重入、长期性能、其它Hook所有权、连续同对象passagestart叠层和完整配置热更新在案例之外。
- VM不是执行不可信代码的权限沙箱；必须审查固定输入。Unknown不能变成通过数。
- 早期RC只在Mac验货；后续Windows的实际检查独立记录在[补验](WINDOWS_6_1.md)，未将Mac结果计入Windows通过数。发布阶段向新目录安装，保留旧工具和Skill备份。

## RC-02复核处置

RC-01（源码 `42c9321f06745a574cdf4d7913255ac9122cf29d`，ZIP摘要 `906ce64d6f840b09df13a5c9ac687cd34d589bbdd85d78a0aa3ed4fec3096514`）收到独立设计复核Conditional Accept。复核者亲自核对了293文件、CRC、摘要与6.0差异，未执行项目测试或独立确认该未发布提交的Git blob。不能把交付方测试改称独立复测，也不能把后续候选写成已获同一复核通过。

| 维护项 | 本轮处置与证据 |
| --- | --- |
| 旧知识页称6.0兼容正例未完成 | 保留当时状态，新增后续CE正例与6.0收口链接；历史与当前结论分开。 |
| 诊断页称当前5.0.0 | 改为当前6.1本地候选，保留5.0历史证据入口。 |
| README对普通Agent工作要求npm ci | 移为仅Gameplay条件步骤；Skill安装/resolver仍无需XState。 |
| Skill绝对要求先下载最新Mod | Skill与AGENTS同步按任务区分当前研究/固定历史复现；不增加新机制或下载前置。 |
| CE验证器只核对三个允许成员与四处表达式 | 独立标准库检查固定原包与原成员摘要、每个完整预期输出成员；拒绝同一允许成员内额外或同长度改写。保留原AST/语义层，未改变生成器。 |
| 直接Patch入口引用resources数组 | 安装时复制；新增回归在调用方修改/清空数组后仍只读取原选资源，保留原调用结果。 |
| 摘要排空等待受墙钟回拨影响 | 使用宿主performance.now；模拟墙钟持续回拨，500ms单调窗口后停止、冻结未决并恢复原方法。 |

这七项均已局部处理，没有将未修项目默认为关闭或隐含延期。新增生产改动仅位于可选示例配方及其验证辅助；正式scripts、GER、Schema、安装器、resolver和依赖仍未改，原测试新增定向回归。前述“不改原实现”的证据保全结论仍适用于正式Runtime，不再用于声称所有示例与测试字节都未变化。

实际定向验证：`node --test tests/patch-observe.test.cjs tests/patch-startup.test.cjs tests/patch-observation-integration.test.cjs`；`python3 -m unittest discover -s tests -p test_cheat_optional.py -v`。结果以RC-02随附validation记录为准。资源选择与回拨回归先在旧实现确定性失败、修复后通过。CE旧归档检查曾接受陌生合成包中同三个成员的额外逻辑；新增完整字节检查用合成固定输入/测试专用身份验证通过与拒绝边界，CLI没有身份绕过选项。

**覆盖限制**：本机无真实固定CE原附件或已有TypeScript模块，因此没有重新执行真实附件完整16项表达式验证；也未重新执行Android探针启动、真实Mod加载、Windows或DoL。上述为实现与定向替身验证，不是相关真实平台验收，普遍提效仍未证明。

新候选保留四件套：ZIP、SHA256SUMS、逐文件artifact-manifest和validation。RC-01的manifest原已在本地生成，独立复核收到的附件不完整；后续交接须将四件套一并提供，原始日志仍只留本地。manifest为交付方可核对材料，不自动等于复核者已验证未发布Git提交。旧RC-01与失败记录均保留。

## Coverage Ledger

以下为Not validated / Additional coverage，不自动成为Remaining work：

- Android/WebView、真实DoL上的6.1新运行，以及其它宿主与桌面GUI热刷新。Mac和Windows分别已有新CLI进程的项目级Skill读取、resolver与CLI证据；不替代其余平台或真实业务验收。
- M3真实SugarCube克隆/存读档、完整Mod、其它Hook引擎、任意Mod组合、长期性能/内存。
- 原6.0 Coverage Ledger中的其它设备、完整框架/功能、全SugarCube执行图与自主部署闭环，仍按其条件保留。
- 通用效率、成本或全生态兼容保证；M4故障缩减、Weather Report预测和其它未来语义研究。

只有明确发布合同、新风险或实际故障才将这些提升为当前剩余工作。公开发布与本地验收分开，不能因为ZIP已生成便声称Release已上线。
