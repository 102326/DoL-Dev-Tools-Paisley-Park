# Action / Journey：开发中的固定动作与复现实验

这些入口已在开发工作区实现，尚未加入新的封装版本。最终封装等待完整蓝图与开发闭环验收；不是每批发布。

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

最多 50 步、4 次旋转实验、120 秒执行期限；每条 ADB/CDP 命令也有时限。执行链每次 await 后与下一次副作用前检查停止状态，不用 Promise.race 后遗留继续点击的后台流程。普通失败/超时停止后续步骤，不自动重试。

已派发的动作在断链或超时后记 outcome unknown；本地停止不能保证取消或回滚远端动作。等待条件与执行总预算分别记录；远端查询返回慢时不会生成迟到的成功判断。

## 输出与清理

Manifest 使用 schema 1、incidentId、planSha256、工具版本、时间、步骤/制品 SHA 和 cleanup。静态 plan 状态 planned；执行 complete/partial/failed。Checkpoint 不覆盖旧文件，失败仍保留成功部分。输入内容与原始异常省略，selector 保存 SHA；原始计划本身可能有私密输入，不自动分享。

旋转恢复使用独立短预算，原始不存在的设置恢复为删除键；当前值已经等于原值则不再写入。发现外部改变时不覆盖，记录清理失败/冲突。只移除自己已知的 ADB forward；若创建后超时丢失端口，记录 ownership unknown，不猜测删除其他人的转发。

当前完成固定动作、plan/replay/wait/checkpoint 基础。Recorder、矩阵、更多生命周期实验和构建部署闭环仍在后续开发清单，不将基础 replay 当作全部最终能力。
