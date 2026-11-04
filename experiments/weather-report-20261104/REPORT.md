# Weather Report：首批可运行实验与采用判断

2026-11-04。版本号未定；本轮已经进入实现，不再停在技术清单。以维护基线 `a29d5088107296843b048ef99b05784535d2b7bb` 为起点，实验分支为 `experiment/weather-report-20261104`。原维护分支保留，可按文件或提交撤回新实验。本报告与 [results.json](results.json) 是经过筛选的公开记录；原始日志、编译器、npm缓存、运行输出留在忽略的 `artifacts/weather-report-20261104/`，不加入Git。

## Delivered

### 1. 实验室结论落到TypeScript运行链

[source-finder](source-finder/README.md) 提供严格TS请求边界、只读候选查找引擎、编译JS产物、类型负对照及运行回归。请求归一化是外部字段形状的唯一消费边界；有限错误按 request/source/search 归属，不透传私人路径、查询或原异常。

七类线索涵盖Passage、Widget/宏、文字、选择器、事件、符号和路径，不依赖商店组件适配。支持明确目录、Git工作树和固定revision；固定revision读取对象，不checkout/reset，禁用Git replace refs和继承的Git位置环境。每个候选给出相对文件、行/列、SHA-256、上下文和启发式依据；来源身份、dirty及部分性单独报告。

预算覆盖候选、文件尝试、字节、上下文、枚举和时间。取消/超时分开，partial不等于无匹配，长行避免按线索反复展开整行。类型验证发现四种契约漂移，运行测试验证类型无法保证的来源/文件/取消语义。没有以此宣称TS普遍比JS更快或更正确。

### 2. 同一引擎的进程组织对照

[entry](entry/README.md) 提供一次一进程和stdio复用入口，使用完全相同的引擎。协议有唯一且有界ID、2并发/16队列、帧/输出预算、显式取消、迟到结果隔离、EOF关闭；主机持有子进程并核对响应ID。取消不释放尚未结束的执行槽，也不将迟到结果归给新请求。启动失败和缺失关闭事件有针对性测试；关停未得到确认时返回 `termination-unconfirmed`，不伪称进程已经退出。

这是本地可调用实验入口，不是已注册的Codex MCP工具，也不是新的GER。正式CLI没有悄悄切到常驻进程。

### 3. Node26原生TS可行性

