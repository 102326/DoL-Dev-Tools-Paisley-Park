# 固定 revision 源码查找：Mac 性能修复与接续

日期：2026-11-06。范围：已授权的研发分支继续开发，不是正式发布或全游戏源码验收。

## 身份与结论

- 分支：`experiment/tusk-act4-7`，仓库：`102326/DoL-Dev-Tools-Paisley-Park`。
- 本机从 `8670318c3947ffd0496582c28c0dfc7ebc3e0074` 安全快进至 Windows 接续基线 `8a0b4263f10dd3804f0eefcd7218c06641689664`，0 个本地独有提交、15 个远端新增提交；没有重置或覆盖私人草稿。
- 本批固定代码：[`d5b3c584a9edc32d501e52d9c7bc3b512949dc67`](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/tree/d5b3c584a9edc32d501e52d9c7bc3b512949dc67)。[变更范围](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/compare/8a0b4263f10dd3804f0eefcd7218c06641689664...d5b3c584a9edc32d501e52d9c7bc3b512949dc67)。本报告及清单在代码提交之后加入。
- **本批达到 Scoped Done**：固定 revision 的逐文件 Git 进程开销已在纯合成仓库复现并修复；结果身份、候选、预算和失败语义有定向回归。不能据此宣布真实游戏全仓性能或整体 7.0 可发布。
- 环境：macOS 27.0.1、ARM64，Node 26.13.0；独立归档另用最低 Node 26.0.0、关闭类型剥离验证。Git 2.54.0 (Apple Git-157)，TypeScript 6.0.2。

## Delivered

Windows 的[接续报告](../WINDOWS_REPORT.md)明确保留了固定 revision 全仓查询因耗时未交付结果的卡点。本机没有取得游戏源码，而是在 512 个不同 blob 的中性仓库复现：旧实现默认 10 秒超时，退出 `SOURCE_TIMEOUT`，已启动 861 次 Git 调用。另将旧实现的请求时间放到允许的 60 秒内，取得完整结果作对照，没有提高产品默认超时。

生产修改只有 `scripts/lib/source-find.cts` 及其生成的 `.cjs` / `.mts`：

- `ls-tree -l -z` 一次取得所选 commit 的文件对象及大小；合格文件的内容改为 `cat-file --batch` 读取，避免每文件分别启动大小和内容进程。
- 每批最多预看 128 个剩余文件尝试，普通批次内容预算 1 MiB；单个更大合格文件允许独立读取，仍不能超过请求剩余字节。预取时重复文件也计入预算，传输可以去重，但统计和扫描仍逐文件计算。
- Git 输入仅使用已从固定树记录验证的十六进制对象 ID。回包按字节长度解析，检查对象 ID、blob 类型、大小、分隔符及尾部；正文中的换行、NUL 和 UTF-8 不参与协议分帧。
- 缺失对象或异常回包保留 `file-unreadable` / partial；取消和请求期限继续生效。stdin 写入错误仅终止本次拥有的 Git 子进程，不回显原始异常。
- 没有改变 CLI / Schema、候选排序、Unicode 位置、摘要、工作树路径、默认预算、replace refs 禁用或固定 commit 合同；没有新索引服务、依赖或源码下载入口。

新增 [7 项回归](../../../tests/source-find-revision.test.cjs)：多 blob 的有界进程数和准确候选、文件/字节预算及重复 blob、大文件窗口、6 类畸形帧、缺失对象与后续有效对象、活动批次取消、stdin 失败的子进程归属。已有源码查找和 CLI 测试直接复用。更新 [GAME_SOURCE](../../../docs/GAME_SOURCE.md) 说明读取行为。

## Validated

### 修复前后

| 检查 | 旧实现 | 新实现 |
| --- | --- | --- |
| 默认 10 秒，512 个合成文件 | 约 10.014 秒 `SOURCE_TIMEOUT`，861 次 Git 调用 | 完整成功；公开对照运行约 0.176 秒，9 次调用 |
| 同一夹具、两者均允许 60 秒 | 约 13.329 秒，1,029 次调用 | 约 0.206 秒，9 次调用 |
| 完整结果 | 512 文件、1 候选 | 与旧实现完整结果 deep-equal，包括身份、摘要、位置、上下文、统计及 partial 原因 |
| 确定性回归负对照 | 160 个不同正文加其他合格文件时，331 次调用，进程上界断言失败；批量预算测试亦按预期失败 | 对应断言及其余定向测试通过 |

[公开对照记录](comparison.json)绑定两份模块的 SHA-256。它是一台 Mac 的一次顺序测量，缓存、系统负载及 Git 实现会影响耗时；进程数下降更直接地证明本次改动去掉了什么开销。不能把该比例推广为所有仓库或实际游戏的提效结论。

正式 CLI 另查询工具自身的固定 `8a0b426` commit：完整读取 796 个合格文件、7,422,768 字节、44 个 `findSource` 候选，无 partial 原因。未查询私人草稿或真实游戏源码，成功结果中的本地路径和源码上下文留在本地。

### 实际命令和结果

在固定代码对应工作树：

```sh
node tools/typescript/build.cjs --write-production
node tools/typescript/build.cjs --check
node tools/typescript/check-types.cjs
node --test tests/source-find.test.cjs tests/source-find-revision.test.cjs tests/source-find-cli.test.cjs
node --check experiments/tusk-act4-7/source-find/compare.cjs
```

