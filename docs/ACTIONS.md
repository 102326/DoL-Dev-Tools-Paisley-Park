# Action / Journey：固定动作与复现实验

这些入口已包含在1.2.0封装中。后续开发修改与实机验收另行记录，不按每批修改发布。

## 使用

```powershell
node scripts/dol-dev.cjs journey --file docs/journey.example.json --serial DEVICE_SERIAL --package YOUR.APP.PACKAGE --out artifacts/plan-001 --plan
node scripts/dol-dev.cjs journey --file docs/journey.example.json --serial DEVICE_SERIAL --package YOUR.APP.PACKAGE --out artifacts/journey-001 --test-environment yes
node scripts/dol-dev.cjs action --file reviewed-action.json --serial DEVICE_SERIAL --package YOUR.APP.PACKAGE --out artifacts/action-001 --test-environment yes
```

必须先核对目标测试环境和具体动作语义。`--test-environment yes` 不授权真实存档/云数据的删除覆盖、正式数据清空或凭据修改。作者先检查实际按钮/输入目标；tap/click 不能自动证明业务动作无破坏性。

`--plan` 只验证静态完整计划并保存脱敏摘要，不连接设备或执行动作。未来步骤的控件可能尚未出现，selector 的实际匹配/可用性在执行时重新检查；plan 不宣称所有 selector 已在现场唯一匹配。

## 固定动作

Action 文件是单个对象，例如 `{"type":"web-focus","selector":"#your-test-control"}`。Journey 包装见 [journey.example.json](journey.example.json)。不接受任意 JS、shell、循环、分支或业务 DSL。

| type | 字段与范围 |
| --- | --- |
| web-click / web-focus | selector，1..256 字符；唯一、连接、可见、可操作的 HTMLElement；focus 检查 activeElement |
| web-input | selector、value ≤1024 字符；原生 input/textarea setter，派发 input/change；拒绝 password/file/hidden/button/submit/radio/checkbox、disabled/readOnly |
| tap | x/y 非负整数；按本次 PNG 屏幕尺寸检查；坐标的业务含义仍由调用者核对 |
| input | value ≤256，限定 ASCII 字母数字、空格与 `.,_@:+-`；空格编码 %s，不允许任意远端 shell 字符；中文 WebView 输入使用 web-input |
| back / home | 无额外字段；当前目标 App 持有前台与窗口焦点 |
| wake | 唤醒明确测试设备屏幕，仍验证当前用户安装的目标 App；不输入凭据、不解除锁屏，不保证 App 获得焦点，也不自动重新休眠 |
| launch / restart | 当前 Android 用户安装的明确 package；resolve-activity 精确绑定 package/user；restart 只 force-stop/start，不清数据；检查 start Status: ok |
| rotate | degrees=0/90/180/270；临时系统旋转设置，在 Journey 清理中恢复。App 可能锁定方向，写设置成功不等于画面实际旋转 |

交互动作在准备截图/连接后、派发前再次检查精确 foreground package/user 和窗口焦点，系统弹窗或其它 App 焦点导致拒绝。检查与操作不能跨进程原子化，不能消除最后一次核对后系统再切换的所有竞态。

## Wait 与 checkpoint

Wait 支持 `milliseconds=1..2000`，或 selector + condition（exists/visible/hidden/absent）+ timeoutMs=1..10000。唯一性/可见性按实时 DOM 判断，不读取 input 值或业务状态。

Checkpoint 显式选择 screenshot/dom/css/environment/console/network/performance，以及 storage/timeline 和六种 DOM Inspector mode（见 [INSPECTORS](INSPECTORS.md)）；DOM/CSS/Timeline/Inspector 必须给本步 scope 或顶层 scope。Timeline 额外要求 timelineMs=1..10000，可选择布尔 observerInstrumentation。Screenshot 是当前设备屏幕，不承诺一定是目标 App；Android performance 不依赖 CDP。其余来源要求重新核对目标 PID/socket/target，失效则停止并保留此前制品。

后续新增web-performance（heap/DOM/listener数值）与leak-probe（显式加experimental detached元信息），见[PERFORMANCE](PERFORMANCE.md)。任何请求的collectorStatus failed/unsupported会先保存制品再停止Journey，不把清理失败记为检查点成功。

