package com.controlkit.sdk.internal

import android.content.Context
import android.content.SharedPreferences

/**
 * Stores the `init()` parameters in SharedPreferences so a WorkManager job
 * can refresh the cache without [com.controlkit.sdk.ControlKit] being
 * initialised in memory (e.g. after the app's process has been killed).
 *
 * Only the bare minimum needed to call the SDK API is stored — no user data.
 */
internal data class PersistedInitConfig(
    val apiKey: String,
    val baseUrl: String,
    val environment: String,
) {
    companion object {
        private const val PREFS_NAME = "controlkit_init"
        private const val KEY_API_KEY = "api_key"
        private const val KEY_BASE_URL = "base_url"
        private const val KEY_ENVIRONMENT = "environment"

        fun save(context: Context, config: PersistedInitConfig) {
            prefs(context).edit()
                .putString(KEY_API_KEY, config.apiKey)
                .putString(KEY_BASE_URL, config.baseUrl)
                .putString(KEY_ENVIRONMENT, config.environment)
                .apply()
        }

        fun load(context: Context): PersistedInitConfig? {
            val p = prefs(context)
            val key = p.getString(KEY_API_KEY, null) ?: return null
            val url = p.getString(KEY_BASE_URL, null) ?: return null
            val env = p.getString(KEY_ENVIRONMENT, null) ?: return null
            return PersistedInitConfig(key, url, env)
        }

        fun clear(context: Context) {
            prefs(context).edit().clear().apply()
        }

        private fun prefs(context: Context): SharedPreferences =
            context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }
}
