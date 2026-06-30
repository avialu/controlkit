package com.controlkit.sdk

import android.content.Context
import android.util.Log
import com.controlkit.sdk.internal.BackgroundRefresher
import com.controlkit.sdk.internal.ConfigCache
import com.controlkit.sdk.internal.ConfigDocument
import com.controlkit.sdk.internal.ConfigRefreshWorker
import com.controlkit.sdk.internal.NetworkClient
import com.controlkit.sdk.internal.PersistedInitConfig
import com.controlkit.sdk.internal.toJson
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import org.json.JSONObject

/**
 * Public entry point for the ControlKit SDK.
 *
 * Lifecycle:
 *   1. Host app calls [init] once, typically in Application.onCreate.
 *      The local cache (if any) is loaded synchronously so the first
 *      `isEnabled`/`getXxx` calls already see data.
 *   2. The SDK polls the backend in the background. Each successful fetch
 *      bumps [configVersion], which Compose UIs can collect to recompose
 *      automatically.
 *   3. Reads (`isEnabled`, `getString`, …) are pure in-memory lookups.
 */
object ControlKit {

    private const val TAG = "ControlKit"
    const val DEFAULT_REFRESH_INTERVAL_MS: Long = 15L * 60L * 1000L

    /** Default cadence (in minutes) for the persistent WorkManager job. */
    private const val DEFAULT_PERSISTENT_REFRESH_MINUTES: Long = 30L

    @Volatile private var initialized: Boolean = false
    private var appContext: Context? = null

    /**
     * Holds the latest config document. Wrapped in a StateFlow so the SDK
     * can notify subscribers (Compose, lifecycle scopes) of new values.
     */
    private val _document = MutableStateFlow(ConfigDocument.EMPTY)

    /**
     * Public flow that fires every time the in-memory config changes.
     * Compose code can do:
     *
     *   val version by ControlKit.configVersion.collectAsStateWithLifecycle()
     *   val welcome = remember(version) { ControlKit.getString("welcome_text", "Hi") }
     *
     * to re-render whenever the SDK gets new data (manual fetch OR background poll).
     */
    private val _configVersion = MutableStateFlow(0)
    val configVersion: StateFlow<Int> = _configVersion.asStateFlow()

    private var defaults: ControlKitDefaults = ControlKitDefaults()

    private lateinit var cache: ConfigCache
    private lateinit var network: NetworkClient
    private var refresher: BackgroundRefresher? = null

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    // ---------------------------------------------------------------
    // Public API
    // ---------------------------------------------------------------

    /**
     * Initialise the SDK. Safe to call multiple times — subsequent calls are no-ops
     * unless [reset] was invoked first.
     *
     * The SDK runs TWO refresh mechanisms in parallel:
     *   1. An in-process coroutine timer driven by [refreshIntervalMillis] — keeps
     *      data fresh while the app is alive, supports short intervals (e.g. 30s
     *      for a snappy demo).
     *   2. A WorkManager periodic job that survives the app being killed and
     *      respects battery/network constraints. Its interval is clamped to
     *      WorkManager's 15-minute minimum.
     *
     * @param context                  any Context; only the application context is retained.
     * @param apiKey                   the API key generated in the portal.
     * @param environment              must match the environment the API key was issued for.
     * @param baseUrl                  backend root, e.g. "http://10.0.2.2:4000" for the Android emulator.
     * @param defaults                 optional defaults used before the first successful fetch / cache load.
     * @param refreshIntervalMillis    how often the in-process timer polls. Pass 0 to disable.
     * @param enablePersistentRefresh  set false to skip scheduling the WorkManager job (useful in tests).
     * @param persistentRefreshMinutes WorkManager interval; min 15.
     */
    @JvmStatic
    @JvmOverloads
    fun init(
        context: Context,
        apiKey: String,
        environment: String = "production",
        baseUrl: String,
        defaults: ControlKitDefaults = ControlKitDefaults(),
        refreshIntervalMillis: Long = DEFAULT_REFRESH_INTERVAL_MS,
        enablePersistentRefresh: Boolean = true,
        persistentRefreshMinutes: Long = DEFAULT_PERSISTENT_REFRESH_MINUTES,
    ) {
        require(apiKey.isNotBlank()) { "apiKey must not be blank" }
        require(baseUrl.isNotBlank()) { "baseUrl must not be blank" }

        if (initialized) return

        val app = context.applicationContext
        this.appContext = app
        this.defaults = defaults
        this.cache = ConfigCache(app, environment)
        this.network = NetworkClient(baseUrl = baseUrl, apiKey = apiKey, environment = environment)

        // Persist init params so ConfigRefreshWorker can run after process death.
        PersistedInitConfig.save(
            app,
            PersistedInitConfig(apiKey = apiKey, baseUrl = baseUrl, environment = environment),
        )

        cache.load()?.let { updateDocument(it) }

        initialized = true

        refresher = BackgroundRefresher(intervalMillis = refreshIntervalMillis).also {
            it.start { runCatching { fetchInternal() } }
        }

        if (enablePersistentRefresh) {
            ConfigRefreshWorker.schedule(app, intervalMinutes = persistentRefreshMinutes)
        }
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
        return _document.value.features[key]
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
    fun rawJson(): JSONObject = _document.value.toJson()

    /** Current config version (or 0 if nothing has loaded yet). */
    @JvmStatic
    fun version(): Int = _document.value.version

    /** Test / re-init helper. Stops the refresher and forgets state. Cache is NOT cleared. */
    @JvmStatic
    fun reset() {
        refresher?.stop()
        refresher = null
        appContext?.let {
            ConfigRefreshWorker.cancel(it)
            PersistedInitConfig.clear(it)
        }
        appContext = null
        initialized = false
        _document.value = ConfigDocument.EMPTY
        _configVersion.value = 0
        defaults = ControlKitDefaults()
    }

    // ---------------------------------------------------------------
    // Internal
    // ---------------------------------------------------------------

    private fun readConfigValue(key: String): Any? {
        if (!initialized) return defaults.config[key]
        return _document.value.config[key] ?: defaults.config[key]
    }

    private fun updateDocument(doc: ConfigDocument) {
        _document.value = doc
        // Use the SERVER's version when present so it lines up with the portal,
        // otherwise tick locally so collectors still wake up.
        _configVersion.value = if (doc.version > 0) doc.version else _configVersion.value + 1
    }

    private suspend fun fetchInternal() {
        try {
            val fresh = network.fetchConfig()
            updateDocument(fresh)
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
