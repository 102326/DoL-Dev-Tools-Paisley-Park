# Chrome GER 与标准 Evidence — Mac 接线交付报告

2026-11-04。**本轮 Chrome GER 与标准 Evidence 接线在 Mac 无内容环境达到 Scoped Done，生产代码已同步 GitHub。7.0 正式发布、Windows、Android 和真实游戏验收未完成。**

代码基线为 `241c77262b560481447dff75903d679bb2fedc2e`；本轮生产实现 `5c132422889d2d3b28877bbf8d6ab19895edaf3c`，最终诊断收口与包体代码 `eff14d6c8a4344ddbae844b2faf7e92896e38c72`。研发分支仍为 `experiment/tusk-act4-7`，不改 main、版本号、Tag、PR 或 Release。

## Delivered

### Chrome GER

- `game-goal-start --host chrome --host-file ...`、后续原 Goal 的 `game-session request/propose/dispatch/resume/reconcile/checkpoint/cancel/status` 复用当前 XState、SQLite、Decision、预算、Memory、fencing、Effect Ledger 和原回执。
- 从 owned record 建立 Session，持久保存原 Profile/browser/target/origin/document；后续不重读 host-file，不自动采用新文档。内部 transport record 有进程内品牌，外部 JSON 不能绕过 owned record 入口。
- Chrome TargetKey 按整个 Profile，在同 Store 内跨 Tab/origin/browser 保留原 pending。Session 要求原完整文档和 Profile 路径，不填 Android nativeIdentity/resourceGeneration；旧 Android key 与数据代次合同保持原样。
- 现有项目 Recipe 新增明确的 Chrome scope：workspace/Profile/origin/intents/chrome-origin-storage，不接受 Android 占位身份，不支持 Chrome data-reset。它记录用户已授予的范围，不能自行授权。
- Runtime.evaluate 保留 uniqueContextId/完整 URL；callFunctionOn 新增同执行回合 canonical global 与 URL guard。仅使用本连接绑定/派生的对象，getProperties 可继续持有 closure 对象；拒绝 context/nodeId 覆盖，scroll 仅使用原对象，清理只接受自身对象与组。
- 原生 DoL Provider 使用同一路径，源码/环境指纹和独立 Outcome 要求没有放松；真实业务 profile 在本机未验收，不回退普通点击。
- 已结清页面回执回收在 LIMIT 前按 Chrome browser/target/uniqueContext 过滤，避免其它标签占满当前64项批次或被错误标为已回收。相同 context 的跨 Session 维护保留；pending 仲裁仍覆盖整个 Profile。

### 标准 Evidence 与消费者

- 标准 `evidence / capture / environment / perf` 接 owned Chrome，保存现有 incident/manifest/每步完整性和去路径的目标身份摘要；复用八类 Web 采集能力。
- Android 专属请求明确 unsupported。当前 optional Integration worker 不具备相同 Chrome 文档绑定，故不在 Chrome 上执行；其 unsupported 不否定成功的通用采集。
- Chrome Environment 保留 browser/runtime，复用 runtime 校验，不伪造 Android device/app/provider/webview。environment-diff、Compare、Known Good 支持同 host；跨 host 比较 unknown，不完整 Mod 元数据不能作完整参考。
- 身份和授权错误加入有限 stage/hint，供 CLI、Journey 和 Evidence 使用；不带私人路径、用户输入或原始异常。
- Skill、PC_RUNTIME、GAMEPLAY、PROJECT_EXPERIMENTS、EVIDENCE_TOOLS 已更新入口和边界。普通 Debug 不强制 GER。

## Validated

实际环境：macOS 27.0.1 ARM64，Chrome 156.0.8078.73，Node 26.13.0 与最低版本26.0.0，Python 3.9.6，Codex CLI 0.166.0-alpha.6。HTML/JS、原始状态 API、Recipe 和公共元数据都是自有合成内容，没有 DoL/Mod 源码、玩家存档或成人资源。

| 检查 | 实际结果 |
| --- | --- |
| `node --test tests/*.test.cjs experiments/gold-runtime/test/*.test.cjs` | 518项，517通过，0失败，1项Windows专属跳过 |
| 隔离 Python `-m unittest discover -s tests -p 'test_*.py'` | 10项，9通过，1项可选Pillow缺失跳过 |
| 最终诊断/Chrome scope/Evidence/Goal 定向 | 78/78通过 |
| Chrome 回执容量修复 | 先RED，再GREEN；65条其它标签历史不能饿死当前标签回收 |
| 回执容量与原Runtime/Goal回归 | 91/91通过，包括既有66 Session回收用例 |
| 真实 Chrome GER/Evidence 最终独立包 | Node26.0.0，13/13场景通过 |
| 原PC Debug/Journey回归 | 独立5c13242包、Node26.0.0，12/12；后续仅诊断文案变化，复用其宿主证据 |
| 独立最终包 | 319文件，准确导出集合，逐文件对应eff14d6 Git blob |
| 隔离安装/resolver/宿主发现 | 安装前0、forceReload后1、独立宿主重启后1；repo scope/enabled，指向解压包 |
| GitHub CI | eff14d6代码提交已成功；此前5c13242实现提交也成功 |

13项真实 Chrome 检查：

