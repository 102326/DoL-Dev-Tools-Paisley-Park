# 普通启动判断与实际只读接续

2026-11-13，源码基线 `4eee0a5d4babd013e041065e91bd62c507881dd7`。本轮修正过宽的启动前置条件，并在获准的原测试 App 中完成真实生产文档绑定和只读观察。系统、包与 Doctor 证据复用上一阶段，没有重跑整轮预检或文本模型。

## 为什么可以继续普通启动

用户本对话已有指定测试 App 的准确授权，本轮再次明确普通启动与只读诊断不应被完整备份门槛笼统阻断。进入游戏业务、清数据、重建、写存档或修改 WebView 配置是不同动作，需要各自的范围与风险依据。

原 APK 摘要仍使用上轮的实际结果 `ab67be61aea19cb259dae155356f7621cd6114d3209c66ca88a4162cbb9b9585`。启动前必要复核确认选定设备、user 0、包安装路径、版本、更新时间和签名记录未变，标准 launcher 仍解析到原 MainActivity。没有重新计算大 APK 摘要来重复同一证据。

现有 [native 构建验证代码](../../../examples/android-native/build.py)明确锁定该 BASE_SHA 和原证书 CERT_SHA；[原生验证记录](../../NATIVE_RECREATE.md)记载原启动加载本地游戏、SaveDialog 无自动初始化写入。此证书依据来自同一 APK 的历史受审合同，并非本轮重新提取。所选动作只允许干净的 MAIN/LAUNCHER 入口，不带载档、保存、重建或外部 URI 参数。

现有受审材料没有给出普通 MAIN 入口必然写入真实存档或自动同步共享云的具体激活通路，因此完整备份未核实不构成这一低风险步骤的统一阻断。这个判断不声称已审计所有当前 Mod 缓存，或普通启动完全没有缓存/偏好初始化；若现场出现载档、云同步、迁移等实际风险，再按该通路处理，不擅自点击或继续相关写操作。高风险动作的授权和恢复条件保持独立。

## 资源窗口变化与真实执行

首次当前目标检查发现平板已从桌面切到另一款游戏，DoL 无 PID。准备阶段的前台断言停止在 `am start` 之前，没有派发启动命令；这不是工具策略拒绝。为避免抢界面，只询问一次设备是否释放，没有再次请求原已授权的普通启动批准。

用户回复“已释放”后，再核对当前设备、用户和前台，发现 DoL 已在前台运行。于是跳过启动命令，直接观察现有文档。**Agent 本轮 MAIN Intent 派发次数为 0**；不能将用户已打开 App 算作 Agent 启动命令通过，也没有为了增加启动记录而重复启动或重载。

实际使用既有 `execution-context.cjs` 的 create / ensureWebview / assertBound / finish 及标准 `cdp.cjs`。只在连接回调旁记录真实 contextCreated 元数据，并原样传给生产监听器，没有替代 transport、放宽身份合同或创建新 Runtime。

| 实际检查 | 结果与范围 |
| --- | --- |
| App / 文档绑定 | 已选定原测试包 PID/socket；绑定当前主 frame、loaderId、完整文档 URL 和唯一默认 uniqueContextId，每次读取前后使用生产断言。原始标识只留本地。 |
| 被动 DOM / 样式 | 页面 readyState 为 complete，存在 #passages，观察到 1 个 passage 节点；读取 body computed display、viewport 与 timeOrigin。没有执行点击、输入或游戏状态赋值。 |
| 公开环境元数据 | 使用既有 environment snapshot，游戏报告 0.5.12.13，Loader 报告 2.101.1，运行时元数据列表报告 39 个 Mod。列表 available 不代表全部 Mod 初始化或业务已通过。 |
| 浏览器 | 实际 CDP product 为 Chrome/156.0.8078.47，文档为本地 HTTPS origin；没有修改 URL 或 WebView 配置。 |
| 清理 | production finish 完成，自有 CDP transport 关闭；ADB forward 前后清单相同。没有移除他人资源、停止 App 或清数据。 |

本次不是 Gameplay Goal，不读取存档正文、派发业务动作、恢复或结清旧 Unknown。没有新的 helper、APK、依赖、全局 Skill 或安全设置变更。旧 child Codex 的启动拒绝未重试；本对话正常生产连接成功不能替代该宿主接缝的验收。

## 证据与收口

实际 CDP 观察窗口为 `2026-11-13T12:58:00.274Z` 至 `12:58:01.635Z`。启动前被停止的检查、用户释放后的状态、真实 frame/context、公开 Mod 原始列表和 cleanup 返回均保存于本机忽略目录 `artifacts/android-start-readonly-7.1-20261113/`。观察脚本只调用 Page.getFrameTree、Browser.getVersion 和受审 Runtime.evaluate，加上生产连接所需的身份检查与事件订阅，没有 Page.reload 或保存 API。

上一阶段真实“未启动”记录不改写；只纠正将完整备份写成所有普通启动前提的判断。当前新文档绑定按这次实际观察成立，没有从旧 APK、PID 或 URL 推导。此轮没有 Agent 启动命令、重载/重建、存档/Mod 写入、全量业务、共享云审计或版本行为 A/B 的新增通过证据。

只改源码交接记录，校验链接、命令/事实一致性、隐私和候选导出内容；不因文档更正重跑完整离线/真机矩阵。候选 payload 不变则保留 RC.2 原身份，不合 main、不创建 Tag/Release、不公开发版。两项新标签争议及旧四项人工复核状态不变。
