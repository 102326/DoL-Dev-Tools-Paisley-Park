# DoL Dev Tools: Paisley Park — Android 关联进程内存

```powershell
node scripts/dol-dev.cjs process-memory --serial DEVICE_SERIAL --package YOUR.APP.PACKAGE --out artifacts/processes-001
node scripts/dol-dev.cjs evidence --serial DEVICE_SERIAL --package YOUR.APP.PACKAGE --out artifacts/facts-processes --processes yes
```

读取 ActivityManager 的公开 ProcessRecord/packageList，以完整 packageList 成员匹配选取当前 App 的关联进程。不凭进程名包含 WebView/Chromium、父进程或 isolated UID 猜归属，也不把 packageDependencies 当成所属 package。主进程 PID 在开始/结束重新核对，必须出现在准确所属记录中。

按核对出的唯一主 PID 所属 Android user 过滤，不能将其它用户安装的同包关联进程一起采样；记录 userId 和排除数量。没有唯一主 PID 或支持的 user/UID 行格式时不猜测用户或回退。

最多8个关联进程，先主进程；逐 PID 采集 meminfo 并校验返回的 PID/进程名，再复查 ActivityManager 中的 UID/名称哈希/所属。只保存 PSS/RSS 数值、PID/UID、名称哈希、记录时间和状态；原始系统 dump、路径、其它 App 列表与进程名不写入包。60秒总期限、单命令最多10秒；格式/归属/目标变化时保留其它结果并 partial，不换设备或重试。

packageList 是系统报告的关联，不能证明这个进程一定承载选定 page 的 JS renderer。采样顺序不同，不应直接求和宣称同时占用，也不能从单次内存值判断泄漏。前后记录和 meminfo 名称不能完全排除两次观察之间同 PID/同名的进程重生，因此明确记录 process generation not proven。

当前真机报告主进程及一个准确关联的独立进程，两份 PID meminfo 均可读，最终 complete。其它没有该 packageList 成员的沙盒候选被排除。没有将其强行关联到当前 CDP target 或宣称整个 WebView 内存已完整枚举。
