# Tusk 7: Android Activity observation prototype

This standalone probe displays its own process UUID, Activity UUID and counter. Only the local **Increment** button changes the counter. The counter is saved in the instance-state Bundle; it is transient UI state, not a committed business effect. Version 0.3 also exposes a bounded, read-only ContentProvider for this App's observation experiment. There is no game code, background job, network permission, device control, automatic retry or production integration.

The JVM Weather experiment established useful identity and Unknown boundaries in a different environment; it did not establish Android lifecycle behavior. This probe deliberately does not copy its file-based commit store or claim durability. A missing, stale, incomplete or unreadable UI dump is Unknown, not a zero count or proof that an operation failed. A new process UUID is not by itself proof of a particular cause of process death.

## Current decision: keep the production Android path

The [Windows device comparison](../ANDROID_SNAPSHOT_COMPARISON_20261107.md) found no demonstrated real-DoL benefit that justifies adopting this provider as a production helper. A single native snapshot took about 1.14 seconds, close to the warmed official Android layout command. Five immediate rows in one query saved command overhead, but those rows do not represent five separate wait points or a real game task. Continue using existing Android CLI / ADB / CDP. Keep this App as an experiment, not a release dependency.

## Read-only self snapshots

After installing and launching this explicitly authorized probe, query its own state:

```powershell
adb -s SELECTED_SERIAL shell content query --user 0 --uri 'content://org.paisleypark.tuskprobe.snapshot/current?count=1'
```

The exported provider requires `android.permission.DUMP`, accepts only `/current` with optional `count=1..16`, and rejects projection, selection and writes. It returns process/Activity identity, availability, lifecycle phase, counter, revision and device monotonic time. Background or uncreated Activities return `available=false` and null Activity/count. Reading can start the probe's process without creating its Activity; it is not a physically inert observation. Identity comparison belongs to the caller; this provider implements no action binding or GER fence.

This reports only the probe's own state. It cannot inspect DoL, another App or a WebView. DUMP is an Android component permission, not a new sandbox. The host must still verify its selected package/user and current identity. An independent unprivileged-client denial was not tested in this batch.

For the controlled three-round comparison, configure installed tools and use a new absolute output directory:

```powershell
$env:DOL_ADB = 'ABSOLUTE_EXISTING_ADB_EXECUTABLE'
$env:ANDROID_CLI = 'ABSOLUTE_EXISTING_ANDROID_CLI_EXECUTABLE'
$env:ANDROID_SNAPSHOT_SDK = 'ABSOLUTE_EXISTING_ANDROID_SDK'
node --no-strip-types experiments/tusk-act4-7/android/snapshot-verify.cjs SELECTED_SERIAL NEW_ABSOLUTE_OUTPUT
```

The driver does not install an App, launch an Activity or dispatch UI controls; its provider delete request is an explicit rejection test. Begin with this probe resumed, coordinate exclusive device use and preserve its stable counter during measurement. It checks seven rejected requests, the 16-row bound and exact state agreement with official Android CLI layout. Raw calls/layouts remain local; do not upload notifications or device identifiers. An unavailable observation fails the run rather than becoming a zero counter. The historical `uiautomator dump` attempt failed with exit 137 and was retained; the current driver uses the working official CLI.

## Subsequent device evidence (2026-11-06)

The [Windows record](../WINDOWS_REPORT.md) now includes an actual build and authorized device run: JDK 21.0.11 compiling JVM 17, Gradle 8.9, SDK 35 / Build Tools 34; controlled counter increment and Activity replacement with a stable process UUID were observed, then the probe was uninstalled. This is probe lifecycle evidence, not a transport/agent, persistent effect or performance result. The preparation-machine limits below still apply to Mac; do not repeat deployment merely because this older preparation section remains.

On 2026-11-07, version 0.2 added the self-observation IPC experiment. Actual rotation, background/unavailable, explicit return and own-process restart checks passed; version 0.3 subsequently fixed text hidden by the ActionBar/system insets and was visually checked on the tablet. Timing belongs to the measured 0.2 APK, not the later UI fix. Both identities and the failure are retained in the comparison report; the final probe was uninstalled and rotation restored.

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

The original instructions above do not establish persistent writes, event history, WebView, other apps or cross-device compatibility. Saved instance state is not a durable transaction. Subsequent Windows results are bounded by their linked reports: the own-process restart exposes a fresh identity; it does not prove durable effect recovery or a production device-agent speedup.
