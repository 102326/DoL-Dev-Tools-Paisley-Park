# 7.0 Mac 合理待办收口与外部依赖

2026-11-06。用户授权继续完成不需要 Windows 的合理工作；本报告统一盘点与本轮修复，不作为 7.0 正式发布验收。

**结论：截至本报告，现有计划、现场证据和授权范围内，可在本机独立交付且有明确收益的待办已处理完。** 这包括已有核心 TS/PC 接线、固定 revision 查询优化，以及本轮启动/停止清理错误修复和轻量 CI 维护。剩余真实平台、游戏源码及设备取舍需要对应输入；未把可选研究追加成发布门槛。

## 固定身份与已有证据

- 分支：`experiment/tusk-act4-7`。本轮起点 `32e1466bd109175bfa29b8901a82d4bcd908115b`，先 fetch 核对远端，0/0 无分叉。
- [最终代码及固定包](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/tree/0a75b59df6898c460ca26b73ee7bc33a8be0b0d5)：`0a75b59df6898c460ca26b73ee7bc33a8be0b0d5`。
- [PC Session 清理修复](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/commit/94132653fff6f606da8e27b60bc8fe8ef0edf1e2)：`94132653fff6f606da8e27b60bc8fe8ef0edf1e2`；[官方 Actions 更新](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/commit/95c9dab7fef6a15eb2306ba29919b30a35bb2972)：`95c9dab7fef6a15eb2306ba29919b30a35bb2972`。最终代码包含两者和启动器补修，报告在其后提交。
- Mac：macOS 27.0.1 / ARM64，Node 26.13.0；独立包 Node 26.0.0，Chrome 156.0.8078.80。只用自建中性页面和新建临时数据，没有游戏内容。
- 不重做[核心 TS 收口](typescript/CLOSEOUT_MAC.md)、[Chrome GER/Evidence](ger/REPORT.md)、[optional Integration](integration/REPORT.md)和[源码查找批量读取](source-find/REPORT.md)。源码查询此前源码/最低 Node 包各 33/33、真实缺失对象回归及 `32e1466` 的 CI 仍有效，本轮没有修改该实现。
- Windows 已完成的代表任务按 [Windows 总记录](WINDOWS_REPORT.md)及其后续链接复用。旧报告的“尚未验证”保留其原时点，不能作为当前重复待办。

## 四类盘点与处理

| 类别 | 当前状态与处理依据 |
| --- | --- |
| 本机能做且值得做 | 原报告明确保留的 HTTP close 掩盖启动错误、stop 吞掉 falsy 异常已修；沿调用链复现并修正 Chrome stop/CDP close 掩盖原错误、跳过浏览器停止、重复关闭未知日志 FD。官方 Actions 的 Node20 弃用告警已按稳定版升级，保留单 job。当前交接入口、最新包身份和已完成 Windows 探针状态已校正。此类当前无未处理项。 |
| 代码可准备、验证需外部环境 | 本批跨平台 JS 错误处理和固定 revision 批量读取已实现并有中性回归；Windows 端可在下次正常接续运行现有定向测试。源码调查已有固定 commit/区域线索/partial 合同和中性对照脚本；Android 探针源码、部署步骤及 Windows 实际构建记录均已提供。当前没有一个已选定且还能靠 Mac 代码继续推进的独立准备缺口。 |
| 必须等对应环境或输入 | Windows 最低 Node26.0.0 的实际运行；Windows 新批量 Git 路径；获准环境中准确游戏版本的全仓/多区域候选质量；Android 原资源身份问题及合法原回执输入；设备端候选的同设备任务比较。Mac 不能提供这些事实，见下方接续清单。 |
| 可选未来覆盖或尚未选择的路线 | 完整 Source Link 2.0、跨版本索引、外部类型 SDK、重写冻结协议正文、将 stdio 研究设为正式默认、其它语言/进程替换、全游戏/全 Mod 矩阵、无依据的新 Provider 层，均不自动变成当前剩余工作。Kotlin 的采用本身不是门槛；是否继续代理/传输方案取决于设备任务收益。 |

7.0 核心 Node TS 迁移已经落地，46 个冻结函数体仍是按原字节/摘要保留的协议输入，不是漏做的迁移任务。保留直接 CJS 运行、原 SQLite/XState/预算/fencing/Unknown/回执合同。没有用迁移比例定义收益。

## Delivered：完整启动清理链

沿现有报告的真实已知限制定位 `pc-session.cts`，并继续检查它调用的 `chrome-launch.cts`，没有建立另一套资源框架。

