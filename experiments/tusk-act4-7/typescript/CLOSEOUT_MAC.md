# Tusk ACT4 TS First — Mac 核心与开发工具收口

2026-11-05。**本轮Mac可完成的完整TS迁移已达到Scoped Done。** 95个原Node入口均接入权威CTS，实际生成与类型负例通过；适合的构建/校验工具也已迁移。不是57/95、69/95或81/95的中途停工记录。Windows、Android和真实游戏仍需各自验收，不能据此正式发布7.0。

固定代码：[`54187d78602dff7d23c91a521be512ee361ac786`](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/tree/54187d78602dff7d23c91a521be512ee361ac786)；分支`experiment/tusk-act4-7`。本批差异：[E10报告基线 → 完整核心](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/compare/bca03f72d303207c91b2322daeb2e36dba71e45e...54187d78602dff7d23c91a521be512ee361ac786)；完整TS线从`18544c8d1cb2a751130bf023cfc37b531ed6b722`起。包内版本仍6.1.0，是实验代码身份，不冒充正式7.0。正式main/6.1不改，用户已决定本次序列化修复随7.0交付，不单独发6.1补丁。

## Delivered

- E10先前已固定并同步：Host工具、CLI、Integration；见[E10报告](BATCH_E10.md)。本批接续6个native协调模块和余下8个核心模块：`evidence-tools`、`game-capabilities`、`game-clothing-provider`、`game-dol-provider`、`game-goal`、`game-native-provider`、`game-project-provider`、`game-runtime`。CLI的4个临时Goal/Site/Clothing/Evidence端口全部接真实owner，懒加载保留。
- `game-native-generic-landing/time/street-recovery/profile/radio`及`game-shop-menu-native`接权威CTS。5个新增ABI保留8个原文函数；project operation另保留原文1函数，SHA-256`7ae01d788237c4d8148b38d26ee3cb553f20ba4eaf4572a1788409275d997f94`，旧v1/v2合同不变。native Goal和site的普通reader进入DOM-only Program，以行为及真实Chrome验证，不宣称普通探针文本不变。
- 当前95原入口中9项是**源码载体**，不能把其浏览器算法体计作已类型化。另17个真正DOM-only TS源，21个冻结JS协议资产共46函数体仍未类型化；运行清单133项。G的3个开发入口使Node Program共98项；两Program共133生成产物，与133运行入口是两个不同集合。
- G迁移`tools/typescript/build.cts`、`check-types.cts`、`test/build.test.cts`，回写原CJS。构建器可自举；测试只执行一份生成CJS。保留原5个构建故障/漂移保护及117个精确负例，新增8个实际owner/unknown/非可调用ABI负例。已有故意非法JS输入、固定旧oracle、历史实验、Python/Kotlin保留角色，不做无收益的全测试语言转换。
- Runtime继续使用原XState/SQLite、Session、budget、fencing、Action、Goal和Effect Ledger。原始JSON记录无完整schema证明时公开为unknown；内部property view只描述读取。无新Provider框架、第二Runtime、运行时TS loader或生产依赖，无Node下限/版本号调整。

### 实际修复的正确性缺陷

1. **street/profile清理中的falsy主异常。** 固定旧实现对照确认同时清理失败时会丢弃`undefined/null/false/0/空串`主异常。独立failed标记保留两者；仅主异常、仅清理异常及正常结果仍按原规则。旧street recovery仍只处理`native-passage-8128aafb01db`且不带新save权限。
2. **config校验与持久值不一致。** 真实临时SQLite复现直接API的继承toJSON将maxActions1存成2、扩展scope intent、丢失继承scope，亦复现第一次修复中getter二次读取的缺口。最终先固定并验证结构化快照，再验证/比较实际JSON投影；预算归一化使用已验证result。7项回归通过，普通JSON和值不变toJSON对照保留。

这是带可执行序列化钩子的**本地JS API一致性缺陷**；常规Goal/授权文件经JSON.parse，不携带函数/原型。未证明远程CLI提权；受审Recipe本来拥有Node权限。结构化克隆不支持的非JSON可执行配置不作为受支持输入。未扩展到6.1回补、权限沙箱或发行。

没有改写旧收据、清空pending、重放Unknown、自动迁移Store或降级目标身份。旧未决状态保持其原合同。

## Validated

环境：macOS27.0.1 ARM64，Node26.13.0/npm11.20.0，最低Node26.0.0，Chrome156.0.8078.73；TypeScript6.0.2、@types/node25.9.5、XState5.33.2沿用既有锁。仅自编中性HTML、fake ADB、替身DOM及自有临时SQLite/Profile，无真实游戏/Mod内容。

