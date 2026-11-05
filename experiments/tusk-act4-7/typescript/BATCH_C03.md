# TS First C03 — Chrome启动、HTTP与宿主输入

2026-11-05。代码`3e6909fa01a0dfb76868dc4072c3242bd275ff72`，基线`8010b2111cc812cc4aca127a777d6cda5094cf81`。四个新strict模块：chrome-launch、pc-http、pc-session、host-options；共13/95核心入口、14生成产物。仍非整体迁移完成。

## Delivered

保留受控独立Profile启动、PID/endpoint/browser身份、精确页面选择、显式重绑、资源白名单快照、保留Profile恢复、资源更新确认与旧CJS路径。Shared Context直接消费host-options类型。WeakSet中fromTarget创建的记录只承诺target，未伪称包含磁盘OwnedRecord全部字段。捕获报告动作状态有有限类型；Action/DOM/CSS模块尚未迁移，不把它们的require调用冒称已全链strict。

JSON由unknown进入实际校验。修复OwnedRecord摘要数组被正则字符串转换接受的问题，路径和根对象也明确验证实际类型；坏元数据按既有PC_INPUT_INVALID拒绝。合成临时记录用例先RED再GREEN；未改真实用户记录、Store、receipt或原pending。

## Validated

- `build.cjs --check`：13模块/14产物一致；`check-types.cjs`：30负例全部按指定错误拒绝，新增启动mode、digest、资源bytes类型与WeakSet记录不可假定有executable。
- `node --test tests/pc-http.test.cjs tests/chrome-host.test.cjs tests/execution-context.test.cjs tests/chrome-gameplay.test.cjs`：31/31；新增`tests/pc-session.test.cjs`1/1。
- `npm test`：536项，535通过、0失败、1Windows跳过。
- 既有`experiments/tusk-act4-7/pc/verify.cjs`在源码Node26.13.0真实Chrome12/12；固定包最低Node26.0.0父进程加`--no-strip-types`12/12。覆盖真实CLI启动/JS/CSS/Action/Journey、精确选页、reload/hash拒绝、URL竞态、关闭原页、Profile保留、ACK丢失后仅观察、审核资源更新及原合成保存状态。
- 固定提交归档322文件逐一对应Git blob、CRC/导出集合一致；不含CTS或tsc。ZIP SHA-256：`849e7c022a79eea4c0ed49a58e22a6903265610e7e48adfa57f0e1656cb8f8cc`。[逐文件清单](package-c03-manifest.json)、[结果](batch-c03-results.json)。

独立只读审查未发现新增阻断；审查方未独立运行测试。Mac/Chrome环境同[C02](BATCH_C02.md)，原构建4项保护运行体未变，沿用有效证据。

## Not validated / Known limitations

Windows路径/文件占用/Chrome、Android/WebView、真实游戏未验证。运行输出含私人本地路径，只保留在ignored artifacts；公开记录仅合成说明与摘要。Worker不是权限沙箱，连接丢失不证明远端取消。继续Collector、浏览器边界、Action/Evidence与GER等迁移，完整核心TS和真实平台验收仍是7.0发布门槛。
