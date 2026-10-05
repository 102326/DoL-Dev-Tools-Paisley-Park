# 目标自有原生重建与 APK 更新验收

Generic 工具不能从 PID、CDP target、Page.reload 或旋转推断原生对象重建。目标作者可以提供明确的原生入口与只读实例契约；缺少契约时保持 unknown。独立 [native-lifecycle Integration](../integrations/examples/native-lifecycle.cjs) 复用 Contract 1，不成为 Generic 或 Soft & Wet 的依赖。

## 本地目标例子

[ProbeActivity.java](../examples/android-native/ProbeActivity.java)、[build.py](../examples/android-native/build.py)、[verify.cjs](../examples/android-native/verify.cjs) 是一个已核对 Lyra 0.5.12.13 APK 的专用离线验收配方，不是任意 APK 修改器。构建材料、SDK/JDK、APK、密钥和密码文件由本机显式提供，不包含在工具发行包中；不下载、不安装依赖、不修改目标源码或凭据。

构建器固定输入副本及 SHA，保留原游戏 assets 与 classes.dex，另加只含测试 Activity/Bridge 的 DEX。新包名 `org.doldevtools.validation.lyra051213`、provider authority、标签和递增 versionCode 独立；最终签名 APK 重新核验身份/权限/debug/backup/certificate。测试副本去掉网络权限并禁用系统备份，只证明本地场景。原启动仅加载本地游戏，SaveDialog 无自动初始化写入；本配方不点击外链、导出或保存对话框。

```powershell
python examples/android-native/build.py --base-apk BASELINE_APK --out NEW_BUILD_DIR --jdk JDK_ROOT --tools EXISTING_TOOLS_ROOT --android-jar ANDROID_JAR --key EXISTING_P12 --password-file EXISTING_PASSWORD_FILE --version 1
# 再使用全新输出目录构建 --version 2。
node examples/android-native/verify.cjs DEVICE_SERIAL V1_BUILD_DIR V2_BUILD_DIR NEW_RUN_DIR JDK_ROOT EXISTING_TOOLS_ROOT --test-environment=yes
```

`build.py --help` 只显示参数。脚本中的基线 SHA、证书和 Java 类型针对这份已核对材料；其它作者应在自己的项目实现契约和构建命令，不能删掉校验让未知包直接通过。

## 只读实例契约与动作

`DoLNativeLifecycle.snapshot()` 返回 contractVersion、packageName、versionCode、processSession、nativePid、Activity/WebView UUID 与 identityHash。元信息在 UI 线程捕获，bridge 只返回不可变 JSON；WebView UUID 用弱引用映射绑定实际对象。没有 JS 动作、文件读取、游戏状态或存档接口。Integration 在 WebView 内投影固定字段，未知版本/身份拒绝或 unsupported；目标缺失时跳过。

Bridge 对所有 frame 可见，不提供调用者认证。实例token只防过期实例，不能当凭据。RECREATE与WEBVIEW_RECREATE Intent仅用于这个独立debug包；在向原运行时传递前拒绝额外extras/URI/type/clip/selector，并替换为干净MAIN Intent。动作需匹配当前实例、前台焦点、resumed与非finishing状态；WebView-only请求还绑定当前WebView UUID。此入口不应加入未知或正式APK。

Runner 首次遇到已有同名包就拒绝；安装 Success 和实际 SHA/version/UID 核对后才认领。动作只派发一次，等待只观察。APK 更新限定本轮自有安装、同包/同证书/更高版本，使用 `install -r`；没有卸载、清空、降级或存档读取。

## 实机证明与范围

2026-10-06 实机 complete / exit0：同 PID/processSession 内 Activity 和实际 WebView 的 UUID、identityHash 均变化，随后游戏 document、#passages 与 SugarCube 就绪。APK 从 51201 更新到 51202，实际安装 SHA 匹配、UID 不变，自有唯一 files sentinel 的 SHA 保留，更新后游戏再次就绪。原 App 的 APK SHA/version/UID、已有 forward/reverse 清单保持一致，自建 forward 移除，原 App 前台恢复并确认。

这份早期记录证明Activity重建连同其中的WebView重建；独立WebView-only的新证明如下，不能回填到旧收据。sentinel不证明所有业务存档或云数据保留。真实业务Mod更新需自己的加载身份与行为证明，不由此回填。首次构建的密码文件重复读取失败、首次runner因Android `appId`字段而在安装前失败均保留；没有重试已派发的安装/重建动作。

测试副本和自有 sentinel 保留，记录只在忽略的本地 artifacts 中。不采截图、Console、日志正文或游戏文字，不上传。既有 1.3 ZIP/tag 冻结；后续真实业务更新及最终范围完成后统一汇入[1.4](RELEASE_1.4.md)。

## 同Activity独立WebView替换

[verify-webview.cjs](../examples/android-native/verify-webview.cjs)复用既有原生安装与业务更新收据，只向已确认SHA/UID/sentinel的自有副本执行同签名更新。构建`--version 4`得到51204；初始基线必须是已验证51202。仅允许显式`--resume-from`接受本配方已知51203失败收据，未知包/版本/收据拒绝，不能删校验绕过。

```powershell
python examples/android-native/build.py --base-apk BASELINE_APK --out NEW_V4_DIR --jdk JDK_ROOT --tools EXISTING_TOOLS_ROOT --android-jar ANDROID_JAR --key EXISTING_P12 --password-file EXISTING_PASSWORD_FILE --version 4
node examples/android-native/verify-webview.cjs DEVICE_SERIAL NATIVE_RECEIPT BUSINESS_RECEIPT NEW_V4_DIR NEW_RUN_DIR JDK_ROOT EXISTING_TOOLS_ROOT --test-environment=yes
```

该路径依据实际Cordova 11公开生命周期与核对过的字段，只在固定debug目标使用。旧interface退休后忽略延迟消息，避免旧WebView销毁的exit消息结束Activity；关闭旧自有线程池，构建新的实际WebView。UI线程重新核对focus/resume/token/两秒请求期限与`https://localhost/index.html`，未完成plugin callback或未知字段格式拒绝。不是通用反射入口。

实机51204 complete/exit0：同PID/processSession、相同Activity UUID/identityHash，实际WebView UUID/identityHash改变；过期WebView token拒绝，未改变当前对象。替换前后及App重启后，主游戏IndexDB DoLGameUI 2.1.0实际JS/CSS SHA、运行时版本、设置打开/关闭均通过；sentinel保留。四份scoped CSS无正文、无截断。设置开关不证明全部设置值持久化或游戏存档迁移。

51203首次执行因启动地址被错误限制为file URL而未重建，partial及清理记录保留；校正为真实HTTPS地址后按显式拥有关系更新51204，只派发一次新的重建动作。原App SHA、已有映射不变、自有forward移除、原前台恢复。详见[最终验收](FINAL_ACCEPTANCE.md)。
