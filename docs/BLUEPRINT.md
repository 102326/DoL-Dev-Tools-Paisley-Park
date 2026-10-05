# 公共开发工具定位与能力蓝图

2026-10-05。本文登记后续需求与落地状态；当前可执行命令见 [DIAGNOSTICS](DIAGNOSTICS.md)，实际验收见 [VALIDATION](VALIDATION.md)。

## 定位

DoL Dev Tools 是面向整个 DoL Mod 生态的公共、本地开发执行工具链。原版、内容 Mod、框架 Mod、UI Mod、管理器、整合包与 Android 包装环境都可以使用。Soft & Wet 是早期重度用户和一个可选 Integration，与其它项目平级。

Android CLI、Chrome Inspect / CDP、ADB 共同构成 Live Device Access：设备画面、WebView 内部事实、Android / App 系统现场。Skill 选择路径，Tools 执行，目标项目的 Runtime / Integration 提供自己的解释。

完整目标：Reproduce → Observe → Understand → Diagnose → Act → Modify → Deploy → Verify → Preserve Evidence。1.2交付通用能力与受控开发闭环；目标业务、设备和专有接口的验收条件分别保留，见[能力覆盖](CAPABILITY_COVERAGE.md)。

## 能力状态

| 能力组 | 1.1 发布基线（历史） | 后续增补（1.2实现与条件见能力覆盖） |
| --- | --- | --- |
| Live Device Access | Android CLI 独立截图/标注/layout；ADB 与 CDP 采集；Doctor 和人工 Chrome Inspect 流程；scrcpy 检测 | 独立 inspect/session、可选启动辅助；更多 WebView provider / socket / target 情况 |
| DOM / CSS | 限定 DOM Contract Snapshot/Diff | Computed Style/CSS Contract、Selector Health、DOM Ownership、z-index、Scroll、Hitbox 与 Accessibility |
| Visual | 截图、短录像、同尺寸 Golden/Visual Diff | Region Diff、动画抽帧、比较条件记录、Known Good |
| Console / Events | CDP Console/Exception 元信息、有限监听窗口 | JS Error / Event / Mutation / Observer 时间线；短时观察、明确 instrumentation 与清理 |
| Network / Storage | 无正文/headers/私有路径的 Network 摘要 | 脱敏 HAR、明确选择的网络情景模拟；Storage 结构 Snapshot/Diff，默认不读正文 |
| Performance | gfxinfo/framestats、PSS/RSS；Perfetto/bugreport 可选包装，重型入口尚未真机验收 | repeated sample、WebView 子进程、thermal/battery、JS heap/DOM leak probe、统一时间线；不重做 Trace Viewer |
| Environment | Device/App/游戏与 Loader 版本/Chromium/viewport 摘要 | WebView Provider、Mod Environment Snapshot、Environment Diff；版本/启用状态/load order，不复制包体或接管加载 |
| Action / Journey | 未提供统一命令 | 显式 Android/WebView Action、生命周期、Recorder/Replay、plan/dry-run、等待条件/checkpoint、选定兼容与设备矩阵 |
| Evidence / Support | schema 1、incidentId、时间/来源/SHA、失败保留、脱敏、复现说明、轻量投影；公共格式与 JSON Schema | Evidence Compare、Known Good、Markdown Issue Report；不自动上传 |
| Integrations | Public Contract 1；内置 Soft & Wet 与显式外置 `.cjs` 同路径；通用 DOM 示例；时限/JSON-only/故障隔离 | 其它作者自维护专属桥；不自动发现或执行未知模块 |
| Skill / Workshop | 仓库内五种诊断模式；未全局安装、未验证自动发现 | 按现场证据定位源码，再使用目标项目自身构建/部署/验收命令；工具不接管项目业务 Runtime |

1.0 的 Support 默认不带截图、DOM 或 WebView 全量资料。蓝图中的更丰富反馈格式需要后续实现与单独隐私选择，不能直接扩大旧版分享范围。

## 当前开发与交付方式

用户已明确以完整最终能力为目标：功能分批实现、测试和提交，再统一封装。1.0/1.1/1.2交付包保留作基线；[1.3](RELEASE_1.3.md)统一汇总后续能力收口，仍保留目标业务接入的条件验收。VALIDATION记录源码检查、发行包和现场证明。

2026-10-06范围纠正：1.3仅为通用工具阶段包，提前封装不代表完整任务结束。原生Activity/WebView重建和真实业务Mod/APK更新尚未完成，仍按用户原目标推进；先核对目标自有接口、源码/制品与签名、保留数据和恢复方法，再执行更新/重建、确认实例或实际加载身份、完成同场景复验。缺接口/材料时说明具体缺口，不直接移出任务范围；全部任务完成前不再按通用范围宣布最终完成或新增发行包。

