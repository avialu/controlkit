package com.controlkit.sdk.internal

import android.content.Context
import android.util.Log
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import java.util.concurrent.TimeUnit

/**
 * Periodic background worker that refreshes the ControlKit config cache.
 *
 * Unlike the in-process [BackgroundRefresher], this worker keeps running even
 * when the host app's process has been killed — exactly what the PDF asks for.
 * It reads the persisted init params from SharedPreferences, fetches the
 * latest config from the backend, and writes it into the cache so the next
 * app launch finds fresh data immediately.
 */
internal class ConfigRefreshWorker(
    appContext: Context,
    params: WorkerParameters,
) : CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result {
        val cfg = PersistedInitConfig.load(applicationContext) ?: run {
            Log.w(TAG, "No persisted init config — skipping refresh")
            return Result.success()
        }
        return try {
            val network = NetworkClient(
                baseUrl = cfg.baseUrl,
                apiKey = cfg.apiKey,
                environment = cfg.environment,
            )
            val doc = network.fetchConfig()
            ConfigCache(applicationContext, cfg.environment).save(doc)
            Log.d(TAG, "Background refresh ok: v${doc.version} env=${cfg.environment}")
            Result.success()
        } catch (t: Throwable) {
            // WorkManager will retry with exponential backoff.
            Log.w(TAG, "Background refresh failed; will retry", t)
            Result.retry()
        }
    }

    companion object {
        private const val TAG = "ControlKitWorker"
        private const val WORK_NAME = "controlkit_refresh"

        /**
         * Enqueue (or replace) the periodic refresh job.
         *
         * WorkManager enforces a 15-minute minimum interval — anything shorter
         * is silently clamped up. The in-process [BackgroundRefresher] handles
         * the short, foreground polling case.
         */
        fun schedule(context: Context, intervalMinutes: Long = 30L) {
            val safeInterval = intervalMinutes.coerceAtLeast(15L)
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()
            val request = PeriodicWorkRequestBuilder<ConfigRefreshWorker>(
                safeInterval, TimeUnit.MINUTES,
            )
                .setConstraints(constraints)
                .build()
            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                WORK_NAME,
                ExistingPeriodicWorkPolicy.UPDATE,
                request,
            )
            Log.d(TAG, "Scheduled WorkManager refresh every ${safeInterval}min")
        }

        fun cancel(context: Context) {
            WorkManager.getInstance(context).cancelUniqueWork(WORK_NAME)
        }
    }
}