1.2发布后增加原生`app-lifecycle` checkpoint，采系统退出元信息而不连接CDP；见[生命周期](APP_LIFECYCLE.md)。它会重新绑定当前user/UID/主PID，格式或身份未确认时保留partial并停止后续步骤。已有restart动作确认不代替后续页面或业务就绪条件。

最多 50 步、4 次旋转实验、120 秒执行期限；每条 ADB/CDP 命令也有时限。执行链每次 await 后与下一次副作用前检查停止状态，不用 Promise.race 后遗留继续点击的后台流程。普通失败/超时停止后续步骤，不自动重试。

已派发的动作在断链或超时后记 outcome unknown；本地停止不能保证取消或回滚远端动作。等待条件与执行总预算分别记录；远端查询返回慢时不会生成迟到的成功判断。

## 输出与清理

Manifest 使用 schema 1、incidentId、planSha256、工具版本、时间、步骤/制品 SHA 和 cleanup。静态 plan 状态 planned；执行 complete/partial/failed。Checkpoint 不覆盖旧文件，失败仍保留成功部分。输入内容与原始异常省略，selector 保存 SHA；原始计划本身可能有私密输入，不自动分享。

旋转恢复使用独立短预算，原始不存在的设置恢复为删除键；当前值已经等于原值则不再写入。发现外部改变时不覆盖，记录清理失败/冲突。只移除自己已知的 ADB forward；若创建后超时丢失端口，记录 ownership unknown，不猜测删除其他人的转发。

## 手动 Recorder

```powershell
node scripts/dol-dev.cjs journey-record --endpoint http://127.0.0.1:PORT --scope '#your-test-panel' --milliseconds 5000 --out artifacts/recording.json
```

这是限定 WebView 范围的短时被动记录：只接受真实 trusted click/input/change，最多30秒、50条、结构深度8；不读取输入值、文本、HTML、原生触摸或历史事件。结束后移除自己的监听器；清理冲突会返回失败退出码。输出 recording 与 candidate；输入保持 unresolved-input，SVG等非HTMLElement点击保持 unresolved-click。所有候选都不可直接执行，结构地址不证明稳定控件身份。作者核对现场业务含义后，提取固定动作字段、重新选择目标、显式填写测试输入与等待条件，才能形成 Journey；不自动填充真实密码或业务输入。

独立 endpoint 不证明目标 App 关联。候选保留调用者选择的 scope 派生 selector 以便审阅，原计划/候选不自动投影到 Support，也不默认公开。

## 选定矩阵与生命周期

```powershell
node scripts/dol-dev.cjs matrix --file reviewed-matrix.json --out artifacts/matrix-plan --plan
node scripts/dol-dev.cjs matrix --file reviewed-matrix.json --out artifacts/matrix-run --test-environment yes
```

矩阵文件为 `{"schemaVersion":1,"cases":[{"name":"resume","serial":"DEVICE_SERIAL","package":"YOUR.APP.PACKAGE","journey":{"schemaVersion":1,"steps":[{"type":"home"},{"type":"wait","milliseconds":300},{"type":"launch"}]}}]}`。最多12个不同slug用例、文件64KiB；全部计划在创建输出/操作前验证。每例明确设备/App，按顺序执行；失败或不完整停止后续用例，保留各例制品，不重试，不自动安装/切换Mod或清空数据。

可选 preconditions 包括 androidVersion/appVersion 与 requiredMods 名称数组，执行前用通用 Environment 检查。公开 reported Mod 列表只证明该列表报告了名称，不能证明全部导入库存、enabled 或实际执行顺序。原输入包含 serial，保持本地；结果省略 serial。plan不连接设备、不检查现场前提，任一计划生成失败不会报告planned成功。

home→launch表达后台返回；restart表达强制停止后重新启动，不清数据。用例必须按实际加载时间明确安排等待/检查点。launch结果只证明Android启动命令成功；页面就绪和业务状态另外验证。当前已实测后台返回；重启命令完成后的页面等待未在所选时限通过，保留为partial，不自动重试制造通过。

更多实体设备/版本/组合须逐个明确选择；标签、单设备运行或浏览器模拟均不代表完整兼容矩阵。构建部署闭环仍在开发清单。
