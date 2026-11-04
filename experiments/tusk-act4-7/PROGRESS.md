# Paisley Park 7.0 TUSK ACT4 — Mac 首批实施报告

> 后续进展：Chrome GER 与标准 Evidence 已接通，当前交付见 [接线报告](ger/REPORT.md)。下文保留首批6bca3dc快照及当时待办，不能再当作当前缺口。

2026-11-04。**已交付可安装的 PC Debug / Action / Journey 开发路径，并完成真实 Chrome 的无内容场景验证。7.0 整体尚未完成，未进行正式发行。**

## 开发基线与同步

研发分支：`experiment/tusk-act4-7`。生产代码验货提交：`6bca3dc83d76c17eacf741288d5b0f48d5300a1a`。本报告之后的文档提交不替换该固定代码身份。

已用 Git 祖先关系确认以下成果都在当前历史中，未整体覆盖或重置：

- 正式 6.1：`cfd76a75e6c28efbbdcf447b25679cd9f257ef54`。
- 维护分支：`a29d5088107296843b048ef99b05784535d2b7bb`；保留 Node 26、分阶段诊断、版本查询和 Android 完整 URL/context 修复。
- Weather Report：`91eb9b0500152e9d055f1424074698db3bf43560`；保留 TS source-find、生成 CJS、受控暂存及此前独立包经验。
- 原 ACT4 MIT 历史：`52a8893910c57ed420587c137472ffb008567b18`，仅选取并适配 Chrome host/identity，不复活旧工作树或覆盖当前 GER。

已分批推送：`a3afe3236ae5f95be0448eae814e5f6cc57a317d`（基线及 PC 复核记录）、`1407c3aaa61021fcded65d9cccc91b6f814eb5ab`（源码上下文和 Android 准备）、`853bd56bcfc651bd98caa39301a9e8efc1861b95`（PC 入口）、`6bca3dc83d76c17eacf741288d5b0f48d5300a1a`（共享 Journey）。上述提交的 author/committer 均已核对为 Codex bot。未修改 main、PR、Tag 或 Release；包元数据仍为 6.1.0，不冒称已发布 7.0。

## Delivered

### PC 本地宿主与接续

- 新增 `pc-start / pc-pages / pc-bind / pc-observe / pc-action`，使用选定 HTML 与显式资源清单、指定 loopback 端口、独立可见或无头 Chrome。
- 支持相对资源、Unicode/空格名称及编码；只提供白名单文件快照，不开放整个目录或代理。端口冲突不自动换端口。
- 绑定原进程、browser ID、Profile、target、origin、frame、loader、uniqueContextId 和完整 URL；刷新、hash/history、导航须显式重绑，不接替代标签。
- 保留 Profile 的恢复要求原 origin、旧实例停用；资源默认相同，获审源码修改可显式 `--allow-resource-update yes`，记录前后摘要并建立新文档合同。
- Ctrl+C/浏览器退出释放自己的 HTTP 和子进程；保留 Profile、日志、结果。启动失败也有有界退出确认及本地 launch 记录。

