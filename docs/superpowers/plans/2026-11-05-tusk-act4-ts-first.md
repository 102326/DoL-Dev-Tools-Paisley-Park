# Paisley Park — TS First 分阶段迁移评估

2026-11-05。状态：用户已批准按批实施。后续明确决定完整Node可执行核心TS迁移是7.0发布门槛；开发包P2，UI4.2为P1，有资源竞争时优先UI。持续推进本机可合理完成的批次，不在A+B完成后宣称整体结束。实验分支同步沿用已有授权边界，不自动合并或正式发布。本内部计划已纳入export-ignore。

## 1. 判断与目标

推荐Node可执行核心采用TS First，以分批全面迁移为目标；运行和发布继续使用预编译JS。当前更适合保留CJS路径，而非同时引入目录迁移、模块制式切换、Runtime替换。

目标是改善跨模块接口、错误定位和开发接续。不是文件改名率，也不据现有两个TS模块推导全项目提效或性能收益。新代码优先TS；旧代码按依赖和风险迁移，长期例外需说明具体用途，而非无限保留两套权威实现。

## 2. 实际基线与盘点

本节是开工前只读盘点快照；后续实现与验证记录见[迁移进度](../../../experiments/tusk-act4-7/typescript/PROGRESS.md)。

| 对象 | 已核对事实 |
| --- | --- |
| 研发分支 | `experiment/tusk-act4-7` |
| 当前本地及远端HEAD | `18544c8d1cb2a751130bf023cfc37b531ed6b722` |
| 最新生产实现 | Chrome optional Integration：`bd3f1b61798552953c27ec0066280169c3f61da3` |
| 正式main / v6.1.0实际源码提交 | `cfd76a75e6c28efbbdcf447b25679cd9f257ef54`；v6.1.0是注释标签，不混用tag对象SHA与commit |
| Node下限 | ACT4实验分支`>=26.0.0`，CI使用26；正式6.1.0仍为`>=22.12.0`，正式基线CI使用22 |
| 根依赖 | 仅运行依赖XState5.33.2；SQLite为Node内置，未新增编译器依赖 |
| TS开发依赖 | 隔离在`experiments/weather-report-20261104/source-finder`：TypeScript6.0.2、@types/node25.9.5；根目录没有tsconfig |
| 当前权威TS | `scripts/lib/source-find.mts`、Skill的`scripts/resolve.cts`；两者均已生成CJS并有完整产物漂移检查 |
| 工作树 | 盘点开始时只有原用户私人维护草稿未跟踪；不读取、覆盖或提交该文件 |

按当前Git已跟踪文件统计：

- 229个CJS、8个JS、1个CTS、1个MTS、10个Python、4个Kotlin；不是全部都属于生产迁移目标。
- 运行入口集合为95个CJS：`scripts/`87、Skill解析器1、`integrations/`7；其中2个已经是生成文件，不能当成另一份手写源。
- `tests/`有87个CJS；其余CJS属于实验、示例和文档夹具。测试、构建工具应按维护收益逐步迁移，不将故意非法输入夹具机械改成合法TS。
- 8个JS分布于`probes/`4、示例2、实验2。仅按扩展名无法覆盖浏览器代码：运行集合中有32个文件被函数源码插值搜索命中，需逐一确认浏览器/Node边界。这是静态命中清单，不是完整数据流证明。
- Python涉及图像比较、ADB备份、例子构建及测试/归档验证；Kotlin涉及JVM实验3文件和Android Activity探针1文件。保持各自职责，暂不替换。

最近一轮功能证据为526项Node测试中525通过、1项Windows跳过；源码和最低Node26独立包各有10项中性Chrome Integration验收。其固定身份见[原报告](../../../experiments/tusk-act4-7/integration/REPORT.md)。本轮未重跑，不能把这些记录当成未来TS迁移已通过。

## 3. 推荐的源码、构建和发布边界

### Node源码与运行入口

- Node权威源以`.cts`为主，生成到原`.cjs`路径，例如`diagnostics.cts → diagnostics.cjs`。保留`node scripts/dol-dev.cjs`、Windows launcher、Worker相对位置、Skill resolver和自定义Integration `.cjs`合同。
- 迁移期间保留已跟踪CJS产物，做到克隆后普通入口可直接运行；CJS不手工修改，生成器检查完整内容，而非仅检查源码hash。
- 每模块只有一个权威源。已有source-find的`.mts → .cjs`是专用转换器行为；正式化构建时对齐`.cts`或使用经过验证的类型桥，不能假定标准tsc会把MTS直接输出成CJS。
- 不设置全仓`type: module`，不默认ESM/CJS双发。保留当前CJS导出形状与调用方式，不自动改成default导出。
- 第一阶段保留当前ES2022发射目标和锁定编译器；避免引入已弃用的esModuleInterop=false，Source Find的标准CJS发射需用行为测试核验；编译语言目标、运行时API下限与浏览器能力是三件事。核对Node类型声明覆盖范围，不能把现有@types/node25.9.5视为Node26全部API的证明。

