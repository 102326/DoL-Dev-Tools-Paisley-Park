# 限定网络实验与脱敏证据

开发工作区提供 `network-scenario`，尚未重新封装。它只临时改变明确CDP目标的请求网络条件与阻断模式，不读取或发送Cookie、Authorization、正文，不主动构造业务请求。页面自身仍可能在解除离线后重试/同步，所以必须核对测试环境及真实数据边界。

```powershell
node scripts/dol-dev.cjs network-scenario --file reviewed-network.json --out artifacts/network-plan --plan
node scripts/dol-dev.cjs network-scenario --file reviewed-network.json --endpoint http://127.0.0.1:PORT --out artifacts/network-run --test-environment yes --exclusive-network yes
```

文件示例：

```json
{
  "schemaVersion": 1,
  "milliseconds": 1000,
  "baseline": {"offline": false, "latency": 0, "downloadThroughput": -1, "uploadThroughput": -1, "blockedURLs": []},
  "scenario": {"offline": true, "latency": 0, "downloadThroughput": -1, "uploadThroughput": -1, "blockedURLs": []}
}
```

时窗1..10000ms，latency单位毫秒0..10000，throughput单位bytes/s（-1无限制，或1..100000000），blockedURLs最多20个、每个256字符的CDP模式。可表达离线、高延迟、限速或选定URL阻断。拒绝throughput=0，不能把它当成离线/停传；匹配Chromium分支的interceptor对零值采用非限速路径，离线使用显式offline字段。[Chromium 8037 ThrottlingNetworkInterceptor](https://chromium.googlesource.com/chromium/src/+/refs/branch-heads/8037/services/network/throttling/throttling_network_interceptor.cc) 文件最多64KiB、原始模式只存在于本地审阅文件，报告保存模式SHA；不会自动猜测或清空既有实验条件。

必须显式声明中性baseline及独占网络设置：无其它客户端同时修改该目标条件，原状态本来就是此baseline。工具没有读取原状态的API，也不能证明多会话隔离。存在自定义原条件或其它网络实验时，不运行该入口；先由拥有它们的项目/客户端恢复并核实。独立endpoint与target-id不自动证明App关联。

兼容入口使用CDP的legacy emulateNetworkConditions及setBlockedURLs；官方已将前者标为deprecated，新请求规则与navigator状态接口的职责分别定义，工具不据此宣称所有provider都支持或断链自动恢复。[CDP Network协议](https://chromedevtools.github.io/devtools-protocol/tot/Network/)

实验设置一旦派发，即使中途失败也在原始连接上分别尝试恢复两个声明基线；每个命令最多1500ms。不得通过新会话冒充原会话恢复。清理acknowledged仅表示协议确认该命令，不证明原状态被读取、其它会话未覆盖、App同步完成或detach后状态持久化；原连接丢失时记unknown，不自动重连/重试实验。Chromium匹配分支的NetworkHandler持有自己的throttling client id，但这不是并发条件合并语义或完整恢复的证明。[Chromium 8037 NetworkHandler](https://chromium.googlesource.com/chromium/src/+/refs/branch-heads/8037/content/browser/devtools/protocol/network_handler.cc)

修改前保存初始Manifest与声明baseline，并把尚未完成的恢复记为unknown；正常控制流finally结束后更新。强制退出、Ctrl+C或进程崩溃不能保证finally/远端恢复；缺少captureEnd的记录只表明进行中或中断，须由原环境拥有者另行核实，不能当作实验完成。

只记录连接窗口内最多200条脱敏网络元信息：method/resourceType/status/时间/时长/failed、scheme及hostname哈希；私有path/query、headers、body和原始error文字全部省略。Evidence的network.json及实验报告的network数组是明确脱敏的HAR等价摘要，不能导入为完整HAR或据此还原原始请求。无历史补采；未完成请求duration/status可为null；遗漏计数保留。

已在独立临时profile的受控浏览器页面验证trusted Recorder、离线失败事件和恢复后正常请求。没有对真实App的云存档/下载链路施加网络实验，不将浏览器协议验收视作WebView/provider业务验收。
