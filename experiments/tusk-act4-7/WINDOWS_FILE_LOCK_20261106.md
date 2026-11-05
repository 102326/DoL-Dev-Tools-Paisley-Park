# Windows：真实文件占用与生成器回滚

2026-11-06（Asia/Shanghai）。**本轮通过，真实 Windows 文件分享模式这一缺口已关闭。** 生成器在目标无法读取或无法替换时拒绝，失败后 133 份旧产物逐字节保持；部分发布后的实际回滚、释放句柄后的生成与检查也通过。没有发现需要修复的生成器产品缺陷。

结果见 [脱敏摘要](windows-file-lock-results.json)。代码固定于 `f49c343f7b0785f12a38e906fe992767834181b0`，基于 `b6833f05b3d9878d6f7aacba40086ed5f29eeb19` 新建专用 detached 工作树。原工作树的产物、已安装包和其它任务资源没有被锁定或用作漂移夹具。

## Delivered

现有五项 G 检查已覆盖完整 Program 漂移、类型拒绝、注入式部分写入/rename 失败与回滚、peer 替换、协作锁和宿主全局隔离；这些不等于真实 Windows 句柄共享语义。

本轮在权威 `tools/typescript/test/build.test.cts` 增加 Windows 专属检查，并通过现有生成器更新对应 CJS。没有改 `build.cts`、生产 Runtime、GER、权限或回执合同。开发说明补充了新测试的 PowerShell 7 前提；其它平台按现有 Node test 的 skip 合同跳过此项。

夹具复用原 G 测试的隔离 Program 和依赖，只在新建 `paisley-build-*` 临时目录复制、漂移 CJS。PowerShell 使用真实 `.NET FileStream` 持有文件；明确收到句柄已打开、分享模式和该句柄读取的 SHA-256 后才运行生成器。没有注入文件系统异常、替换 rename 或依赖固定等待时长。

## Validated

实际环境：Windows 10.0.26340.0、PowerShell 7.6.5、Node 26.12.1、TypeScript 6.0.2。所有命令均在专用工作树执行，没有访问平板、浏览器或游戏。

| 真实条件 | 本次结果 |
| --- | --- |
| `FileShare.None`，只读持有第一份 CJS | 生成器退出 1，真实 `EBUSY open`；释放后核对全部 133 份旧产物字节不变。 |
| `FileShare.Read`，只读持有第二份待发布 CJS | 读取允许，真实替换发生 `EPERM rename`，生成器退出 1；没有 `TS_ROLLBACK_INCOMPLETE`。 |
| 部分发布与回滚 | 第一份 CJS 的文件 ID 已变化，但其内容与失败前旧字节完全相同，证明先前文件实际被替换并回滚，不能只解释成“发布前就拒绝”。其余旧产物也全部不变。 |
| 句柄释放后 | `--write-production` 退出 0，随后的 `--check` 退出 0；成功产物与原有效 Program 内容按 LF 合同一致。 |
| peer 与资源 | 自建 peer 哨兵内容未被生成器清除或覆盖；本轮锁持有者正常退出，临时夹具根目录已删除。删除前核对绝对父目录及本轮目录前缀。 |

新检查首先定向通过 1/1，随后固定提交的完整 G 套件通过 **6/6**。完整套件包含同一新检查，不把两次运行相加成七项独立检查。

另外实际运行：

```sh
node tools/typescript/build.cjs --check
node tools/typescript/check-types.cjs
```

Program 一致性通过：98 个 Node、17 个 DOM-only 源、133 产物。原 117 项加新增既有 8 项，共 125 个类型负例按预期拒绝。原漂移、注入失败、peer 替换和宿主隔离断言均保留，没有为了真实锁测试降低旧保护。

没有改产品行为，因此没有重跑无关的本地完整 Node / Python、PC/GER 或 Android 套件。已有结果按各自提交继续引用；同步后的 GitHub CI 是另一环境，不冒充 Windows 本地结果。

### 首轮失败与修正

首轮定向运行失败在最后的成功恢复比较：夹具从 Windows checkout 复制了 CRLF 文件，生成器成功发布采用既有 LF 合同。测试原先误要求成功重建仍逐字节等于 CRLF 输入，出现断言失败。

修正只作用于**成功发布后的内容比较**，按既有 LF 规范比较；失败、拒绝和回滚路径仍对 133 份旧产物逐字节比较。没有吞掉 EBUSY/EPERM、跳过 Windows 用例、盲重试或遗留临时文件制造通过。修正后的测试还在各阶段输出原生错误和句柄证据，保留原首轮失败日志。

### 清理与证据

定向通过和完整套件两轮中记录的四个锁持有者均已通过子进程 close/退出断言；后续 PID 检查也未见存活。两个对应夹具根目录均不存在，测试收尾没有清理失败。首轮失败的收尾也未报告资源关闭/删除错误。专用工作树与原始日志有意保留，不是仍持锁的临时夹具。

原始 TAP、完整原生错误、路径、PID、文件 ID、摘要及清理记录留在该工作树忽略的 `artifacts/windows-filelock-20261106/`，只提交脱敏摘要。不结束其它 PowerShell/Node 进程，不递归清理用户目录，没有打开任何 Profile、SQLite 或旧 Unknown。

## Not validated / Known limitations

本次证明可观察到的读取/rename 拒绝和已知失败回滚。现有合同仍是单文件 rename 加尽力回滚，**没有断电、多文件持久事务或任意第三方并发写入的原子性承诺**。peer 变更的原有拒绝/保留备份检查仍独立存在；不以本次真实锁通过扩大这些保证。

没有使用最低 Windows Node 26.0.0，没有下载安装 Node、改变 PATH 或系统版本。macOS 的最低版本证据和本次 26.12.1 结果都不能计作 Windows 26.0.0 通过。设备、历史原回执和其它游戏组合继续保留原未覆盖状态。

## 后续范围

在当前已有输入和权限下，本轮未发现其它必须继续补的无设备检查；无需追加全设备/全业务矩阵。原清单中的真实 Windows 文件占用项现已关闭。

最低 Node 是单列的新运行时输入，后续可按下面方案准备，**本轮未执行**：

1. 从 [Node 26.0.0 官方发布目录](https://nodejs.org/dist/v26.0.0/)取得 `node-v26.0.0-win-x64.zip`。官方发布页列出的 SHA-256 为 `d0418640a36096e00bddb57761aa0b1b98f91904ec4ed2b9dd75cbad723becd7`；先与下载字节比对，再解压到本轮自有新目录。[官方发布说明与摘要](https://nodejs.org/en/blog/release/v26.0.0)
2. 不使用 MSI、不改全局 PATH。始终用新目录下 `node.exe` 的绝对路径，先确认 `--version` 为 `v26.0.0`，记录 ZIP 和运行入口身份。本轮只核对了官方网页的摘要，没有下载二进制或验证 PGP 签名。
3. 用该入口运行当前 Program 检查、G6，以及固定独立包的 CJS help/version、resolver、XState/SQLite 和现有无头 GER 代表夹具。只有新的实际差异才升级验证，不把 26.12.1 或 Mac 结果挪用过来。

Android 当前 TS 的文档替换、原回执与原生资源身份接缝需要实机阶段；真实 CRLF / 旧 Session 需其原输入和合同。用户新给出的设备空闲授权仍保留，本轮按无设备安排没有操作它。F07 / 后台截图根因仍 Unknown。正式候选收口与合并、版本、Tag、Release 继续按后续明确阶段办理。
