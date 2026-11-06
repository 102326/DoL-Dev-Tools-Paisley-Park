# Tusk 7: Android Activity observation prototype

First device question: can a foreground app expose its own state for observation while a configuration change replaces the Activity? This standalone probe displays a process UUID, Activity-instance UUID and counter. Only the local **Increment** button changes the counter. The counter is saved in the instance-state Bundle; it is transient UI state, not a committed business effect. There is no background job, transport, automatic retry, network permission, game code or production integration.

The JVM Weather experiment established useful identity and Unknown boundaries in a different environment; it did not establish Android lifecycle behavior. This probe deliberately does not copy its file-based commit store or claim durability. A missing, stale, incomplete or unreadable UI dump is Unknown, not a zero count or proof that an operation failed. A new process UUID is not by itself proof of a particular cause of process death.

## Subsequent device evidence (2026-11-06)

The [Windows record](../WINDOWS_REPORT.md) now includes an actual build and authorized device run: JDK 21.0.11 compiling JVM 17, Gradle 8.9, SDK 35 / Build Tools 34; controlled counter increment and Activity replacement with a stable process UUID were observed, then the probe was uninstalled. This is probe lifecycle evidence, not a transport/agent, persistent effect or performance result. The preparation-machine limits below still apply to Mac; do not repeat deployment merely because this older preparation section remains.

## Windows build preparation

No SDK, APK build or device execution was performed on the preparation machine. On Windows inspect the existing authorized installation first. This project specifies Android Gradle Plugin 8.7.3, Kotlin 2.0.21, compile/target SDK 35 and min SDK 23. Use JDK 17 and Gradle 8.9; install SDK Platform 35 and required build tools through an authorized Android SDK installation if missing. AGP 8.7 compatibility is documented by [Android](https://developer.android.com/build/releases/agp-8-7-0-release-notes); [Gradle/JDK requirements](https://developer.android.com/build/releases/about-agp) and [Android JDK guidance](https://developer.android.com/build/jdks) provide context. Dependency resolution requires network and repository access on Windows. There is intentionally no Gradle wrapper JAR in this source handoff; use an existing trusted Gradle 8.9 installation or configure a trusted wrapper on Windows, rather than silently using an arbitrary Gradle version.

From this directory in PowerShell, with `JAVA_HOME`, Android SDK location and `gradle` configured for that environment:

```powershell
java -version
gradle --version
gradle :app:assembleDebug
```

A successful build should produce `app/build/outputs/apk/debug/app-debug.apk`. Record actual JDK, Gradle, SDK/build-tools, build result and any failure. No signing keys need to be transferred; this is a local debug build only.

## Device comparison

Choose one authorized test device, confirm its serial with `adb devices -l`, and use that serial explicitly for every command below. Install the debug app and launch it. Installation and launching are explicit operations; observation itself performs no tap or retry.

```powershell
$device = '<selected-serial>'
adb -s $device install -r app/build/outputs/apk/debug/app-debug.apk
adb -s $device shell am start -n org.paisleypark.tuskprobe/.MainActivity
adb -s $device shell uiautomator dump /sdcard/tusk-window.xml
adb -s $device exec-out cat /sdcard/tusk-window.xml
```

Check each command's exit status and inspect the dump for this app's visible `process`, `activity`, `count` and `Increment` text; hierarchy availability and representation depend on the actual device. The dump is a shared-storage artifact: it can contain other visible UI if focus changed, so inspect and handle it as local evidence. Never interpret a failed dump or an unrelated foreground window as this app's state. Remove the probe's file when finished using `adb -s $device shell rm /sdcard/tusk-window.xml`.

1. Record a baseline dump and the on-screen values. Press **Increment** once manually, then take another dump: expect count to increase once and both IDs to stay the same. Do not repeat the press if its result is uncertain; observe again first.
2. Rotate the device to trigger a real configuration change, then capture again. If recreation occurred, expect a different Activity UUID, the same process UUID and the saved count. If rotation did not cause recreation, record that observation rather than claiming a pass. The [Activity lifecycle documentation](https://developer.android.com/guide/components/activities/activity-lifecycle) explains the expected default behavior.
3. Capture multiple dumps without pressing anything. Each successful current capture should show the same values while the foreground state is stable; failures or changed focus are Unknown. This is a functional comparison, not a timing or performance benchmark. Record device model, Android version, screen/orientation and each command/result; compare raw values rather than assuming recreation from a PID alone.

The probe does not establish process-kill recovery, persistent writes, event history, WebView, other apps, cross-device compatibility or latency improvements. Saved instance state is not a durable transaction. Device deployment and the checks above remain unvalidated until run on Windows and an authorized device.
