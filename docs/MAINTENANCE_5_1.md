# Paisley Park 5.1 维护与验收记录

2026-10-15。独立分支 `maintenance/paisley-park-5.1`，参考 5.0.0 `607d2807d8735233e986d048849d8b14b23c4f22`；开发起点 `99affae8c6545b5ed8cf0493db687c18c33ab813` 仅多一项 README 改善。原研究分支和未相关工作保留，没有重置、清理 Unknown、全局安装切换或远端推送。本地候选版本为 **5.1.0**，不是正式发布。

## Delivered

| 工作包 | 实际交付 |
|---|---|
| P1 | GAMEPLAY 的三次无进展改为真实 routeHints 语义，不自动封路；Help 区分支持 seconds 的采集器；Node22 SQLite 示例补齐；安装后不再保证下一回合自动发现。保留冻结历史语境。 |
| P2 | 主 Skill 从36111缩到8261字节，先选 Debug、Action/Journey、源码构建、GER、安装排障等路径。49段任务规则迁入现有权威文档，身份、授权、Evidence、Unknown 与恢复规则仍在。六个固定提示的静态前后评估见 [路由记录](SKILL_ROUTING_5_1.md)，不是成功率基准。 |
| P3 | 已知输入错误提供固定 code/stage/field/advice，未知错误不猜根因；timeout 不当成设备故障或撤销。新增安装缺源/失败/不完整分类。不泄漏原始异常、路径或参数，不自动重试副作用。 |
| P4 | 必要源完整预读、同父目录隔离暂存、字节核验、exclusive mkdir/硬链接发布，SKILL.md 最后出现。新完整性清单由 resolver 验证，旧无清单安装兼容。按 inode/字节撤销自己文件，保留陌生或已修改资源；失败与中断可从新父目录重试。见 [安装合同](SKILL_INSTALL.md#安装失败与重试)。 |
| P5 | 真实隔离 Chrome 证明 detect/collect 可跨导航和同 URL 刷新。现有结果声明顺序观察，未承诺单文档事务；补齐 [文档归属边界](INTEGRATIONS.md#顺序观察与文档归属)，没有制造不必要的新绑定层。新增可选择执行的浏览器夹具。 |
| P6 | 版本/锁文件为5.1.0，XState仍锁5.33.2。固定提交ZIP262文件逐一对应Git blob，195条包内文档链接/锚点通过；独立目录缺依赖拒绝、安装后回归及真实Codex宿主发现通过。未发布或替换全局安装。 |

主要生产修改是 CLI Help/错误分类、Skill 安装器与 resolver。GER/SQLite schema、预算、fencing、目标身份、回执、Effect Ledger 及旧 Unknown 合同未修改；普通 Debug 不新增 Goal 锁。Android 强绑定及 Integration 生产代码未修改。没有增添外部依赖或6.0能力。

P4 比较了完整预检与隔离暂存：预检消除缺源后态，却不能消除后续写入失败，因此选暂存。实际 Mac rename 能替换其它进程创建的空目录，不能用它承诺不覆盖，最终采用 exclusive mkdir 与 hard link。不是目录事务或断电保证；不支持 hard link 的文件系统安全失败。入口发布后崩溃可能已安装但未返回成功，先核验，不盲目重装。

## Validated

环境为 macOS27.0.1 ARM64、Node24.18.0/npm11.16.0、Apple Git2.54.0、Chrome155.0.8059.41/CDP1.3、Python3.12.14。最低 Node22.12.0 使用官方便携归档，SHA256 与官方 SHASUMS 核对，没有修改全局 Node/PATH。项目安装仅 `npm ci --ignore-scripts --no-audit --no-fund`。

| 实际命令 | 结果与范围 |
|---|---|
| `npm test`（Node24，含 experimental-sqlite） | 427 passed / 0 failed / 0 skipped。首次沙箱运行426通过、1项 workshop-origin 因 loopback listen EPERM 失败；保留失败，授权本地夹具端口后原命令427全过，未改产品掩盖失败。 |
| `node --test tests/install-skill.test.cjs tests/install-skill-failures.test.cjs tests/cli-errors.test.cjs` | 18 passed / 0 failed / 0 skipped，实际 Mac 临时文件系统。 |
| Node22.12 `node --experimental-sqlite --test tests/install-skill.test.cjs tests/install-skill-failures.test.cjs tests/cli-errors.test.cjs tests/integration.test.cjs` | 22 passed / 0 failed / 0 skipped。 |
| `python -m unittest discover -s tests -p 'test_*.py'`（Python3.12.14） | 4项：3 passed、1 skipped（Pillow缺失），不是4项全通过。 |
| `DOL_TEST_CHROME=<已核对Chrome> node tests/integration-document.browser.cjs` | 3/3：稳定文档、detect后导航、同URL刷新。自有临时Profile/loopback夹具，无游戏资源；浏览器及服务器关闭。 |

初期 Node24/22 各自的13项 CLI/诊断与1项真实临时 SQLite 无进展测试也通过；后者使用替身目标，不代表 Android/游戏。Node22不带SQLite参数时在创建Store前正确拒绝。P2独立审查确认49/49规则保留、111条本地链接/锚点有效。

安装故障回归覆盖缺少后置源文件、五处部分写入、五处发布失败、并发目标创建、权限拒绝、陌生文件、外部截短文件、真实子进程在入口发布前退出及换目录重试。独立审查发现的撤销误删外部截短文件问题，先红后绿补回归；仅未完成的本轮写入允许按部分字节识别，已完成文件要求完整字节一致。未递归清理未知目录。

## P6 独立包与真实宿主

验货源码固定为 `0ad62c28a5f96f057b137a30ff9f8cae0135cd34`。按 [RELEASE_PACKAGE](RELEASE_PACKAGE.md) 从该提交 git archive；262个文件逐字节对应Git blob，33个历史/内部计划文件按export-ignore排除。LICENSE、锁文件、正式入口与必要实验测试资源保留。无node_modules、Profile、SQLite/存档、截图、原始测试输出、便携Node或第三方下载归档进入payload。新增代码/文档及提交差异经过路径与敏感数据检查，测试中只有合成数据。

独立解压至源码树以外的自有临时目录。createRequire确认无候选或祖先XState，help/version仍成功；有效合成Session link触发GAMEPLAY_RUNTIME_UNAVAILABLE，Store不存在。初次用不存在Goal探测时先触发本地记录错误，不能证明依赖拒绝；已修正输入并保留此区别。随后仅在候选目录按锁npm ci，确认XState5.33.2解析至包自身node_modules。独立包执行：

```
node --experimental-sqlite --test tests/install-skill.test.cjs tests/install-skill-failures.test.cjs tests/cli-errors.test.cjs tests/integration.test.cjs
node --experimental-sqlite --test --test-name-pattern='settled no-progress' tests/game-goal.test.cjs
```

分别22/22、1/1通过。后一项确实使用本轮临时SQLite，包含恢复与持久化提示，目标仍是替身。安装到新的项目级 `.agents/skills`；版本/位置解析正确，旧配置、全局Skill和Store未修改。

真实宿主为 **Codex CLI 0.162.0-alpha.17.2**，新 `exec --ephemeral --sandbox read-only` 进程。负对照自动Skill目录没有该Skill；正对照从本轮项目自动目录发现，提示未提供Skill或Tools具体路径、禁止目录搜索。实际工具事件依次读取已发现SKILL.md、运行其resolver、调用解析出的CLI `--version`/`--help`，全部exit0、根目录匹配独立候选、版本5.1.0。原始事件保留本地，没有把模型自述或resolver单独成功当宿主发现证据。宿主有既有状态/元数据警告但测试exit0；不修改宿主配置来消除警告。

这证明该Mac宿主版本的新进程项目级发现与调用，不证明桌面GUI热更新、其它Agent宿主或所有自然语言提示都自动触发。项目级扫描规则参见 [官方Skills文档](https://learn.chatgpt.com/docs/build-skills)，临时只读运行参见 [非交互运行文档](https://learn.chatgpt.com/docs/non-interactive-mode)；实际通过依据是本轮事件记录。

后续收口只更新说明/验收记录，生产代码、锁文件和Skill字节保持上述验货提交一致。最终本地ZIP/manifest随最终提交重新生成并核对源码字节；摘要写在包外，避免自引用。验货记录区分行为验货提交与文档收口提交，不将较早ZIP摘要当作新ZIP摘要。

## 本地提交记录

| 提交 | 范围 |
|---|---|
| `ba54aad11618ce588c18596db8c4795b0cebde33` | P1/P3：指令一致性与已知错误。 |
| `037a67d4de32b4cab3ebffed403223f13fc0dc52` | P2：任务选路、完整规则迁移。 |
| `5b9d258153977f96cd5e3393730b0de930d90f74` | P4/P3：暂存安装、完整性与失败恢复。 |
| `78e63f32d412258ba9c8a33ff2f2dfa6eae7ef3b` | P5：真实Chrome夹具及顺序观察边界。 |
| `0ad62c28a5f96f057b137a30ff9f8cae0135cd34` | P6：本地5.1.0候选与导出。 |

## Not validated

Windows launcher 真执行、Windows路径/占用/硬链接与异常恢复；Android CLI、Android WebView实机及真实DoL Gameplay未验证。Mac并不替代这些验收。Python可选Pillow用例跳过。六任务路由是静态人工/独立审查，不代表所有模型和提示的动态触发率。

## Known limitations

安装不具备全目录原子事务或电源故障保证；异常中断可能保留自己与未知资源。新清单只证明本地完整性，不证明来源可信。保留不明残留、从新父目录重试；不自动覆盖旧安装。

Integration多次采集是顺序观察，manifest/envelope、URL相同及集成版本均不证明同一文档代次。导航期间依赖跨观察连续性的消费者必须自行重新核对身份，不能把这些输出当原子业务快照。

本地原始测试记录、浏览器输出、便携Node与未来包验货材料位于ignored artifacts；不进入Git/发行payload。所有夹具均为合成无游戏内容数据。

## 交付与发布判断

**P1–P6在本次Mac范围达到Scoped Done。暂不建议直接正式跨平台发布。** 必须补Windows安装器新流程的路径、文件占用、hard link支持、并发创建与中断后态定向实测，并实际调用两个launcher。Mac结果不能替代这些证据。

Android目标绑定及Gameplay生产代码未改，本轮未作设备/真实游戏验收，不把既有历史实机证据计作新通过数。若Windows定向验收发现问题，修复后重跑受影响检查，再评估正式发布。当前没有额外在Mac可推进而未完成的必要实现；不擅自实现6.0能力。远端推送、Tag和Release均未执行。
