# 6.0 — White Snake：支持范围与验收

2026-10-16。6.0.0 已完成约定范围的本地候选验货；用户随后明确授权 GitHub 发布和本地工具/Skill 更新。基线是已发布 5.1.0：`fc52a6ce6c5f15a884f775d9473ae19e133a6987`。正式制品通过 [v6.0.0 Release](https://github.com/102326/DoL-Dev-Tools-Paisley-Park/releases/tag/v6.0.0) 提供，最终提交、逐文件摘要和验货范围以随附 manifest、validation.json 为准，不沿用候选 ZIP 摘要。

## Delivered

三条核心能力及联合接续已取得代表性证据。工具继续使用原 Debug、GER、Workshop、Evidence 和 Skill；没有新建 Runtime、Ledger、知识数据库，也没有改变 Store schema 或处理历史 Unknown。

| 能力 | 交付与支持边界 | 依据 |
| --- | --- | --- |
| Mod 专业研究 | MapleBirch Character 注册、缓存采用和消费者构建方法；固定 5.4.3 源码，消费者在 5.4.2 和更新后的 5.4.3 分别读回。不是整个框架构建或所有图层验收。 | [专业参考](MAPLEBIRCH.md)、[构建字节差异](knowledge/build-byte-drift.md)、[版本输入](knowledge/latest-mod-sources.md) |
| 真实关系修复 | CE 1.20.3.1 在 MapleBirch 5.4.3 下探测缺失的可选 Simple，触发原 Loader error。三个 JS 成员的四处存在性检查消除假错误，保留原分支、其余成员、Mod 顺序及相关设置入口。 | [原因与实机结果](knowledge/cheat-optional-framework.md)、[固定输入配方](../examples/cheat-extended-optional-probe/README.md) |
| 无冲突负对照 | ModHub 与原版优化共享侧栏目标，实际执行/发布与带、无探针菜单对照成立；更新组合另有加载及入口读回。共享目标不等于故障。 | [共存案例](knowledge/shared-caption-coexistence.md)、[复用 ModHub 检查](MODHUB.md) |
| 经验学习 | 原 Skill 按问题发现条件化知识。独立会话验证发现、条件变化和真实反证修订；另有新会话自行发现 CE 案例、构建并验证同摘要候选。 | [知识入口与修订规则](MOD_KNOWLEDGE.md)、[CE 接续](knowledge/cheat-optional-framework.md) |
| 联合接续 | CE 任务串联专业调查、真实调用栈、定向构建、原组合加载/相关功能复验、知识回写及新会话实际应用。独立会话未部署设备；主会话实机操作不记为它完成。 | 同一 CE 案例与配方 |
| 有界执行证据 | 显式选择 Mod/资源的启动期包装和可选 Evidence 投影；固定方法摘要、有界容量、自动停止及归属恢复。 | [按需诊断配方](../examples/patch-provenance/README.md) |

常规诊断不安装探针。Patch 观测保持显式诊断实验身份：只覆盖已审方法接缝，不提供完整逐规则因果图、无扰动保证或全生态兼容结论。这个边界不取消上述已验证的真实关系修复能力。

## Validated

### 已有有效证据复用

- 真实 Android：M367FC / Android 17 / WebView 154，授权独立 DoL 测试 App，ModLoader 2.101.1，StartConfig 来源版本 0.5.12.13。独立 GameVersion 来源仍为 Unknown，不用包装版本代替。39 项 Mod 组合保留；UI 2.7.0、MapleBirch 5.4.3、ModHub 1.7.0、原版优化 1.1.1.5 的来源/加载分别核对。
- CE 作者最新已核对附件内部版本 1.20.3.1；原包启动三条目标错误，修改后零条。102 个实际加载成员对应候选，99 个未修改。CE 与 Maple 设置区均显示，Loader 查询源码、Mod 顺序/隐藏状态保持。未更改设置值、存档或游戏进度。
- CE 离线以真实消费者表达式验证 16 组注册表替身，包括仅 Maple、仅 Simple、两者和皆无；不记为真实 Simple 全功能测试。
- 十二组固定上游 TweeReplacer/Linker 实现的受控场景，及真实 Chrome 的三类原生 DOM 发布路径。桥与业务替身均按实验配方披露。
- 启动观测显式选择后的真实记录为 11 项、8 项主动过滤、0 项容量丢失；原方法恢复。标准 Evidence 的实际 Worker 投影可用；移除自有探针后投影 unavailable、Generic complete。带/无探针的相关菜单对照通过，原始截断和旧失败保留。
- 四次独立经验测试、一次更新后只读接续及一次实际构建接续。最后一次冻结 322 项输入，新会话执行 9 条成功命令，重建出与平板所用包相同的 SHA-256。沿用既有宿主配置；模型服务端后端未独立证明，不报告统计收益。

### 本轮 Windows 离线回归

Windows / PowerShell 7，Node 26.12.0、npm 11.20.0、Python 3.14.7。`npm test` 共 448 项：447 通过、1 项 macOS 权限专属跳过、0 失败。没有把此前 Linux CI 的 446 通过/2 跳过记为本轮结果。

Python 初次因当前解释器缺开发校验依赖和 Pillow，2 通过/2 跳过。随后仅在本轮临时目录按 CI 固定版本安装 jsonschema 4.25.1、rfc3339-validator 0.1.4，实际重跑为 3 通过、1 项可选 Pillow 跳过、0 失败。未修改全局 Python 或 Tools 运行依赖。63 份发行文档的 289 条本地链接/锚点检查通过，包括导出排除目标核对。

独立候选验货结果另随包提供 `validation.json`：核对归档文件与固定 Git blob、CLI、安装/resolver、缺依赖拒绝、自有 SQLite 生命周期和解压路径。manifest 只说明来源/字节，不替代验货结论。上列原始设备证据不因版本改为 6.0 而改写来源提交或计为重新实测；最低 Node 22.12 的既有安装回归按未改行为复用，不声称本轮重跑。

首次本地 ZIP 被逐字节核对拒绝：系统 Git 的 `core.autocrlf=true` 将 LF 导出为 CRLF，规范换行后才相等。失败包保留，不作为候选交付。后续按[打包约定](RELEASE_PACKAGE.md)仅为归档进程固定换行，再重新核对全部文件；没有降低字节判据或改全局 Git 配置。

## Known limitations

- 方法返回、内容变化、原生发布和业务成功是不同证据；`okCount` 不等于匹配数。StoryCaption 存在未采集的中间写入者，不能补造连续因果链。
- 包装会改变函数身份和时序。主动过滤、容量丢失、摘要未决及停止时未决分别保留。Integration 是 reviewed local code；Worker 不是权限安全沙箱。Evaluator 可执行传入 JavaScript。
- Generic 与 Integration 属于顺序采集，不是原子快照；相同 URL 或文档标签不能替代原执行绑定。
- CE 配方只接受固定原包；保持上游 Manifest 版本，靠成员摘要和收据区分本地修改。输入换版须重新审查，不通过降低门禁兼容未知包。上游包和修改包均不随 Tools 分发，保留其 CC BY-NC-SA 4.0 边界。
- 私人设备截图、游戏资源、原始会话、备份及实验日志只留本地；公开摘要可供使用，无法访问原件的读者不能声称亲自核验。

## Coverage Ledger

以下为 Not validated / Additional coverage，不自动成为 Remaining work：

- 其它设备、WebView Provider、包装 App、Mod 版本与组合。
- 所有 CE 功能、纹身应用、时间旅行、真实 Simple-only 运行与存档迁移。
- 新宿主独立完成 Android 部署和完整无人接管的 Mod 修复闭环。
- 全部角色表情、完整 MapleBirch 上游框架构建、所有 ModHub 检查及任意动态 Patch。
- ReOverfits 本地 4.1.1 的最新公开更新链仍不明确；没有将原作者公开 2.0.0 当作最新 4.x 或降级安装。
- 全 SugarCube 执行图、确定性回放、Diver Down 完整研究、性能学习收益率。

只有新要求、发布目标或真实风险/故障才把这些提升为当前任务。升级不迁移旧 Store、清理 Unknown 或替换全局 Skill；隔离安装后再按用户决定切换。