### 开发构建

- 将已有生成机制正式化为源码仓库内的隔离开发工具包，建议`tools/typescript/`，沿用单独lock；保持根运行依赖及Gameplay原npm安装流程不拉取TS编译器。
- 多文件代码改用完整Program/tsc语义检查与发射，不把当前单文件transpileModule helper无限推广。保留strict、noEmitOnError、LF规范化及负对照。正式编译允许标准CJS的export=以保持旧导出形状；不再要求native-stripping实验的erasableSyntaxOnly，不引入运行时TS loader。
- 明确输入与输出清单；检查模式不写运行产物、不递归清理未知目录。先完整编译/验证到本轮拥有的暂存，再发布生成文件。失败拒绝归档，保留或恢复可确认归属的旧产物；不声称多文件写入具备断电事务性。
- 第一轮明确检查已迁移模块，不用全仓any、宽泛声明或ts-nocheck掩盖边界。未迁移JS允许临时共存，不能冒称全仓strict通过。
- 构建工具可以先保留极小CJS启动器；实际类型化编排后续迁移。编译器需要JS来启动不是迁移失败。

### 浏览器代码

- 单独DOM编译单元，显式lib/types，不引入Node全局类型；Node单元排除浏览器全局。共享部分仅复用合适的类型/纯数据，不把Node运行依赖带入注入代码。
- 发布供浏览器直接运行的自包含JS函数或IIFE；Runtime.evaluate/callFunctionOn与probes目录只消费JS产物。不能把编译成CJS的函数连同require、导出包装或Node helper直接塞进页面。
- 先用一个DOM/CSS无副作用探针验证构建边界，再处理receipt与原生操作。多函数组合方式按真实依赖选择，不先引入大型bundler或整份CDP SDK。
- 对源码文本参与契约摘要的操作，类型迁移优先保持原JS字节/摘要。无法保持时须单列明确版本的契约变更与旧未决恢复策略；不能重新哈希后默认接受旧receipt，不能改掉Unknown或自动补发。

### 发布包与类型声明

- 继续固定提交git archive及既有Tools布局，交付CJS、浏览器JS和所需JSON/schema/Skill/文档。运行包不需要tsc、ts-node或构建时下载。
- `.d.cts`按开发者/外部作者的真实消费需要生成；初期不把发布类型SDK列为必需，不强行双发。声明不是运行时依赖。
- 开发工具、编译缓存、source map默认不进入payload；权威TS默认留源码仓库。按实际清单排除，不用全仓`*.ts`忽略规则误删必要合成测试输入。具体TS随包策略在首批独立包验货时确认。
- 安装仍只复制原payload及清单；resolver成功不代替宿主发现。若Skill文件/安装布局变化，必须在隔离宿主实际确认；未变部分可复用仍有效证据。