启动原语借鉴了 [The Hand 固定 HTTP 代码](https://github.com/102326/DoL-The-Hand/blob/3bb65685b6db1afc5b28cad91662932833da17d4/experiments/TH-E01-script-parse-reuse/run.cts#L182-L225) 的指定文件、loopback、独立实例经验；未将其多轮性能对照脚本当常驻启动器，也没有复制夹具 CSP 限制游戏脚本。

### 共享执行与工具入口

- `action / journey --host chrome --host-file ...` 接入现有执行路径、截止预算和清理；提取当前 Web Action 实现，Android 前台、guard、原生操作语义保留。
- Journey 支持 Web 动作、等待、screenshot、DOM、CSS、Console、Network、storage、environment、web-performance 八类检查点。其他能力记 unsupported，停止后续步骤。
- 动作前持久写保守 Unknown；超时/断连不自动重放。ACK 仍不是业务 Outcome，本地日志不是 Effect Ledger。
- Skill 加入 PC 选路，详细入口及恢复条件见 [PC_RUNTIME](../../docs/PC_RUNTIME.md)。官方工具和原生浏览器仍可按任务使用；普通 Debug 不强制建 Goal。

### 源码查找与 Android 准备

- source-find 长行上下文定位到最早文本命中，新增 Unicode 起始 column，省略号和 truncated 表达不完整性；240 码点窗口不承诺包含完整512码点线索。
- 保留七类通用线索、部分结果/无匹配区分、固定 commit 查询及 Skill/游戏版本独立。
- Android 原型源码包含自身进程/Activity UUID 和可人工递增的计数，测试旋转重建与实例状态。提供固定工具版本及 Windows 构建/部署/对照说明。
- Android 当前只是待编译的生命周期探针源码，尚不是设备代理；未下载 SDK、编译 APK 或连接设备。未把 JVM 实验改称 Android 验收。

## Validated

实际环境：macOS 27.0.1 ARM64；Node 26.13.0、最低版本26.0.0；Chrome 156.0.8078.73；Python 3.9.6；Codex CLI 0.166.0-alpha.6。所有页面均为自建无内容 HTML/JS/CSS，无游戏文本、素材、存档或 Mod 资源。

| 检查 | 实际结果 |
| --- | --- |
| `node --test tests/*.test.cjs experiments/gold-runtime/test/*.test.cjs` | 507 项：506 通过、0 失败、1 项 Windows 专属跳过 |
| 隔离 Python `-m unittest discover -s tests -p 'test_*.py'` | 10 项：9 通过、1 项可选 Pillow 缺失跳过 |
| 最终 Chrome/HTTP/Journey/Action 定向测试 | 36/36 通过 |
| source-find 定向及 CLI | 25/25 通过；已先复现旧长行摘录缺失 |
| `source-finder/build.cjs --check`、`check-types.cjs`、构建回归 | 生成 CJS 与权威 TS 一致；4 个类型负例、2 个构建保护测试通过 |
| 真实 Chrome 可见模式 | 12/12 场景通过，Node 26.13.0 |
| 独立解压包 + Node 26.0.0 + 无头 Chrome | 同一12/12场景通过，无源码树 node_modules 依赖 |
| 归档逐文件验证 | 318 个文件，准确导出集合，每个文件字节对应固定 Git blob |
| 隔离 Skill 安装/resolver/宿主发现 | 安装前0、forceReload后1、独立宿主重启后1；repo scope/enabled，resolver 指向解压包 |
| Android 准备 | Manifest XML 解析通过；无 APK 编译或设备结果 |

Chrome12项：外部资源和观察；单次动作及独立 DOM/测试状态交叉验证；共享 Journey 和八类检查点；断连后原文档显式重连；同 URL reload 拒绝旧绑定；重复 URL 的精确选择且不动干扰页；hash 重绑；预检后同 context URL 交错不点击；关闭原 target 不替代；Profile/origin 恢复与自有存储；副作用后 ACK 丢失只观察不重发；源码修改后保留测试进度、拒绝未审变化并确认实际新版本标识。

复现入口：

```sh
node experiments/tusk-act4-7/pc/verify.cjs ABS_CHROME NEW_OUTPUT visible
PAISLEY_TOOL_ROOT=ABS_EXTRACTED_TOOLKIT node experiments/tusk-act4-7/pc/verify.cjs ABS_CHROME NEW_OUTPUT headless
node experiments/weather-report-20261104/source-finder/build.cjs --check
node experiments/weather-report-20261104/source-finder/check-types.cjs
node --test experiments/weather-report-20261104/source-finder/test/build.test.cjs
python3 experiments/tusk-act4-7/verify-package.py FULL_COMMIT REVIEWED_ZIP NEW_EXTRACT_DIRECTORY
```

本地原始记录位于 ignored artifacts，未上传：`tusk7-node-suite-final.log`、`tusk7-python-final.log`、`tusk7-focused-final-02.log`、`tusk7-pc-journey-visible-02/results.json`、`tusk7-package-floor26-01/results.json`、`tusk7-host-discovery-final.json`。控制台中的旧绑定拒绝是负例预期，不是被忽略的测试失败。

固定开发包：来源 `6bca3dc83d76c17eacf741288d5b0f48d5300a1a`；ZIP SHA-256 `48fafbe96abf65148f84200fb249a2f0754e085e7464fd4f2e4245cb26f4358a`。ZIP 留本机，不发布 Release；[逐文件 manifest](package-manifest.json) 与[脱敏验证摘要](validation-results.json) 随源码保存，可按同一固定提交重新 archive 验货。

[该代码提交 GitHub CI](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/actions/runs/41795639735) 已成功；此前三批推送 CI 也成功。CI 是 Linux 证据，不替代 Windows/Android。宿主发现仅使用 initialize/skills/list，无模型任务、全局安装或 Desktop 当前聊天热重载声明。

## 实验失败与修复

1. 初次真实 Chrome 失败于初始文档尚未就绪；target list 的预期 URL 不等于可用文档。诊断后改成有界等待准确文档证据，旧失败记录保留，没有重试已派发动作。
2. 独立审查确认同文档导航可插在预检和动作之间，uniqueContextId 不足。已加入同 JS 执行内 URL 核验，并以真实 Chrome 确定性交错和单元负例验证。
3. 启动失败终止信号原先未确认退出；现保留启动身份并有界等待，不确定时明确报告。
4. 独立审查复现 Chrome 在启动返回前退出导致 CLI 漏 close、HTTP 残留的竞态。已增加返回前检查、状态查询、注册监听后检查，并有不依赖真实浏览器时序的回归。
5. 独立审查自身有一次 HTTP listen EPERM，属于子代理沙箱限制；没有把该次检查说成通过。主代理获准本地端口环境中的 HTTP/真实 Chrome 检查通过。

## Not validated

Windows Chrome、真实 DoL/Mod 交互与存档、正式 GER 的 Chrome 业务执行、Android SDK/APK/设备、真实游戏衣柜/侧栏/另一类逻辑源码调查尚未验证。源码查找当前证明的是通用算法和合成区域，不是全游戏真实任务质量。

## Known limitations 与下一批工作

- Chrome 尚未接生产 GER/Goal/Session，也未接通标准 Evidence 全入口；目前提供 PC 本地证据和共享 Journey 检查点。这些是实际后续实现，不写成已完成或仅待平台测试。
- 当前 GER 的 Android 原生数据代次/身份校验不能跳过或伪造后挪到 PC。下一批须明确 Chrome 数据域与原回执身份、Runtime target key、对象/context 执行绑定，保留同 Profile pending 围栏；不能直接覆盖历史 ACT4 的较旧合同。标准 Evidence 随同 host 路径整合，不复制新的 Agent Runtime。
- Debug/Journey 没有跨进程业务锁或 exactly-once；按目标串行使用，受保护动作只由一个协调器派发。待定业务不能靠新 Profile、Store 或绑定自动结清。
- HTTP 是内存快照，不热更新；需要重启实例载入新内容。保留 Profile 也保留 Service Worker/Cache Storage，服务端摘要不能证明实际已加载，更新后要查页面自身标识/行为，不静默清缓存。
- Profile/日志不自动删除；强制杀宿主或断电不保证退出清理/持久 fsync。保留并检查原实例身份，不批量杀 Chrome。
- Android 设备端等待/批量观察、代理部署及与 ADB 同设备比较仍待 Windows，采用 Kotlin 与否尚未裁定。SDK/APK 是用户已决定的 Windows 分工，不是本轮等待审批。
- 真实多区域源码质量与人工搜索比较留到获准环境。源码不随工具或 Skill 打包，完整 Source Link 2.0 不作为本轮前置条件。

## 本轮结论

基线盘点和 Mac 首批 PC/共享 Journey、源码上下文、Android 准备、独立包与 Skill 发现达到本轮 Scoped Done。**7.0 整体未达发布验收；下一批继续 GER/标准 Evidence 接线，Windows 负责已约定的真实平台与游戏验收。**

保留用户未提交的私人维护文件。未上传 Profile、SQLite、截图、原始日志、凭据、游戏资源、SDK 或第三方工具归档。
