# Paisley Park 5.0：C 后续接续与证据导航

2026-10-14，依据用户 C 后续/C-EXT V0.1。当前范围是复核现有真实摩擦，改善按需 Recipe 和已有证据引用；RC.1 完成口径保持不变。本页是结果与导航，不是新的研发计划、记录 Schema 或发布门禁。

## Delivered：C-1 的最小调整

| 真实摩擦 | 本轮调整 | 适用边界 |
| --- | --- | --- |
| 旧离线摘要仍写 C partial、平板待连接；后续平板记录已完成新只读核对。 | Recipe 明确从当前报告找所引用证据，保留各摘要的时段；本页列出旧调查与新观察的不同入口。 | 不覆盖旧摘要，不用新身份追认旧调查。 |
| `original-timeline.json` 总计报告 64 命令/11 失败，`timeline` 实际仅 33 个映射条目/10 失败。 | 分开写聚合总计与筛选映射，停止把它当完整轨迹。 | 总计沿用先前原 turn 复盘；当前仅凭 33 行无法独立重建 64 命令。 |
| RC.1 解压目录位于源码树内，缺依赖验货借到祖先 XState。 | 在安装资料补实际解析路径、独立目录与失败资源关闭清理，Recipe 按需链接。 | 只用于独立安装/缺依赖验货，不加普通 Debug 前置步骤。 |

Skill 已有 development-flow Recipe 短入口，本轮沿用它，没有再加全局规则或修改工具实现。重复读取原日志的收益尚未量化，不报告节省时间或自动接管成功。

## C-2：先读哪份记录

下列名称均是既有文件或标识，不另建 Task/Session ID。原始记录留在本地忽略目录，表中只给可复核的入口与证据边界。

| 要核对的结论 | 先读的入口 | 按缺口追溯 | 不能据此证明 |
| --- | --- | --- | --- |
| 打赏调查证明了什么 | [C 复盘](PAISLEY_PARK_5_0_C_REVIEW.md) 的调查表；`artifacts/c-flow-review/smartphone-evidence-review.json`。 | 原 turn `01a1307f-f613-7543-915f-913c936f5bf6`；同目录 `original-timeline.json` 的映射命令 ID；原案例 `same-time-current.json`、`income-bound.json`、`final-refresh.json`，摘要保留各文件 SHA。 | 旧 helper 的每阶段 Document 连续性、单笔 £10,000 或第三方修复。 |
| 标准 Action 是否启动指定 App | 平板 launch 的 Journey manifest，incident `202a2380-8ce9-492f-a0c7-40d77134e2e4`。 | `artifacts/c-flow-review/tablet-launch-20261014-run/manifest.json`；App 字段采于启动前，启动后身份看下行。 | manifest 入场 foreground=false 不能当启动后状态；launch 不证明业务就绪。 |
| 新观察是否属于同一文档/资源、哪包实际加载 | `artifacts/c-flow-review/tablet-continuity-checks.json`；对应 `tablet-continuity-2026-10-13T16-16-38-299Z.json`。 | 运行 Tools `a41664ff8683f7bbd477493ae1c17f654f0f9ab9`；4 个阶段的前后 target/frame/loader/uniqueContext/timeOrigin、原生身份与 commandTrace；localArtifact、matchingArchive、存储 ZIP/加载资源摘要。 | 新观察不能补旧轨迹；加载资源和 Runtime 存在不证明所有业务通过。 |
| RC.1 包来自哪里、安装是否通过 | [候选收口](CLOSEOUT_5_0_RC1.md)；候选目录的 `artifact-manifest.json` 与 `candidate-validation.json`。 | 源码 `9745caa5ff0fb6e081212c98ceb22201d963b4ee`；ZIP `a6f9fbff95987c137fc473e5e77f808d91f3d65b99653569038e47cb9631072a`；manifest 每文件摘要、validation 的实际结果及日志摘要。 | manifest 不能替代测试结果；本页后续改动不包含在这个固定 ZIP 中。 |
| 初次缺依赖验货为何失败、是否纠正 | 候选目录 `first-missing-check-failure.json` 和 validation 的 `harnessFailure`。 | 原工具 chunk `e8ab18`；实际借用路径、原自有 DB 文件摘要；独立目录的 missing-dependency/installed-candidate 日志。 | 这是条件隔离不足，不是共享 Store 故障；失败记录只有摘录和引用，不冒充完整原 stderr。 |

候选目录为 `artifacts/paisley-park-5.0.0-rc.1-20261014/`。原案例位于原独立 SmartPhone 调查工作区，不复制私有页面、存档或原始会话到公共包。文件名对应本轮实际快照；没有使用 GER Session，也不为关联而创建一个。后续真实 GER 任务沿用其原 Session/attempt 与 Store，不能靠报告换合同结清 Unknown。

## Validated

本轮只读核查现存记录：原案例被摘要引用的文件哈希保持一致；平板接续仍包含 4 个文档/原生身份一致阶段；候选 manifest 与 validation 对应相同固定源码与 ZIP。导航摘要的 SHA 和适用范围记录在本地 `artifacts/c-followup-20261014/validation.json`。

第一次检查误把筛选 timeline 当完整命令列表，断言失败。核查后确认 33 行投影与聚合计数不同，保留失败解释，不增补缺失行；本轮未重新读取完整原会话或重演业务。文档链接、隔离 Skill 的实际 Recipe 路由与格式检查按改动范围执行；原 Runtime、候选验货、A/B/C 实机结果复用，不重复运行无关全量回归。

## C-EXT 与 Not validated

已读取的记录没有出现必须借助额外语义定位、CSS/网络/内存诊断、交互回放或纯函数性质测试才能解决的新缺口。因此 Playwright CLI/MCP、DevTools 深度诊断、rrweb 和 Property-Based Testing 本轮均未触发，不安装新依赖，不构成 RC 阻断。原任务的 Playwright/CDP 使用不是本轮外部工具对照。

新 Recipe 在未来真实任务中能否减少阅读与人工接力，仍为待观察；本轮没有量化收益，也未验证完整 Android Mod 修复、新的 Gameplay 或其它设备。只修已观察的引用歧义，未扩大自动化承诺。

## Known limitations

本页属于 RC.1 后续源码资料，既有 RC ZIP/manifest/validation、独立解压目录和全局 4.0.1 Skill 不变；没有再次打包、推送、正式合并或发布。旧历史摘要保留当时的 partial/pending，当前范围判断以对应后续报告为准。导航提高可查性，不赋予原证据新的证明能力。
