package org.paisleypark.wondershell

import android.app.Activity
import android.content.pm.ApplicationInfo
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.HandlerThread
import android.util.AtomicFile
import android.view.Window
import android.webkit.RenderProcessGoneDetail
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import androidx.webkit.WebViewRenderProcess
import androidx.webkit.WebViewRenderProcessClient
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayInputStream
import java.io.File
import java.security.MessageDigest
import java.util.UUID
import java.util.concurrent.Executors

class MainActivity : Activity() {
    private lateinit var store: FixtureStore
    private lateinit var surface: FrameLayout
    private lateinit var banner: TextView
    private lateinit var activateButton: Button
    private lateinit var segmentStart: Button
    private lateinit var segmentStop: Button
    private lateinit var terminateButton: Button
    private lateinit var metricsThread: HandlerThread
    private val worker = Executors.newSingleThreadExecutor()
    private var view: WebView? = null
    private var fixture: FixtureStore.Fixture? = null
    private var generation = 0L
    private val activityId = UUID.randomUUID().toString()
    private var ready = false
    private var switching = false
    private var recording = false
    private var rendererExits = 0
    private var lastSegment: JSONObject? = null
    private val events = ArrayDeque<JSONObject>()
    private var droppedEvents = 0L
    private val frames = FrameSegment()
    private val metricListener = Window.OnFrameMetricsAvailableListener { _, metrics, dropped -> frames.add(metrics, dropped) }
    private val telemetry by lazy { AtomicFile(File(filesDir, "wonder-telemetry.json")) }
    private val debug by lazy { applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE != 0 }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        store = FixtureStore(filesDir)
        WebView.setWebContentsDebuggingEnabled(debug)
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            fitsSystemWindows = true
        }
        banner = TextView(this)
        root.addView(banner)
        fun button(label: String, click: () -> Unit): Button = Button(this).also {
            it.text = label
            it.setOnClickListener { click() }
            root.addView(it)
        }
        activateButton = button("Activate staged neutral fixture", ::activate)
        segmentStart = button("Start comparison segment", ::startSegment)
        segmentStop = button("Finish comparison segment") { finishSegment("operator-finished"); publish() }
        terminateButton = button("Terminate this test renderer", ::terminateRenderer)
        surface = FrameLayout(this)
        root.addView(surface, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f))
        setContentView(root)
        metricsThread = HandlerThread("wonder-frame-samples").apply { start() }
        window.addOnFrameMetricsAvailableListener(metricListener, Handler(metricsThread.looper))
        try { fixture = store.readActive() }
        catch (_: Exception) { event("active-fixture-unreadable") }
        fixture?.let(::mount) ?: publish()
    }

    private fun event(kind: String, details: JSONObject = JSONObject()) {
        if (events.size == 64) { events.removeFirst(); droppedEvents++ }
        events.addLast(JSONObject().put("kind", kind).put("viewGeneration", generation)
            .put("timeNs", System.nanoTime()).put("details", details))
    }

    private fun publish() {
        val selected = fixture
        val snapshot = JSONObject().put("schemaVersion", 1).put("kind", "wonder-neutral-shell")
            .put("activityId", activityId).put("processInstanceId", processInstanceId).put("viewGeneration", generation)
            .put("artifactSha256", selected?.sha256 ?: JSONObject.NULL)
            .put("memberSha256", selected?.members?.mapValues { sha(it.value) }?.let { JSONObject(it) } ?: JSONObject.NULL)
            .put("origin", ORIGIN).put("documentReadyCallback", ready)
            .put("rendererObservationSupported", WebViewFeature.isFeatureSupported(WebViewFeature.WEB_VIEW_RENDERER_CLIENT_BASIC_USAGE))
            .put("sampling", recording).put("lastSegment", lastSegment ?: JSONObject.NULL)
            .put("eventsDropped", droppedEvents).put("events", JSONArray(events.toList()))
        try {
            val fd = telemetry.startWrite()
            try { fd.write(snapshot.toString().toByteArray(Charsets.UTF_8)); telemetry.finishWrite(fd) }
            catch (error: Exception) { telemetry.failWrite(fd); throw error }
            banner.text = "Neutral shell · ${selected?.sha256?.take(12) ?: "empty"} · view $generation · " + when {
                switching -> "activating"
                recording -> "sampling"
                ready -> "ready callback observed"
                else -> "waiting for owned document"
            }
        } catch (_: Exception) {
            banner.text = "Telemetry write failed. Inspect the app's current state before continuing."
        }
        activateButton.isEnabled = debug && !switching && !recording
        segmentStart.isEnabled = ready && !switching && !recording
        segmentStop.isEnabled = recording
        terminateButton.isEnabled = debug && ready && !switching && supportsTermination()
    }

    private fun activate() {
        if (!debug || switching || recording) return
        switching = true
        publish()
        worker.execute {
            val activated = try { store.activate() } catch (_: Exception) { null }
            runOnUiThread {
                if (isDestroyed) return@runOnUiThread
                switching = false
                if (activated == null) { event("fixture-rejected"); publish(); return@runOnUiThread }
                if (fixture?.sha256 == activated.sha256 && view != null) {
                    event("fixture-already-active"); publish(); return@runOnUiThread
                }
                fixture = activated
                rendererExits = 0
                event("fixture-activated")
                mount(activated)
            }
        }
    }

    private fun requestAllowed(uri: Uri): Boolean = uri.scheme == "https" && uri.host == WebViewAssetLoader.DEFAULT_DOMAIN &&
        uri.userInfo == null && uri.port == -1 && uri.encodedPath == uri.path && URL_PATHS.contains(uri.path.orEmpty())

    private fun responseError() = WebResourceResponse("text/plain", "UTF-8", 404, "Not Found",
        mapOf("Cache-Control" to "no-store"), ByteArrayInputStream(byteArrayOf()))

    private fun mount(active: FixtureStore.Fixture) {
        detachView()
        ready = false
        generation++
        val mountedGeneration = generation
        val artifact = active.members
        val loader = WebViewAssetLoader.Builder().addPathHandler("/fixture/", WebViewAssetLoader.PathHandler { name ->
            val data = artifact[name] ?: return@PathHandler responseError()
            val type = when (name) {
                "index.html" -> "text/html"
                "release.js" -> "text/javascript"
                else -> "text/css"
            }
            WebResourceResponse(type, "UTF-8", 200, "OK", mapOf(
                "Cache-Control" to "no-store", "X-Content-Type-Options" to "nosniff",
                "Content-Security-Policy" to "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
            ), ByteArrayInputStream(data))
        }).build()
        val page = "$ORIGIN/fixture/index.html?generation=$mountedGeneration"
        val web = WebView(this)
        view = web
        web.settings.apply {
            javaScriptEnabled = true
            allowFileAccess = false
            allowContentAccess = false
            domStorageEnabled = false
            javaScriptCanOpenWindowsAutomatically = false
            setSupportMultipleWindows(false)
        }
        web.webViewClient = object : WebViewClient() {
            private var documentFailed = false
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest) = true
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse {
                val url = request.url
                if (request.method != "GET" || !requestAllowed(url)) return responseError()
                if (request.isForMainFrame && url.toString() != page) return responseError()
                if (!request.isForMainFrame && (url.encodedQuery != null || url.path == "/fixture/index.html")) return responseError()
                return loader.shouldInterceptRequest(request.url) ?: responseError()
            }
            override fun onPageFinished(view: WebView, url: String) {
                if (this@MainActivity.view !== view || url != page || documentFailed) return
                ready = true
                event("page-finished")
                publish()
            }
            override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
                if (this@MainActivity.view !== view || !request.isForMainFrame) return
                documentFailed = true
                ready = false
                event("main-document-error", JSONObject().put("code", error.errorCode))
                publish()
            }
            override fun onRenderProcessGone(view: WebView, detail: RenderProcessGoneDetail): Boolean {
                if (this@MainActivity.view !== view) return true
                ready = false
                finishSegment("renderer-gone")
                event("renderer-gone", JSONObject().put("didCrash", detail.didCrash())
                    .put("priorityAtExit", detail.rendererPriorityAtExit()))
                detachView()
                rendererExits++
                publish()
                // One bounded automatic rebuild of the same immutable fixture. No action replay.
                val goneGeneration = generation
                if (rendererExits == 1) surface.post {
                    if (!isDestroyed && generation == goneGeneration && this@MainActivity.view == null && fixture === active) mount(active)
                }
                return true
            }
        }
        if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_VIEW_RENDERER_CLIENT_BASIC_USAGE)) {
            WebViewCompat.setWebViewRenderProcessClient(web, object : WebViewRenderProcessClient() {
                override fun onRenderProcessUnresponsive(view: WebView, renderer: WebViewRenderProcess?) {
                    if (this@MainActivity.view === view) { event("renderer-unresponsive"); publish() }
                }
                override fun onRenderProcessResponsive(view: WebView, renderer: WebViewRenderProcess?) {
                    if (this@MainActivity.view === view) { event("renderer-responsive"); publish() }
                }
            })
        }
        surface.addView(web, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT))
        event("view-mounted")
        publish()
        web.loadUrl(page)
    }

    private fun detachView() {
        val previous = view ?: return
        view = null
        surface.removeView(previous)
        previous.destroy()
    }

    private fun startSegment() {
        if (!ready || recording || switching) return
        frames.start(generation, "neutral-interaction")
        recording = true
        lastSegment = null
        event("segment-started")
        publish()
    }

    private fun finishSegment(reason: String) {
        if (!recording) return
        recording = false
        lastSegment = frames.finish(reason)?.put("artifactSha256", fixture?.sha256 ?: JSONObject.NULL)
        event("segment-finished", JSONObject().put("reason", reason))
    }

    private fun supportsTermination() = WebViewFeature.isFeatureSupported(WebViewFeature.GET_WEB_VIEW_RENDERER) &&
        WebViewFeature.isFeatureSupported(WebViewFeature.WEB_VIEW_RENDERER_TERMINATE)

    private fun terminateRenderer() {
        val current = view ?: return
        if (!debug || !ready || switching || !supportsTermination()) return
        val accepted = WebViewCompat.getWebViewRenderProcess(current)?.terminate() == true
        event("renderer-termination-requested", JSONObject().put("accepted", accepted))
        publish()
    }

    override fun onStop() {
        if (recording) { finishSegment("activity-stopped"); publish() }
        super.onStop()
    }

    override fun onDestroy() {
        finishSegment("activity-destroyed")
        ready = false
        event("activity-destroyed")
        publish()
        window.removeOnFrameMetricsAvailableListener(metricListener)
        metricsThread.quitSafely()
        worker.shutdown()
        detachView()
        super.onDestroy()
    }

    companion object {
        private const val ORIGIN = "https://appassets.androidplatform.net"
        private val URL_PATHS = FixtureStore.supported.map { "/fixture/$it" }.toSet()
        private val processInstanceId = UUID.randomUUID().toString()
        private fun sha(bytes: ByteArray): String = MessageDigest.getInstance("SHA-256").digest(bytes).joinToString("") { "%02x".format(it) }
    }
}