1. 正式 CLI Goal→Decision→propose→dispatch→原状态 Outcome，虚构购买只一次，花费10。
2. Chrome Session 没有 Android nativeIdentity/resourceGeneration。
3. 报价/原状态变化执行前拒绝，零购买、pending=false、spent=0。
4. 真实 remote object、closure/getProperties、callFunctionOn、scroll、owned cleanup；外来ID/context覆盖拒绝。
5. callFunctionOn 预检后 URL 交错不点击；已发现URL变化后恢复原值也不复活旧holder。
6. 真实派发CLI被SIGKILL后，SQLite保留pending/预留；原terminal恢复后花费10，无重复购买。
7. 停止后的reconcile只读原terminal，不新派发、不延长截止、不把清理算作Goal完成。
8. reload拒绝旧Session并保留原未决效果。
9. 显式新文档/新Session仍被同Profile旧pending围栏阻挡。
10. 正式Evidence CLI保留Web采集和owned文档身份。
11. 缺ModLoader元数据时Compare保留unknown/partial。
12. 完整合成公共元数据下Known Good与双向Compare可用。
13. Android专属与可选Integration不编造支持，不破坏已成功通用采集。

复现命令：

```sh
node experiments/tusk-act4-7/ger/verify.cjs ABS_CHROME NEW_OUTPUT
PAISLEY_TOOL_ROOT=ABS_EXTRACTED_TOOLKIT node experiments/tusk-act4-7/ger/verify.cjs ABS_CHROME NEW_OUTPUT
node --test tests/chrome-gameplay.test.cjs tests/game-goal.test.cjs experiments/gold-runtime/test/runtime.test.cjs
python3 experiments/tusk-act4-7/verify-package.py eff14d6c8a4344ddbae844b2faf7e92896e38c72 REVIEWED_ZIP NEW_EXTRACT_DIRECTORY
```

包按原lock从本机缓存 `npm ci --offline --ignore-scripts --no-audit --no-fund`，仅XState 5.33.2，没有新增生产依赖。最终ZIP SHA-256为 `a0b80e12428ab9bb1c60ac1cd3f8fa92088367df59ff6901065c0eea668ea7d1`；[逐文件manifest](package-manifest.json)与[脱敏验证摘要](validation-results.json)保留固定身份。最终验证脚本摘要也在JSON中，包含最后增加的reconcile场景；脚本和实验不进入payload。

[最终生产代码CI](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/actions/runs/41800367209)。宿主检查只用initialize/skills/list，无模型任务、全局Skill安装或当前Desktop会话热重载声明。

## 审查、失败与修正

- 独立审查发现初版把新Chrome验证无条件加到Android reconcile，会缺失生产serial并阻塞无nativeIdentity的历史恢复。已将新增检查仅限Chrome，保留Android历史只读清理合同。
- Chrome reconcile 在前置身份检查后重新计算30s剩余窗口，不能重新获得一整轮30s观察预算。
- Chrome跨标签回执容量用65旧记录+1当前记录确定性复现，修复在LIMIT前筛选；独立审查确认Android查询、同context跨Session回收和全Profile pending未改变。
- 初版Chrome Compare验收错误地期待缺Mod元数据时退出0；产品实际正确返回partial。脚本改成验证unknown，并另测完整合成元数据，而非弱化完整性规则。
- 新增零副作用断言时，脚本把paused状态CLI既有退出1误当产品失败；改为读取保留的结构化状态再检查pending/spent，没有改变生产退出语义。
- 原始失败轮、Profile、SQLite、截图和日志保留ignored artifacts。没有用反复相同重跑、清pending或删除回执制造通过。

## Not validated

Windows Chrome、Android SDK/APK/设备/WebView、真实DoL/Mod/存档及原生业务profile、跨版本游戏源码调查、Chrome optional Integration执行、当前Desktop聊天热重载未验证。

## Known limitations

- Profile路径哈希、资源摘要、同origin都不是数据世代或独立存档证明。当前Chrome业务合同严格限定原live browser/document；不承诺检测原地存储清空。变化后旧pending仍保留，不迁移Android或旧文档效果。
- 跨Store/跨主机不是全局业务锁；换Store不能作为绕过Unknown的办法。普通Debug和手动/CUA操作不能事后补记成GER执行。
- Windows的进程终止、文件占用、路径和Chrome行为尚需实际验证；本机SIGKILL及模拟网页不等于真实平台/游戏验收。
- 原生DoL源码/函数指纹未在公司环境取得；无法匹配时应拒绝，不为夹具放松正式Provider。Recipe验证只证明共享协调和原终态合同。
- Chrome可选Integration明确不支持执行；通用Evidence、Journey、GER Recipe和已列离线消费者不因此阻断。其它离线工具按其实际覆盖判断。
- Profile和业务日志默认保留，清理只关自身连接/实例，不承诺断电或强杀宿主后的清理；不读或修复任何正式Store/私人数据。

## 后续交接

本轮约定的Mac接线、独立包、错误反馈和无内容恢复合同已完成，没有需要为本轮继续追加的本机实现门禁。Windows后续先同步固定代码、检查Node26/Chrome/依赖，运行新PC及GER夹具，再在获准环境验证真实HTML/资源、原生业务profile、存取和多标签/断连恢复。Android SDK/APK与设备代理对照仍按既定Windows分工；不把Mac结果计作实机通过。

本轮Scoped Done不等于7.0正式发布许可。未修改main、发布正式版本或上传私人实验数据。
