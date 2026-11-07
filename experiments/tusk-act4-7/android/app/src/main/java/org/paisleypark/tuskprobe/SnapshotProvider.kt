package org.paisleypark.tuskprobe

import android.content.ContentProvider
import android.content.ContentValues
import android.database.Cursor
import android.database.MatrixCursor
import android.net.Uri
import android.os.Process
import android.os.SystemClock
import org.json.JSONObject
import java.util.UUID

internal object ProbeState {
    val processId = UUID.randomUUID().toString()
    private data class State(val activity: String?, val count: Int?, val phase: String, val revision: Long)
    @Volatile private var current = State(null, null, "unavailable", 0)

    // Activity callbacks publish on the main thread; Binder queries read one immutable value.
    fun publish(activity: String, count: Int, phase: String): Long {
        current = State(activity, count, phase, current.revision + 1)
        return current.revision
    }

    fun release(activity: String) {
        if (current.activity == activity) current = State(null, null, "unavailable", current.revision + 1)
    }

    fun observe(packageName: String): String {
        val state = current
        val active = state.phase == "resumed"
        return JSONObject().put("schemaVersion", 1).put("source", "self-app-native")
            .put("package", packageName).put("uid", Process.myUid()).put("pid", Process.myPid())
            .put("process", processId).put("available", active).put("phase", state.phase)
            .put("activity", if (active) state.activity else JSONObject.NULL)
            .put("count", if (active) state.count else JSONObject.NULL)
            .put("revision", state.revision).put("elapsedRealtimeMs", SystemClock.elapsedRealtime()).toString()
    }
}

// Experiment only: no game state, device control, file access or mutable operations.
class SnapshotProvider : ContentProvider() {
    override fun onCreate() = true
    private fun samples(uri: Uri): Int {
        require(uri.scheme == "content" && uri.authority == "${context!!.packageName}.snapshot" &&
            uri.path == "/current" && uri.fragment == null &&
            uri.queryParameterNames.all { it == "count" } && uri.getQueryParameters("count").size <= 1) {
            "Unsupported snapshot query"
        }
        val count = uri.getQueryParameter("count") ?: "1"
        require(count.matches(Regex("[1-9]|1[0-6]"))) { "Unsupported sample count" }
        return count.toInt()
    }

    override fun getType(uri: Uri): String { samples(uri); return "application/json" }
    override fun query(uri: Uri, projection: Array<out String>?, selection: String?,
                       selectionArgs: Array<out String>?, sortOrder: String?): Cursor {
        val count = samples(uri)
        require(projection == null && selection == null && selectionArgs == null && sortOrder == null) {
            "Snapshot projections and selection are unsupported"
        }
        return MatrixCursor(arrayOf("snapshot"), count).apply {
            repeat(count) { addRow(arrayOf(ProbeState.observe(context!!.packageName))) }
        }
    }
    override fun insert(uri: Uri, values: ContentValues?): Uri = throw UnsupportedOperationException("Read only")
    override fun update(uri: Uri, values: ContentValues?, selection: String?, selectionArgs: Array<out String>?): Int =
        throw UnsupportedOperationException("Read only")
    override fun delete(uri: Uri, selection: String?, selectionArgs: Array<out String>?): Int =
        throw UnsupportedOperationException("Read only")
}
