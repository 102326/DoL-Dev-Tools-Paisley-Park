# Paisley Park 5.0：A/B Windows 接续验收

> 2026-10-13 同步说明：用户已授权将最新进展上传到现有 GitHub 测试分支。Tools 使用 `test/paisley-park-5.0-mac`（保留命名，追加 Windows 验收与真实反馈），UI Lab 使用 `test/paisley-park-component-lab`。下文的“未推送”“待确认”保留各阶段当时状态；UI 3.0 使用已获后续确认，首轮反馈已登记。正式 main、4.0.1 Release 与全局 Skill 不因本次同步更新；`floating.tools` 仍是未实施的覆盖候选。

2026-10-12。本轮只验收 A（UI Source Link）和 B（Vite Component Lab）的现有有限原型。达到本文范围内的 Scoped Done；不等于完整 5.0 或真实游戏修复闭环。UI 3.0 的真实使用须先由用户确认，再交给 UI 对话，本轮尚未发送消息或改动其开发分支。

## Delivered

从 GitHub 读取并保留两个 Mac 成果：

- Tools：`test/paisley-park-5.0-mac`，`ed1efc708d919e669ffa3a1486a0a43a4c3e8cd1`。
- UI：`test/paisley-park-component-lab`，`f4a795a24eeb66d4479142e5c618226562a0452e`，基于 UI 2.5.0。**不是 UI 2.6 或 UI 3.0 的直接替代工作区。**

建立独立的 Windows 工作树，Tools 分支 `test/paisley-park-5.0-windows-ab`，UI 分支 `test/paisley-park-component-lab-windows`。UI 路径实际包含空格和中文；按原锁文件安装依赖，使用已有 Chrome，没有下载浏览器。

仅修正三个测试接缝，生产代码、Source Link 的读取约束和 Lab 的执行边界未改：

1. Windows 文件 symlink 需要额外权限，原测试在进入断言前 EPERM。Windows 改用无需提权的目录 junction，仍验证真实 canonical 越根和敏感路径拒绝；其它系统保留文件 symlink。
2. 原 Vite 根外测试把 C 盘临时文件交给 E 盘服务。在此 Vite 版本的 Windows raw-fs 路径处理中，得到的是 HTML fallback 200，没有返回合成文件内容。测试改为同盘根外文件，并增加根内文件内容读取对照，再验证根外 403；没有放宽服务端访问规则。
3. 验收记录不再把已实际运行的 Windows 列为未验证；其它平台和真实游戏仍独立记录。

## Validated

本轮 Windows 11、PowerShell 7.6.6、Node 24.19.0、npm 11.17.0、Python 3.14.7、已安装 Chrome 155.0.8059.39。以下为 Windows 新运行，不计入 Mac 历史通过数。

- Source Link 单元 6 项通过；包含未知组件、同 HEAD 字节变更、旧 revision、缺文件、Git 不可用、中文/空格路径、非 root cwd、防覆盖、敏感与越根链接拒绝。与 CLI 错误检查一起共 8 项通过。
- producer 单元 2 项通过；同 HEAD 字节变更及实际 Windows junction 的越根/敏感目标拒绝。
- `lab:check`、`lab:build` 通过。真实 Vite + 隔离且启用 Chromium sandbox 的 Chrome，13 个代表性检查通过：同源 Toolbar/GameButton、三组 props、内存回调、键盘与 Escape、390/900 几何、手动容器宽度、组件与 CSS HMR、旧索引/线索 stale、新线索 matched、有效读取对照/根外 403、未加载游戏主 Runtime、无页面错误。只操作自有页面，限制外部 origin。
- inspected 窄/紧凑及长消息截图，未发现相应范围的裁切或不可读问题。宽度滑杆只是几何工具，不代表正式父层自动宽度检测。
- 实际 `npm run build` 和 `node scripts/package.cjs` 通过；普通 ZIP 19 个条目，无 Lab/index/map/本机路径。Windows 生成的正式 JS/CSS 与 Mac 已记录生产哈希相同：JS `d97239e1638e722f1d5800da8bacf8980fa7104d21a54fdc8e05efebd5bb31be`，CSS `160ab2dbcdedea5f8e59154a5c1253f81e70a921abff4e8f794e46918e79019e`。这是本轮生成后比较，不把 Mac 构建算作 Windows 新通过。

首次失败、诊断和修正后的输出分别保留。诊断用自有 Vite probe 已记录 HTML 回退及未泄露合成文件；其关闭等待未结束，限定到确认的自有 PID 停止并删除自有临时文件，未当成成功清理。正式联合验收关闭自己的 browser/server，恢复组件与 CSS 原字节。

最终两份本地源码提交、实际命令、日志/截图/索引/线索哈希、进程清理及性能单次观测见 ignored 本地 `artifacts/windows-ab-20261012/validation.json`。不把单机 HMR 时延当成统计性能承诺，不上传原始实验记录。

## 可复用操作

在 UI Lab 工作树 PowerShell 中：

```powershell
npm run lab:check
npm run lab
# 默认 http://127.0.0.1:5175，以本轮终端实际 URL 为准；Ctrl+C 停止。
# 联合验收（脚本自行创建并关闭独立 Vite 和 Chrome，无需先运行上面的 server）：
$env:DOL_LAB_CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
$env:DOL_LAB_TOOLS = 'ABSOLUTE_TOOLS_WINDOWS_WORKTREE'
npm run lab:test
```