[native-probe.cjs](source-finder/native-probe.cjs) 把同一源字节复制为临时 `.mts`，对照原生类型擦除与编译CommonJS的查询/错误/取消。初始参数属性构造器确实触发 `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`；改为显式字段后通过，构建加入 `erasableSyntaxOnly`。类型擦除不执行类型检查，参见核对过的 [Node26官方合同](https://github.com/nodejs/node/blob/v26.0.0/doc/api/typescript.md)。尚未切换正式包的ESM/TS布局，不能把临时副本运行当作正式入口已免构建。

### 4. Kotlin/JVM设备端协议核

[kotlin](kotlin/README.md) 已隔离获取固定编译器并实际编译运行，不只是任务书。核把run/process-start/Activity-instance/work归属与连接状态分离；500ms合成工作完成后，通过原子文件业务效果与回读产生见证，实例重建后的迟到提交仍属于原实例，断连不取消实际工作，重复ID回到原持有者，未知保持Unknown。

这不是Android代理成品。自有Android App/适配、传输、SDK/APK和设备验证未实现/未执行；单写者文件存储没有证明多进程、掉电/fsync或任意外部输入安全。不能依据JVM驱动判断Kotlin胜过ADB/Node。编译器约64MiB，局部存放；Git只保留源码、坐标与摘要，不再分发依赖JAR。

### 5. 维护接续与源码Reference

没有重做已有CDP/Action诊断、版本查询或hash上下文修复。新工具重放两个现有真实维护调查：`getModListNameNoAlias`定位版本安全查询的environment/collectors；`Page.navigatedWithinDocument`定位旧holder失效。随后读取相关实现并接续既有22项回归。它证明工具可以在真实公开工程源码上定位和接续，不能称为发现了新Bug、盲测提效或真实游戏验收。

新增 `docs/GAME_SOURCE.md` 与README/Skill/Workshop/知识页条件入口：提供官方仓库、按任务确认版本/revision及最小查找方法。源码不打包进Skill，不固定游戏版本，不要求维护两份树。旧精确Source Link、生产scripts、根package/lock、GER/Store/预算/fencing/Unknown合同均未修改。实验从正式archive排除，现有轻量CI不增加框架或任务。

## Validated

环境：macOS27.0.1 ARM64，Node26.13.0/npm11.20.0，TS6.0.2，Node types25.9.5、undici-types7.24.6，OpenJDK21.0.11，Kotlin2.0.21/JVM target17。未使用游戏、私人Profile或正式Store。

命令均从仓库根执行，只有安装/构建括号明确指定实验目录：

| 实际命令 | 结果与范围 |
| --- | --- |
| `(cd experiments/weather-report-20261104/source-finder && npm ci --ignore-scripts && npm run build)` | 固定锁文件独立安装3个开发包，strict/noEmitOnError/erasableSyntaxOnly构建通过；与复用旧Lab工具链生成的JS摘要一致。没有修改根依赖或全局工具。 |
| `node --test experiments/weather-report-20261104/source-finder/test/*.test.cjs` | 12通过、0失败、0跳过；包括失败构建清理旧产物。 |
| `(cd experiments/weather-report-20261104/source-finder && node check-types.cjs)` | 四种错误kind/code/outcome/role均被TS2322拒绝。 |
| `node experiments/weather-report-20261104/source-finder/native-probe.cjs` | 同源原生TS与编译CJS五种查询、坏请求和预取消一致；运行时无类型检查。 |
| `node experiments/weather-report-20261104/source-finder/replay-maintenance.cjs` | 两个预先已知调查返回预期生产文件和实际读取摘要；非游戏场景。 |
| `node --test tests/environment.test.cjs tests/execution-context.test.cjs` | 22通过、0失败、0跳过；VM/替身CDP/ADB范围，非设备。 |
| `node experiments/weather-report-20261104/entry/protocol-test.cjs` | 明确stub验证并发/队列、取消、重复ID、迟到、错误白名单、帧边界、EOF。 |
| `node experiments/weather-report-20261104/entry/host-test.cjs` | 真实不可执行路径、模拟有close无exit及无close，确认清理不挂起及未知终止状态。 |
| `node experiments/weather-report-20261104/entry/benchmark.cjs` | 真实同一引擎/自有夹具，一次入口与复用入口结果及错误一致，宿主超时后可处理后续独立只读请求。 |
| `experiments/weather-report-20261104/kotlin/run.sh` | 校验固定JAR SHA-256，实际编译并通过实例/见证/断连/重复/恢复/Unknown/有界事件的JVM驱动。 |

首次离线生成npm锁因空隔离缓存 `ENOTCACHED` 失败，随后正常访问官方registry完成锁与独立安装；没有绕过网络策略。早期TS编译因辅助函数的控制流类型收窄失败，修正后严格编译通过，并加上编译失败不保留旧产物。初始模块尚不存在时的测试失败仅是未实现状态，不计为有效Bug负对照。Kotlin驱动首次误选Runnable返回null，改用Callable后通过，细节保留在该线README。

### 审查暴露的问题与修复证据

| 实际缺陷 | 修复与证据 |
| --- | --- |
| Git replace refs让原commit身份读取替换内容 | 所有Git读取禁用replace；原提交训练房间应命中的回归修前失败、修后通过。 |
| UTF-16/NUL文件被跳过却报告完整无匹配 | 标为unsupported partial，针对回归修前失败、修后通过。 |
| 失败/超限文件不消耗maxFiles | 新增filesAttempted，独立复现的31次size请求现被1次尝试限制。 |
| ignored源文件参与搜索却dirty=false | Git状态包含ignored，保守dirty；命中ignored源码的回归修前失败、修后通过。 |
| 最后空目录读取中的取消会返回complete none | 返回前统一取消/单调截止检查；独立注入和最终回归通过。测试需使用realpath避免Mac `/var`别名造成无效注入。 |
| 长行反复Array.from堵住timer，超时后仍成功 | 有界摘录、单次列计算及单调截止核验；8MiB原实现约534ms的负例失败，最终约70ms内完成或按预算拒绝；独立32MiB/20ms预算得到SOURCE_TIMEOUT。不是硬实时抢占保证。 |
| 编译器定位/版本检查失败保留旧dist | 清理前置，missing/wrong-version临时构建测试通过。 |
| cancel分支绕过ID格式；spawn失败close可能永远等exit | 统一ID约束，不回显畸形ID；等待close且有未知终止返回，协议及宿主故障脚本通过。 |

独立Terra审查在临时合成输入上复测上述源码边界，另检查根路径及末尾空格，最终未报告新的实质缺陷；其独立engine测试为11项，主代理另含build测试共12项，不能相加成23项。审查后SourceError仅为原生TS改成等价显式字段，最终编译/12项回归和原生对照再通过。类型检查不能替代这些运行合同。

### 入口采样及身份

最终记录在 [results.json](results.json)，绑定引擎、入口文件和夹具摘要。相同自有夹具，冷入口10次、复用入口首次+10次；早期开发中间态样本不混入最终分布。

- 冷入口中位78.13ms（77.10–113.76ms），复用首次79.75ms，后续中位31.47ms（31.09–32.41ms）。
- 独立IPC采样：一次请求后RSS63,291,392字节，复用十次后66,699,264字节；不是峰值或同一时刻的系统内存，未从请求耗时扣除采样成本。正常关闭3.07ms并确认child close。
- 这是小任务进程复用收益，未比较大型源码、并发吞吐、真实设备或完整Agent任务；不宣称普遍提效或语言胜负。

## Not validated

Windows（含文件占用/NOFOLLOW/路径语义）、Android APK/真实Activity/ADB/WebView、真实进程死亡、真实游戏及多个非商店区域源码、Codex宿主工具注册/技能重新发现、正式发行包。负责人已确认无本机设备且公司内容限制继续有效；未获取游戏资源，以上范围留到获准环境。

先前维护基线已有Chrome夹具/Node26及CI证据保持其原范围，本轮没有重跑全仓/真实Chrome，也没有把旧结果算作新原型的设备或游戏证明。

## Known limitations与采用决定

**继续推进TS边界与通用查找**：已形成实用、可独立运行的路径，下一步用获准真实非商店源码与实际任务确定正式入口/结果格式。当前语法识别为启发式；翻译、动态拼接、生成代码、宏展开和Mod注入可能无对应候选。没有完整调用链、索引或全游戏准确率。

**保留stdio实验，暂不设正式默认**：小任务启动开销有收益，但增加了协议、进程所有权、队列和关停维护；需要更长任务和实际Agent使用决定是否值得。依然保留简单一次入口。关闭未确认时如实返回，不隐瞒活进程可能性。

**保留Node原生TS路线**：同源运行验证了可行性，正式采用前处理模块布局/发布与独立检查；当前编译CJS仍是可操作入口。不引入额外运行时loader。

**继续Kotlin设备方向，但不裁决替换ADB**：已经有可运行JVM核，真正需要的Android事实尚无设备证据；下一阶段实现自有App/传输并在Windows验证。文件核只服务合成见证，不接真实游戏真相。

父目录rename竞态、工作树跨文件一致性、异常OS调用的硬截止未被沙箱解决；候选摘要只绑定实际读取字节。结果可能含私有源码，默认只本地输出，不自动上传。没有新增数据库、Store迁移、Effect回收或旧Unknown清理。

本轮首批开放实验达到Scoped Done；**下一版整体、正式平台验收与发布未完成**。这里不把尚未选择的所有实验都升级为门禁。后续按真实任务收益继续扩大或撤回，完整战未来独立研究。无推送、合并、Tag或Release操作。