| 实际命令/检查 | 结果及证明范围 |
| --- | --- |
| `node tools/typescript/build.cjs --write-production`后`--check` | 中央自举并核对98Node+17DOM/133产物，源码摘要及完整字节一致 |
| `node tools/typescript/check-types.cjs` | 原117+新8=125个指定错误准确拒绝；不是只看非零退出 |
| `node --test tools/typescript/test/build.test.cjs` | 5/5：坏候选、CRLF/完整字节、部分写/第二次rename、权限、peer替换、协作锁和双Program隔离 |
| 最低Node26.0.0加`--no-strip-types`执行build/check-types | 同一Program/125负例通过；无TS运行loader |
| `npm test` | 621项：620通过、0失败、1Windows专属句柄测试跳过 |
| 树外固定包、自有离线XState、最低Node26.0.0 `--no-strip-types --experimental-sqlite --test`，全部`tests/*.test.cjs experiments/gold-runtime/test/*.test.cjs` | 同样621项，620通过、0失败、1Windows跳过；已移除NODE_PATH/DOL_DEV_TOOLS_HOME，不复用源码依赖 |
| 源码及最低Node独立包各执行`experiments/tusk-act4-7/ger/verify.cjs CHROME NEW_OUTPUT` | 各13/13：真实派发/原状态Outcome、预算、quote漂移、Unknown/恢复、目标与标准Evidence、Known Good/双向比较 |
| 两者各执行`experiments/tusk-act4-7/integration/verify.cjs CHROME NEW_OUTPUT` | 各10/10：原目标/同URL peer隔离、导航/重载/URL ABA、redact变化、Generic保留与optional失败；cleanup confirmed |
| `python3 -m unittest discover -s tests -p 'test_*.py'` | 系统Python3.9.6：10项中7通过、3可选依赖跳过 |
| 已有隔离schema环境解释器执行同一Python命令 | 9通过、0失败、1可选Pillow跳过；jsonschema4.25.1/rfc3339-validator0.1.4；无安装新依赖 |

独立包全文430文件，Git blob/CRC/export集合一致；ZIP SHA-256`da74c3e0bcaf264db1983ef30db9a7134c3d2845b61f6b7d5f6c4ccb1a225f78`。[逐文件manifest](package-core-g-manifest.json)、[结构化结果](core-g-results.json)。包内无CTS/MTS、tools、编译器、loader、Profile、Store或原始浏览器日志。使用`git -c core.autocrlf=false -c core.eol=lf archive`固定上述代码；后续文档提交重建ZIP不要求同摘要。

独立审查的实际证据：native协调18项、Evidence12项、native Goal6项及reader7场景旧对照、Runtime/resource/retirement48项（含实际子进程死亡和并发VM支路）、domain/site32项、capabilities4项。G做独立静态审查，审查者的重复测试被中断、没有结果；采用主代理最终5/5与worker隔离同源5/5。不能把这些数相加成互不重叠的独立覆盖。

失败/缺失均保留：初次受限沙箱完整Node运行620项中617过、2项loopback监听EPERM、1跳过；允许自有监听后621项全组通过（增加了1个固定reader对照）。G最初隔离fixture缺xstate声明且共享接口未收敛，仅1/5，补齐自有temp声明链接和实际接口后最终5/5。domain/Evidence隔离驱动初次缺experiments/package.json，修复驱动后完成定向组；不把这些早期失败算作生产通过。所有原始日志/Profile/SQLite留在忽略的本地artifacts，不上传。

## Not validated

- Windows Chrome、Windows文件占用/真实rename/junction与launcher实际行为；Mac注入rename错误不替代Windows验收。
- Android真机/WebView、ADB宿主生命周期、真实输入、官方Android工具、SDK/APK构建。
- 真实DoL、真实源码/Mod输入、真实玩家存档或真实历史Unknown/旧回执跨构建恢复。
- 可选Pillow图像测试；新Agent宿主Skill发现/会话重载未实测。Skill内容和安装布局未改，安装器/resolver及用户配置保留合同由两套Node回归覆盖；resolver成功不等于真实宿主发现。

## Known limitations 与交接

**F07初始空文档`PC_DOCUMENT_CHANGED`仍未解决。** 本轮Chrome通过只说明这些运行，没有定位或修复其物理原因，也没有以重跑抹除旧失败。首次启动时保留原日志/Profile；不得换Tab、修改身份或清Unknown来凑通过。

46个冻结函数体是原协议输入，仍未类型检查；Windows LF策略与真实旧收据需按原身份验收。Node对外声明SDK不在本轮范围，个别私有类型尚不支持完整declaration-only输出；strict和CJS发射实际通过。构建发布只有逐文件原子rename及可确认归属的回滚，不是断电整批事务；不自动清理未知lock/staging。一次被中断的独立G重复测试可能留下它自建的temp夹具，未扫描清理未知目录。

Windows继续以[接续任务书](../../../docs/HANDOFF_TUSK_ACT4_7_WINDOWS.md)为入口。优先固定此SHA与本manifest；验证实际Chrome、原生工具与Android目标，再在有授权的适用环境验证真实游戏/旧回执，保留全部Unknown和原预算。任何未完成的平台证据不宣称通过。本机TS实施清单已收口，无需回到中途批次补做迁移；尚未满足完整7.0发布条件，不合main、不建PR/Tag/Release、不改正式6.1。
