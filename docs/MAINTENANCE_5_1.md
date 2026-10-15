# Paisley Park 5.1 维护进度

2026-10-15。本轮按开工指令完成工作区检查及第一阶段 P1 + P3；不是完整 5.1 发布验收。尚未改版本号，当前包仍报告 5.0.0。没有远端推送、合并、Tag/Release 或全局安装切换。

## 基线与环境

参考 5.0.0 `607d2807d8735233e986d048849d8b14b23c4f22`；实际开发起点 `99affae8c6545b5ed8cf0493db687c18c33ab813`，后者仅新增 README 改善，没有修复 P1–P6。原 `research/star-platinum-mac` 分支和所有研究文件保留；独立 worktree 分支 `maintenance/paisley-park-5.1`，没有继承 Star Platinum 研究提交。入场工作树干净，无 stash，原工作区未覆盖或重置。

本次重新探测：macOS 27.0.1 / ARM64，Node24.18.0、npm11.16.0、Apple Git2.54.0、Chrome155.0.8059.41；项目只需原锁定 XState5.33.2。测试使用 Node24 与官方便携 Node22.12.0（项目 ignored artifacts 内），未改变系统 Node/PATH。官方归档 SHA256 `293dcc6c2408da21562d135b0412525e381bb6fe150d688edb58fe850d0f3e13` 已与 nodejs.org 同版本 SHASUMS256.txt 核对；初次下载60秒超时，保留部分文件并续传完成，未跳过摘要核验。

`npm ci --ignore-scripts --no-audit --no-fund` 成功；既有 Node 测试入口与 git archive/export-ignore 规范可用，没有现成统一发布构建脚本，P6 沿用原规范而不另造发布系统。

## Delivered / 按工作包状态

| 工作包 | 当前状态与变更 |
|---|---|
| P1 | 已修：GAMEPLAY 的三次无进展规则为 routeHints、不自动封路；Help 拆开 capture/perf/logcat/record，保留 deep 的显式敏感选择；PROJECT_EXPERIMENTS 示例增加 SQLite 参数并引用统一运行前提；安装消息/安装文档/README 不再保证下一回合发现；README 失效升级锚点指向现有数据兼容说明。冻结 Foundation 历史示例未改。 |
| P3 | 第一阶段已修：CLI_OPTION_NOT_APPLICABLE、SKILL_TARGET_EXISTS、INVALID_SKILL_TARGET、ETIMEDOUT 的固定阶段/字段/建议。保留原错误括号格式、原成功命令行为和 unknown fallback；不输出原始异常、路径或私有参数。不重试、不结清 Unknown。安装缺后置源文件/写入失败的分类将结合 P4 的真实后态实现。 |
| P2 | 已定位主 Skill36111字节、入口混合任务细则；未开始移动规则或做六任务路由评估。 |
| P4 | 已确认原安装器先建最终目录、后读取/复制 agents 元数据；半安装修复尚未实施。此次只有输入错误分类与 lstat 保护（已有坏链接也拒绝），不声称已解决中途写入/崩溃。 |
| P5 | 已定位 Worker 普通 evaluate 与 execution-context 强绑定的差别；导航/重建的真实 Integration 调查尚未执行，未预设已出现混采事故。 |
| P6 | 发布规范及现有入口已核对；5.1 独立 ZIP、安装完整验货与真实宿主发现尚未执行。 |

生产 GER/SQLite 模式、预算、fencing、目标绑定、回执与 Effect Ledger 没有修改；未打开真实 Store、私人 Profile 或游戏。普通诊断不新增 Goal 或 GER 依赖。

## Validated

初始 CLI/Skill 基线3项通过。新增行为测试先确认旧代码失败；初次 Evidence 替身遗漏 completed 数组导致测试设置失败，已修正替身完整结构，不把它算产品缺陷或靠重跑掩盖。

在 **Node24.18.0 与 Node22.12.0** 各自运行：

```
node --experimental-sqlite --test tests/cli-errors.test.cjs tests/install-skill.test.cjs tests/diagnostics.test.cjs
node --experimental-sqlite --test --test-name-pattern='settled no-progress' tests/game-goal.test.cjs
```

每个 Node 环境：第一组 **13 passed / 0 failed / 0 skipped**；第二组 **1 passed / 0 failed / 0 skipped**。没有执行或宣称整套产品回归。安装测试只在自有临时目录操作；无进展回归使用自有真实 SQLite 及替身 Android/CDP，覆盖四次重复、恢复、仍可执行与持久提示，不是实机游戏。

seconds 的 capture/普通 perf 拒绝发生在受控 Evidence I/O 前；logcat/record/deep 合法值正确映射到既有 collector 选项。没有访问 ADB、Perfetto 或设备。隐私测试注入 PRIVATE 参数/路径/错误，验证固定输出不泄漏；未知 Session 操作仍显示原阶段和 cause unknown。安装已有目录的 sentinel 保留。

另外验证 help/version/Skill 安装不加载 xstate/node:sqlite/game-runtime；Node22.12 不带 SQLite 参数时 Runtime 给出 GAMEPLAY_RUNTIME_UNAVAILABLE，未创建临时 Store。`node --check`、`git diff --check` 通过；变更涉及文档的36个本地链接/锚点核对通过。独立只读审查未发现第一阶段高优先级问题。

本地原始记录在 ignored `artifacts/5.1/`：stage1-baseline/red/final、no-progress、node22-stage1/no-progress/sqlite-prerequisite 等，不进入发布 payload 或源码提交。

## Not validated / Known limitations

- Windows launcher 真执行、Windows 路径/占用、Android WebView/设备、真实 DoL 未验；本阶段不改这些实现。
- 文件安装成功与 resolver 可执行仍不证明 Agent 宿主已自动发现 Skill。本轮没有全局 Skill 安装或宿主发现验收。
- P4 的半安装失败与竞争/异常中断恢复仍是待修复的已知问题，不因新增输入错误码而消失。
- P2 六任务评估、P5 真实导航调查和 P6 独立包验货属于后续已规划工作；不能用本阶段通过数替代。

## 发布判断

**第一阶段 P1 + P3 范围内完成。整体 5.1 尚未达到 Scoped Done，暂不建议正式发布。** 下一阶段按计划推进 P2，再做 P4/P5 和 P6；需要的 Windows/宿主证据分别记录为发布条件，不把主要研发全部转移到家里，也不提前实现6.0功能。
