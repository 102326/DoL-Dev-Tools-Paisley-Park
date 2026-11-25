# Android 中性测试壳 · 2026-11-26 平板交接

Windows 上从研究基线 `970875f20eb349e953a11da2e135fc232cf22a8a` 接续。目标为 Android 17 平板上的独立调试包 `org.paisleypark.wondershell`，系统 WebView 为 157.0.8103.52。开测时只有一台在线设备，当前用户为 0，已解锁并停在桌面。包管理器未发现该包或保留的安装记录。首次安装后直接在设备上核对 base.apk 的 SHA-256，与上轮已检查签名、包名和权限的调试 APK 一致。

## 实际走过的入口

从固定的 Acrylic 源文件构建 live 和 static 中性 ZIP。分别经 `stage.cjs` 传入壳的私有目录，读回整包，点击壳的激活按钮；每次激活后从当前壳 PID 对应的调试 socket 发现精确 page，再用 `record.cjs` 核对该文档中 `release.js` 的 CDP 脚本文本。具体参数见[操作清单](README.md#构建选择设备和发布到私有目录)。各步使用不同的本地证据文件。

| 实测 | 活动制品与实际行为 |
| --- | --- |
| live，视图代次 1 | 整包及成员核对通过，文档脚本匹配。计算样式为 `blur(22px)`。在绑定目标派发一次触摸后，Exercise 计数从 0 到 1。 |
| live 运行时指定 static 作为预期 | 返回 `mismatch / staged-bytes-differ`。设备报告的活动 ZIP 已不同，在进入脚本比对前结束。 |
| static，代次 2 | 整包及成员核对通过，文档脚本匹配。计算样式为 `none`，Exercise 计数从 0 到 1。 |
| 点击壳内终止 renderer 按钮 | 代次 2 记录终止请求已接受和 `renderer-gone`，`didCrash=false`。Activity 与 App 进程实例延续，只新建一次视图。代次 3 的 page ID 和文档摘要均已改变。重新发现并绑定后读到同一 static 脚本，样式仍为 `none`，新页面计数为 0。 |

| 制品 | 整包 SHA-256 | 当前文档所读脚本文本 SHA-256 |
| --- | --- | --- |
| 安装的调试 APK | `c3ac736fbbb8c4784bbcd152fa7a4acb1d622b16c4253d59a6ede3c764088677` | 不适用 |
| live ZIP | `e8389766d52b7aecfbf70326d029873db1c4ba845ab8d1c3bab736a2c3a7c09d` | `a314decfd07b029af3edd597d5a2f795fe9643913c8b6085c38605bad8c35e7b` |
| static ZIP | `dee47656d551bd6c1781aeb7b07293ceda0287cf3e1530d73a5d192247c53cf8` | `642e5a3d9cf24dcd09142e86ac3b88b158ac554aefd38a1a7f11360406fb62d7` |

## 帧样本

在 live 代次 1，通过壳按钮开始并结束一个 6.417 秒的 Activity 窗口采样区间，中间执行一次 Exercise。FrameMetrics 送达 638 个回调，采样丢失 0，时长缺失或省略均为 0；638 个有可比 deadline 的样本中，1 个超时。总帧时长 P95 为 10.762 ms。样本包含宿主按钮交互及 WebView 动画。未测量从输入到显示屏呈现的时延，也未做 live/static 性能优劣对比。无响应回调、自然崩溃、真实游戏与其它设备均未验证。

## 现场发现与恢复

第一次通过 Windows ADB 的 shell 标准输入传 4,391 字节的 live ZIP，壳内只收到 501 字节，恰好止于首个 `0x1A` 前；这 501 字节与源文件前缀完全一致。原入口返回 `SHELL_STAGE_UNCONFIRMED`，没有提升或激活。先读回并保存部分文件，复核摘要后在本轮私有目录留存，再测试修正。

`stage.cjs` 现在以 Base64 文本通过标准输入，在目标 App 的 `run-as` 进程内还原字节。此前的独占暂存、提升前后两次读回与整包摘要检查继续生效。修正后 live 和 static 均由同一用户入口完成。回归夹具包含 `0x1A`、零字节及非 ASCII 字节，并覆盖读回不一致时停止。

四次正向观测都返回清理完成；发现目标时临时建立的转发分别移除。结束前再次核对已安装 APK 摘要，只卸载本轮新装壳，读回包已不存在、桌面已恢复。原始帧数据、文档和目标标识、失败片段保存在本地。

**短交接。** 两份中性制品在同一台平板和同一 APK 中先后得到脚本实载与交互证明。受控 renderer 终止后，独立 App 在新文档恢复同一制品。此次复现并修复了 Windows 传输截断；单个宿主帧样本仅用于证明采集链可用。