编辑真实 `src/shop/Toolbar.vue` 或 `src/shop/style.css` 观察 HMR。在 Lab 线索面板取得当前 clue，用 producer 生成新 index，再由明确的 Tools 工作树消费。旧输出不能覆盖，也不能把 Source Link 接入权限门槛：

```powershell
node component-lab/source-index.cjs --out NEW_INDEX.json
node "$env:DOL_LAB_TOOLS/integrations/soft-and-wet/source-link.cjs" --root ABSOLUTE_UI_ROOT --index NEW_INDEX.json --clue CAPTURED_CLUE.json --out NEW_RESULT.json
```

## Not validated / Known limitations

A 当前仅定位 Lab-owned `shop.toolbar` 与列出的源码/候选样式，不支持任意游戏 DOM 或第三方 handler。`matched` 证明覆盖输入适用，**不证明运行 Mod 制品已加载，不证明 CSS 根因，不证明生产业务事件**。B 的分类/详情是明示占位，回调只改内存；没有接入原生购买、偏好或存档。Android、正式 UI 3.0、其它组件、父层自动断点及真实游戏修复尚未验证。

正式 4.0.1、全局 Skill、GER/Store/Unknown、正在开发的 UI 2.6/3.0 和用户已有未提交文件未修改。未推进 C、未推送/发布本轮成果、未自动通知 UI 对话。

## 待用户确认的 UI 3.0 试用

建议 UI 对话在自己的 3.0 分支薄接入：按其当前组件/props/样式顺序更新 Lab 和覆盖输入，重新生成 index/clue，做一次真实样式或组件任务的「观察→定位→编辑→HMR→正式构建→同场景验证」。不要整分支合并导致 3.0 回退到 2.5，不复制 Runtime 或用内存回调代替业务证明。

先选择一个 3.0 实际高频组件，复用现有 Vue/Vite/Playwright 和项目构建；只在 Source Link 不能回答真实问题时补最小映射。是否需要 GER 由任务决定，不为普通 UI 调试强建 Goal。通过之后再决定覆盖其它组件或推进 C。

## Field Report：Stone Free 3.0 首轮使用（2026-10-13 登记）

UI 对话已按用户后续确认开展实际使用。本节保留此前原型验收的历史边界，不把新的 UI 项目记录算成本工具重新执行的验收。反馈基线是 UI `dev/stone-free-3.0-current` 的 `f247df7f03ea7aabfc13635d44cc7c4cceac28aa`；来源为该项目 `docs/STONE_FREE_WINDOWS_AB.md` 与 ignored `tests/artifacts/stone-free-lab`。本轮只读复核这些记录、现有 producer/consumer 与去重登记，未重跑浏览器、设备或测试。

已复核 producer 列明 `shop.toolbar` 与 `floating.tools` 各自真实组件、样式和接线输入，未把旧 2.5 Lab 整分支覆盖 3.0。保存的商店结果为 `matched`，悬浮结果为 `unknown / index-format`；当前 Tools consumer 的白名单确实只接受 `shop.toolbar / toolbar`。它属于已声明的覆盖边界，不是已支持能力退化或权限拒绝，普通 Debug 不受影响。保存结果对应当时快照，不代表提交或后续改动后的线索仍新鲜。

Source Index 三项通过及类型检查记录存在。成功的 `hmr-data-ready-test.txt` 和对应联合结果证明同源悬浮组件、390px、内存回调、CSS HMR/恢复与商店线索；`hmr-final-test.txt`、`hmr-corrected-test.txt` 等首次失败仍保留，不能因文件名带 final 就当作成功。平板 trusted Pointer、位置保存、设置 Modal 暂停/恢复和关键原状态对照来自 UI 的独立设备记录，不由 Lab 或 `matched` 推导。本工具未重测这些设备行为，也未宣布 UI 3.0 全部完成。

| 候选 | 登记状态与归属 | 提升为实施任务的条件 |
| --- | --- | --- |
| FR-20261013-SF-01A：明确 `floating.tools` consumer profile | Additional coverage / Optional Integration；复用本节已有单组件覆盖限制，非阻塞缺陷，未排入 Remaining work。 | 用户/目标发布明确要求，或真实项目需要可靠悬浮源码关联且现有直接源码/CDP 不足；再核对当前 3.0 的明确合同与负例，不全局扫描、不新建 SDK。 |
| FR-20261013-SF-01B：区分 unsupported component 与 invalid index | 错误解释候选；当前格式检查把不支持的组件也归为 index-format，仍返回 unknown，不伪造匹配。 | 有明确解释需求或反复误判证据时，单独审查原因分类兼容性；不得因此新增权限门槛或让普通 Debug 停止。 |

以下经验按现有规则去重，不新增 Skill 规则或工具任务：旧 `ui/utilities.css` 不存在是项目接入差异，应按实际样式入口调整；折叠 `details` 的 `innerText` 和异步 null 是探针读取/等待问题；人工编辑晚于等待窗口是实验时序问题，不自动归因 Tools/Vite。优先读取实际源码与 `textContent`、等待所需数据就绪，并用无业务影响的控制样式验证 HMR 后恢复原字节。保留失败与时间边界，不进行无依据重试。

本次仅登记；未修改运行实现、全局 Skill、GER/Store/Unknown、UI 工作区，未推送/发布或另行发消息催促工具扩展。UI 的后续自有设置研发由其原计划继续负责。
