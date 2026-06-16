package com.controlkit.sdk.internal

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.IOException
import java.util.concurrent.TimeUnit

internal class NetworkClient(
    private val baseUrl: String,
    private val apiKey: String,
    private val environment: String,
) {
    private val client: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .build()

    /**
     * Calls `GET {baseUrl}/sdk/config?environment={env}` with the API key header.
     * Returns a parsed [ConfigDocument]. Throws [IOException] on network or HTTP errors —
     * callers are expected to fall back to the local cache.
     */
    suspend fun fetchConfig(): ConfigDocument = withContext(Dispatchers.IO) {
        val url = baseUrl.trimEnd('/') + "/sdk/config?environment=" + environment
        val request = Request.Builder()
            .url(url)
            .header("x-api-key", apiKey)
            .header("Accept", "application/json")
            .get()
            .build()

        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) {
                throw IOException("ControlKit /sdk/config failed: HTTP ${response.code}")
            }
            val body = response.body?.string()
                ?: throw IOException("ControlKit /sdk/config returned empty body")
            ConfigParser.parse(body)
        }
    }
}
