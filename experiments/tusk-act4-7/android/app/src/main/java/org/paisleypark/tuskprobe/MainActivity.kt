package org.paisleypark.tuskprobe

import android.app.Activity
import android.os.Bundle
import android.view.Gravity
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import java.util.UUID

// Process-local identity survives Activity recreation, not process death.
private val processStartId = UUID.randomUUID().toString()

class MainActivity : Activity() {
    private val activityInstanceId = UUID.randomUUID().toString()
    private var count = 0
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

    private fun render() {
        state.text = "process=$processStartId\nactivity=$activityInstanceId\ncount=$count"
    }
}
