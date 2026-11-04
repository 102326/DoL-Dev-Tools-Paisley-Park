# Weather Report：Mac接线、执行协议与独立归档验收

2026-11-04。接续首批实验 `e2e66236af4f659f0cccd7e63bc6229fe8a91f8d`，分支 `experiment/weather-report-20261104`。本轮从原型进入现有CLI，并根据实际成本调整运行方式；版本号仍未预设，package的6.1.0是源码基础元数据，不表示本分支已发行。用户确认Android实机和真实游戏源码验收留Windows，公司内容限制继续有效。

## Delivered

**源码查找进入现有CLI。** `source-find --root REVIEWED_ABSOLUTE_SOURCE --file QUERY_JSON --out NEW_JSON [--revision REVIEWED_REF]` 可直接调用，不需要设备、Goal、TypeScript编译器、原型目录或额外loader。TS源位于 `scripts/lib/source-find.mts`，不是复制第二套引擎；正式入口使用预生成 `source-find.cjs`。query遵循 `schemas/source-find-query-v1.schema.json`，root/revision由CLI独立提供，禁止查询JSON覆盖。参数、错误和退出码在 `docs/GAME_SOURCE.md`/help/格式页明确。

七类线索、工作树/目录/固定Git对象及原有来源合同保留。修复了原型不搜索 `.mts/.cts/.tsx/.jsx/.scss/.sass/.less` 的实际缺口，避免新工具连自己的TS实现也无法查找。包内自查已经定位到 `source-find.cjs` 的函数定义。定义/引用依然是启发式，未冒充精准现场映射或游戏全覆盖。

**边界与接续。** 查询文件最多65536字节、正规UTF-8、regular file；非阻塞打开避免FIFO等待，读取循环有硬字节上限。非法输入、未知字段、范围及输出占位都在发布前拒绝。成功结果保存selection（绝对root、revision、归一化limits）、clues、源码身份和候选摘要；普通输出日志不回显私人路径/文本。成功JSON本身可能含私人源码及路径，不自动上传。完整无匹配退出0；partial保存结果并退出2；输入/访问/发布失败退出1，有限code/stage给出处理建议。

**输出发布和归属。** 同父目录暂存完整JSON，经回读验证后独占硬链接发布；已有文件、符号链接、并发占位都不覆盖。底层链接不支持时明确失败，不回退部分写入。发布已生效但确认丢失时，保留最终输出并报告 `SOURCE_OUTPUT_INCOMPLETE`，不声称未发布。临时清理只处理可核验身份/字节的自有文件，无法确认的目录/文件保留。成功输出但清理未知时保留成功结果并明确提示。

为此将安装器原有 `owned()` 提取为 `scripts/lib/owned-files.cjs`，供两条路径复用；没有重写Skill安装合同。发现并修复 `fstat` 失败时fd泄漏，测试先复现句柄未关闭，修复后关闭句柄且保留无法确认归属的空文件。旧安装保护、并发占位、回滚、外来文件保留和Windows身份比较逻辑保持。

**TS维护，JS运行。** 同源原生TS与生成JS做了功能和启动/RSS对照，原生路径在该小任务上冷启动与内存成本更高。因此不把“省转译”当成性能收益：正式使用预生成CommonJS；原生TS作为实验模式保留。CI独立安装3个锁定的开发包，检查strict/noEmit/erasable类型、四个类型负对照及生成漂移；根运行依赖未增加。

生成器读取单份源快照，固定TS6.0.2及LF发射，生成头部含 `source-lf-sha256`。默认/`--check`不改tracked runtime；CRLF checkout在校验时归一化，非语义换行不制造漂移。显式 `--write-production`先完成其它产物、验证同文件系统暂存，最后原子替换唯一已知的生成文件。审查复现的中途写失败截断旧JS问题已修，故障注入证明旧JS保留；中断发生在rename附近仍需重开后 `--check`，没有承诺fsync/断电耐久或清扫未知残留。

