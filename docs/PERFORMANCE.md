# 性能重复采样

开发入口复用 gfxinfo/meminfo 解析器，增加热状态、电池与可选 CDP 数值指标。单次 2..20 组、间隔 0..5000ms，计划等待总量 ≤50 秒、采样截止 60 秒。顺序与每组实际耗时分别记录，间隔不是保证的固定周期。

```powershell
node scripts/dol-dev.cjs perf-series --serial DEVICE_SERIAL --package YOUR.APP.PACKAGE --out artifacts/perf-series --samples 3 --interval-ms 1000 --webview yes
```

每组核对当前唯一 PID 与最初 PID；变化则停止、保留前组。采集 PSS/RSS、累计帧/采样帧统计，以及支持时的 thermal severity、电池 level/scale/温度/电压/充电枚举。权限或格式未知如实 unsupported；请求能力不完整时 Evidence partial。

`--webview yes` 才连接已核对的 App socket/target。采样当前 CDP 页面的 Performance 数值白名单：heap used/total、Nodes/Documents/JSEventListeners、layout/style/script/task 时间与次数，支持时追加 Memory.getDOMCounters。每组启用自有连接的 Performance domain，在 finally 禁用；截止关闭自有客户端，无后台重试。未选择时原生采样无需 CDP。

gfxinfo 是累计 App 统计，重复组可能包含同一批帧；不是全部游戏速度、独立 FPS 或 Chromium-only timing。Heap/DOM/listener/PSS 上升不证明泄漏；不强制 GC、不取 heap 正文、不测 detached nodes/Observer 存活，不猜 WebView 原生 renderer 子进程所有权。深入问题使用 Chrome/Perfetto 等平台工具；重复打开/关闭的实验可在 Journey 中插入 performance checkpoint，保留动作与采样时间。

休眠时 CDP 可能暂停，黑屏截图也不能当作 App 黑屏；核对设备 power 与焦点。`wake` 是显式 Action，采集器不偷偷唤醒设备或重启 App。
