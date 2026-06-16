package com.controlkit.sdk.internal

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlin.time.Duration
import kotlin.time.Duration.Companion.minutes

/**
 * Periodically calls a refresh lambda from a background coroutine. The MVP
 * fires once every [interval]; nothing fancy.
 */
internal class BackgroundRefresher(
    private val interval: Duration = 15.minutes,
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var job: Job? = null

    fun start(refresh: suspend () -> Unit) {
        if (job?.isActive == true) return
        job = scope.launch {
            while (isActive) {
                delay(interval)
                runCatching { refresh() }
            }
        }
    }

    fun stop() {
        job?.cancel()
        job = null
    }
}