当前开发中已补 CSS Snapshot/Diff、Environment/Mod Snapshot/Diff、Provider、显式 CDP target/socket 选择，以及固定 Action primitives 和 Journey plan/replay/checkpoint。原版页面结构/Mod 元信息保持中立；已明确当前连接 App 可作为测试环境，普通复现动作可主动执行，真实存档和云数据删除/覆盖仍排除。

1.2也包含短时事件/Mutation/Error/Long Task与可选Observer时间线、六类Inspector、Storage结构、区域视觉、重复性能/热电采样、离线Compare/参考/报告、Recorder候选、矩阵、Network实验和动画取帧；数值/可选detached Leak Probe、证据时间对齐、Viewport Matrix与显式Native Layout见对应文档。独立Skill安装/前向任务与固定Workshop通过；renderer归属、完整原生帧时间、目标业务部署和其它设备仍分别判断。候选录制不等于正确Journey，浏览器/矩阵标签不等于实体设备证明。

## 后续实施顺序

后续 [关联进程内存](PROCESS_MEMORY.md) 已在真机验收主进程和一个准确关联的isolated进程，不推断renderer角色；Hitbox补中心命中与离线SVG；[Workshop](WORKSHOP.md) 受控浏览器源码构建部署复验通过。原文章节、外部/条件路径和未验收部分见 [能力覆盖](CAPABILITY_COVERAGE.md)。

以下是结合当前缺口的分批顺序，不要求一次实现全部，也不预建框架。

1. **公共接入基础（1.1 已交付）**：公开已有 Evidence/DOM/Support 格式与 Collector 约定；定义可验收的 Integration Contract 和第三方例子。证明无 Soft & Wet 可用、未知/缺失/异常集成不阻断 Generic、第三方不需要 UI 源码。
2. **WebView 事实与比较**：Scoped Computed Style/CSS Snapshot/Diff、Environment/Mod Snapshot/Diff；补目标选择与 WebView Provider 情况。默认结构化元信息，敏感状态/正文独立选择。
3. **复现实验**：独立有限 Action primitives；Journey plan、显式执行、唯一 selector/目标重新核对、等待/超时/checkpoint、失败保留与资源复原。先覆盖小的明确复现，不实现任意业务 DSL。
4. **问题时间线与专项检查**：按实际问题补 Event/Mutation/Error/Performance、Storage、动画/Region、Selector/Overlay/Scroll；Observer/heap 只在具体问题需要时升级，不全量常驻 hook。
5. **开发闭环与交付**：Evidence Compare/Known Good/Markdown Report，选定矩阵，目标项目构建部署与真机复验；重型采集按具体调查验证。

## 操作与数据边界

Inspect / Doctor / Evidence 保持观察和采证语义。Action / Journey 独立表达将执行的动作；plan/dry-run 不产生这些操作副作用。

在已明确的测试档、测试账号、隔离 App 或临时数据环境中，任务范围内的点击、输入、页面导航、开关设置、重启、旋转和普通游戏操作可以主动执行，不逐动作重复索要确认。目标和环境不明确时先观察并核对，不能把正在运行的 App 自动当成隔离测试环境。

真实存档/云数据的删除或覆盖、正式用户数据清空、真实 Mod 删除、真实凭据修改需要对应显式授权。操作工具的存在、读取本蓝图或一次诊断请求本身不扩大这些权限。测试数据的更激进实验必须限定在已核对的隔离范围内。

未来观察器/Event instrumentation 可能临时注册监听器；须标明副作用、限制时窗并清理，不能修改业务逻辑来制造通过。网络离线/限速等实验状态同样须记录与恢复。

Generic 数据保持中立。Integration 的角色、Fingerprint、匹配与降级判断属于项目解释，不能覆盖 DOM/CDP/Android 观察。不能从 DOM 猜出未知 Mod 的所有权，也不能从像素差或内存上涨自动判根因。

## 完整需求来源

- [公共开发工具重新定位](proposals/PUBLIC_POSITIONING.md)：生态定位、平级可选 Integration、公开格式与公共 Skill。
- [最终能力蓝图原文](proposals/CAPABILITY_BLUEPRINT.md)：完整能力条目与 Agent 开发闭环。原文中长期建议不代表当前命令可执行。

保持本地优先，不建立遥测、中央数据库、常驻用户监控、自动上传、第二个 ModLoader、通用游戏 Runtime、全局 DOM 虚拟化或自动修改未知第三方代码。
