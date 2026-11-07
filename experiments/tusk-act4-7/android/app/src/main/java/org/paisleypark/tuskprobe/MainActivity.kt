package org.paisleypark.tuskprobe

import android.app.Activity
import android.os.Bundle
import android.view.Gravity
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import java.util.UUID

class MainActivity : Activity() {
    private val activityInstanceId = UUID.randomUUID().toString()
    private var count = 0
    private var phase = "created"
    private lateinit var state: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        count = savedInstanceState?.getInt("count") ?: 0
        state = TextView(this).apply { textSize = 16f; setTextIsSelectable(true) }
        val increment = Button(this).apply {
            text = "Increment"
            setOnClickListener { count++; render() }
        }
        setContentView(LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding(24, 48, 24, 24)
            addView(state)
            addView(increment)
        })
        render()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        outState.putInt("count", count)
        super.onSaveInstanceState(outState)
    }

    override fun onResume() { super.onResume(); phase = "resumed"; render() }
    override fun onPause() { phase = "paused"; render(); super.onPause() }
    override fun onDestroy() { ProbeState.release(activityInstanceId); super.onDestroy() }

    private fun render() {
        val revision = ProbeState.publish(activityInstanceId, count, phase)
        state.text = "process=${ProbeState.processId}\nactivity=$activityInstanceId\ncount=$count\nphase=$phase\nrevision=$revision"
    }
}