**Kotlin推进至真实独立JVM。** 新增 `Worker.kt` 与Node标准库host，ASCII小协议有帧、序号、请求数及单工作上限。独立JVM的process UUID、重建实例UUID和原work归属可观察；READY/释放/提交后保持门闩决定相位，实际SIGKILL前未释放工作返回Unknown，断开stdin后释放的工作仍能提交，宿主独立回读效果，提交后SIGKILL再启动新JVM可恢复原UUID见证。没有靠sleep推测提交时机。

重复finish不重复发commit事件；finish中的store异常保持Unknown；清理不覆盖已获得的结果。宿主等待child close才移除自有目录，5秒仍未确认就保留目录并标未知，处理pending timer和EPIPE。它仍是单写者、无fsync的合成文件效果实验；尚无Android App/SDK/APK/设备代理适配，不把此结果当作Kotlin胜过ADB或Android业务可靠性。

## Validated

Mac27.0.1/ARM64，Node26.13.0/npm11.20.0；最低版本实际使用既有官方Node26.0.0二进制。检查器TS6.0.2、Node types25.9.5、undici-types7.24.6；OpenJDK21.0.11、Kotlin2.0.21/JVM17。Python隔离venv用本机3.9及CI规定的jsonschema4.25.1/rfc3339-validator0.1.4；不修改全局环境。

| 实际执行 | 最终结果 |
| --- | --- |
| 根目录 `npm test` | 492项：491通过、0失败、1个Windows文件占用测试跳过。包含旧GER/SQLite离线回归；不代表真实Gameplay。 |
| Node26.0.0执行 `node --test tests/source-find.test.cjs tests/source-find-cli.test.cjs` | 24通过、0失败、0跳过；最终生成CJS入口。 |
| `node --test experiments/weather-report-20261104/source-finder/test/build.test.cjs` | 2通过；覆盖checker缺失/错误版本、漂移拒绝、CRLF、部分暂存写失败及成功原子更新。 |
| `npm --prefix experiments/weather-report-20261104/source-finder run build` | strict类型与整份生成运行文件一致。 |
| `node experiments/weather-report-20261104/source-finder/check-types.cjs` | 四种kind/code/outcome/role漂移被TS2322拒绝。 |
| `node experiments/weather-report-20261104/source-finder/native-probe.cjs` | 同源原生TS/生成CJS五查询、坏请求与取消一致。 |
| `schema-venv/bin/python -m unittest discover -s tests -p 'test_*.py'`（venv位于忽略的artifacts） | 10项：9通过、1个Pillow测试跳过；新增Schema与真实CLI共用20个正/负查询。最终Schema又定向执行2项通过。 |
| `node experiments/weather-report-20261104/entry/protocol-test.cjs`及`host-test.cjs` | 有界协议、取消/迟到和进程关闭故障脚本通过。 |
| `node experiments/weather-report-20261104/entry/benchmark.cjs`与`PAISLEY_SOURCE_ENGINE=native`同命令 | 最终CJS和原生各10冷/10复用采样，实际结果一致，身份与指标见下。 |
| `experiments/weather-report-20261104/kotlin/run.sh` | 编译并通过原核及真实JVM门闩/SIGKILL/重启；过长帧预期拒绝并非测试失败。 |

首次全套Node回归为386通过、45失败、1跳过：工作树未安装XState，以及沙箱禁止127.0.0.1监听。按原锁补装XState并使用允许自有测试端口的执行权限后，最终491/0/1；未修改测试来遮盖失败。系统Python初次缺可选Schema包跳过2项，独立venv装好现有CI依赖后实际通过。既有原始失败日志保留，未算作通过。

接线审查还复现并修复：ENOTDIR/EACCES输出预检丢失source阶段、query关闭错误越过分类、发布确认丢失误报未发布、原生TS关闭时的错误误归类。正式切CJS后，`--no-strip-types`应能成功；未知模块异常仍归unknown，不编造环境根因。最终独立审查CLI/所有权助手13项通过，并在无依赖/无类型擦除的隔离模块中确认运行；生成器的后续部分写问题通过定向故障注入收口。

