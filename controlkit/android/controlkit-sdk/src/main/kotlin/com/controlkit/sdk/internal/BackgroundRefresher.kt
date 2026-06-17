package com.controlkit.sdk.internal

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

/**
 * Periodically calls a refresh lambda from a background coroutine. The MVP
 * fires once every [intervalMillis]; nothing fancy.
 */
internal class BackgroundRefresher(
    private val intervalMillis: Long,
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var job: Job? = null

    fun start(refresh: suspend () -> Unit) {
        if (job?.isActive == true) return
        if (intervalMillis <= 0) return
        job = scope.launch {
            while (isActive) {
                delay(intervalMillis)
                runCatching { refresh() }
            }
        }
    }

    fun stop() {
        job?.cancel()
        job = null
    }
}
