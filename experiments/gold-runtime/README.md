# Gold Experience M1：控制与恢复实验

这是隔离实验，不是正式Gameplay实现或发行包。入口只连接持久模拟接收端；不会连接ADB/CDP、执行游戏、读取存档或调用付费模型。当前宿主通过普通工具执行CLI，读取Decision Request并提交Proposal；用户不需要逐步填写决策。

## 运行（仓库根目录）

```powershell
npm ci --ignore-scripts --no-audit --no-fund
node --experimental-sqlite --test experiments/gold-runtime/test/runtime.test.cjs
node --experimental-sqlite experiments/gold-runtime/cli.cjs start ABSOLUTE_PRIVATE_EXPERIMENT_DIR
node --experimental-sqlite experiments/gold-runtime/cli.cjs request ABSOLUTE_PRIVATE_EXPERIMENT_DIR SESSION_ID
node --experimental-sqlite experiments/gold-runtime/cli.cjs propose ABSOLUTE_PRIVATE_EXPERIMENT_DIR SESSION_ID REVIEWED_PROPOSAL_JSON
node --experimental-sqlite experiments/gold-runtime/cli.cjs dispatch ABSOLUTE_PRIVATE_EXPERIMENT_DIR SESSION_ID
node --experimental-sqlite experiments/gold-runtime/cli.cjs observe ABSOLUTE_PRIVATE_EXPERIMENT_DIR SESSION_ID
```

`resume`重新绑定、使旧Proposal失效，不重放动作。`cancel`停止新派发并释放lease，不删除未知effect或取消模拟接收端在途请求。`status`只读历史记录。CLI的CRASH_POINT仅用于故障注入，不是恢复选项；首次创建的Store可含私有认知/决策，应留在artifacts或明确本地目录，不提交SQLite文件。

## M1技术决策

采用**XState 5.33.2作为Session控制底座候选，原生SQLite作为单一事务Store**进入M2迁移。XState的合法状态转移、序列化/恢复代替自研生命周期分派；领域语义、原结果与副作用仍由项目拥有。SQLite承担Session、lease、effect和预算的共同原子提交，避免自行维护跨文件事务。依赖锁定及完整性见仓库根package-lock.json；XState为MIT、没有runtime依赖，安装禁用生命周期脚本。本实验不添加LangGraph或其它规划框架。

XState稳定版的实际实验确认invocation恢复会重新启动工作。Session机器因此不调用游戏executor，也不恢复副作用actor；独立派发先提交effect，再调用接收端。派发前后崩溃、不明回执、取消或新Session接管均不会盲重放。prepared只在同一写事务确认尚未跨派发边界后废弃；dispatching/acknowledged仍需逐attempt的原结果与远端终止证据。余额未变、Goal已真或模型解释不足以结清。

Node22.12.0实测需要`--experimental-sqlite`；没有开关报`ERR_UNKNOWN_BUILTIN_MODULE`，不将这种失败记为通过。Node24.19.0可以直接使用内置SQLite。M2必须显式处理这个Gameplay功能前提；通用诊断不能因缺少SQLite/XState而失效。不默默提升通用平台最低版本，也不自动下载Node或改系统PATH。SQLite实验性质与兼容性作为真实限制记录，正式包在M6选择并说明支持路径。

## 已验证与限制

- 官方Node22.12.0（ZIP摘要已核对）、CJS、XState5.33.2：21项专项通过；修复后的相同21项在Node24.19.0也通过。早期17项及实际失败记录保留，不拿它们替代最终检查。
- 覆盖持久认知、整份Proposal拒绝、重复/过期/重连响应、写入失败、真正的子进程退出、未知effect、迟到结果、跨Session阻挡、原状态守卫、预算不重置、目标用户规范化、接管后恢复及版本拒绝。
- 当前宿主实际通过CLI提交两次不同Proposal，在新的Scene/epoch下收到下一Request并完成模拟Goal；每个命令为独立进程。旧lease过期时显式resume、重新观察后提交，未沿用旧响应。此项不是fake Provider，但现场是fixture，不能声称真实DoL Gameplay已通过。
- 独立复核发现用户ID `0`/`00`别名绕过目标锁，以及旧Session在接管者结清后无法恢复；已修复并加入回归，静态复核确认关闭。首次预算用例同时触发lease过期，测试分离两种边界后通过；原失败保留，不是flaky重跑至绿。
- 累计硬上限证明重复无效果决策最终停止，**不证明目标相关无进展识别**；更丰富的loop/progress判定属于M4。
- M1历史Store/Session为版本1、Decision协议1；当前共享内核Store/Session为版本2、Decision协议仍为1。跨Store版本拒绝而不自动迁移，M1历史证据留在原Git提交与私有目录。目标身份和结果关闭由受审本地reader提供，不是安全沙箱、真实远端exactly-once或通用取消保证。

M2已将同一实现迁至[scripts/lib/game-runtime.cjs](../../scripts/lib/game-runtime.cjs)，本目录runtime.cjs仅供fixture adapter；主线与实验不各自维护状态机。新故障/迁移测试随根npm test运行。冻结Foundation和本机已安装执行代码保留；真实终止合同、宿主语义规划与设备S1/S2仍按M3—M5推进。见[当前M2进展](../../docs/GOLD_EXPERIENCE_REAUDIT.md#10-m2共享内核迁移进展)。
