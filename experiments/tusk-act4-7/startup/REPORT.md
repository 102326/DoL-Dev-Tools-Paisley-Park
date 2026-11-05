# F07 后续 — 初始空文档调查与启动诊断

2026-11-05。**本批诊断改进达到Scoped Done；F07历史物理根因仍为Unknown。** 按用户停止点，完成固定提交、相称验证、实验分支同步及CI后停止，等待回家接续；不启动下一批、不发布。

固定代码：[`93facebe38a81ecbe2b6e2d9976ed92ef45b5926`](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/tree/93facebe38a81ecbe2b6e2d9976ed92ef45b5926)；分支`experiment/tusk-act4-7`。差异：[49c15888 → 本批](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/compare/49c15888a7fd1c54c5f50515e2f8c42ae7d9d345...93facebe38a81ecbe2b6e2d9976ed92ef45b5926)。完整TS迁移仍已完成，无需重做；Node下限26、包版本和依赖不变。正式6.1不改，相关一致性修复随7.0，不另发补丁。

## 调查结论

读取原[F07记录](../typescript/BATCH_F07.md)及本地保留的失败/诊断资料：两次失败均在绑定前；一次约5秒92帧快照都是空URL，默认context origin为`://`。旧失败缺少HTTP请求/响应进度，进程已关闭，不能事后补出因果证据。相同显示驱动告警在通过运行中也存在，不能凭告警认定GPU故障。

本轮的中性Chrome控制得到：

- 普通首页与脚本：原精确目标正常绑定。
- 扣住首页响应：相同空文档表象，原5秒等待后`PC_DOCUMENT_CHANGED`安全拒绝；未返回owned记录。
- 扣住脚本响应：首页仍可绑定；脚本未就绪可单独观察，释放后同一不可变文档读到就绪状态。

这些控制证实表象可以被明确的HTTP阶段重现，并能区分首页与脚本等待。它们**不证明历史两次失败由HTTP导致**。本轮没有捕获新的自然首败；历史证据缺口和未复现限制阻止进一步根因认定。没有改端口/目标来凑通过、延长超时、重导航、清Unknown或多跑直到变绿。

## Delivered

- `chrome-host.cts`：首次绑定到期才附有限`pcDocumentReason`，区分空文档、URL不匹配、context缺失/歧义、loader缺失。原错误码、截止和轮询不变；已有绑定失败仍按原语义拒绝，不附初始就绪原因。
- `diagnostics.cts`：安全白名单输出原因和建议，任意metadata/路径/异常不透传；说明原因仍未知。其他直接绑定入口不承诺有pc-start记录。
- `pc-http.cts`：只用被动connection/request和response finish/close观察，计数到65535饱和并标记truncated；不挂clientError/error/data处理器、不消费流、不改Node默认解析拒绝或响应。只统计规范首页GET，不记录URL、头、Cookie或正文。
- `pc-session.cts`：launch拒绝时、HTTP关闭前独占尽力创建`startup-failure.json`，记录有限诊断与服务计数。写失败或同名peer文件不替换原启动异常、不跳过原HTTP清理；不覆盖或自动清理旧记录。
- [中性控制脚本](verify.cjs)：新建独立Profile和中性HTML/JS，持有响应门闩；仅输出过滤后的事件类别/状态，不使用游戏、日常Profile或正式Store。实际owned PID消失和原端口关闭分别核对。
- 更新`docs/PC_RUNTIME.md`，说明记录时点、含义和证据边界。既有CJS导出名、CLI签名、GER/预算/fencing/Session/旧收据合同不变。没有新的Runtime或Provider层。

`readyRecordReturned:false`只说明未返回可用记录，不证明页面从未执行脚本。HTTP观察不归属某个Tab，不证明文档提交，更不能作为GER结算依据。新记录属于辅助启动诊断，不是标准Evidence或业务Outcome。

## Validated

环境：macOS27.0.1 ARM64，Node26.13.0及最低26.0.0，Chrome156.0.8078.73。仅自编中性夹具、替身CDP和自有临时数据。