1. 启动失败后 HTTP 关闭也失败：用 `AggregateError.errors` 保存原失败和清理失败，`cause` 保留首个失败；不再只剩 HTTP 错误。启动诊断 journal 仍在清理前尽力独占创建，写入失败不替换原失败。
2. 停止时浏览器抛出 `undefined/null/false/0/空字符串`：按是否真的抛错记录，不再用 truthy 判断。HTTP 关闭仍尝试一次；双重失败都保留，只有浏览器失败则抛回原值。
3. Chrome launch 的发现/元数据失败与 browser stop/CDP close 同时失败：保留原错误，CDP close 失败不阻止本轮浏览器停止；在返回可用句柄前发生清理失败也执行同一清理路径。
4. 日志 FD 从待关闭集合取出后各尝试一次；一个失败不跳过其余项，也不再次关闭结果未知的 FD。进程监听立即注册，`launch.json` 在 FD 关闭之前尽力保存身份。
5. 错误构造留在两个持有资源的模块内，保持 diagnostics 原有两个导出，CLI 只输出固定 `PC_CLEANUP_UNCONFIRMED stage=pc.cleanup` 和保留/核查建议，不回显原始异常、路径或任意 metadata。[当前用法](../../docs/PC_RUNTIME.md)说明 API、日志与不确定性。

权威 TS 和生成 CJS 同步；没有修改启动期限、选页、文档绑定、HTTP 白名单、Action/GER 派发或持久 Store。清理不自动重试、删除 Profile 或按进程名结束浏览器。新代码改变的是异常与失败后的资源处理，成功返回结构不变。

## Delivered：轻量 CI 维护

实际 `32e1466` CI 报告了 checkout/setup-node/setup-python 的 Node20 弃用告警。核对官方已发布稳定版后，仅将这三个 `uses` 更新为 `@v7`，没有改变检查命令、Node26、Python3.10、触发器、缓存或增加平台矩阵。

