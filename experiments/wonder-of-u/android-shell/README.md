# Wonder of U · Windows / Android 接续

这是独立的 Kotlin 研发测试壳，包名为 `org.paisleypark.wondershell`。Mac 已验证两份中性制品的 Chrome 行为和 Node 接收端的合成数据。Windows 已通过 Gradle 构建 APK，并从成品核对包名、入口、SDK 级别和调试签名。设备上的 ADB 传输、换包、实载和 renderer 重建仍待验证。[Windows 构建记录](../WINDOWS_E46_HANDOFF.md#android-壳的本地构建)

## 宿主与前提

[Soft & Wet 的 Java 探针](https://github.com/102326/DoL-Game-UI/blob/001ebd12a981a98ce4c2bf57848a0ce25bde7186/prototypes/host5/composition/android/ProbeActivity.java)已有隔离 WebView、禁止网络和手动测试交互。[Tusk 7 独立 Kotlin 探针](../../tusk-act4-7/android/README.md)提供构建基线和实例身份的实机经验。本壳用新包名、私有制品目录和固定 HTTPS origin，把切换制品与重新安装 APK 分开；沿用 7.2 的设备、包、PID、socket、精确目标 ID 和文档绑定。

Windows 建议使用 PowerShell 7、Node 26、Python 3、Git、ADB、JDK 17、Gradle 8.9、SDK Platform 35。壳的最低系统为 API 26，`FrameMetrics.DEADLINE` 需要 API 31。Gradle 工程只在本目录，使用受信任且获准的本地工具和依赖源。保留现有 SDK 和 JDK 配置，或用忽略的 Android `local.properties` 指定 SDK。 [AGP 8.7 兼容表](https://developer.android.com/build/releases/agp-8-7-0-release-notes) · [FrameMetrics API](https://developer.android.com/reference/android/view/FrameMetrics)

## 生成同一组中性制品

从实验分支的固定源码打开新 PowerShell 会话，当前目录为仓库根。选择一个不存在的工作路径和可直接用的 Python 3 可执行文件。下面只检出 Soft & Wet 的 Acrylic 模块。

```powershell
$ErrorActionPreference = 'Stop'
function Run-Native {
    $tool, $nativeArgs = $args
    & $tool @nativeArgs
    if ($LASTEXITCODE -ne 0) { throw "$tool failed with exit code $LASTEXITCODE" }
}
$ge = (Resolve-Path .).Path
$exp = Join-Path $ge 'experiments/wonder-of-u'
$shellProject = Join-Path $exp 'android-shell'
$work = '<new-absolute-work-directory>'
$python = (Get-Command python.exe).Source
New-Item -ItemType Directory -Path $work -ErrorAction Stop | Out-Null
$sw = Join-Path $work 'soft-wet'
Run-Native git clone --filter=blob:none --no-checkout --single-branch --branch main https://github.com/102326/DoL-Game-UI.git $sw
Run-Native git -C $sw sparse-checkout set --no-cone /src/theme/acrylic.ts
Run-Native git -C $sw checkout --detach d643674cedca5dafc05b83d59d14a2fb5342d0ca

Push-Location $sw
try {
    Run-Native node (Join-Path $exp 'fixtures/build-soft-wet.cjs') live (Join-Path $work 'live.zip') $python
    Run-Native node (Join-Path $exp 'fixtures/build-soft-wet.cjs') static (Join-Path $work 'static.zip') $python
} finally { Pop-Location }
Get-FileHash -Algorithm SHA256 (Join-Path $work 'live.zip'), (Join-Path $work 'static.zip')
```

同一脚本模块调用 Soft & Wet 的真实 `acrylicParameters`。控制组只关闭测试面板的 `backdrop-filter`，颜色、布局、样式表、用户动作都相同。为实际 Windows 构建记录新的 SHA，换行转换和 Node 版本可能改变制品字节。

## 构建、选择设备和发布到私有目录

```powershell
Run-Native java -version
Run-Native gradle --version
Run-Native gradle -p $shellProject :app:assembleDebug
$apk = Join-Path $shellProject 'app/build/outputs/apk/debug/app-debug.apk'
Get-FileHash -Algorithm SHA256 $apk
Run-Native adb devices -l
$serial = '<explicitly-selected-serial>'
$pkg = 'org.paisleypark.wondershell'
Run-Native adb -s $serial shell pm list packages $pkg
# 确认没有这个包名后才首次安装，不带 -r。
Run-Native adb -s $serial install $apk
Run-Native adb -s $serial shell am start -n "$pkg/.MainActivity"
$live = Join-Path $work 'live.zip'
$static = Join-Path $work 'static.zip'
Run-Native node (Join-Path $shellProject 'stage.cjs') $serial $live $python
```

在壳的 UI 点击 **Activate staged neutral fixture**。暂存只把通过 Node ZIP 检查和逐字节读回的文件放入该调试 App 的私有 inbox；直到显式激活，旧制品仍是 active。切换失败时先核对原 inbox 和部分传输文件，避免覆盖不确定结果。壳记录活动实例和视图代次，通过 [WebViewAssetLoader](https://developer.android.com/reference/androidx/webkit/WebViewAssetLoader) 为有效路径供给当前制品，并为其它请求返回 404。应用无网络权限且无游戏数据输入。

为观察获得当前精确 `page` ID。可从 Chrome Inspect 确认选中的包和页面 URL，或使用选定设备的 `pidof`、`/proc/net/unix` 核对唯一的当前 PID socket，分配自己拥有的临时 ADB 转发，再用 `node scripts/dol-dev.cjs inspect --endpoint http://127.0.0.1:PORT --out NEW_JSON` 核对。完成发现后仅移除自己的转发。Node 观察器独立建立自己的转发；发现不唯一或 `run-as` 不可用时保留现场，停止依赖步骤。详细入口见 [目标选择](../../../docs/DIAGNOSTICS.md)。

```powershell
$id = '<exact-live-page-id>'
$record = Join-Path $shellProject 'record.cjs'
Run-Native node $record (Join-Path $work 'live-first.json') matched $serial $id $live $python
Run-Native node $record (Join-Path $work 'static-while-live.json') staged-bytes-differ $serial $id $static $python
```

**设备窗口清单。** 先确认平板已由当前使用者释放，记录目标设备、Android 用户、包和获准测试 APK 的摘要。首次安装前确认包名空闲；接续已有安装时先核对其制品与隔离来源。选定已审核的 live/static ZIP 和可恢复方式，再按上面的步骤暂存、手动激活、发现目标。renderer 操作另需同一设备上无其他使用者且允许影响这个自有视图。把安装、激活和终止与只读采证分开执行。

`record.cjs` 先独占创建本地证据文件，再调用现有观察器。输出路径已存在时退出 1，尚未访问设备；每次使用新的文件名。退出 0 表示本次结果符合所选预期。正例需要文档摘要和已完成的清理；上例的负对照检查当前活动制品与 static ZIP 字节不符，此时尚未比较 CDP 脚本。未知或非预期结果保存在 `result` 中，退出 2。异常中断留下的空文件或不完整记录不能作为完成证据。恢复后先查原 inbox、活动代次和已有证据，再决定下一步。

记录的 ZIP 和成员摘要来自两侧。实载核对另向精确文档读取 `Debugger.getScriptSource`。只有脚本证据相同和绑定未变才报告 `matched`。壳的页面完成回调只表示其观察到的生命周期阶段。

## 同一平板的对照和恢复

1. 先完成一次负对照。当前 live 在运行时，指定 static ZIP 验证，应返回 `mismatch` 和退出码 2，页面交互数保持原值。成功结果与负对照使用不同的新文件。
2. 固定平板、刷新率、窗口尺寸、方向、WebView 版本和温度条件。用同一壳依次激活 live 和 static，各自重新核对目标 ID 与脚本。保持同一 APK。每个运行先将页面恢复到计数 0，在壳上点击 **Start comparison segment**，在中性页面按一次 **Exercise**，等动画结束后点击 **Finish comparison segment**；换包间隔与采样操作保持一致。用 DOM 核对计数为 1，实测面板为 `blur(22px)` 或 `none`。重复时独立保存观测，记录预热与顺序，交替两种制品以降低顺序偏差。
3. 再执行 `observe.cjs`，检查 `lastSegment.current`、`finishReason`、当前代次和制品匹配。比较已送达回调、采样遗漏、P95 以及可比较 deadline 样本中的 miss 比例；`callbackDrops` 是回调采样丢失，`deadlineMisses` 是报告样本中的超预算帧。回调窗口包含外层 Activity UI，记录边界和误差。若需定位成本，先复用 [gfxinfo 与 Perfetto](../../../docs/DIAGNOSTICS.md)；独立记录这些证据的窗口和范围。只有追踪到实际输入与显示呈现的关联时，才报告触摸到上屏。
4. 在只运行自有壳的测试环境点击 **Terminate this test renderer**。记录旧 generation 与 `documentSha256`；确认 `renderer-gone`、一次受限重建、同一 active ZIP、不同 generation。通过重新发现的精确 ID 验证同一 ZIP 已实载，另核对页面计数从 0 开始。旧段落证据应仍属旧代次，旧 `page` ID 即使保留也必须重新验证文档。记录 `renderer-unresponsive`、`renderer-responsive` 与退出为不同事件；若观察不到前两项或不支持控制终止，如实记录。终止可能影响共享同一 renderer 的 WebView，因此只在自有壳上执行。 [AndroidX renderer 回调](https://developer.android.com/reference/androidx/webkit/WebViewRenderProcessClient)
5. 留存 APK/ZIP/成员 SHA、真实命令、设备和浏览器版本、代次、帧指标、失败与不支持状态。设备序列、Raw Trace、私人截图和本地路径留在本机；提交经审查的摘要。

如需在 Windows Chrome 预先复跑同夹具，只需用新的隔离输出目录执行 [Mac 验证记录](../MAC_VALIDATION.md) 中的 `soft-wet-browser.cjs` 命令并代入绝对浏览器与 Python 路径。Android Build、同平板 Acrylic 帧对比、renderer 恢复和真实游戏加载各自留证。
