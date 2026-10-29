# 6.1 后续诊断维护与经验吸收：Windows 接续

日期：2026-10-29。源码基线：正式6.1.0，`cfd76a75e6c28efbbdcf447b25679cd9f257ef54`。
交接分支：`maintenance/diagnostic-feedback-20261029`。

**当前补验：** 最低Node22.12与独立维护归档已在Mac补验通过，见[本机后续验证](#mac后续验证最低node与独立归档)；Windows、Android和真实游戏范围仍未替代。此前维护代码提交为`d4c826aa1abd54ddbb847ee2a0cf28e18394e73f`，本次补验后没有修改生产代码或测试输入。

本文是适合公开的交付摘要。维护实现已在Mac限定范围完成并验证，尚不构成新版本发行或全部平台验收；正式版本号与Tag保持6.1.0。内部报告、原始Agent轨迹、Profile、现场日志与全局记忆不随本次提交上传。Windows端有更完整的历史材料，应先补齐来源，再判断是否存在本轮遗漏；不重复打开已解决事项。

## Delivered

| 工作包 | 实际成果与边界 |
| --- | --- |
| C01/C03 | 固定CDP发现/连接/命令阶段及Action字段/普通页面拒绝诊断；CLI、Evidence与Journey附加有界提示，保留旧reason/status/partial。未知方法、原始错误、路径和输入内容不进入新增提示。页面reason标为page-reported，不获得零副作用或结算权限。 |
| C02 | Environment及版本采集先用安全公开名称列表确认GameVersion；缺列表/无效/未列出则该来源为null。真实已列出的查询错误仍可观察。无安全列表的旧Loader可能少一个来源；列表/查询不原子，不承诺所有Loader兼容。 |
| M01—M12 | 四组按需案例已归入现有开发Reference：对象与原入口、动作与结果、寿命与恢复、来源与加载。项目字段留项目，不向主Skill追加总则。 |
| README | 落实“你只管开车，办法由老爹来想！”及负责人定目标、Agent在授权内自主推进的说明；产品身份与能力边界保留。 |
| R03 | 修复真实Chrome复现的hash变化后旧C1持有者仍可调用问题。处理urlFragment、旧式完整URL、缺字段的原生当前导航URL取证及主frame同文档事件；证据不足安全拒绝，旧持有者不随重绑复活。 |
| 经验吸收 | 明确新只读补采与未知业务副作用重放的区别；修正Reference中研究前无条件取最新版的残留指导。当前版本任务按需取包，历史复现保留固定输入。 |

生产修改集中于[诊断帮助](../scripts/lib/diagnostics.cjs)、[CDP](../scripts/lib/cdp.cjs)、[Action](../scripts/lib/action.cjs)、[执行上下文](../scripts/lib/execution-context.cjs)、[采集器](../scripts/lib/collectors.cjs)、[Environment](../scripts/lib/environment.cjs)、[Evidence](../scripts/lib/evidence.cjs)、[Journey](../scripts/lib/journey.cjs)及[CLI](../scripts/dol-dev.cjs)。

当前指引见[诊断](DIAGNOSTICS.md)、[Action](ACTIONS.md)、[开发Reference](DEVELOPMENT_FLOW.md)、[Gameplay身份边界](GAMEPLAY.md#目标仲裁与派发身份的解释边界)和[条件知识入口](MOD_KNOWLEDGE.md)。

### 保留的安全语义

- 同一Store内的租约/fencing不等于跨Store或跨主机全局锁；不得通过换Store或直接工具绕过相依Unknown。
- 持久claim先于执行器调用，不等于网络字节已发送；标记后、调用前失败也可能保持Unknown。
- 前后身份检查不与远端操作原子执行；操作期间导航后检失败，不能证明副作用未发生、撤销或自动重放。
- 当前绑定或新诊断不能结清旧effect；原provider/contract/contextNonce/requestDigest及可信终态要求保留。
- 缺片段元数据时，原生history响应会将该Tab导航列表带入内存；代码只用当前项URL，不输出其它历史条目。每次受绑定evaluate前后通常增加两次协议读取。无充分URL证据的旧peer拒绝，不退化成origin/path匹配。

GER Runtime、Goal、原生终态生产者、回执reader、数据库Schema、预算、主Skill、安装器、resolver及生产依赖未修改；Node仍要求`>=22.12.0`，CommonJS及`xstate@5.33.2`保留。普通Debug不因此要求完整GER流程。

## Validated

环境：macOS27.0.1 ARM64，Node26.12.1，npm11.20.0，Chrome156.0.8078.73；系统Python3.9.6仅用于本地观察脚本。本轮没有真实DoL内容、真实Android设备或私人Store。

以下是交付方实际运行记录，不是独立审查方复跑结果。后续仅文档变化时复用输入未变的测试证据；本次Git同步未为增加数量重跑业务测试。源码及测试输入摘要见[交接身份清单](handoff/maintenance-20261029/identity.json)，清单不包含原始现场或机器路径。

| 检查 | 结果 | 准确范围 |
| --- | --- | --- |
| 核心8文件定向回归 | 74通过、0失败、0跳过 | CDP、Action、CLI、Environment、Journey、Evidence、执行上下文、回执；Node/VM、DOM及协议替身，不构成本轮SQLite Store集成验收。 |
| 两个实际消费者文件 | 15通过、0失败、0跳过 | semantic Provider与Gameplay Journey执行窗口；非真实游戏。 |
| 独立Chrome夹具 | 11项通过 | 真实CDP/DOM点击与输入、精确目标、hash/query/自然重载拒绝、旧字段事件替身、重绑及真实超时；Android宿主用替身提供。自有浏览器和服务器已退出。 |
| R03缺陷负对照 | 原实现9组既有通过，6组新回归预期失败 | 修复后执行上下文共17组通过；不是把原实现失败记录追改为通过。 |
| 局部JSDoc/checkJs | 当前诊断模块通过；拼写负对照得到TS2345 | 编译器仅在隔离实验目录；没有TS生产依赖、转译或全仓迁移。 |
| 文档吸收 | 69个本地链接/锚点及diff空白检查通过 | 指经验吸收阶段四份文档；交接摘要与身份清单另做链接和内容检查。 |

核心命令：

```sh
node --experimental-sqlite --test tests/cdp.test.cjs tests/action.test.cjs tests/cli-errors.test.cjs tests/environment.test.cjs tests/journey.test.cjs tests/evidence.test.cjs tests/execution-context.test.cjs tests/game-receipts.test.cjs
node --experimental-sqlite --test tests/game-semantic.test.cjs tests/game-execution-window.test.cjs
```

浏览器夹具用法：先将当前进程环境变量`DOL_TEST_CHROME`设置为自行选定、已安装Chrome的绝对可执行路径，再运行：

```sh
node tests/diagnostics.browser.cjs
```

脚本使用独立headless Profile、自有HTTP页面和动态调试端口；不下载浏览器，不使用日常Profile。是否允许本机启动或loopback监听依运行环境权限。它是显式实验入口，不是Windows/Android已验收的正式自动化承诺。

### R02与研究停点

三类真实Agent只读任务各做改前/候选一次，共6次，均exit0。两侧均正确解释限定证据、保留Unknown并继续独立调试，未发现盲目重放或伪造终态。耗时结果混合，命令事件不等于物理读取数或人工操作；任务难度、缓存及既有MCP/marketplace启动干扰也未完全受控，不能归因于本轮优化。

R02在此结束，不宣称普遍提速、节费或减少手操，不追加样本或改日常MCP配置。后续实际任务中按需记录选工具、搬日志、解释步骤等具体负担，必要授权单列。局部类型结果只保留为已有实验；实验室路线由负责人与小鸥另定，本次没有建立入口、启动Kotlin代理或承诺6.2/7.0。

## Windows端需要补齐的材料

本机只取得交接摘要，未找到下列三份原件：

- `FEEDBACK_INBOX.md`
- `Paisley_Park_White_Snake_Discussion_Checkpoint_2026-10-26.md`
- `PAISLEY_NEXT_ITERATION_PROPOSAL_2026-10-29.md`

相关历史研究ZIP与原始设备证据也未独立重开。H01—H14按摘要沿用历史关闭，H06收窄数量/选槽候选不等于完整业务链实现；不宣称已逐项重新验收或穷尽全部历史。Windows端先对照原件去重，更新确有遗漏或新证据的条目；已有C/M/R成果不重复施工，旧Tusk/3.5路线不重开，UI/Host等项目专属字段留在各自项目。原件可能包含私有现场，补齐上下文不等于授权公开原件。

同步前先检查本机分支和dirty，保留未提交工作；获取本维护分支并审查与6.1.0的差异，避免直接覆盖工作区或自动合入main。必要时在独立工作区接续。本交接没有授权新的安装、设备副作用、清理历史数据或正式发布。

## Not validated 与已知限制

- 本次新增修改的Windows运行、Android CLI/WebView真机、真实DoL/Loader均未验证；最低Node22.12的Mac定向与浏览器证据见下节，不代表最低版本的全平台或全套验收。历史正式6.1.0证据不替代新代码定向验证。
- 设备重启/PID复用及真实旧协议兼容未实测。快照不能捕获所有未报告且已恢复的瞬时导航；后检失败保留执行不确定性。
- C02缺安全列表时选择unknown、R03缺可信URL时拒绝，是明确兼容取舍；不能包装成全部平台兼容。
- R01多Agent共控需求与跨库仲裁仍未定义/实现；当前证据不要求在本次维护引入分布式锁。
- 本次为独立维护分支交接，不修改main、版本号、Tag或Release，不创建PR。后续平台验证和发布由负责人另行安排。

## Mac后续验证：最低Node与独立归档

负责人要求先解决本机能够处理的事项。本轮补齐两项具体证据缺口，没有追加R02、修改日常MCP或开启实验室。机器已有Node24/26，故从[Node官方22.12.0发布](https://nodejs.org/en/blog/release/v22.12.0)取得固定macOS ARM64二进制，并与[官方SHA清单](https://nodejs.org/dist/v22.12.0/SHASUMS256.txt)核对；仅在本地忽略目录运行，不改系统Node、PATH或全局依赖。

验证对象为固定维护提交`d4c826aa1abd54ddbb847ee2a0cf28e18394e73f`，不是正式Release候选。用`git -c core.autocrlf=false -c core.eol=lf archive`导出，解压至源码树之外的新临时目录，先确认无法从祖先解析XState。结果与可公开摘要见[Mac验证记录](handoff/maintenance-20261029/mac-validation.json)。二进制、ZIP、Profile、SQLite与原始日志均不上传。

| 检查 | 实际结果与边界 |
| --- | --- |
| 固定归档 | 298个导出文件；集合符合该提交export-ignore，每个文件逐字节等于Git blob，ZIP CRC通过。包内331个本地文档链接/锚点通过；安装和测试后298个原文件仍未变。 |
| Node22.12入口 | help/version、隔离Skill安装与resolver通过，已有目标拒绝覆盖；缺XState时Runtime明确拒绝且不创建Store。resolver只证明安装和定位，本轮没有调用新Agent宿主发现。 |
| Node22.12定向回归 | 原核心/消费者加安装器两文件，共102项，101通过、0失败、1跳过。唯一跳过是Windows独占文件句柄；Mac权限失败、hard-link发布/回滚和异常中断等现有安装器回归实际执行。该集合包含此前核心/消费者，不把数字相加成额外覆盖。 |
| Node22.12真实Chrome | 11项通过；仍是自有HTML、真实Chrome/CDP、Android宿主替身及旧协议字段/事件替身。自有浏览器退出、服务器关闭。 |
| 锁定依赖与SQLite | 只在独立解压目录`npm ci --ignore-scripts --no-audit --no-fund`；XState5.33.2实际解析到包内node_modules，锁文件未变。自有空库由生产Runtime创建、关闭后重开，schema2、三张表、integrity_check=ok；不证明真实Session/设备/业务派发。 |
| 已有Linux CI | [固定维护提交的CI](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/actions/runs/40839507298)通过：Node22.23.4下465通过、0失败、2跳过；Python3.10.22运行9项，8通过、1跳过。Node跳过Windows句柄与Mac权限专属项；Python跳过未装可选Pillow的视觉测试。此为GitHub托管Linux证据，不计为Mac或Windows通过。 |

最低版本测试在独立解压目录执行，显式选定22.12.0解释器；除上文两条核心/消费者命令外，附加现有安装器文件：

```sh
node --experimental-sqlite --test tests/install-skill.test.cjs tests/install-skill-failures.test.cjs
```

记录中的102项来自一次合并的12文件调用，未通过反复重跑掩盖失败。Mac本轮没有新生产缺陷需要修复，维护代码及测试输入未变；新增内容仅为可复核的验证记录。留待外部环境的仍是Windows/真实Android/真实DoL及旧协议实测，缺失历史原件由Windows端补齐。
