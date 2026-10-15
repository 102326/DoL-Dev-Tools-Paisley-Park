# Paisley Park 5.1 Windows 验收记录

2026-10-15。本轮已完成约定的 Windows 验收，未发现剩余阻塞。范围是 5.1 安装器、CLI、独立包和选定 Codex 宿主，不包含设备或真实游戏测试。原 Mac 记录继续保留，未计入以下 Windows 结果。

## Delivered

从 GitHub `test/paisley-park-5.1` 获取源码，在独立工作树 `E:/daima/DoL/experiments/Paisley-Park-5.1-Windows` 的 `test/paisley-park-5.1-windows` 分支验收，没有覆盖原工作区。基线为 `6f29ae4954ed9874e41ad4f9f7810f74900482a6`；Windows 修复提交为 **`7309e273ad22a773d10c232fd9068202437409d4`**。

本轮修复 Windows Node 22.12 下安装器误判文件归属的问题，新增身份差异回归和真实文件占用测试。生产修改仅在 `scripts/lib/install-skill.cjs`，没有修改 GER、SQLite schema、资源代次、回执、预算、Android 绑定或历史 Unknown。测试使用自有目录、合成数据和临时 SQLite；没有读取私人游戏数据。

文档收口另行更新本记录、维护说明、安装说明和候选公告；下面 ZIP 固定于上述修复提交，不包含之后的文档收口，也不是待上传的正式发布包。

## 问题与修复依据

首次最低 Node 定向运行保留为 **19 passed / 4 failed / 1 skipped**。四项失败涉及 CLI 写入错误分类、暂存写入撤销、并发目标创建和发布失败撤销；不是游戏业务断言失败。

独立文件探针确认：Node 22.12 在 Windows 对同一文件的 `fstatSync(fd).dev` 返回实际设备号，`lstatSync(path).dev` 返回 0，关闭句柄后差异仍在。原安装器记录前者、清理时比较后者，因此把自己刚写入的文件误判为外来文件，返回 INCOMPLETE。相同探针在 Node 24 没有该差异。

修复后，文件身份的记录与比较统一使用 descriptor stat，并使用 BigInt 保留完整文件 ID；检查句柄在 finally 中关闭。目录仍使用路径 stat 对比。没有忽略 dev/ino、删除内容校验、吞异常或引入重试。

新增回归分别证明：

- 路径 stat 的 dev 与 descriptor 不同时，自己的未改文件仍能撤销，错误分类正确，正常安装清理暂存成功。
- Windows 子进程以 FileShare.None 独占真实发布文件，读操作确实被系统拒绝。撤销返回 INCOMPLETE，保留文件和暂存硬链接，SKILL.md 未出现；释放并等待子进程退出后，可向新父目录正常安装。
- 完整安装的 SKILL.md 被独占时，再次安装仍拒绝已有目标，不覆盖原文件。释放后字节和 resolver 保持正确。

原有缺源、部分写入、各发布阶段失败、并发创建、陌生文件、外部截短、入口发布前真实子进程中断及换目录重试，也在本次 Windows 套件中执行。没有通过跳过失败、永久保留自有测试垃圾或盲重试制造通过。

## Validated

环境：Windows NT 10.0.26340.0、PowerShell 7.6.6、Node 24.19.0 / npm 11.17.0、Python 3.14.7；另用官方校验和核对的便携 Node 22.12.0。测试临时目录位于 C: NTFS，独立 Tools 和项目 Skill 位于 E: NTFS，路径包含中文与空格。没有修改全局 Node/PATH 或安装不必要的工具链。

| 本轮实际运行 | 结果 |
| --- | --- |
| 修复后 Node 24 `npm test` | **429 passed / 0 failed / 1 skipped**，430 项；跳过的是 macOS 专属权限用例。 |
| 修复后 Node 22.12 定向套件 | **24 passed / 0 failed / 1 skipped**，25 项；同一 macOS 专属跳过。 |
| 独立 ZIP 内 Node 22.12 再执行同一定向套件 | **24 passed / 0 failed / 1 skipped**。 |
| Node 22.12 `settled no-progress` 临时 SQLite 回归 | **1 passed / 0 failed**；目标是替身，不是游戏。 |
| Python unittest，当前 5.1 源码 | **3 passed / 0 failed / 1 skipped**；可选 Pillow 未安装。复用已存在的隔离 Python 依赖环境，不复用旧测试结果。 |
| 两个 Windows launcher | DoL-Dev.cmd、Paisley-Park.cmd 各自在 Node 24 / 22 下执行 version/help，共 **8 组通过**，返回 5.1.0 和对应 Help 首行。 |
| 独立包依赖与安装 | 无 XState 时 help/version 可用，Gameplay 在创建 Store 前拒绝；按锁 npm ci 后解析到包自身 XState 5.33.2。项目 Skill 安装、manifest、resolver、临时 schema 2 Store 打开/关闭/清理通过。 |
| Node 22.12 不带 SQLite 参数 | 在创建自有 Store 前返回 GAMEPLAY_RUNTIME_UNAVAILABLE；未碰旧 Store。两个 launcher 已包含该参数。 |
| 真实 Windows 宿主 | Codex CLI 0.162.0-alpha.17.2 新进程发现项目级 5.1 Skill，读取、resolver、CLI version/help 四条实际工具命令均 exit 0。 |
| 文档链接与锚点 | 工作树 29 份入口/任务文档、178 条本地链接，以及固定 ZIP 中对应 28 份文档、171 条本地链接均通过；不包含外网链接可用性验证。 |

