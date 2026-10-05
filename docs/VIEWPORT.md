# Viewport Matrix

`viewport-matrix` 在调用者选定的本地 CDP page 上执行 1..6 个视口配置，逐例保存 scoped DOM、CSS 和私有 PNG。它检查浏览器布局，不模拟完整实体设备、系统字体、触摸、GPU 或 Android 生命周期。

```json
{"schemaVersion":1,"baseline":"none","scope":"#passages","profiles":[{"name":"phone","width":360,"height":640,"deviceScaleFactor":1,"mobile":false},{"name":"tablet","width":800,"height":1000,"deviceScaleFactor":1,"mobile":false}]}
```

```powershell
node scripts/dol-dev.cjs viewport-matrix --file viewport.json --out artifacts/viewport-plan --plan
node scripts/dol-dev.cjs viewport-matrix --file viewport.json --endpoint http://127.0.0.1:PORT --out artifacts/viewport-run --test-environment yes --exclusive-metrics yes
```

执行前，调用者必须确认目标是测试环境、没有已有 device metrics override，也没有其它客户端同时修改 metrics。`baseline:none` 是声明，工具不能读取并恢复任意已有 override；观测 innerWidth 也不能证明原设置为空。计划检查不连接设备或改 metrics。

范围必须唯一；宽高 240..2560、scale 0.5..3、物理像素乘积 ≤800万。每例失败即停止；已成功资料保留，禁止覆盖输出。JSON 经过共享脱敏，PNG 仍需人工检查。完整采集不自动判布局或兼容通过；mobile=true 时实际布局宽度也可能与请求不同，记录观察结果供复核。

正常结束/失败的 finally 在原 CDP session 上调用 clearDeviceMetricsOverride，并读取恢复后的视口与开始观测比较。命令确认、观测匹配和真实原设置恢复是不同证据。连接丢失、进程终止或竞争设置可能留下未知状态；不新建 session 重试恢复。初始 manifest 在改变前保存 cleanup unknown，恢复不明或观测不匹配最终为 partial。

已在受控桌面浏览器完成三种宽度采集和恢复观测；这不是 DoL 实体设备矩阵验收。物理设备/版本矩阵使用 [ACTIONS](ACTIONS.md) 中的显式目标 matrix，每台设备单独核对。