当时稳定版本为 [checkout v7.0.1](https://github.com/actions/checkout/releases/tag/v7.0.1)、[setup-node v7.1.0](https://github.com/actions/setup-node/releases/tag/v7.1.0)、[setup-python v7.1.0](https://github.com/actions/setup-python/releases/tag/v7.1.0)。Action 自身的 Node24 运行要求见官方 [checkout](https://github.com/actions/checkout#checkout-v5)、[setup-node](https://github.com/actions/setup-node#breaking-changes-in-v5)及 [setup-python](https://github.com/actions/setup-python#breaking-changes-in-v6)；项目测试进程仍是 Node26。已观察到 hosted runner 为 2.338.2，满足文档的最低前提。

[首轮更新后的实际 CI](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/actions/runs/42167447903)在 `95c9dab` 成功，Node20 告警消失；仍有 ubuntu-latest 镜像迁移提示，未把它写成项目故障。后续启动器补修按其实际 CI SHA 核对，不借用首轮成功。

## 真实 CI 失败与合同修正

启动器初版 `971c47e99f090801127519191551638cba9b35fb` 的[完整 CI](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/actions/runs/42168240129)实际失败：657 项中 654 通过、1 失败、2 跳过，Python 阶段未执行，不能把它写成完整通过。原因是为了共享错误构造给 diagnostics 额外导出了 pcCleanup，触发既有 typed-target 导出合同；本地当时的 40 项选择没有包含该测试。

保留原 ABI 断言，错误构造改回两个资源模块的私有函数，diagnostics 继续只导出 describe / cdpTimeout。最终定向集加入原 typed-target 三项，成为 43/43；固定包和 SHA 随后重新验证。最终代码是本页顶部的 `0a75b59`，不是失败初版；该修正没有变更已测清理算法或放宽合同。

修正后[完整 CI](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/actions/runs/42168854353)在固定 `0a75b59df6898c460ca26b73ee7bc33a8be0b0d5` 成功：Node **655 通过 / 0 失败 / 2 跳过**（共657），G构建保护 **5通过 / 0失败 / 1 Windows专属跳过**，Python **9通过 / 0失败 / 1跳过**（共10）；Program与125类型负对照通过。CI是Linux证据，不替代Mac/Windows/设备。

## Validated

```sh
node tools/typescript/build.cjs --write-production
node tools/typescript/build.cjs --check
node tools/typescript/check-types.cjs
node --test tests/pc-session.test.cjs tests/pc-startup-diagnostics.test.cjs tests/chrome-launch-readiness.test.cjs tests/cli-errors.test.cjs tests/typed-target.test.cjs
```

- 最终代码定向 **43 通过 / 0 失败 / 0 跳过**，包括 15 个新增测试结果（含子测试），不是 15 项独立产品能力。既有单目标、期限、journal 和 CLI 隐私断言保持。
- 旧 PC Session 实现运行新增的三个场景及子测试：10 个预期失败；修复后通过。启动器补修的 4 项回归在旧 `95c9dab` CJS 隔离加载时均失败，在最终产物通过，涵盖原错误、stop/CDP/FD 清理及返回句柄之前的失败。
- 首轮一个 spawn 故障注入未在模块解构前安装，另一次旧模块 loader 未处理 `.cjs` 回退，均属于试验设置错误；修正后才取得上述有效负对照，不把设置错误算 Bug 证明。
- 98 个 strict Node + 17 个 DOM-only 模块、133 个产物生成一致；125 个既有类型合同负对照通过。没有新增编译器或运行依赖。

### 固定独立包及真实中性 Chrome

[432 文件逐一清单](mac-closeout-package-manifest.json)绑定 `0a75b59df6898c460ca26b73ee7bc33a8be0b0d5`；ZIP CRC、export 集合和 Git blob 字节全部匹配。ZIP SHA-256：`27ca3ef056d64625fa4310732e737e8c1717fcd09dd98cb33fbcb2e4aa14462e`。ZIP 和原始输出只留本地，不是 Release 资产。

```sh
git -c core.autocrlf=false -c core.eol=lf archive --format=zip --prefix=Paisley/ --output=REVIEWED_ZIP 0a75b59df6898c460ca26b73ee7bc33a8be0b0d5
python3 experiments/tusk-act4-7/verify-package.py 0a75b59df6898c460ca26b73ee7bc33a8be0b0d5 REVIEWED_ZIP NEW_EXTRACT_DIRECTORY
# 以下在解压后的 Paisley 根运行；NODE_26_0 替换为已核对的最低版本二进制。
NODE_26_0 --no-strip-types --test tests/pc-session.test.cjs tests/pc-startup-diagnostics.test.cjs tests/chrome-launch-readiness.test.cjs tests/cli-errors.test.cjs tests/typed-target.test.cjs
```

树外全新目录，包内定向 **43/43**，最低 Node26.0.0 且关闭类型剥离，没有安装包内或编译器 node_modules。对最终包另运行现有 `startup/verify.cjs` 的 `observe` 和 `hold-document` 两组，均使用最低 Node26.0.0、自建中性页面、独立 Profile、明确端口18784、清空 NODE_PATH/NODE_OPTIONS：

- 正常启动在同一不可变文档读到脚本状态；受控扣住首页响应仍以原 `PC_DOCUMENT_CHANGED` 拒绝，并保留初始空文档/journal 证据。
- 两组均 passed，原浏览器 PID 消失、原端口拒绝连接，cleanup confirmed；无业务派发。受控拒绝不证明历史 F07 的物理原因。
- 驱动从源码侧运行但以 `PAISLEY_TOOL_ROOT` 明确加载树外包，生产运行不借源码依赖。复现入口：`NODE_26_0 --no-strip-types experiments/tusk-act4-7/startup/verify.cjs CHROME NEW_OUTPUT MODE 18784`，相应环境变量和绝对路径须按任务明确提供。

结构化摘要见 [mac-closeout-results](mac-closeout-results.json)。没有重装全局 Skill、重新做宿主发现、重跑未改变的 GER/真实保存/Android；对应原证据继续保留其原 SHA 和范围。resolver 可用不等于当前聊天热加载。

## Not validated / 外部接续

| 需要的事实或输入 | 当前状态和下一步 |
| --- | --- |
| Windows 最低 Node26.0.0 | 仍未实际运行。正常接续时用已核对的对应运行时验证固定包，不以默认26.13或 Mac26.0代替。 |
| Windows 本轮改动 | 新 Git 批量路径和本轮清理失败组合尚未在 Windows 实跑。已有定向测试可复用；未改 Windows 原生进程工具或强迫重跑全部游戏流程。 |
| 准确游戏源码与调查任务 | 在获准环境按实际加载版本核对 commit，复验全仓查询及衣柜/侧栏/第三类候选质量、耗时和人工查找对照。旧0.5.11.9资料不能冒充0.5.12.13。公司 Mac 不获取游戏正文/图片/存档。 |
| Android 原资源身份与未决 | 原设备上的 dev/inode 身份差异尚未合法闭合，页面原回执缺失；原四条 pending 保留。需合法目标/原输入及相应授权后继续，不能换 Store、marker 或合同结清。历史 terminal 恢复仍按原 nonce/attempt/合同和账本 fence，不新增当前身份门槛阻止合法旧恢复。 |
| Kotlin 取舍 | Windows 已实际构建并验证自有 Activity 旋转/状态，不再只是 JVM 结果；尚无设备代理、传输或同任务性能收益。需在授权设备选择有价值的观察/批量等待场景对照 ADB/WebView，决定采用、混合或撤回。Mac 再写一套无设备代理不能替代这个决定。SDK/APK 仍留 Windows。 |
| 历史真实回执与首败 | 只有存在实际兼容/发布需求和原输入时才追加历史 CRLF/旧停止 Session 验收。F07、后台截图根因仍 Unknown；现有成功和控制重现不能追认修复。需要真实重现/日志时停在该输入上。 |

## Known limitations 与停止依据

异常聚合保留在程序内，不保证原始错误已经写盘；journal、launch.json 及日志写入仍可能因 IO 故障缺失或不完整。FD/进程关闭的结果未知就保留未知，不自动重试，不保证断电清理或 fsync。没有新增沙箱、事务发布、Exactly-once 或游戏真相来源。

当前没有还可以独立推进的既定 Mac 实现缺口。没有因此把所有历史 TODO、未测平台或候选技术扩成新任务；也没有用“本批通过”遮住整体 7.0 的外部依赖。下一次拿到具体可重现输入或任务收益证据再继续相应路线。

Gold Experience（黄金体验）名称仍在用户指定的 7.0 发布收口时统一处理。本轮没有改仓库名、路径、内部标识、历史材料或正式版本号；未合并 main、建 PR/Tag/Release。未读取、覆盖或提交私人维护草稿，未上传 Profile、SQLite、原始工具日志、设备私人信息或游戏资源。
