package org.doldevtools.validation;

import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.os.Bundle;
import android.os.Process;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import java.util.UUID;
import java.util.WeakHashMap;
import org.json.JSONObject;

/** Test-copy only. The bridge cannot dispatch actions or read game data. */
public final class ProbeActivity extends com.vrelnir.dol.MainActivity {
    private static final String PACKAGE = "org.doldevtools.validation.lyra051213";
    private static final String SESSION = UUID.randomUUID().toString();
    private static final WeakHashMap<WebView, String> VIEWS = new WeakHashMap<>();
    private final String instance = UUID.randomUUID().toString();

    public static final class SnapshotBridge {
        private final String json;
        SnapshotBridge(String json) { this.json = json; }
        @JavascriptInterface public String snapshot() { return json; }
    }

    @Override public void onCreate(Bundle state) {
        // Original startup receives no external extras, URI or background command.
        setIntent(new Intent(Intent.ACTION_MAIN).setClass(this, ProbeActivity.class));
        super.onCreate(state);
        if (!PACKAGE.equals(getPackageName()) ||
            (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) == 0) {
            throw new IllegalStateException("Requires the dedicated debug validation package");
        }
        if (appView == null || !(appView.getView() instanceof WebView)) {
            throw new IllegalStateException("Requires the actual Cordova WebView");
        }
        WebView view = (WebView) appView.getView();
        if (!VIEWS.containsKey(view)) VIEWS.put(view, UUID.randomUUID().toString());
        try {
            JSONObject data = new JSONObject();
            data.put("contractVersion", 1);
            data.put("packageName", PACKAGE);
            data.put("versionCode", getPackageManager().getPackageInfo(PACKAGE, 0).versionCode);
            data.put("processSession", SESSION);
            data.put("nativePid", Process.myPid());
            data.put("activityInstance", instance);
            data.put("activityIdentity", System.identityHashCode(this));
            data.put("webViewInstance", VIEWS.get(view));
            data.put("webViewIdentity", System.identityHashCode(view));
            view.addJavascriptInterface(new SnapshotBridge(data.toString()), "DoLNativeLifecycle");
            WebView.setWebContentsDebuggingEnabled(true);
        } catch (Exception error) {
            throw new IllegalStateException("Native snapshot initialization failed");
        }
    }

    @Override protected void onNewIntent(Intent intent) {
        // UUID prevents stale-instance dispatch; it is not caller authentication.
        boolean requested = (PACKAGE + ".RECREATE").equals(intent.getAction());
        if (intent.getData() != null || intent.getType() != null || intent.getClipData() != null ||
            intent.getSelector() != null) return;
        Bundle extras;
        try { extras = intent.getExtras(); } catch (RuntimeException error) { return; }
        boolean matched = false;
        if (requested) {
            if (extras == null || extras.size() != 1 ||
                !instance.equals(extras.get("activityInstance"))) return;
            matched = true;
        } else if (!Intent.ACTION_MAIN.equals(intent.getAction()) ||
                   (extras != null && !extras.isEmpty())) return;
        Intent clean = new Intent(Intent.ACTION_MAIN).setClass(this, ProbeActivity.class);
        setIntent(clean);
        super.onNewIntent(clean);
        if (matched && PACKAGE.equals(getPackageName()) &&
            (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0 &&
            hasWindowFocus() && !isFinishing()) {
            recreate();
        }
    }
}