定向套件命令：

```text
node --experimental-sqlite --test tests/install-skill.test.cjs tests/install-skill-failures.test.cjs tests/cli-errors.test.cjs tests/integration.test.cjs
node --experimental-sqlite --test --test-name-pattern='settled no-progress' tests/game-goal.test.cjs
python -m unittest discover -s tests -p 'test_*.py' -v
```

宿主使用 `codex exec --ephemeral --sandbox read-only --skip-git-repo-check --json -C <本轮隔离项目>`，保留用户默认模型和既有认证。提示未提供 Skill 或 Tools 路径，并禁止目录搜索、设备、浏览器、Gameplay 及改文件。实际事件显示它读取项目安装的 SKILL.md，再调用该副本的 resolver 和独立 Tools 入口；解析到 5.1.0。没有只凭模型自述认定通过。

现有全局 4.0.1 Skill 未替换，Windows 未另跑负对照。宿主日志有 PowerShell snapshot 不支持、其它 Skill 图标路径和模型列表刷新超时提示；本次四条工具命令及宿主进程仍全部 exit 0，未修改配置隐藏这些提示。该结果证明这一个宿主版本在新进程中发现并调用项目 Skill，不保证桌面 GUI 热更新、同名 Skill 的通用优先级、其它宿主或所有自然语言提示的触发率。项目扫描与命令参数参见 [官方 Skills 文档](https://learn.chatgpt.com/docs/build-skills)及[非交互运行文档](https://learn.chatgpt.com/docs/non-interactive-mode)；通过依据是本轮本地工具事件。

### 独立包身份与本地证据

| 字段 | 值 |
| --- | --- |
| ZIP | DoL-Dev-Tools-5.1.0.zip |
| 固定源码 | `7309e273ad22a773d10c232fd9068202437409d4` |
| ZIP SHA-256 | `33b8d90e3904354285eb1a315ec4d5cf1b23be6c719f862625c05dc3de981f63` |
| 大小 / 文件数 | 775364 bytes / 262 个文件 |
| 来源核对 | git archive；每个文件与固定 Git blob 相同或仅经过现有 Git 配置的 LF→CRLF 转换，33 个 export-ignore 文件排除。 |

逐文件摘要、ZIP、官方 Node 校验资料、原始失败、文件身份探针、完整通过日志、宿主 JSONL 和验证结果均保留在本工作树的 ignored `artifacts/windows-acceptance-20261015/`。ZIP 与 manifest 位于其 `package/` 子目录。未将本轮完整宿主输出、安装位置记录、测试 Profile/Store、node_modules、便携 Node 或私人材料放入包。

宿主原始输出含本机上下文，只留本地；本记录仅保留验收相关事实。Windows 补验结束时没有远端写入、正式合并、Tag 或 Release，也没有切换全局 Skill；修复代码与测试已本地提交，四份文档收口当时保留为工作区变更，未纳入上述修复提交或验货 ZIP。

## Not validated

Android、真实 DoL、其它浏览器或 Agent 宿主、GUI 热更新、本轮 Mac 修复回归，以及 NTFS 以外、网络盘等文件系统未验证。Python 可选图像用例跳过。未执行完整 Node 22 套件；最低版本实际覆盖上述受影响安装/CLI/Integration 与临时 SQLite 路径。

未改变的 Integration 生产代码及顺序观察合同，复用 [Mac 三场景证据](MAINTENANCE_5_1.md#p6-独立包与真实宿主)及其原范围；本轮没有启动 Chrome，不把历史浏览器结果计入 Windows 通过数。

## Known limitations

安装依赖本地文件系统 hard link 支持；不支持时安全失败，不降级。归属/字节检查与 unlink/rmdir 不是原子事务，仍不抵御同权限进程在检查后持续替换路径。真实文件占用可能留下须保留的 INCOMPLETE 现场；这属于明确失败后态，不应谎报全部清理。没有断电事务保证，新清单也不是来源签名。

**本轮 Windows 补验达到 Scoped Done。** 5.1 现在有 Mac 与 Windows 各自注明范围的验收依据。用户随后于 2026-10-15 授权进入 GitHub 发布阶段；正式发布包将从包含文档收口的最终提交生成，以 v5.1.0 与其 Release 随附清单核对，不覆盖上述验货 ZIP。未修改的运行行为复用本记录中的有效结果。附加设备、文件系统和宿主覆盖不自动成为当前阻塞项。
