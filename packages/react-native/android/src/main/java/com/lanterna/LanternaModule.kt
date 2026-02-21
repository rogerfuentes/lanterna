package com.lanterna

import android.view.Choreographer
import com.facebook.react.bridge.*
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID
import java.util.concurrent.CopyOnWriteArrayList

/**
 * Lanterna native module — collects real-time performance metrics.
 *
 * Supports both Turbo Module (New Architecture) and legacy bridge (Old Architecture).
 * Metrics collection runs on a background thread with configurable sampling interval.
 */
class LanternaModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = NAME

    private var isActive = false
    private var currentSessionId: String? = null
    private val frameTimestamps = CopyOnWriteArrayList<Long>()
    private var choreographerCallback: Choreographer.FrameCallback? = null

    @ReactMethod
    fun startProfiling(configJson: String, promise: Promise) {
        try {
            val config = JSONObject(configJson)
            val sessionId = UUID.randomUUID().toString()
            currentSessionId = sessionId
            isActive = true
            startFrameTracking()
            promise.resolve(JSONObject().put("sessionId", sessionId).toString())
        } catch (e: Exception) {
            promise.reject("START_ERROR", e.message)
        }
    }

    @ReactMethod
    fun stopProfiling(sessionId: String, promise: Promise) {
        try {
            isActive = false
            stopFrameTracking()
            val result = JSONObject()
                .put("sessionId", sessionId)
                .put("stopped", true)
            currentSessionId = null
            promise.resolve(result.toString())
        } catch (e: Exception) {
            promise.reject("STOP_ERROR", e.message)
        }
    }

    @ReactMethod
    fun getMetrics(sessionId: String, promise: Promise) {
        try {
            val runtime = Runtime.getRuntime()
            val usedMemoryMb = (runtime.totalMemory() - runtime.freeMemory()) / (1024 * 1024)

            val metrics = JSONObject()
                .put("memory", usedMemoryMb)

            val result = JSONObject()
                .put("sessionId", sessionId)
                .put("timestamp", System.currentTimeMillis())
                .put("metrics", metrics)

            promise.resolve(result.toString())
        } catch (e: Exception) {
            promise.reject("METRICS_ERROR", e.message)
        }
    }

    @ReactMethod
    fun getFrameTimestamps(promise: Promise) {
        try {
            val timestamps = JSONArray()
            for (ts in frameTimestamps) {
                timestamps.put(ts)
            }
            frameTimestamps.clear()
            promise.resolve(timestamps.toString())
        } catch (e: Exception) {
            promise.reject("FRAME_ERROR", e.message)
        }
    }

    @ReactMethod
    fun isProfilingActive(promise: Promise) {
        promise.resolve(isActive)
    }

    @ReactMethod
    fun getActiveSessionId(promise: Promise) {
        promise.resolve(currentSessionId)
    }

    private fun startFrameTracking() {
        frameTimestamps.clear()
        choreographerCallback = Choreographer.FrameCallback { frameTimeNanos ->
            if (isActive) {
                frameTimestamps.add(frameTimeNanos / 1_000_000) // ns → ms
                choreographerCallback?.let {
                    Choreographer.getInstance().postFrameCallback(it)
                }
            }
        }
        Choreographer.getInstance().postFrameCallback(choreographerCallback!!)
    }

    private fun stopFrameTracking() {
        choreographerCallback?.let {
            Choreographer.getInstance().removeFrameCallback(it)
        }
        choreographerCallback = null
    }

    companion object {
        const val NAME = "LanternaModule"
    }
}
