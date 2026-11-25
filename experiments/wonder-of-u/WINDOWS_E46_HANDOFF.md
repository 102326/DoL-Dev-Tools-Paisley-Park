# Windows 研发接续 · Sticky Fingers E46

2026-11-25。问题是换一个进程接手时，能否说清“我改的源码正在这个页面起作用吗？”。本次在 E46 固定游戏候选的独立副本上验证了加载检查器，包含一组正常部署和一组确认前中断。两组都只派发了一次。7.2 正式版保持原样。

## 这次改了什么

在独立的 Sticky Fingers 源码副本中，为原生检查器按钮补充弹窗类型和目标对话框 ID，让页面能表达这个按钮会打开哪个对话框。原候选中按钮可见，但没有该关联。候选在 DoL 的 Start 页面实际打开检查器后，探针读取按钮指向的元素，确认它是已打开的原生对话框，而且里面有检查报告。这证明了 DOM 关系和按钮行为。屏幕阅读器的实际朗读另需验证。改动只用于这份副本，未提交给加载器项目。

使用 Windows、Node 26.13.0、Python 3.14.9、Chrome 157.0.8103.79。研发 CLI 的执行来源是 `00741a7b3023c82648db7b5a374a8b84af6a58fe`。加载器源码固定为 `c3c7c58ac3f8256ca7a815157ffc6e07ea57cc99`。按锁文件离线安装构建依赖，调用加载器本身的 `buildMainline()`。两次候选构建均有未提交的同一处源码修改。配方核对了 esbuild 输入图及构建入口、package 和锁文件，共 29 个输入。

| 可复核的对象 | SHA-256 |
| --- | --- |
| E46 原单包页面 | `4a16a47040900df60e041fb262b03a016a1728bcd69f2f043e182c048fb8b4d1` |
| 原候选内嵌的加载器，与本轮干净源码构建字节相同 | `70c9b33a3e38bcb9b3a8a8578be08978aa4dfe8fb20241b0ea61d890ada97b6a` |
| 干净源码的构建输入集合 | `b941b167e1e5844f15f546a676069ccf8f1ed42b238bab34347f8868225c8ae6` |
| 同一提交上修改后的构建输入集合 | `6c214de736a80e92e9ade1a9cef0c84fd20042d82d882f62b4c504883d42f80d` |
| 旧加载器 ZIP | `3d46e5e8b215101b8bd7e9946c7508a9478469bedbdc8c8124811dd3435abb7c` |
| 候选加载器 ZIP，两次独立构建相同 | `5f18ff79fce926e59bbdb9bea3a194847c997b931d645dfc9ade7c85c4fe4789` |
| 候选 ZIP 中的脚本，也是两次 CDP 读回的 UTF-8 文本摘要 | `9c04406a1ceb26822b4a14c0cb75d2cabeba5537960939ce427372ae31e35c3f` |
| 隔离回环宿主实际提供的页面文件 | `eac0b43ee46aa6cae800cc9805ff34301d8bd8fa31e1ab7ed700a06e6cad19fc` |

从固定 E46 页面中按精确字节匹配一次原 bundle，在原位置改用同源脚本 URL，保留游戏和原有单包输入。页面加入资源策略限制外部连接。两组分别使用新 Profile、独立回环服务和精确目标。服务在部署时校验整个 ZIP，再从 ZIP 中读出成员提供给页面。浏览器侧使用 `Debugger.getScriptSource`，只证明当前文档中这份脚本文本的身份。这轮没有验证原样 `file://` 分发、整包在浏览器内安装、游戏进度或真实存档。

## 命令与接手证据

以下是本轮调用的正式入口，变量代表各组自己的本地路径。构建配方使用 `schemaVersion: 1`，成员为 `loader.js`，URL 为 `/loader.js`，转换为 `utf8`。构建器输出实际 metafile 输入，ZIP 成员内容使用加载器构建输出的原始字节。

```text
node "$CLI" dev-receipt build --receipt "$RECEIPT" --recipe "$RECIPE"
node "$CLI" dev-receipt verify-current --receipt "$RECEIPT" --recipe "$RECIPE" --host "$HOST"
node "$CLI" dev-receipt prepare-handoff --receipt "$RECEIPT" --recipe "$RECIPE" --host "$HOST" --probe "$PROBE" --expect "$EXPECT"
node "$CLI" dev-receipt deploy-begin --receipt "$RECEIPT" --recipe "$RECIPE" --host "$HOST"
```

