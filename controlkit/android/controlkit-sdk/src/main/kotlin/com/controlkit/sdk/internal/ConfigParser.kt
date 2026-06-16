package com.controlkit.sdk.internal

import org.json.JSONObject

internal object ConfigParser {

    fun parse(rawJson: String): ConfigDocument {
        val root = JSONObject(rawJson)

        val version = root.optInt("version", 0)
        val environment = root.optString("environment", "")

        val features = mutableMapOf<String, Boolean>()
        root.optJSONObject("features")?.let { obj ->
            val keys = obj.keys()
            while (keys.hasNext()) {
                val k = keys.next()
                features[k] = obj.optBoolean(k, false)
            }
        }

        val config = mutableMapOf<String, Any?>()
        root.optJSONObject("config")?.let { obj ->
            val keys = obj.keys()
            while (keys.hasNext()) {
                val k = keys.next()
                config[k] = if (obj.isNull(k)) null else obj.get(k)
            }
        }

        return ConfigDocument(
            version = version,
            environment = environment,
            features = features,
            config = config,
            rawJson = rawJson,
        )
    }
}
