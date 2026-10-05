package org.doldevtools.validation;

import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.os.Bundle;
import android.os.Process;
import android.os.SystemClock;
import android.util.SparseArray;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import java.util.UUID;
import java.util.WeakHashMap;
import java.lang.reflect.Field;
import org.json.JSONObject;

/** Test-copy only. The bridge cannot dispatch actions or read game data. */
public final class ProbeActivity extends com.vrelnir.dol.MainActivity {
    private static final String PACKAGE = "org.doldevtools.validation.lyra051213";
    private static final String SESSION = UUID.randomUUID().toString();
    private static final WeakHashMap<WebView, String> VIEWS = new WeakHashMap<>();
    private final String instance = UUID.randomUUID().toString();
    private boolean resumed, rebuilding;
    private String pendingWebView;
    private long pendingAt;

    /** Messages from a retired view must not finish or change the surviving Activity. */
    public static final class ViewInterface extends org.apache.cordova.CordovaInterfaceImpl {
        private final ProbeActivity owner;
        private volatile boolean retired;
        ViewInterface(ProbeActivity owner) { super(owner); this.owner = owner; }
        @Override public Object onMessage(String id, Object data) {
            return retired ? null : owner.onMessage(id, data);
        }
        void retire() { retired = true; }
        void closePool() { threadPool.shutdown(); }
    }

    @Override protected org.apache.cordova.CordovaInterfaceImpl makeCordovaInterface() {
        return new ViewInterface(this);
    }

    public static final class SnapshotBridge {
        private final String json;
        SnapshotBridge(String json) { this.json = json; }
        @JavascriptInterface public String snapshot() { return json; }
    }

    @Override public void onCreate(Bundle state) {
        // Original startup receives no external extras, URI or background command.
        setIntent(new Intent(Intent.ACTION_MAIN).setClass(this, ProbeActivity.class));
        super.onCreate(state);
        attachSnapshot();
    }

    private void attachSnapshot() {
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

    @Override protected void onResume() {
        super.onResume();
        resumed = true;
        scheduleWebViewRecreate();
    }

    @Override protected void onPause() {
        resumed = false;
        pendingWebView = null;
        super.onPause();
    }

    @Override public void onWindowFocusChanged(boolean focused) {
        super.onWindowFocusChanged(focused);
        if (focused) scheduleWebViewRecreate();
    }

    // Fixed, reviewed Cordova 11 target fields. Unknown layouts fail closed.
    // These checks are not a Generic diagnostic API or arbitrary reflection bridge.
    private Object cordovaField(String name) throws Exception {
        Field field = Class.forName("org.apache.cordova.CordovaInterfaceImpl").getDeclaredField(name);
        field.setAccessible(true);
        return field.get(cordovaInterface);
    }

    private boolean cordovaIdle() {
        try {
            for (String name : new String[]{"activityResultCallback", "savedResult", "savedPluginState", "initCallbackService"}) {
                if (cordovaField(name) != null) return false;
            }
            Object callbacks = cordovaField("permissionResultCallbacks");
            if (callbacks == null) return false;
            Field field = Class.forName("org.apache.cordova.CallbackMap").getDeclaredField("callbacks");
            field.setAccessible(true);
            synchronized (callbacks) {
                Object values = field.get(callbacks);
                return values instanceof SparseArray && ((SparseArray<?>) values).size() == 0;
            }
        } catch (Exception error) { return false; }
    }

    private void scheduleWebViewRecreate() {
        if (pendingWebView == null) return;
        if (SystemClock.uptimeMillis() - pendingAt > 2000) { pendingWebView = null; return; }
        if (!resumed || !hasWindowFocus()) return;
        getWindow().getDecorView().post(new Runnable() {
            @Override public void run() {
                if (pendingWebView == null) return;
                String requested = pendingWebView;
                pendingWebView = null; // One attempt; rejected requests are never queued for a later scene.
                if (!resumed || !hasWindowFocus() || isFinishing() || rebuilding ||
                    SystemClock.uptimeMillis() - pendingAt > 2000) return;
                if (appView == null || !(appView.getView() instanceof WebView)) return;
                WebView previous = (WebView) appView.getView();
                if (!requested.equals(VIEWS.get(previous)) || previous.getProgress() != 100 ||
                    !"https://localhost/index.html".equals(previous.getUrl()) ||
                    !"https://localhost/index.html".equals(launchUrl) || !cordovaIdle()) return;
                rebuilding = true;
                try {
                    org.apache.cordova.CordovaWebView old = appView;
                    ViewInterface previousInterface = (ViewInterface) cordovaInterface;
                    previousInterface.retire();
                    old.handlePause(keepRunning);
                    old.handleStop();
                    old.handleDestroy();
                    previousInterface.closePool();
                    appView = null;
                    cordovaInterface = makeCordovaInterface();
                    init();
                    if (appView.getView() == previous) throw new IllegalStateException("WebView object was reused");
                    attachSnapshot();
                    loadUrl(launchUrl);
                    appView.handleStart();
                    appView.handleResume(keepRunning);
                } finally { rebuilding = false; }
            }
        });
    }

    @Override protected void onNewIntent(Intent intent) {
        // UUID prevents stale-instance dispatch; it is not caller authentication.
        boolean requested, webViewRequested, matched = false;
        String webViewToken = null;
        try {
            if (intent == null) return;
            requested = (PACKAGE + ".RECREATE").equals(intent.getAction());
            webViewRequested = (PACKAGE + ".WEBVIEW_RECREATE").equals(intent.getAction());
            if (intent.getData() != null || intent.getType() != null || intent.getClipData() != null ||
                intent.getSelector() != null) return;
            Bundle extras = intent.getExtras();
            if (requested || webViewRequested) {
                if (extras == null || extras.size() != (webViewRequested ? 2 : 1) ||
                    !instance.equals(extras.get("activityInstance"))) return;
                if (webViewRequested) {
                    Object token = extras.get("webViewInstance");
                    if (!(token instanceof String) || appView == null ||
                        !(appView.getView() instanceof WebView) || pendingWebView != null || rebuilding ||
                        !token.equals(VIEWS.get((WebView) appView.getView()))) return;
                    webViewToken = (String) token;
                }
                matched = true;
            } else if (!Intent.ACTION_MAIN.equals(intent.getAction()) ||
                       (extras != null && !extras.isEmpty())) return;
        } catch (RuntimeException error) { return; }
        Intent clean = new Intent(Intent.ACTION_MAIN).setClass(this, ProbeActivity.class);
        setIntent(clean);
        super.onNewIntent(clean);
        if (matched && PACKAGE.equals(getPackageName()) &&
            (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0 &&
            !isFinishing()) {
            if (webViewRequested) {
                pendingWebView = webViewToken;
                pendingAt = SystemClock.uptimeMillis();
                scheduleWebViewRecreate();
            } else if (hasWindowFocus()) recreate();
        }
    }
}
