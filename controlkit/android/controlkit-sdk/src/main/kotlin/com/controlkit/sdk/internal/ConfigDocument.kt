package com.controlkit.sdk.internal

import org.json.JSONObject

/**
 * In-memory representation of the `/sdk/config` response.
 *
 *   {
 *     "version": 1,
 *     "environment": "production",
 *     "features": { ... },
 *     "config":   { ... }
 *   }
 *
 * Values inside `config` are stored as raw JSON values (Boolean, Number, String, JSONObject, JSONArray)
 * so the typed getters in [com.controlkit.sdk.ControlKit] can coerce them on demand.
 */
internal data class ConfigDocument(
    val version: Int,
    val environment: String,
    val features: Map<String, Boolean>,
    val config: Map<String, Any?>,
    val rawJson: String,
) {
    companion object {
        val EMPTY = ConfigDocument(
            version = 0,
            environment = "",
            features = emptyMap(),
            config = emptyMap(),
            rawJson = "{}",
        )
    }
}

internal fun ConfigDocument.toJson(): JSONObject = JSONObject(rawJson)
