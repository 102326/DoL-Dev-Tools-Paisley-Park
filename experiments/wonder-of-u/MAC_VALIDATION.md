# Wonder of U · Mac 研发验证

日期为 2026-11-25。正式 Gold Experience 7.2 基线是 `a8b1dfa235c6ece17d10ef4a3f47c5f658832449`，本轮从研究基线 `8f61e66f347fe8012dab140e921635a59c2fba97` 接续。实际运行环境是 macOS 27.2.1 ARM64、Node 26.13.0、Python 3.9.6、Chrome 157.0.8103.79。两条 Chrome 路径均使用独立 Profile、回环 HTTP 和中性内容。

## Delivered

- [研发回执 CLI](dev-receipt.cjs)随研究源码提供。构建记录 Git HEAD、dirty 状态、实际输入图、本地构建器与配方摘要、ZIP 和成员摘要。失败将后续阶段截断。派发意图、派发确认、文档实载、行为分别入档，既有结果采用独占写入。CLI 复用 7.2 的 Chrome 目标绑定、Action 和 Evidence。
- [实载核对](loaded-script.cjs)以选定 ZIP 成员的原始字节 SHA-256 保留制品身份，对明确 UTF-8 解码和已知转换后的文本作独立摘要。选定 Chrome 文档的默认上下文中，通过 `Debugger.getScriptSource` 读取代表性脚本，要求文档在观察期间保持一致。多个同 URL 候选、来源不可比或连接异常时保留 Unknown。V8 的解析事件摘要和事件顺序不参与制品判定。 [CDP Debugger](https://chromedevtools.github.io/devtools-protocol/tot/Debugger/)
- [Kotlin Android 壳与 Windows 交接](android-shell/README.md)使用独立包、私有制品、稳定本地 HTTPS origin、版本化遥测和 Node 验证器。两份用于同平板 Acrylic 对比的中性制品已在 Mac Chrome 实跑。

## Validated

### Sticky Fingers

使用在用的真实诊断组件，固定 E35 源码为 `ab94d07bf2a54d3635ac5731f4a5d00eafe1ad1b`。针对当前 E36 源码 `c3c7c58ac3f8256ca7a815157ffc6e07ea57cc99` 只读核对，确认原回调仍缺少焦点归还。本轮实际构建、改动及测试均基于所列 E35。现用真实内容 collector 已要求 7.2.0，历史脚本存在不同的版本约束。中性重现使用 esbuild 和 7.2 的公开 CLI。

| 检查 | 实际结果 |
| --- | --- |
| `source-find` 定位和原实现反例 | 收起诊断后面板关闭，主切换控件没有获得焦点 |
| 同一 HEAD 且两次均为 dirty | 实际构建输入字节与制品摘要均能区分 |
| 旧制品、错代文档和旧行为 Evidence | 旧包返回 mismatch，派发前文档被拒绝，旧 `pc-action` 清单被拒绝 |
| 同一 `release.js` 的中文反例 | 相同源码构建输入与脚本映射，仅中性中文标记不同，运行态拒绝了另一份包 |
| 应用侧回执超时 | 实际发出一次 Chrome 重载，本地测试交接层弃收响应，回执维持 unknown；后续通过原目标实载核对 |
| 派发连接实际断开 | 单独运行向 Chrome 发出一次重载，派发连接先关闭并收到 `CDP_CONNECTION_CLOSED`，观察连接发现原目标新文档，而后继续同样的核对 |
| 修补后行为 | `pc-action` 后证明面板关闭，焦点返回标题控件 |
| 防止重复派发 | 实载映射不可确认时不建立新意图，第二次 intent 被拒绝，正确包已经加载时新检查直接进入行为核对 |

候选中性 ZIP SHA-256 为 `823d023071b9de41c76d4d2a63abd0da2a9f7b4f38154b1e0d2c9490bc633bb7`。Chrome 和回环 HTTP 在每次完整运行后关闭。

### 两个 Codex 会话的接续对照

在同一次真实超时夹具后，启动两个新临时 Codex 会话，模型为 `gpt-6.2-sol`。两者拿到同一份脱敏 7.2 人工交接摘要，第二个另有结构化回执状态。会话只输出下一步计划；第二个会话的安全决定通过校验后，独立 CLI 进程在活目标上实际执行实载与行为核对。原始对话、Profile 和运行证据留在本机。

| 观察 | 7.2 CLI 人工交接摘要 | 加同一条研发回执 |
| --- | --- | --- |
| 从启动会话到取得决策 | 17.692 秒 | 10.534 秒 |
| 选择观察原目标、核对实载、核对行为 | 正确 | 正确 |
| 拒绝旧文档行为证据 | 是 | 是 |
| 提议重新部署 | 否 | 否 |
| 明确维持派发确认 unknown | 否 | 是 |

这是同一场景、固定顺序、各一次的**决策时间**，含会话启动和模型耗时，样本不足以估计整体提速或重部署率。前一次启动曾因临时子会话的 stdin 未关闭而超时，修正后重跑通过，超时样本未计入上表。一次更严格的结构检查复跑中，基线 18.482 秒后未给出可用结构，回执组 8.552 秒后给出安全决策并在现场完成接续。两次试验仍不足以判断总体效率。独立会话执行全链的任务仍需进一步验证。

### Soft & Wet

使用固定 4.5.1 源码 `d643674cedca5dafc05b83d59d14a2fb5342d0ca` 的 Acrylic 模块。用同一 `source-find → build → check-load → pc-action → check-behavior` 入口验证 live，并用原目标中 `deploy-begin → 重新载入 → pc-bind → deploy-ack` 切换验证 static。两份使用相同 HTML、CSS 和 `Exercise` 交互，浏览器各测得计数 1；同一面板实测 `blur(22px)` 与 `none`。这里验证了真实材质模块的中性用例，原 Mod 打包与游戏内挂载留待后续。

- live ZIP SHA-256 `7dcff8a80cf492bf29cfc246e97bac22f06c79cabd307fad8655a3f4acff6394`
- static ZIP SHA-256 `e5b950e13c9c9ab7a7366341e1ef9d53de09de9386aeaa434d39beda1f32496c`

### 本机入口和定向检查

从 Git 根目录运行，英文字段是待替换的绝对路径。Sticky Fingers 需要固定提交的干净、可修改、一次性工作树，以及已有项目 esbuild 依赖目录。Soft & Wet 的最小源码检出见 [Windows 接续](android-shell/README.md#生成同一组中性制品)。为每次浏览器运行使用不同的空输出路径和可用本地端口。

```text
node scripts/dol-dev.cjs --version
node --test experiments/wonder-of-u/receipt.test.cjs experiments/wonder-of-u/android-shell/shell.test.cjs
node experiments/wonder-of-u/dev-receipt.cjs --help
node experiments/wonder-of-u/sticky-browser.cjs ABS_STICKY_WORKTREE ABS_PROJECT_WITH_ESBUILD ABS_CHROME NEW_ABS_OUT 18797 python3
node experiments/wonder-of-u/soft-wet-browser.cjs ABS_SOFT_WET_WORKTREE ABS_CHROME NEW_ABS_OUT 18798 python3
```

- 设置 `WONDER_CODEX` 为本机 Codex 的绝对可执行路径即可增加两个临时只读会话，入口依赖该宿主的正常登录和本机权限。设置 `WONDER_DISPATCH_FAULT=disconnect` 运行独立断连反例。两种场景使用各自干净工作树与新证据目录。
- Node 定向回归 7/7 通过，覆盖同 HEAD dirty 输入、回执独占写入与 Unknown、错代文档、真实 CLI 构建失败截断、CDP 脚本文本比较、Android 遥测归属及私有目录读回屏障。Android 的 Node 替身用于验证数据合同和主机分支，真机传输单独验收。

## Known limitations

- 构建器是显式审查过的本地程序。记录构建前后输入及实际报告图，无法发现两次采样之间发生的编辑后还原。该流程要求构建输入稳定，不以 Git HEAD 或 dirty 标记代替内容。
- 回执按目录保留原决策，适用当前单操作者接续。创建另一个目录不会继承旧记录；未决派发与原回执一同交接。当前写入依赖本地文件系统支持独占硬链接，主机断电持久性、并发独立操作者和 Windows 文件系统待核验。
- 文本比对证明选定脚本中的内容，行为观察证明明确的 DOM 结果。APK 安装身份、全包加载、初始化顺序、实际业务结果各自取证。完整转换图未知时先保留 Unknown。
- 当前操作对照已能在同一个 CLI 上跑通。MCP、公共 SDK、SQLite 及产品接入保持为待证据决定的工作项。若独立会话的真实项目接续持续卡在站点重绑或工具发现，再测共享同一份回执的 MCP 入口。

## Not validated

Windows Chrome／NTFS、Android APK 构建、ADB 真实传输、目标发现和清理、同平板 FrameMetrics 对比、renderer 重建、真实 DoL 内容及 Mod 正式制品链仍待相应环境验收。先复跑 [Windows 中性实验](android-shell/README.md)，再在已授权的实际 Sticky Fingers 入口测试加载器转换与接续，复用现有备份、证据目录和反例。研究分支保留 7.2 的发布包边界。
