# Android 生命周期元信息

```powershell
node scripts/dol-dev.cjs app-lifecycle --serial DEVICE_SERIAL --package YOUR.APP.PACKAGE --out artifacts/lifecycle-001
node scripts/dol-dev.cjs evidence --serial DEVICE_SERIAL --package YOUR.APP.PACKAGE --out artifacts/facts-lifecycle --lifecycle yes
node scripts/dol-dev.cjs app-lifecycle-diff --before artifacts/lifecycle-001/app-lifecycle.json --after artifacts/lifecycle-002/app-lifecycle.json --out artifacts/lifecycle-diff.json
```

独立profile只采device、app和app-lifecycle，不截图、不打开CDP、不采Console/Logcat、不安装helper、不唤醒或重启。Journey checkpoint可显式选择`"capture": ["app-lifecycle"]`，在既有restart/launch动作前后记录；观察不会自动派发这些动作。Support默认不复制此历史。

读取当前Android user、公开package UID与内核boot ID哈希；若存在唯一主PID，用系统ProcessRecord的精确packageList成员、主进程名、user、真实/hosting UID和非isolated状态绑定，前后复核。跨用户、UID/boot/PID变化或不支持的格式会partial，未经绑定的主PID不输出。没有唯一PID时mainPid为null，不等于App已停止；不推断WebView renderer。

系统`dumpsys activity exit-info PACKAGE`提供保留的ApplicationExitInfo元信息。仅保存当前用户所属package UID的最多32条：PID/UID、设备本地时间、数字reason/status、公开reason符号、进程名哈希和main/associated标记。原始dump、description、trace、state bytes、原进程名不落盘。其它用户排除；截断、格式/身份未知保留incomplete，未知计数为null。总采集60秒、单命令最多10秒，不自动重试或修环境。

reason数字含义以[Android ApplicationExitInfo官方API](https://developer.android.com/reference/android/app/ApplicationExitInfo)为依据；未来未知代码保留数字并标记UNRECOGNIZED。CRASH/CRASH_NATIVE/ANR表示系统报告的相应退出原因；不能从历史条目推断当前页面异常根因、所有未退出的ANR或某个Mod责任。SIGNALED不自动解释成低内存；USER_REQUESTED不自动解释成用户手动操作。历史没有条目不证明从未崩溃。

Diff只比较相同package/user/UID/boot的固定投影。主PID不同只是PID观察变化，不能排除重用、证明Activity/WebView实例recreate或替代实际加载/业务复验。新增条目称newlyReportedExits，系统发布延迟可能使它早已发生；消失只记noLongerReportedCount，不当作删除。时间是设备本地字符串，未猜测UTC偏移、转为主机时间或加入统一时间轴。不同目标/boot或不完整输入保留incomplete，CLI退出1；输入格式/关联无效则拒绝写出。

公共payload定义为[Schema appLifecycle](../schemas/diagnostics-v1.schema.json)。格式验证不保证真实性、隐私或完整系统历史。当前已在授权App只读采集complete，未为了制造条目杀进程、重启、收集堆栈或调试第三方问题。