初次比对退出 2，两次都是当前源码匹配、现场仍为旧脚本。写入部署意图后，先从原文档读到 `inspect-pending-deployment`。每组服务只接受一次派发并刷新原 Tab。下列命令从各自的回执目录运行，继续步骤按当时的 `resume` 建议执行。

```text
node "$CLI" dev-receipt resume --receipt .
node "$CLI" dev-receipt continue --receipt . --step rebind
node "$CLI" dev-receipt deploy-ack --receipt . --host "$FRESH_HOST"
node "$CLI" dev-receipt continue --receipt . --step check-load
node "$CLI" pc-action --host-file "$FRESH_HOST" --file "$OPEN" --out "$EVIDENCE" --scope "#sf-native-inspector" --probe "$PROBE" --test-environment yes
node "$CLI" dev-receipt continue --receipt . --step check-behavior --evidence "$EVIDENCE"
node "$CLI" dev-receipt resume --receipt .
```

只有正常组执行了上面的 `deploy-ack`。中断组的部署进程在服务已派发、回执尚无 ACK 时以指定退出码 73 终止。随后启动的独立操作进程读取封存入口，先查原目标，得到 `document-changed`，再按建议重绑。两组分别确认了同一 Profile、浏览器、Tab、Origin 和 URL，以及已变化的 loaderId 与 uniqueContextId。这是实际操作进程的交班，未运行新一轮模型会话。

| 接手时的检查 | 正常部署 | 部署确认前中断 |
| --- | --- | --- |
| 重新绑定后读到的脚本 | 候选匹配 | 候选匹配 |
| 点击后对话框类型、打开状态、报告存在 | 三项均符合预期 | 三项均符合预期 |
| 接手完成时的部署记录 | `acknowledged` | `unknown`，无 ACK |
| 实际派发 / 换文档后重绑 | 各 1 次 | 各 1 次 |

最后在同一 HEAD 的隔离副本中再次修改按钮源码，保持原页面运行。两个回执都返回当前源码 `needs-rebuild`、实载 `matched`、历史行为 `passed`，建议另建回执。强行请求继续检查行为均以 `HANDOFF_STEP_BLOCKED` 退出 1。前后复核的 13 份顶层回执文件逐字节未变。两个浏览器与回环服务均已关闭。原始回执、构建图、操作记录及实验副本留在本地。

## Android 壳的本地构建

同一研究提交的独立 Kotlin 工程在 Windows 用 Temurin 17.0.21.1、Gradle 8.9、Android SDK Platform 35 和 Build Tools 34.0.0 执行了 `:app:assembleDebug`。Gradle 和 JDK 的便携归档分别核对了发行方 SHA-256；工具、SDK 与构建日志位于项目本地。构建重用了既有 SDK 许可。APK 为 1,266,190 字节，SHA-256 为 `c3ac736fbbb8c4784bbcd152fa7a4acb1d622b16c4253d59a6ede3c764088677`。这个摘要标识本机这份调试签名制品。

```text
gradle --no-daemon -p experiments/wonder-of-u/android-shell :app:assembleDebug
aapt dump badging app-debug.apk
apksigner verify --verbose app-debug.apk
node --test tests/dev-receipt.test.cjs experiments/wonder-of-u/android-shell/shell.test.cjs
node tools/typescript/build.cjs --check
```

从 APK 读回包名 `org.paisleypark.wondershell`、入口 `MainActivity`、最低 API 26、目标 API 35；清单未声明 INTERNET，v2 签名验证通过。上述四个 Node 定向用例及生成物一致性检查通过。APK 留待独立设备窗口，安装、renderer 重建和真机帧观测尚未执行。

## 给下一位研发者

独立候选已经走完从未提交源码到真实游戏页面检查器的研发闭环。接手时先比对当前源码和现场文档；部署确认遗失时，可以靠原目标的实载与行为证据继续，同时保留未知状态。现有研发回执足以支持这条路径。研究 CLI 的帮助文字已补明适用的隔离本地 Chrome 范围。本轮没有证据要求引入 MCP 编排或变更 GER。

**可单独转交 Gemini。** Windows 上用同一固定游戏候选完成了正常部署和一次真实进程中断。新进程都能在原 Tab 识别新文档、读回脚本并验证检查器；中断组没有重发，也没有补造部署确认。之后仅修改源码，旧页面仍匹配，工具要求重建。接下来若要扩展结论，优先选择确实需要跨宿主交班的研发任务。本次没有验证模型接手、移动端实载或游戏存档。
