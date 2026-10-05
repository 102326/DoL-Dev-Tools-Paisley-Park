# Native Layout

用于系统弹窗、原生 App 外壳和当前窗口结构。与 DOM Contract 分开，不读取 Soft & Wet。复用已有 Android CLI 的 flat JSON 输出，不增加另一套 UIAutomator/XML 实现。

```powershell
node scripts/dol-dev.cjs native-layout --serial DEVICE_SERIAL --package YOUR.APP.PACKAGE --out artifacts/layout-001 --allow-helper yes
node scripts/dol-dev.cjs evidence --serial DEVICE_SERIAL --package YOUR.APP.PACKAGE --out artifacts/facts-with-layout --layout yes --allow-helper yes
```

`--allow-helper yes` 显式选择 Android CLI 可能安装/运行其辅助 APK 的副作用；未选择时在创建输出前拒绝。工具不会自动安装或更新 Android CLI。可用进程环境 DOL_ANDROID_CLI 指定已有可执行文件、DOL_ANDROID_SDK 指定已有 SDK；没有 CLI 或输出不支持时保留 unsupported。不要将 layout 作为失败的只读 CDP 采集的自动后备。

固定运行参数为 `--no-metrics layout --device=... --flat --full --no-idle`，15秒/2MiB 输出上限。投影最多200节点，记录 class、resourceId 哈希、text/contentDesc 是否存在、矩形、有限 interaction/state 和 off-screen；原始文本、描述、stderr、resourceId 明文不写入包。布局是当前设备窗口，可能包含系统 UI；指定 package 不证明每个节点属于该 App。flat 不重建父子关系，截断不冒充完整。

离线 runner 与隐私/边界检查已通过。本轮没有执行辅助 APK 或宣称真机原生布局通过。需要对真实原生控件操作时，先核对当前画面和控件，用已安装 Android CLI 的现有交互路径，并保留目标、动作和复验；不要通过布局摘要猜测正文或执行任意坐标操作。