官方依据：[模块格式和解析](https://www.typescriptlang.org/docs/handbook/modules/reference.html)、[types/lib/noEmitOnError配置](https://www.typescriptlang.org/tsconfig/)。CTS/CJS和MTS/ESM的差异需要在构建中明确处理。

## 4. 主要风险与保留合同

1. **注入函数与源码指纹。** `game-native-save.cjs`、`game-native-navigation.cjs`等把function.toString()纳入digest/contract；编译器重排、别名或helper既可能改变哈希，也可能让浏览器出现不可见的Node引用。编译通过不能证明兼容。
2. **跨模块类型空洞。** 现有单文件strict不等于JS调用链strict；`.mts`权威源与`.cjs`消费路径也需明确解析关系。采用真实类型所有者，不建立平行的第二套业务模型。
3. **序列化合同。** Android Target原本没有`host:'android'`；用TS联合类型不能偷偷给持久JSON加字段或改变target key。预算null/undefined/0、Session生命周期、SQLite记录与XState快照必须保持区别。
4. **模块位置与可选依赖。** CLI、worker、安装器均使用相对路径或__dirname；目录整体挪到dist会扩大影响。普通Debug不能因静态引入GER而开始强制加载XState/SQLite。
5. **运行时边界。** JSON、CDP、IPC、SQLite和外部工具输出均从unknown验证；类型断言不替代白名单、长度、身份、原回执及deadline检查。
6. **中断与恢复。** 未知不重放，预算/fencing不因类型重构放松；不迁移、清理或打开真实Store做验货。阶段结果绑定实际源码和包，不能挪用旧manifest。

## 5. 分批顺序、风险和验收门槛

| 批次 | 主要范围与依赖 | 兼容风险 | 独立验收门槛 |
| --- | --- | --- | --- |
| A 构建正式化 | 当前两个TS模块、隔离编译依赖、多文件输入/产物清单、旧构建入口兼容；不动GER | 生成漂移、扩展名解析、产物部分写入、开发依赖进入运行包 | 完整内容漂移检查、类型错误/CRLF/写失败负对照；独立包最低Node26入口，原安装/Skill路径保持 |
| B 叶子契约试迁移 | diagnostics与runtime-target；A之后。类型由原所有者导出，保持所有运行校验 | 错误元数据/导出形状、Android目标字段和键变化 | 现有诊断/Target/CLI回归；非法输入与错误码不变；目标JSON/key固定向量对照；CJS调用方无需改调用 |
| C 工具/传输与宿主 | cdp、Integration IPC、ChromeHost/execution-context、相关工具调用边界；按依赖分小批 | 异步生命周期、timeout/close、worker路径、目标失效锁存 | 原deadline/断连/错误分类回归，中性Chrome选页与Integration夹具；Windows/Android定向证据另列 |
| D 浏览器边界 | dom/css等纯探针先行，再逐个混合模块；不一次抽走32文件 | Node依赖泄漏、闭包丢失、执行realm与摘要变化 | 浏览器禁止Node引用的类型负例+实际Chrome执行；旧/新JS源与关键摘要对照；必要Android引擎补验 |
| E CLI与Action/Journey/Evidence | C/D逐项就绪后迁移对应模块，保持所有既有入口 | 参数、输出/退出码、可选能力、普通Debug依赖扩大 | CLI错误和代表流程对照，标准Evidence/optional失败，独立包最低Node26、安装和按风险宿主验货 |
| F GER与业务Provider | 先纯契约/预算/语义，再game-runtime/game-goal及Provider；D稳定后处理注入业务代码 | Session/Store/fencing、Unknown、回执源码契约 | 现有SQLite/交错/预算/恢复回归；旧合成Store/回执跨构建恢复及不重放；有影响的真实平台/业务验收不能由Mac替代 |
| G 开发与验证工具 | 在各批同时维护类型负例；随后将适合的Node测试、构建和验货工具纳入TS | 测试源/生成测试重复执行、Fixture意图被抹掉、构建自举 | 测试只运行一份权威生成产物，坏候选仍失败；发布白名单、独立包和最低Node门禁保持 |

按实际收益可让C中的纯Node叶子与D的纯浏览器试点并行，但不跳过依赖和验收。测试不全部留到最后重写；各批维护现有测试，G处理剩余开发工具。Python/Kotlin/Markdown及有意保留的原始JS输入不计入迁移缺口。

## 6. 建议的第一批具体范围

首个已授权范围为 **A+B**，拆成可回滚的构建批与契约批；之后按依赖继续C–G：

1. 正式化现有TS生成入口和隔离开发lock，保留旧命令薄入口；对齐source-find模块格式与CJS消费，不改查找语义。
2. 用`diagnostics`和`runtime-target`验证多模块类型消费与CJS输出。它们有清楚的运行时边界，适合定义有限错误元数据及Chrome/Android目标联合类型；不先碰SQLite与注入函数。
3. 保持CJS导出、目标序列化/key、CLI stderr和退出码。用已有回归和有限类型负对照验收；不以新增any宣称完成。
4. 完成最低Node26.0独立包help/version/安装/resolver和受影响CLI验证，核对包内无编译器/loader需求；Skill实际内容改变才重验宿主发现。

暂不迁移Action/Journey/GER，不改schema、版本号或最低Node。第一批无须下载SDK、运行游戏或等待设备；Windows文件占用等如受新构建影响，明确作为其定向补验。

## 7. 尚需决定的事项

- **已决定发布节奏：** 完整Node可执行核心迁移是7.0硬门槛，不赶发布，现有6.1继续服务使用者。各批进展不代替整体完成，Windows/Android/真实游戏仍是相应发布验收门槛。
- **已决定实施范围：** 用户已批准本地按完整计划分批开发、验证、审查及可回滚提交，继续完成本机可合理完成部分；不得自动正式发布7.0，不扩大远端分支或其它外部动作授权。开发包P2，不抢占UI4.2的P1资源。
- **旧操作源码契约：** 初期按字节/摘要保留执行。若D/F发现必须变更，届时提供具体影响、旧未决恢复与兼容方案供判断，不先默认升级策略。
- ESM双发、对外类型SDK、Python收敛与新bundler均没有当前必选需求，先不增加决策负担。

## 8. 公司Mac边界与完成标准

公司Mac继续只用合成HTML/JS/Store和已安装独立Chrome，不取得真实游戏资源、不访问公司内部材料、不改日常Profile；SDK/APK构建仍留Windows。

规划完成标准：实际基线和依赖明确、源/产物/浏览器边界清楚、第一批可执行且可独立验收、风险有对应检查、待决策与未验证平台明确。本轮不靠重复运行旧测试证明方案可行，也不将类型方案当成已经实现。后续各批按具体改动验证；Windows/Android/真实游戏保留原验收职责。
