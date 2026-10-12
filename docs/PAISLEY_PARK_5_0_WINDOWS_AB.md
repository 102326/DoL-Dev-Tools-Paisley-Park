# Paisley Park 5.0：A/B Windows 接续验收

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
