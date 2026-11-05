# 当前 TS 基线：Windows 真实 DoL 原生保存验证

2026-11-06（Asia/Shanghai）。**本次真实保存闭环通过。** 在全新空白 PC Chrome 环境中，生产 GER 执行一次原生保存，Effect 结清，独立读回一致，最终 Session 为 Completed。没有修改生产代码，也没有操作 Android。

## Delivered

固定运行提交为 `b175c8e0f3bd4f942961554557230b77b947c970`；其中受验代码仍来自 `cd28b0aba280f986145378d2d5c86b4ee853b5a7`。这是 TS 迁移后的新运行，与 [Windows 接续记录](WINDOWS_REPORT.md)中的迁移前真实游戏实验分别记录。脱敏结果见 [验证摘要](windows-ts-real-save-results.json)。

本轮使用获准的 DoL HTML、新建的 headless Chrome Profile、未复用的 loopback origin、新 SQLite Store 和新 Evidence 目录。没有复制已有存档或 Profile，也没有访问旧 Store、pending 或 Unknown。只提供 HTML 快照，没有托管整个游戏目录。

| 输入 | 本次实际身份 |
| --- | --- |
| 系统与命令入口 | Windows；PowerShell 7.6.5；生产 CLI 使用 Node 26.12.1 |
| 浏览器 | Chrome 156.0.8078.80，headless |
| 实际游戏 | DoL 0.5.12.13，SugarCube 2.36.1+34；获准的 Lyra 合集 HTML |
| HTML SHA-256 | `0e804505ee6829170936922efce86669387ea17522cd1a3c89c9058edde4e6f8` |
| Recipe | `docs/recipes/dol-save-state.cjs`；SHA-256 `885d9962e7d9261be54d77ac07bbc065762f7605d8e0485203bdddf9abcef018` |
| 授权范围 | 本次 Profile / origin 的 `chrome-origin-storage`，仅 `save` |

启动前核对工作区与远端一致。游戏就绪后，读取实际原生保存方法、onSave/onLoad hooks、marshaller 和 decoder 的指纹，再填入已有 Recipe；没有关闭 attestation 或替换业务实现。新 Profile 的存档元数据为空，目标槽 8 不存在。

## Validated

### 真实执行和结果

通过标准 Debug Action 勾选入口复选框、关闭欢迎对话并使用原生新游戏控件，准备空白测试进度；这三次准备点击单独留证，不计作 GER 保存。准备后停在 Start2，没有继续剧情。

随后以独立 CLI 进程依次运行以下生产入口，均退出 0。路径占位符代表本次新建目录，不是日常数据：

```sh
node scripts/dol-dev.cjs game-goal-start --host chrome --host-file NEW_HOST_JSON --store NEW_SQLITE --file REVIEWED_SAVE_REQUEST_JSON --out NEW_GOAL_DIR --test-environment yes
node scripts/dol-dev.cjs game-session --goal NEW_GOAL_DIR --operation propose --file CURRENT_DECISION_PROPOSAL_JSON --test-environment yes
node scripts/dol-dev.cjs game-session --goal NEW_GOAL_DIR --operation dispatch --test-environment yes
node scripts/dol-dev.cjs game-session --goal NEW_GOAL_DIR --operation checkpoint --file VERIFIED_CHECKPOINT_JSON --test-environment yes
```

实际结果：

- 新 Decision 只提供一个 `save` 候选，没有 `load` 或 `delete`。使用完整 Decision envelope 和原 actionRef 提案，再由生产 coordinator 派发；没有 `readOutcome` override。
- `maxSpend: 0`，保存报价 0；派发后动作数 1、spent 0、reserved 0。原生保存终态为 `occurred`，Effect 为 `settled`，保留原 contextNonce / requestDigest。
- 目标槽从不存在变为存在，只有一条存档元数据。trial 与本次请求一致；存入的 money/time/passage 对应保存前原生 marshal 投影，当前游戏 money/time/passage/turns 不变。
- 派发后另行调用原生 `getItem` / `getSaveDetails` 并解码存档，核对摘要、metadata 和状态字段，与该次 Effect 的原始 before/after 证据一致。没有再次保存。
- 状态谓词初始已为真，但必需的 `save-witness` 检查点尚未完成，因此初始 Session 保持 Active、动作数 0。只有验证本 Session 的 settled 保存见证后才提交检查点；最终 Completed、动作数仍为 1、pending 为 false。没有拿“当前状态满足”冒充“本次执行过保存”。

原请求预算为 600000 ms、最多 4 次动作、24 次观察、maxSpend 0。Scene、Scope、quote、budget、dispatch、原生终态与 SQLite 均使用当前生产实现。最终 Store 只有本次一个 settled Effect，没有新增未决效果。

### 现场与清理

三次准备动作和最终只读观察均保存 DOM、CSS、截图和连接期间事件；本次截图成功。前后 frameId、loaderId、uniqueContextId 和 URL 一致，原 Profile 身份一致。截图不参与业务成功判定。

已关闭只读 CDP transport 和本次 owned Chrome / HTTP 服务。核对记录的 Chrome PID 不再存活，HTTP 与 CDP 端口没有 LISTENING；残留 TIME_WAIT 不是服务监听。Profile、存档、SQLite 和原始记录仅保留本地，不删除数据。

### 本次脚本错误

REPL 在启动前两次尝试读取不受支持的进程信息而报错，均未启动浏览器或派发业务。Goal 完成后的文档核对曾因跨运行环境对象 prototype 不同而触发 `deepStrictEqual` 错误，随后改为逐字段比较同一批身份值，通过；期间一次过早的清理查询缺少 cleanup 文件，该无效输出另行保留。实际 stop 返回后再用 PID 与 netstat 验证清理。没有重启实验或重放保存，也没有把这些错误记成 Runtime 缺陷或有效清理证明。

## Not validated

- 本次没有注入进程中断、重载或恢复；已有迁移前真实保存恢复与当前 TS 中性 GER 恢复分别保留其原范围。
- 没有操作 Android、日常存档或当前 UI 4.2，没有验证购买、穿戴、战斗、剧情、其它 Recipe 或更多 Mod 组合。
- 没有新增独立包的真实 DoL 保存运行；当前包的既有离线、GER、Integration 和 contracts 结果继续按各自报告引用。
- 未运行最低 Node 26.0.0 的 Windows 组合；本次生产 CLI 为 26.12.1。没有重跑代码未改的完整 Node / Python 套件。

## Known limitations

保存能力仅证明此固定游戏输入与已审原生 IDB Recipe。本次 HTML 含随包内容，不代表无 Mod 版本或所有 Loader/Mod 组合。没有提供完整图片等附加资源，也没有做整页视觉验收。

本次成功不解释历史 F07 初始空文档失败或后台截图超时的物理原因，两者仍 Unknown。原始游戏状态、原生读回、Profile、Store、命令输出和错误均在本地忽略的 `artifacts/windows-ts-real-save-20261106/`，不随本报告上传。

本轮真实保存验证可按上述范围标记 Completed。整体 7.0 发布、main 合并、Tag 和 Release 不在本次同步范围。
