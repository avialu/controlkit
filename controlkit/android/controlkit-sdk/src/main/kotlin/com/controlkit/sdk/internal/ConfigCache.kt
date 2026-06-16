package com.controlkit.sdk.internal

import android.content.Context
import android.content.SharedPreferences

/**
 * Persists the latest [ConfigDocument] in SharedPreferences as the raw JSON
 * the server returned. Storing the raw JSON keeps the cache forward-compatible
 * with new fields the server might add later.
 */
internal class ConfigCache(context: Context, environment: String) {

    private val prefs: SharedPreferences = context.applicationContext
        .getSharedPreferences("controlkit_$environment", Context.MODE_PRIVATE)

    fun save(document: ConfigDocument) {
        prefs.edit()
            .putString(KEY_RAW, document.rawJson)
            .apply()
    }

    fun load(): ConfigDocument? {
        val raw = prefs.getString(KEY_RAW, null) ?: return null
        return runCatching { ConfigParser.parse(raw) }.getOrNull()
    }

    fun clear() {
        prefs.edit().clear().apply()
    }

    companion object {
        private const val KEY_RAW = "raw_config_json"
    }
}
