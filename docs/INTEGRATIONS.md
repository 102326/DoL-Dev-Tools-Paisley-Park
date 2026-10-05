# Public Integration Contract 1

1.1.0 提供显式本地 `.cjs` 接入。Soft & Wet 与外置集成使用同一执行路径；不依赖 UI 源码、自动下载、插件扫描或某个 Mod 的内部对象。

## 使用

```powershell
node scripts/dol-dev.cjs evidence --serial DEVICE_SERIAL --package YOUR.APP.PACKAGE --out artifacts/example-001 --scope '#passages' --integration-file integrations/examples/dom-summary.cjs
```

`--integration-file` 接受一个已审阅的本地模块；相对路径相对于调用者当前目录。可同时给 `--integration soft-and-wet`，分别记录两个结果；同一选项不接受重复。没有这些选项时不导入任何集成模块。
内置Soft & Wet入口为[integrations/soft-and-wet/index.cjs](../integrations/soft-and-wet/index.cjs)，无需猜测`integrations/soft-and-wet.cjs`。通常使用命名选项即可，外置模块才需显式文件路径。
文件缺失、导入报错、契约不支持或执行失败作为该可选集成的状态记录，通用采集继续。若没有可用 CDP，则跳过，不导入模块；Generic 因自身必需步骤缺失而 partial 与集成失败无关。

## 模块接口

导出 `contractVersion: 1` 和四个函数；同步返回或 Promise 均可。完整可运行例子见 [dom-summary.cjs](../integrations/examples/dom-summary.cjs)。该例只读取原版页面结构，是接入示例，不冒充 MapleBirch/ModHub 的已验收专属集成。

| 接口 | 输入与返回 |
| --- | --- |
| `describe()` | `{name, version, supportedApiVersion?, capabilities?}`。name 为 1..64 个小写字母/数字/连字符；version 为 1..64 个字母/数字及 `._()+-`。可选 API 版本为非负整数；capabilities 最多 16 个小写标签，1..64 字符，允许数字、`.`、`-` |
| `detect(ctx)` | `available / unavailable / unsupported / failed`。只有 available 才调用 collect |
| `collect(ctx)` | 普通 JSON 对象，含同一组枚举的 `status`，其它字段是作者自己的诊断摘要 |
| `redact(result)` | 自己的白名单投影；必须返回对象并保持 collect 的 status。之后仍经过核心启发式过滤 |

`ctx` 只提供 `ctx.client.evaluate(expression)`，执行已经审阅的只读 CDP JS 探针。不注入 ADB、设备 serial、输出目录或 App 私有数据。调用者必须 await 自己的异步工作，不能启动后台任务、抓全页业务状态或把诊断 getter 改成写操作。

这里的“只读”是Probe/Workflow的使用约束；evaluate执行器可以运行传入的任意页面JavaScript，并没有只读权限隔离。自定义表达式和模块必须由使用者审查，不能将接口精简或Worker执行描述成未知插件的安全沙箱。

name/version 描述的是桥接模块；目标 Runtime/Mod 的实际版本可以作为经过白名单处理的诊断字段。capabilities 描述桥的采集能力，不保证目标项目的对应 API 一定存在；仍须 detect/collect 实际检查。

## 时限与结果

- 入口文件最多 64 KiB，按真实路径验证 `.cjs` 普通文件；仅记录其 SHA，不导出私有路径。SHA 不覆盖依赖模块，也不是来源签名。
- 整个 Worker（文件检查/导入/describe/detect/collect/redact/序列化）最多 10 秒；单集成最多 16 次 evaluate，每个表达式最多 32 KiB。连接使用同一已验证 ADB 转发，另建临时 CDP 会话，不创建另一条转发。
- 模块与核心脱敏后的结果包最多 64 KiB UTF-8；超限/类型错误/状态不一致记 failed。stdout/stderr 丢弃，原始异常正文不导出。
- `unavailable` → skipped，`unsupported` → unsupported，`failed` → failed，`available` → completed。它们均为 optional，不计入 Generic 完整性失败。
- 每个结果只能保存为 `integration-N.json`，外层 schema 1 / incidentId / source / capturedAt；即便模块诊断里有 `file`、`binary`、`extension` 字段，也只是 JSON，不触发文件读取或二进制保存。
- Manifest 的 integrations 记录 index/name/version/status、可选 API/capability、入口 SHA。没有名字的加载失败保留 null。步骤说明对应阶段失败、超时或 Worker 提前退出。
- 不自动重试、换设备或覆盖成功现场。Support 只投影公共身份/状态及历史兼容摘要，不复制模块自定义诊断正文。

Worker 用于故障隔离，**不是安全沙箱**。模块依然拥有 Node 文件/网络权限。终止 Worker 不回滚其副作用，也不能保证取消已提交的 WebView 求值；10 秒保证的是本地采集流程恢复。只执行自己审阅过的本地模块。

## 作者的隐私责任

尽量不采集敏感内容，而不是读完后再尝试删掉。默认排除用户输入、角色/存档正文、Credential、Cookie、Token、云端数据、私有路径与原始日志。只输出明确的版本、状态、计数和经核对的枚举。
核心过滤是启发式保护，不保证普通自定义字段中的自由文本一定安全。模块的 collect/redact 必须自行白名单化；分享任何结果仍需人工复核。未知 API/schema 记 unsupported，不能猜测内部 store 或偷取私有状态来补齐诊断。

## 最小验收

作者应覆盖：目标缺失、未知 API、正常结果、诊断方法报错、redact 报错/改变状态、超时、敏感值过滤。验证 Generic 制品保留、manifest/artifact 状态一致、防覆盖及临时资源清理。当前工具的回归见 [integration.test.cjs](../tests/integration.test.cjs)；这不代替每个第三方项目自己的运行验收。

原有模块对象注入是内部测试钩子，不作为外部作者的公共主机 API。公共接入走 CLI 文件入口与 Contract 1。

目标自有原生实例的只读例子见 [native-lifecycle.cjs](../integrations/examples/native-lifecycle.cjs) 与 [原生验收配方](NATIVE_RECREATE.md)。不存在该桥时跳过，未知契约拒绝；它不为通用 DOM 增加角色或指纹字段，也不通过桥派发动作。