- 完整 Program 生成一致性通过：98 个 strict Node 模块、17 个 DOM-only 模块、133 个产物。
- 类型合同负对照通过：117 个既有和 8 个新增边界错误被拒绝；这些类型负对照来自既有工具，本批没有另加类型错误用例。
- 定向 Node 测试 **32 通过 / 0 失败 / 0 跳过**，包含上述 7 项新增回归。修复前的两项预期失败单独记录，不混作最终通过数。
- 本批未在 Mac 重跑无关的 GER / Chrome / Android / Python 套件；这些生产模块未改，沿用各自固定提交的既有证据。远端 CI 的全套结果另按其运行 SHA 确认，不能用本地 32 项替代。

公开合成对照可复现；`REVIEWED_TEMP` 指已有且获准的独立临时目录，两份模块都是将被执行的代码，应先确认来源：

```sh
git show 8a0b4263f10dd3804f0eefcd7218c06641689664:scripts/lib/source-find.cjs > REVIEWED_TEMP/before.cjs
node experiments/tusk-act4-7/source-find/compare.cjs REVIEWED_TEMP/before.cjs scripts/lib/source-find.cjs
```

驱动只创建和清理自己的中性临时仓库，不下载游戏；stdout 只给摘要，不输出临时路径和正文。协议依据是 Git 官方 [ls-tree](https://git-scm.com/docs/git-ls-tree) 与 [cat-file](https://git-scm.com/docs/git-cat-file) 文档；没有新增浏览器或设备工具包装。

### 独立包

```sh
git -c core.autocrlf=false -c core.eol=lf archive --format=zip --prefix=Paisley/ --output=REVIEWED_ZIP d5b3c584a9edc32d501e52d9c7bc3b512949dc67
python3 experiments/tusk-act4-7/verify-package.py d5b3c584a9edc32d501e52d9c7bc3b512949dc67 REVIEWED_ZIP NEW_EXTRACT_DIRECTORY
cd NEW_EXTRACT_DIRECTORY/Paisley
NODE_26_0 --no-strip-types --test tests/source-find.test.cjs tests/source-find-revision.test.cjs tests/source-find-cli.test.cjs
NODE_26_0 --no-strip-types .agents/skills/dol-dev-tools-paisley-park/scripts/resolve.cjs
NODE_26_0 --no-strip-types scripts/dol-dev.cjs --version
```

归档解压在源码树之外的新目录；逐文件 [manifest](package-manifest.json) 的 **432 个文件**与固定 Git blob 及 export-ignore 集合一致，ZIP CRC 通过。ZIP SHA-256：`f63906a51f3d54a38819e00fb8755a3d5621253ff49d11216b22caec7ce12a46`。原始 ZIP 保留本地，不作为 Release 上传。

最低 Node 26.0.0、关闭类型剥离，包内同一组测试 **32/32、无失败或跳过**；resolver 指向独立包，版本仍是未改号的 `6.1.0`。包没有安装 node_modules 或编译器依赖。另以包内正式 CLI、清除 NODE_PATH / NODE_OPTIONS、默认预算查询同一 512 文件合成 revision，完整成功、512 文件、39,606 字节、1 个准确候选、退出 0。不是从源码树借用依赖运行。

本批不重新安装全局 Skill，也没有重新验证宿主发现；Skill 及 resolver 生产代码未变，既有独立宿主记录保持其原证据范围。resolver 可运行不被写成新宿主发现结论。

## Not validated

- 本批新的 Git 批量实现尚未在 Windows Git / 文件系统运行；Windows 最低 Node 26.0.0 也仍未补验。此前 Windows 新 TS 的代表性 Chrome、真实保存恢复、导航 Scope 和文件占用通过范围见对应报告，不被本批 Mac 结果取代。
- 当前真实游戏版本的全仓固定 revision 查询、非商店候选质量和实际耗时；旧版本局部命中不能代替当前版本覆盖。
- 本批没有 Android 设备、SDK / APK 构建或真实游戏运行；也没有重新验证 Chrome / GER。
- 超大仓库、损坏/缺失 Git 对象、特殊 Git 配置的所有组合未实测。有限畸形回包由定向注入证明失败处理，不冒充真实磁盘损坏验收。

## Known limitations 与下一步

- 固定 revision 仍受原有枚举、字节、文件、候选和协作式时间上限约束；批量读取不会使 partial 变成完整，也不保证所有全仓查询都能在默认期限完成。协议错误时整批有效正文也可能暂不采用，以 partial 保留不确定性。
- 本批只解决进程启动开销；不是运行现场到源码的精确映射，也没有实现 Source Link 2.0 或自动跨版本索引。
- F07 初始空文档的历史物理原因、后台截图原因仍按原报告保留 Unknown；没有为本批加等待或焦点 workaround。
- Android 原 Store 的四条未决效果、文档代次和原资源身份差异保持原合同。没有读写该 Store、重放、清 pending 或换 Store 结清。新业务的原资源绑定阻断不因 Mac 源码查找通过而解除；合法旧 terminal 的恢复仍按原 attempt/nonce/合同及账本 fences 判断。
- `DoL Dev Tools — Gold Experience（黄金体验）` 的展示名在 7.0 正式收口落实；本批不改仓库、内部标识、正式版本或历史名称。

Windows 接续时先同步并核对实际 SHA，运行本批 32 项定向测试，再用获准的实际源码目录和已核对版本/commit复验原固定 revision 卡点。记录实际扫描规模、limits、完整/partial、候选质量和耗时；不为了得到 complete 自动放宽限制或更换源码。其余真实平台验收依 [现有任务书](../../../docs/HANDOFF_TUSK_ACT4_7_WINDOWS.md) 及最新 Windows 报告去重安排。

本批仅提交和同步现有研发分支；main、Tag、Release、版本号和用户数据未变。私人未跟踪草稿及原始路径/结果留在本地，未进入提交或归档。
