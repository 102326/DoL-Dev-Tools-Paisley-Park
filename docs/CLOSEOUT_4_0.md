# DoL Dev Tools 4.0.0 — Bites the Dust 技术说明与收口

产品名为 **DoL Dev Tools**，代号 **Bites the Dust**。本文保留 2026-10-11 将已审 RC 收口并在用户单独确认后发布的原记录。2026-10-12 修订候选尚未获准远程发布，见 [F1–F5 定向收口](F1_F5_CLOSEOUT_4_0.md)。下方原记录的交付与验证范围保留，公开制品身份以随附 manifest 和 [Release](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/releases/tag/v4.0.0) 为准。[面向使用者的更新说明](RELEASE_4.0.0.md)与[安装指南](SKILL_INSTALL.md)为入口。

## Delivered

- 保留正式 3.0.3 的共享 GER Runtime、CLI/Skill 机器标识、Store 路径、TargetKey 和历史记录身份。Debug 与长期 Gameplay 两条路径共用原执行与证据底座，不增加第二套 Runtime。
- 本地版本、package/lock、CLI 显示、Skill 指引、安装与更新文档统一为 4.0.0。正式 ZIP 从限定本地提交通过 `git archive` 独立生成；固定 SHA、完整文件摘要、包大小和哈希记入随包 manifest，不以 RC ZIP 改名替代构建。
- 本轮只改元数据与文档，执行代码、Schema、Collector、业务 guard 和安全合同不变。包核验及独立安装采用现有 CLI/安装器/resolver；日常稳定 3.0.3 与全局 Skill 保留。

## 关键合同与兼容

### 可选虚拟消费额度

新请求省略 `maxSpend` 时持久化为 `null`，表示不设虚拟消费上限；`0` 禁止正金额消费，有限值限制累计开销，父子目标采用有效的较小限额。免费的操作仍要证明真实业务结果。旧记录缺少字段时继续按零读取，不改写其文档。旧 3.0.3 不支持恢复新的 null 预算 Session。时间、步骤和运输调用仍有技术上限，超时不证明设备动作取消。

### GER Q1–Q3

- **Q1a**：SQLite `BEGIN IMMEDIATE` 内比较已批准的场景/Decision 快照，预留后只执行同一动作，拒绝并发旧决定。
- **Q1b / Q2**：固定实际 callable 与 receiver；只有受审本地来源和真实执行开始标记才能证明未派发。页面自报或复制对象不取得此资格，标记后的错误保留 Unknown。
- **Q3**：先按 owner/provider/代次筛选，再限制回收候选；仅回收已经可靠持久结算的精确终态回执，不回收 Unknown/started。容量和中断回归不等于手机全部业务验证。

### 数据重建与旧记录

经过授权的原生 App-user-data 重建可在**原 Store/TargetKey** 内建立新资源代次。原生清理、进程停止、数据根和标记需有独立证据；换库或自报 UUID 不能规避未决副作用。旧 Unknown 保留原动作、源码和合同，不由新 Provider 追认。

Store 仅在原生数据重建开始时从 schema 2 升级到 3。执行前做 SQLite 一致备份，不能只复制仍在写入的主文件。稳定 3.0.3 的新连接会拒绝 schema 3，已打开旧连接也受 lease fence 约束；不得继续用它写入升级 Store。没有经过验证的自动降级、历史合并、外部存储/cloud/shared-UID 隔离或全字段存档迁移流程。详细机制见 [资源代次](RESOURCE_GENERATIONS.md)。

### 项目实验与存档

Recipe 是经过审核的本地 Node 脚本，拥有实际文件/网络权限，**不是安全沙箱**。源码与函数摘要固定在原动作绑定中，新脚本不解释旧未决结果。它复用既有 GER Goal、执行和 Outcome，见 [实验合同](PROJECT_EXPERIMENTS.md)。

支持的 DoL 0.5.12.13 原生 IDB 自动保存合同等待真实 transaction complete，独立读回原档案，并在公布终态前恢复自有有限观察器。返回标记、`idb.lock` 或运输 acknowledgement 不代表写入完成。其它后端/hook 需受审支持，旧 no-save 回执不会继承新权限。

## Validated：证据继承边界

以下记录属于原 4.0 发布收口；2026-10-12 行为修订及新回归见 [F1–F5 定向收口](F1_F5_CLOSEOUT_4_0.md)。原发布阶段的元数据与文档不改变运行行为。独立 RC 审查固定源码 `3213bea663dcadf9fa01b7ed25da68ae94ebb776`，结论为预发布 Go、正式版 Conditional Go，无 Blocker/Must Fix。正式版本身份和包核验在本轮实际执行，记录于本地包旁 `validation.json`；下列是继承的有效证据，**不记为本轮新运行**：

- `467f32e15d6929e13bf2d4bc5d9fcc0bae33a146` 完整 Node **393 passed / 0 failed / 0 skipped**，定向 window 56 passed；未改 Python，复用 **2 passed / 2 optional-dependency skips**。锁定 XState 5.33.2。
- 实际 Android 17 / WebView 154.0.8037.58 / DoL 0.5.12.13：10 项真实 Document 重载检查、旧 client 拒绝、显式新绑定与自有 forward 清理；PID/target/URL 不变也不证明文档相同。
- 五项 GER 试验依次为**创建/写入 → 覆盖 → 独立货币状态准备 → 读取 → 删除**。其中四项是存档操作，货币准备不是购买，读取不是写入；各次单独派发、结算、原状态检查。另有一次真实原生自动保存 transaction commit 与档案读回。
- 一次受控原生零价购买：原成本设置调整后，库存、消费计数/时间与执行回执共同证明；随后恢复成本设置。四项真实 WebView 生产 Action 边界检查是受控夹具，不是 durable GER 购买崩溃试验。
- 四次获证实的原生数据重建；原 81 Effect docs/status、21 Session docs 及后来四条历史未决记录保留。失败记录不被成功试验覆盖或追认。

Android 三剑客实测来源：CLI 1.0.16486076 的实际版本和 native-layout；已安装官方 Skills 的实际清单/内容摘要；KB 的真实查询 `WebView debugging JavaScript execution context page reload` 与返回 `kb://android/develop/ui/views/layout/webapps/debugging`，接收时间 `2026-10-11T08:39:48.076Z`。KB 说明适用于 WebView 诊断，不能替代本项目身份协议证明。来源和固定切片见 [开发记录](BITES_THE_DUST_4_0.md)。

## Not validated / Known limitations

- 完整 Android Mod 自主修复→构建→持久部署→加载→同条件复验。没有合适当前 Bug，不重演已修历史故障。
- 更多设备、WebView、Mod、存档后端/hook、每个 producer 的实际自动保存；物理断连恢复、CLI trusted touch、完整存档迁移/备份恢复。
- 手机上 durable GER 故障注入与 66 次业务容量；这些已有离线/受控验证，不能冒充真机业务覆盖。
- Skill 显式定位/安装验证不保证每个自然语言提示都自动触发；resolver 验证位置，不提供代码信任保证。

原始 SQLite、存档、APK、截图、完整设备标识、机器配置和私有执行日志仅保留在 ignored 本地证据目录，不随公开包或 Release 上传。现场事实、项目解释和能力完成状态保持分开；覆盖有限不自动构成剩余研发任务。本地发布准备时的 Go 不等于远程发布；原 2026-10-11 发布已有用户单独确认；这不授权 2026-10-12 修订候选的推送、正式合并、Tag 或 Release。后续发布仍需对应授权。
