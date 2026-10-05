# 性能重复采样

开发入口复用 gfxinfo/meminfo 解析器，增加热状态、电池与可选 CDP 数值指标。单次 2..20 组、间隔 0..5000ms，计划等待总量 ≤50 秒、采样截止 60 秒。顺序与每组实际耗时分别记录，间隔不是保证的固定周期。

```powershell
node scripts/dol-dev.cjs perf-series --serial DEVICE_SERIAL --package YOUR.APP.PACKAGE --out artifacts/perf-series --samples 3 --interval-ms 1000 --webview yes
```

每组核对当前唯一 PID 与最初 PID；变化则停止、保留前组。采集 PSS/RSS、累计帧/采样帧统计，以及支持时的 thermal severity、电池 level/scale/温度/电压/充电枚举。权限或格式未知如实 unsupported；请求能力不完整时 Evidence partial。

`--webview yes` 才连接已核对的 App socket/target。采样当前 CDP 页面的 Performance 数值白名单：heap used/total、Nodes/Documents/JSEventListeners、layout/style/script/task 时间与次数，支持时追加 Memory.getDOMCounters。每组启用自有连接的 Performance domain，在 finally 禁用；截止关闭自有客户端，无后台重试。未选择时原生采样无需 CDP。

gfxinfo 是累计 App 统计，重复组可能包含同一批帧；不是全部游戏速度、独立 FPS 或 Chromium-only timing。Heap/DOM/listener/PSS 上升不证明泄漏；普通series不强制GC、不取heap正文、不测detached nodes/Observer存活，不猜WebView原生renderer子进程所有权。

## 基线 / 打开关闭 / 复采

Journey checkpoint中`performance`采原生gfxinfo/meminfo，`web-performance`采heap/DOM/listener数值；在已审阅的页面打开关闭动作前后分别选择，保留同一Journey内的动作和采样时间。heap used、DOM节点和listener计数必须全部可用才标available；只有Timestamp或部分数字不冒充完整采样。

`leak-probe` checkpoint明确额外请求experimental detached计数；独立命令为：

```powershell
node scripts/dol-dev.cjs leak-probe --endpoint http://127.0.0.1:PORT --out artifacts/leak-baseline.json
node scripts/dol-dev.cjs leak-probe --endpoint http://127.0.0.1:PORT --out artifacts/leak-detached.json --detached yes
```

协议`DOM.getDetachedDomNodes`返回detached树及retainedNodeIds。工具只投影树数量和最多200树/每树1000个retainedNodeIds的计数，不保存/访问treeNode正文；原始协议响应仍在本地运输层收到，已有4MiB上限，超过会断开并如实记unsupported/cleanup未确认。retainedNodeIds数量不是JS wrapper对象数量，截断计数可能只是下界。方法实验性及provider差异明确unsupported，不能用0替代缺失。[CDP DOM协议](https://chromedevtools.github.io/devtools-protocol/tot/DOM/)

派发enable前登记尝试，finally在原连接独立尝试disable；丢失enable响应也尝试清理。清理失败保留warning，Journey保存制品后停止，不报成功。工具不发送collectGarbage或取heap snapshot；内部协议/v8行为和采样扰动未保证。匹配Chromium分支使用heap profiler的detached wrapper观察并构造树，不能以协议观察证明泄漏根因。[Chromium 8037 InspectorDOMAgent](https://chromium.googlesource.com/chromium/src/+/refs/branch-heads/8037/third_party/blink/renderer/core/inspector/inspector_dom_agent.cc)

Timeline显式observerInstrumentation窗口可报告新建且成功instrument的Observer数量与末端WeakRef存活数量，不枚举已有Observer。保存原始bound/arrow方法可能间接保留实例，报告明确instrumentationMayRetainInstances；未强制GC，aliveAtEnd不是无扰动存活或泄漏判断。完整renderer所有权、heap保留链和callback闭包由目标项目公开Integration或Chrome/Perfetto调查，不把generic数字猜成某个Mod的所有权。

当前真机普通WebView数字available；detached请求unsupported且DOM.disable未确认，Journey保留partial并停止复采。浏览器/VM成功不是该WebView实验协议通过。

休眠时 CDP 可能暂停，黑屏截图也不能当作 App 黑屏；核对设备 power 与焦点。`wake` 是显式 Action，采集器不偷偷唤醒设备或重启 App。

独立 `process-memory` 或 `evidence --processes yes` 使用Android公开packageList/user/UID采集逐PID内存，见 [PROCESS_MEMORY](PROCESS_MEMORY.md)。它支持准确关联的isolated进程，但不推断当前CDP page的renderer角色，采样也不是同时发生。
