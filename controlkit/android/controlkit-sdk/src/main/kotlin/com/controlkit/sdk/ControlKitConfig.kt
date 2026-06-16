package com.controlkit.sdk

/**
 * Optional defaults that the host app can pass into [ControlKit.init] so that
 * the very first `isEnabled`/`getXxx` call before any network response — and
 * before the cache is populated — still returns sensible values.
 *
 * Example:
 *
 *   ControlKit.init(
 *       context = this,
 *       apiKey = BuildConfig.CONTROLKIT_API_KEY,
 *       environment = "production",
 *       baseUrl = BuildConfig.CONTROLKIT_BASE_URL,
 *       defaults = mapOf(
 *           "welcome_text" to "Hello",
 *           "max_items"    to 10,
 *           "show_banner"  to false,
 *       ),
 *   )
 */
data class ControlKitDefaults(
    val features: Map<String, Boolean> = emptyMap(),
    val config: Map<String, Any?> = emptyMap(),
)
