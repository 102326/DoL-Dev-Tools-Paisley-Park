# 真实业务 Mod 的持久更新复验

[verify-business-mod.cjs](../examples/android-native/verify-business-mod.cjs) 是 DoLGameUI 已审阅发行制品的目标配方，复用公开 ModLoader API、Action 的目标检查、CSS Contract 和 optional Integration；不新增业务 DSL，不修改 UI 项目的源码或制品。

必须先完成[独立原生验收副本](NATIVE_RECREATE.md)。入口校验完成收据的 UUID/source/结构、实际安装 APK SHA、versionCode、user/UID；sentinel 文件名精确绑定本轮 incidentId，拒绝远端 shell 注入和私有路径。首次业务运行要求此测试副本 IndexDB Mod 清单/隐藏清单为空，已有状态就拒绝；不能对原测试 App 或其它未知 Mod 套用。

```powershell
node examples/android-native/verify-business-mod.cjs DEVICE_SERIAL COMPLETED_NATIVE_RECEIPT REVIEWED_2.0.3_ZIP REVIEWED_2.1.0_ZIP NEW_RUN_DIR --test-environment=yes
```

两份 ZIP 的 SHA 固定，支持 GameVersion 0.5.12.13。脚本复制输入后核对 boot/version/依赖与 JS/CSS SHA，在独立副本主游戏中通过 `checkModZipFileIndexDB`、`addModIndexDB` 持久安装 2.0.3、更新 2.1.0。每次派发一次 native Activity 重建，核对真正实例变化与新游戏页面，不使用 iframe 或临时 DOM 代替业务加载。

复验使用公开 `getModAndFromInfo` 的 IndexDB 来源、Mod/version、运行时版本，以及公开 ModInfo.cache 中固定 `game-ui.js` / `game-ui.css` 的哈希。正文只在 WebView 中用于计算 SHA，只有哈希返回。两版均通过 `DoLGameUI.openSettings()` 打开真实设置，限定 CSS scope 为 `#dol-midnight-controls`，受目标/唯一/可见检查的 web-click 关闭设置并确认。CSS 截断会传播到子 Evidence 和总状态，不扩大节点限制来掩盖遗漏。

最后真正重启测试 App，确认 processSession 改变、2.1.0 仍从 IndexDB 加载、JS/CSS SHA一致、设置开关仍工作、自有 sentinel 保留。任何已派发动作不自动重试；失败保留；自建 forwarding 精确清理，已有 forward/reverse 清单保持一致，原 App 的 APK及前台复核。

## 已完成验收

2026-10-06 business-run-1 complete / exit0。2.0.3→2.1.0→App restart 三阶段的来源、版本、运行时版本、JS/CSS SHA与实际制品一致，设置打开/关闭成功。三份 CSS Evidence 含191/193/193节点，均无截断；9份Manifest/Envelope/CSS payload经标准Draft 2020-12与RFC3339验证，incident/SHA匹配。真实 `evidence-compare` 与 `issue-report` 均 complete。只读 native Integration 经实际 Worker 返回 available。

`npm test` 91 passed、0 failed、0 skipped，包含收据对象/注入/路径穿越在创建输出和ADB前拒绝的检查。独立源码审查完成；没有重跑已完成的业务部署。测试副本中的 2.1.0 安装、自有sentinel与本地证据保留；原 App/其 Mod 清单、存档、云数据及 UI 源码未由此配方操作。截图、Console、原始日志和游戏文字没有采集。

这是主游戏中真实业务 Mod 的持久发行更新和设置场景证明，不保证所有游戏业务、存档迁移、其它 Mod、其它设备或线上功能。旧矩阵 restart partial仍保留，与这次独立副本新场景的通过分别记录。其它项目复用公共工具及自己的构建/部署/接口，不猜测本项目私有模型。
