package org.paisleypark.wondershell

import android.os.Build
import android.view.FrameMetrics
import org.json.JSONObject

internal class FrameSegment {
    private data class Active(val view: Long, val started: Long, val name: String,
        val durations: MutableList<Long> = mutableListOf(), var delivered: Long = 0,
        var callbackDrops: Long = 0, var deadlineKnown: Long = 0, var deadlineMisses: Long = 0,
        var durationUnavailable: Long = 0, var durationOmitted: Long = 0)
    private var active: Active? = null

    @Synchronized fun start(view: Long, name: String) {
        check(active == null)
        active = Active(view, System.nanoTime(), name)
    }

    @Synchronized fun add(metrics: FrameMetrics, drops: Int) {
        val sample = active ?: return
        val intended = metrics.getMetric(FrameMetrics.INTENDED_VSYNC_TIMESTAMP)
        if (intended >= 0 && intended < sample.started) return
        sample.delivered++
        sample.callbackDrops += drops.coerceAtLeast(0).toLong()
        val duration = metrics.getMetric(FrameMetrics.TOTAL_DURATION)
        if (duration < 0) { sample.durationUnavailable++; return }
        if (sample.durations.size < 8192) sample.durations.add(duration)
        else sample.durationOmitted++
        val deadline = if (Build.VERSION.SDK_INT >= 31) metrics.getMetric(FrameMetrics.DEADLINE) else -1
        if (deadline > 0) {
            sample.deadlineKnown++
            if (duration > deadline) sample.deadlineMisses++
        }
    }

    @Synchronized fun finish(reason: String): JSONObject? {
        val sample = active ?: return null
        active = null
        val sorted = sample.durations.sorted()
        val p95 = sorted.takeIf { it.isNotEmpty() }?.let { it[(kotlin.math.ceil(it.size * 0.95).toInt() - 1).coerceAtLeast(0)] }
        return JSONObject().put("name", sample.name).put("viewGeneration", sample.view)
            .put("durationNs", System.nanoTime() - sample.started).put("finishReason", reason)
            .put("deliveredCallbacks", sample.delivered).put("callbackDrops", sample.callbackDrops)
            .put("durationUnavailable", sample.durationUnavailable).put("durationOmitted", sample.durationOmitted)
            .put("sampledDurationP95Ns", p95 ?: JSONObject.NULL)
            .put("deadlineComparableFrames", sample.deadlineKnown).put("deadlineMisses", sample.deadlineMisses)
    }
}