| 实际检查 | 结果与限制 |
| --- | --- |
| Git49四模块旧CJS隔离加载，运行`tests/pc-startup-diagnostics.test.cjs` | 有效RED共9项：7预期失败、2旧语义对照通过；检测缺失原因/记录和未进入journal写分支 |
| `node --test tests/pc-http.test.cjs tests/chrome-host.test.cjs tests/chrome-launch-readiness.test.cjs tests/pc-session.test.cjs tests/pc-startup-diagnostics.test.cjs tests/cli-errors.test.cjs` | 35/35；含真实HTTP畸形请求默认400并关闭、HEAD/错误Host过滤、不可变快照、同URL peer隔离、既有绑定、ENOSPC和peer文件保护、CLI隐私 |
| `node tools/typescript/build.cjs --write-production`及`--check` | 98Node+17DOM/133产物一致，原95运行入口角色不变 |
| `node tools/typescript/check-types.cjs` | 原117+8=125精确负例通过；构建工具未改，本地原5项证据保持有效，CI对本次提交复跑 |
| `npm test` | 632项：631通过、0失败、1Windows句柄测试跳过 |
| 树外固定包、自己的离线XState、最低Node26.0.0加`--no-strip-types --experimental-sqlite --test`运行全部两组Node测试 | 同样632项：631通过、0失败、1Windows跳过；无NODE_PATH/DOL_DEV_TOOLS_HOME，不复用源码依赖 |
| 新脚本对旧固定包54187d78，hold-document | 真实Chrome原拒绝保持PC_DOCUMENT_CHANGED，新诊断断言按预期以STARTUP_JOURNAL_MISSING失败；PID/端口清理确认。这是诊断缺口RED，不是历史物理根因复现证明 |
| 当前源码及最低Node新固定包分别运行observe/hold-document/hold-script | 各3组/5项检查通过；hold-document记录首页GET未完成响应，host.json不存在；其余在同一绑定观察；PID和端口均独立确认清理 |
| 源码`ger/verify.cjs` | 13/13，中性购买/预算/Unknown恢复/标准Evidence回归 |
| 最低Node固定包`integration/verify.cjs` | 10/10，原目标、导航/重载/ABA、Generic和optional边界；cleanup confirmed |

启动控制命令：`node experiments/tusk-act4-7/startup/verify.cjs CHROME NEW_OUTPUT MODE PORT`，MODE为`observe`、`hold-document`、`hold-script`。使用源码仓库外包时显式`PAISLEY_TOOL_ROOT`指向经审查的解压根。默认端口18784；每组新目录，不复用Profile。脚本是实验驱动，尚未在Windows执行，不是正式跨平台CLI。

固定ZIP431文件，逐文件Git blob/CRC/export集合一致，SHA-256`df3003d9425dee1e292088ad6657ea5b65ac998c8618dda8d664877142d52a6e`。包中无CTS/MTS、tools、原始日志/Profile/SQLite；[清单](package-manifest.json)、[脱敏结构化结果](results.json)。归档源为上述代码SHA；后续报告提交不要求生成相同ZIP。

独立审查未发现新增阻断。审查者启动测试全部通过，HTTP非监听测试通过，监听项因其沙箱EPERM未运行；主代理在允许自有监听环境完整35/35和两套Node/Chrome完成验证。最初新测试有括号语法错误，已修且**不计作RED**；有效RED在此后用Git原模块重现。原始日志和Profile留本地忽略目录，不上传。

Python、安装/Skill布局、编译器/依赖均未改变，复用此前对应记录，不重复声称新宿主发现或图像验收。CI结论在同步后实际读取，不预写成功。

## Not validated / Known limitations

- 历史F07的物理触发原因未定位；正常控制通过不证明首次启动可靠性已修。
- Windows Chrome/文件占用/rename、Android/WebView/真实输入、真实DoL/源码、真实历史Unknown/旧回执均未验收。
- journal为best effort，存储故障时可缺失或不完整；保留未知残留。服务计数不能充当目标身份、文档提交或业务完成证据。
- 原有HTTP close失败可能替换启动异常的行为仍在，本次没有扩大该边界；没有宣称所有清理错误语义已收口。
- 冻结46函数体、构建逐文件发布而非断电事务、对外声明SDK等既有限制保持。此前私人未跟踪草稿未读取、改写或上传。

后续遇到自然首败，先保留本次新增记录、原launch记录和日志，区分HTTP阶段与浏览器提交；不拿控制故障为真实失败归因。本批同步/CI后停止，实际平台验证留待Windows授权环境。
