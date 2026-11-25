# 研发回执

Wonder of U 研究分支在构建生成的 `scripts/dol-dev.cjs` 中提供 `dev-receipt`。用于在本地负责源码、制品和独立 Chrome 的开发者或 Codex，将构建、派发、实载和行为留在同一个回执目录。

```sh
node scripts/dol-dev.cjs --help
node scripts/dol-dev.cjs dev-receipt --help
```

输入为审核过的本地配方与可用的 Node 26、Git、Python 3。只有构建和 ZIP 校验调用 Python，状态读取保留 Node 离线路径。除 URL 映射外，命令文件参数均为绝对路径。配方执行本地 Node 驱动并继承本机运行权限，应先核对源码与参数。回执和 Evidence 适合保存在本地任务输出目录。

## 继续已有任务

| 问题 | 命令 | 如何解读 |
| --- | --- | --- |
| 上一次走到哪里 | `status --receipt DIR` | `load`、`behavior` 和 `next` 来自这份回执的历史证明 |
| 当前源码是否仍对应这份构建 | `verify-source --receipt DIR --recipe ORIGINAL_RECIPE` | 比对声明的构建输入字节与驱动。无须启动浏览器 |
| 原目标现在是否运行该制品的代码 | `verify-current --receipt DIR --recipe ORIGINAL_RECIPE --host PC_HOST` | 同时给出 `source` 和 `currentLoad`。成对制品还返回各角色状态 |
| 新制品是否需要派发 | `deploy-begin --receipt DIR --recipe RECIPE --host PC_HOST` | 源码和制品须可核对。已实载匹配时可直接验证行为，否则在已知不匹配时保留一次派发意图 |

两个 `verify` 命令是只读操作。退出码 0 为匹配，2 为需要重建、失配或无法完成对照，先读 JSON 再决定下一步。命令错误退出 1。若回执是旧研究格式且没有可核对的原配方摘要，历史记录仍可读，明确比较时返回 `unknown`。

`source: needs-rebuild` 可以与 `currentLoad: matched`、`behavior: passed` 同时出现。它表示当前源码和那次构建的输入字节不同，旧制品还在运行，历史行为仍通过。此时为新候选建立新回执；旧回执、旧文档及正在运行的制品照原样保留。HEAD 和 dirty 标记仅作来源信息，未纳入输入清单的 README、说明或 Evidence 不影响比较。配方不一致、输入缺失或无法安全读取时，源码结果为 `unknown`。

### 构建、派发与验证

1. 用 `build --receipt NEW_DIR --recipe LOCAL_JSON` 创建新回执。构建前后各读取一次输入字节，构建器报告使用范围，并验证每个新 ZIP 的成员与摘要。失败记录阻止后续派发。
2. 用 `verify-current` 先看现场，再用 `deploy-begin` 记录决策。只有明确已知不匹配且输入仍匹配时才会留下派发意图。实际部署由目标项目自己的已授权入口完成，一次派发后按现场判断。
3. 如果派发确认无法取得，先读原回执并观察原 Profile、浏览器和 Tab。显式 `pc-bind` 新文档后用 `check-load --receipt DIR --host FRESH_PC_HOST` 核对实载。如果工具明确确认派发和新绑定，可以先用 `deploy-ack --receipt DIR --host FRESH_PC_HOST`。派发为 `unknown` 时，后续实载与行为可以独立得到证明，同一回执的未决状态不会触发重发。
4. 用现有 `pc-observe` 或获准的 `pc-action` 在已验证文档生成新 Evidence，使用 `check-behavior --receipt DIR --host FRESH_PC_HOST --evidence NEW_EVIDENCE --probe PROBE_JS --expect EXPECTED_JSON` 核对。回执检查采集文档、时间、探针和观察结果摘要，行为结论来自实际观测。

恢复时同时交接原回执目录、原配方、原绑定和验收探针。对需要支持脚本 URL 未写入配方的旧单包，`verify-current`、`deploy-begin` 和 `check-load` 可接收 `--script-path /release.js`。作用域限于原来核对的同源映射。

## 配方

单 ZIP 使用 `schemaVersion: 1`。字段包括项目 Git 根目录 `root`、Node 入口 `driver`、`args`、构建相关的项目内相对路径列表 `inputs`、`python`、新输出 `artifact`、ZIP 成员 `scriptMember`、同源 `scriptPath` 和文本 `transformation`。建议为新配方在构建时封存 `scriptPath`。

成对 ZIP 使用 `schemaVersion: 2`，共享项为 `root`、`driver`、`args`、`inputs` 与 `python`。每个 `artifacts` 元素填写 `role`、`artifact`、`scriptMember`、`scriptPath` 和 `transformation`。角色、输出与映射各自唯一。两份 ZIP 都要校验成功才会记录构建通过。需要各自保存 ZIP 全字节摘要、所有成员摘要与选定成员的文本摘要。

驱动在 `root` 下执行，stdout 返回 `{"inputs":["src/entry.js"]}`，所报路径必须在配方声明范围内。适合在驱动提供实际构建图的项目中直接使用它；基于保守的构建输入清单时，记录该清单的覆盖边界。对生成器加入新输入、改工具配置或改变依赖版本，先审查新配方再建立新回执。当前对照以可重复读取的本地源码、配方、驱动和项目选择的锁文件为依据。

转换支持 `utf8`、`utf8-strip-bom`、`utf8-inline-html`。后者只适用于已确认以同一方式转义结束标签的内联转换。浏览器端从绑定文档的上下文取得脚本文本和可比哈希。它能证明各角色的代表性脚本，完整 ZIP 的安装身份以及样式、注入阶段、初始化顺序和业务效果仍需各自的证据。界面行为验证沿用原 Evidence 合同。

详见 [PC 运行时](PC_RUNTIME.md)和[研发流程](DEVELOPMENT_FLOW.md)。