### 最终入口对照

固定同一自有夹具，禁用子进程compile cache；耗时不启用IPC采样，RSS另开进程观察，不是峰值。CJS冷启动中位79.69ms、复用32.68ms，原生TS冷106.86ms、复用35.72ms。复用10次后RSS分别66,781,184与99,893,248字节。结果支持当前路径采用生成JS，并保留进程复用研究；不能换算成Codex完整任务提效、跨设备性能或语言胜负。早期ESM/开发中间态没有混入最终采样。

## 独立归档与Mac安装

固定代码提交 **`346eb834a8309d81b5c5867b521b41a853f22fb2`**。使用 `git -c core.autocrlf=false -c core.eol=lf archive` 生成新ZIP，摘要 **`b4441894dba00719bba30d2660f1980057aa77ef75cb4889f519658f6d0a9601`**。

- **308个文件**：集合等于导出属性允许范围，每个文件与对应Git blob逐字节相等。经过筛选的逐文件摘要见 [package-manifest.json](package-manifest.json)；不包含实验目录、编译器、node_modules、原始记录或私人报告。
- 全新 `/private/tmp` 目录解压，Node26.0.0、禁用全局模块搜索与类型擦除，无node_modules，独立确认XState不可解析。
- 实际help/version/source-find运行，定位包中自身函数定义，保护已有结果；包内24项源码测试全部通过，不复用源码树依赖。
- 在临时位置安装Skill并从安装位置实际解析回该包，通过。**宿主发现、会话重新加载、Codex注册不在这一结论内。**

归档本身与原始日志只留本机忽略目录，不是正式候选发布或GitHub附件。后续纯实验/报告提交不改变该受验生产payload；版本号、Windows门禁、合并与Release另定。

## 本地提交与边界

- `12d540b100351b994bc579a64a46caf3a7c2c8df`：CLI、TS/生成JS、输出与所有权、Schema/回归、轻量CI和使用说明。
- `7295e05f583fd6559bbb79625ef1a5ec64f88646`：生成文件暂存与原子替换故障保护。
- `346eb834a8309d81b5c5867b521b41a853f22fb2`：Kotlin独立JVM恢复与关闭。

作者/提交者均核对为Codex bot noreply；无推送、PR、合并、Tag或Release。基线维护分支仍指向a29d508；原私人未跟踪维护报告保留。本次新增公开材料没有个人绝对路径、真实设备身份或原始运行状态；成功CLI原始结果含本地selection，故未上传。

## Not validated / Known limitations

Windows文件系统/文件占用、Android SDK/APK/真机/WebView、多个非商店真实游戏源码及Gameplay，留到获准Windows环境。GitHub CI配置已更新但本轮未推送，不能称远端CI已通过。Codex实际宿主发现与工具注册未验。没有重新做Chrome/CDP真浏览器实验，因为本轮没有修改该路径；历史证据保持历史范围。

检索是字面候选，不是完整Twee/JS调用链；翻译、动态文本/宏展开、Mod覆盖仍需实际调查。文件白名单/预算/encoding导致partial不能被解释成游戏无功能；父目录rename竞态、工作树跨文件原子性、硬实时截止和权限沙箱均未被新模块解决。文件系统不支持硬链接时明确失败。保存输出含私人路径与代码，需要分享时另行脱敏。

JVM核不具备多写者/掉电耐久或Android业务真相，不接现有GER；缺文件不自动证明无副作用。生成器rename附近中断需核对实际字节，不能宣称所有失败都未发布。没有清理历史Store、回执或Unknown，没有用新合同结清旧效果。

**本轮Mac接线及本机实验达到Scoped Done；下一版整体发布和真实平台验收未完成。** 类型与请求边界已经进入实际工具，Windows接续应从真实任务收益、真实源码候选与设备事实继续裁决；完整战未来仍独立推进，不为本轮强加通用Provider或全仓语言迁移。
