# 6.1 — White Snake：范围与本地RC验收

2026-10-16。6.1承接正式6.0提交 `c98ac280f13e9f4820c919fcf97c8d9281a526e4`；M1为 `98cbe5ae89a58aca2344c9618a686d3befa019cc`，M3为 `7835a5798e329f5c27dd07078fa753e08346d16c`。本页固定交付范围；每个本地RC的最终提交、ZIP摘要与实际验货结论，单独写入随附manifest和validation，不以本文替代制品验货。尚未授权推送、正式Tag或Release。

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
- 当前RC只在Mac验货；Windows启动器及最低Node的旧证据可按未改入口复用，但不宣称本轮重新执行。未升级全局依赖或更改用户配置。

## Coverage Ledger

以下为Not validated / Additional coverage，不自动成为Remaining work：

- 6.1当前制品在Windows、Android/WebView、真实DoL上的新运行，以及新宿主自动发现本版Skill；既有记录不冒充本次新验收。
- M3真实SugarCube克隆/存读档、完整Mod、其它Hook引擎、任意Mod组合、长期性能/内存。
- 原6.0 Coverage Ledger中的其它设备、完整框架/功能、全SugarCube执行图与自主部署闭环，仍按其条件保留。
- 通用效率、成本或全生态兼容保证；M4故障缩减、Weather Report预测和其它未来语义研究。

只有明确发布合同、新风险或实际故障才将这些提升为当前剩余工作。公开发布与本地验收分开，不能因为ZIP已生成便声称Release已上线。
