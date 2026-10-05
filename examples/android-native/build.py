"""Build a side-by-side native validation copy of one verified Lyra APK.

No downloads, installation, game source edits, or secret output. This is a target
recipe, not a general APK patcher. All output must be a fresh directory.
"""
import argparse
import hashlib
import json
import os
import pathlib
import re
import shutil
import subprocess
import xml.etree.ElementTree as ET
import zipfile

PACKAGE = "org.doldevtools.validation.lyra051213"
BASE_SHA = "ab67be61aea19cb259dae155356f7621cd6114d3209c66ca88a4162cbb9b9585"
CERT_SHA = "efdbb6da72670f631293b17d9b197b0db9aa1457e4c14d36c0d2ad3b07cbb02f"
HERE = pathlib.Path(__file__).resolve().parent


def sha(data):
    return hashlib.sha256(data).hexdigest()


def run(*args):
    result = subprocess.run([str(a) for a in args], capture_output=True, stdin=subprocess.DEVNULL, timeout=180)
    if result.returncode:
        # Build tool output contains no game data; only a bounded diagnostic.
        raise RuntimeError(result.stderr.decode(errors="replace")[-3000:])
    return result.stdout.decode(errors="replace")


def main():
    p = argparse.ArgumentParser(description=__doc__)
    for name in ("base-apk", "out", "jdk", "tools", "android-jar", "key", "password-file"):
        p.add_argument("--" + name, type=pathlib.Path, required=True)
    p.add_argument("--version", type=int, choices=(1, 2), required=True)
    a = p.parse_args()
    if sha(a.base_apk.read_bytes()) != BASE_SHA:
        raise ValueError("Baseline APK identity mismatch")
    a.out.mkdir(parents=True, exist_ok=False)
    baseline = a.out / "baseline.apk"
    shutil.copyfile(a.base_apk, baseline)
    if sha(baseline.read_bytes()) != BASE_SHA:
        raise ValueError("Baseline changed while copying")
    probe = a.out / "ProbeActivity.java"
    shutil.copyfile(HERE / "ProbeActivity.java", probe)
    probe_sha = sha(probe.read_bytes())
    java, javac = (a.jdk / "bin" / f for f in ("java.exe", "javac.exe"))
    signer = [java, "-cp", a.tools / "uber-apk-signer-1.3.0.jar", "com.android.apksigner.ApkSignerTool"]
    original_cert = run(*signer, "verify", "--print-certs", baseline)
    if "certificate SHA-256 digest: " + CERT_SHA not in original_cert:
        raise ValueError("Baseline certificate mismatch")
    decoded = a.out / "decoded"
    apktool = a.tools / "apktool_3.0.3.jar"
    frame = a.out / "framework"
    run(java, "-jar", apktool, "d", "--no-src", "--no-assets", "-p", frame, "-o", decoded, baseline)
    manifest = decoded / "AndroidManifest.xml"
    text = manifest.read_text(encoding="utf-8")
    root = ET.fromstring(text)
    if root.get("package") != "com.vrelnir.dol.lyra.uicompat051213":
        raise ValueError("Unexpected source package")
    android = "{http://schemas.android.com/apk/res/android}"
    if root.get(android + "sharedUserId") or any(
        n.get(android + "name") != "android.permission.INTERNET" for n in root.findall("uses-permission")
    ):
        raise ValueError("Unexpected shared UID or permissions")
    app = root.find("application")
    if [n.tag for n in app] != ["activity", "provider"] or app.get(android + "debuggable") != "true":
        raise ValueError("Unexpected application components")
    if app.find("provider").get(android + "authorities") != root.get("package") + ".androidx-startup":
        raise ValueError("Unexpected provider authority")
    # This offline verification copy cannot contact real cloud endpoints.
    text = re.sub(r'\s*<uses-permission android:name="android.permission.INTERNET"\s*/>', '', text)
    text = text.replace('<application ', '<application android:allowBackup="false" ', 1)
    text = text.replace("com.vrelnir.dol.lyra.uicompat051213", PACKAGE)
    if text.count('android:name="com.vrelnir.dol.MainActivity"') != 1:
        raise ValueError("Unexpected launcher")
    text = text.replace('android:name="com.vrelnir.dol.MainActivity"',
                        'android:name="org.doldevtools.validation.ProbeActivity"')
    text = re.sub(r'android:label="@[^"]+"', 'android:label="DoL Native Validation"', text)
    ET.fromstring(text)
    manifest.write_text(text, encoding="utf-8")
    config = decoded / "apktool.yml"
    text = config.read_text(encoding="utf-8")
    text, count = re.subn(r"(?m)^  versionCode: \d+$", f"  versionCode: {51200 + a.version}", text)
    if count != 1:
        raise ValueError("Unexpected version metadata")
    config.write_text(text, encoding="utf-8")
    # Compile-only stubs reflect verified DEX descriptors. Never ship these classes.
    stubs = a.out / "stubs"
    src = a.out / "stub-source"
    definitions = {
        "com/vrelnir/dol/MainActivity.java": "package com.vrelnir.dol; public class MainActivity extends org.apache.cordova.CordovaActivity { public void onCreate(android.os.Bundle b) {} }",
        "org/apache/cordova/CordovaActivity.java": "package org.apache.cordova; public class CordovaActivity extends android.app.Activity { protected CordovaWebView appView; }",
        "org/apache/cordova/CordovaWebView.java": "package org.apache.cordova; public interface CordovaWebView { android.view.View getView(); }",
    }
    for file, body in definitions.items():
        dest = src / file
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(body, encoding="utf-8")
    run(javac, "--release", "8", "-classpath", a.android_jar, "-d", stubs,
        *(src / f for f in definitions))
    classes = a.out / "classes"
    run(javac, "--release", "8", "-classpath", str(a.android_jar) + os.pathsep + str(stubs),
        "-d", classes, probe)
    dex = a.out / "dex"
    dex.mkdir()
    run(java, "-cp", a.tools / "sdk/android-15/lib/d8.jar", "com.android.tools.r8.D8",
        "--min-api", "22", "--lib", a.android_jar, "--classpath", stubs, "--output", dex,
        *sorted(classes.rglob("*.class")))
    metadata = run(a.tools / "sdk/android-15/dexdump.exe", "-f", dex / "classes.dex")
    descriptors = re.findall(r"Class descriptor\s+: '([^']+)'", metadata)
    expected = ["Lorg/doldevtools/validation/ProbeActivity$SnapshotBridge;", "Lorg/doldevtools/validation/ProbeActivity;"]
    if sorted(descriptors) != sorted(expected):
        raise ValueError("Unexpected DEX classes; compile stubs must not ship")
    rebuilt, unsigned, aligned, signed = (a.out / f"{name}.apk" for name in ("rebuilt", "unsigned", "aligned", "validation"))
    run(java, "-jar", apktool, "b", "-p", frame, decoded, "-o", rebuilt)
    with zipfile.ZipFile(rebuilt) as changed, zipfile.ZipFile(baseline) as base, zipfile.ZipFile(unsigned, "w") as final:
        if "classes2.dex" in base.namelist():
            raise ValueError("Baseline already has classes2.dex")
        for info in changed.infolist():
            if info.filename.startswith("assets/") or info.filename.endswith(".dex"):
                continue
            if re.match(r"META-INF/[^/]+\.(SF|RSA|DSA|EC)$", info.filename, re.I) or info.filename == "META-INF/MANIFEST.MF":
                continue
            final.writestr(info, changed.read(info))
        preserved = [n for n in base.namelist() if not n.endswith("/") and (n.startswith("assets/") or n.endswith(".dex"))]
        for name in preserved:
            final.writestr(base.getinfo(name), base.read(name))
        final.writestr("classes2.dex", (dex / "classes.dex").read_bytes())
    run(a.tools / "zipalign.exe", "-f", "4", unsigned, aligned)
    run(*signer, "sign", "--ks", a.key, "--ks-key-alias", "dol-personal", "--ks-pass",
        "file:" + str(a.password_file),
        "--v4-signing-enabled", "false", "--out", signed, aligned)
    verified = run(*signer, "verify", "--print-certs", signed)
    if "certificate SHA-256 digest: " + CERT_SHA not in verified:
        raise ValueError("Signed APK certificate mismatch")
    run(a.tools / "zipalign.exe", "-c", "4", signed)
    with zipfile.ZipFile(baseline) as base, zipfile.ZipFile(signed) as final:
        for name in preserved:
            if base.read(name) != final.read(name):
                raise ValueError("Business asset/DEX changed")
    aapt = a.tools / "sdk/android-15/aapt.exe"
    badging = run(aapt, "dump", "badging", signed)
    xml = run(aapt, "dump", "xmltree", signed, "AndroidManifest.xml")
    if not re.search(r"package: name='" + re.escape(PACKAGE) + r"' versionCode='" + str(51200 + a.version) + "'", badging):
        raise ValueError("Final APK package/version mismatch")
    if "launchable-activity: name='org.doldevtools.validation.ProbeActivity'" not in badging:
        raise ValueError("Final APK launcher mismatch")
    if "E: uses-permission" in xml or "android:sharedUserId" in xml or "com.vrelnir.dol.lyra.uicompat051213" in xml:
        raise ValueError("Final APK permissions/identity isolation mismatch")
    if not re.search(r"android:allowBackup[^\n]*=\(type 0x12\)0x0\s", xml) or not re.search(r"android:debuggable[^\n]*=\(type 0x12\)0xffffffff\s", xml):
        raise ValueError("Final APK debug/backup flags mismatch")
    if f'"{PACKAGE}.androidx-startup"' not in xml:
        raise ValueError("Final APK provider mismatch")
    if sha(baseline.read_bytes()) != BASE_SHA or sha(probe.read_bytes()) != probe_sha:
        raise ValueError("Owned build input changed")
    report = dict(applicationId=PACKAGE, launcher="org.doldevtools.validation.ProbeActivity",
                  versionCode=51200 + a.version, baselineSha256=BASE_SHA,
                  apkSha256=sha(signed.read_bytes()), probeSourceSha256=probe_sha,
                  certificateSha256=CERT_SHA, preservedAssetAndDexFiles=len(preserved),
                  addedDexDescriptors=descriptors, signatureVerified=True, zipAlignmentVerified=True,
                  networkPermission=False, cloudBackupAllowed=False,
                  installed=False)
    (a.out / "build-report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report))


if __name__ == "__main__":
    main()
