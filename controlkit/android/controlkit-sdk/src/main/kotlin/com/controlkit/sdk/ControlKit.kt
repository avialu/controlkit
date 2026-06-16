package com.controlkit.sdk

import android.content.Context
import android.util.Log
import com.controlkit.sdk.internal.BackgroundRefresher
import com.controlkit.sdk.internal.ConfigCache
import com.controlkit.sdk.internal.ConfigDocument
import com.controlkit.sdk.internal.NetworkClient
import com.controlkit.sdk.internal.toJson
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import org.json.JSONObject

/**
 * Public entry point for the ControlKit SDK.
 *
 * Lifecycle:
 *   1. Host app calls [init] once, typically in Application.onCreate.
 *      The local cache (if any) is loaded synchronously so the first
 *      `isEnabled`/`getXxx` calls already see data.
 *   2. Host app (or the SDK itself) calls [fetch] / [refresh] to pull
 *      the latest config from the backend.
 *   3. Reads (`isEnabled`, `getString`, …) are pure in-memory lookups.
 */
object ControlKit {

    private const val TAG = "ControlKit"

    @Volatile private var initialized: Boolean = false

    @Volatile private var document: ConfigDocument = ConfigDocument.EMPTY
    private var defaults: ControlKitDefaults = ControlKitDefaults()

    private lateinit var cache: ConfigCache
    private lateinit var network: NetworkClient
    private val refresher = BackgroundRefresher()

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    // ---------------------------------------------------------------
    // Public API
    // ---------------------------------------------------------------

    /**
     * Initialise the SDK. Safe to call multiple times — subsequent calls are no-ops
     * unless [reset] was invoked first.
     *
     * @param context     any Context; only the application context is retained.
     * @param apiKey      the API key generated in the portal.
     * @param environment must match the environment the API key was issued for.
     * @param baseUrl     backend root, e.g. "http://10.0.2.2:4000" for the Android emulator.
     * @param defaults    optional defaults used before the first successful fetch / cache load.
     */
    @JvmStatic
    @JvmOverloads
    fun init(
        context: Context,
        apiKey: String,
        environment: String = "production",
        baseUrl: String,
        defaults: ControlKitDefaults = ControlKitDefaults(),
    ) {
        require(apiKey.isNotBlank()) { "apiKey must not be blank" }
        require(baseUrl.isNotBlank()) { "baseUrl must not be blank" }

        if (initialized) return

        this.defaults = defaults
        this.cache = ConfigCache(context, environment)
        this.network = NetworkClient(baseUrl = baseUrl, apiKey = apiKey, environment = environment)

        cache.load()?.let { document = it }

        initialized = true

        refresher.start { runCatching { fetchInternal() } }
    }

    /** Forces a synchronous (suspend) fetch from the backend. Updates cache on success. */
    suspend fun fetch() {
        ensureInitialized()
        fetchInternal()
    }

    /** Fire-and-forget refresh. Errors are swallowed; cached values stay in effect. */
    @JvmStatic
    fun refresh() {
        ensureInitialized()
        scope.launch { runCatching { fetchInternal() } }
    }

    @JvmStatic
    @JvmOverloads
    fun isEnabled(key: String, defaultValue: Boolean = false): Boolean {
        if (!initialized) return defaults.features[key] ?: defaultValue
        return document.features[key]
            ?: defaults.features[key]
            ?: defaultValue
    }

    @JvmStatic
    fun getString(key: String, defaultValue: String): String {
        val raw = readConfigValue(key) ?: return defaultValue
        return raw.toString()
    }

    @JvmStatic
    fun getInt(key: String, defaultValue: Int): Int {
        val raw = readConfigValue(key) ?: return defaultValue
        return when (raw) {
            is Number -> raw.toInt()
            is String -> raw.toIntOrNull() ?: defaultValue
            else -> defaultValue
        }
    }

    @JvmStatic
    fun getBoolean(key: String, defaultValue: Boolean): Boolean {
        val raw = readConfigValue(key) ?: return defaultValue
        return when (raw) {
            is Boolean -> raw
            is String -> raw.equals("true", ignoreCase = true)
            is Number -> raw.toInt() != 0
            else -> defaultValue
        }
    }

    @JvmStatic
    fun getJson(key: String): JSONObject? {
        val raw = readConfigValue(key) ?: return null
        return when (raw) {
            is JSONObject -> raw
            is String -> runCatching { JSONObject(raw) }.getOrNull()
            else -> null
        }
    }

    /** Returns the entire current config as a JSON object — handy for debug screens. */
    @JvmStatic
    fun rawJson(): JSONObject = document.toJson()

    /** Current config version (or 0 if nothing has loaded yet). */
    @JvmStatic
    fun version(): Int = document.version

    /** Test / re-init helper. Stops the refresher and forgets state. Cache is NOT cleared. */
    @JvmStatic
    fun reset() {
        refresher.stop()
        initialized = false
        document = ConfigDocument.EMPTY
        defaults = ControlKitDefaults()
    }

    // ---------------------------------------------------------------
    // Internal
    // ---------------------------------------------------------------

    private fun readConfigValue(key: String): Any? {
        if (!initialized) return defaults.config[key]
        return document.config[key] ?: defaults.config[key]
    }

    private suspend fun fetchInternal() {
        try {
            val fresh = network.fetchConfig()
            document = fresh
            cache.save(fresh)
            Log.d(TAG, "Fetched config version=${fresh.version} env=${fresh.environment}")
        } catch (t: Throwable) {
            Log.w(TAG, "Fetch failed; keeping cached config", t)
            throw t
        }
    }

    private fun ensureInitialized() {
        check(initialized) { "ControlKit.init(...) must be called before using the SDK." }
    }
}
