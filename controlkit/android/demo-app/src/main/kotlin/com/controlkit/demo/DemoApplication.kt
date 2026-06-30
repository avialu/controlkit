package com.controlkit.demo

import android.app.Application
import com.controlkit.sdk.ControlKit
import com.controlkit.sdk.ControlKitDefaults

class DemoApplication : Application() {

    override fun onCreate() {
        super.onCreate()

        ControlKit.init(
            context = this,
            apiKey = BuildConfig.CONTROLKIT_API_KEY,
            environment = BuildConfig.CONTROLKIT_ENV,
            baseUrl = BuildConfig.CONTROLKIT_BASE_URL,
            // Poll every 5s so portal edits show up in the demo without
            // anyone tapping Refresh. Tune lower for talks, higher for prod.
            refreshIntervalMillis = 5_000L,
            defaults = ControlKitDefaults(
                // Four feature flags, each with an obvious on-screen effect:
                //   dark_mode             -> flips the whole app to a dark theme
                //   new_version_available -> shows an "Update available" prompt
                //   show_promo_banner     -> shows the marketing banner
                //   show_buy_button       -> shows a "Buy" button on each product
                features = mapOf(
                    "dark_mode" to false,
                    "new_version_available" to false,
                    "show_promo_banner" to false,
                    "show_buy_button" to false,
                ),
                config = mapOf(
                    "welcome_text" to "ControlKit Store",
                    "promo_text" to "",
                    "update_message" to "A new version is available.",
                    "max_items" to 6,
                ),
            ),
        )
    }
}
