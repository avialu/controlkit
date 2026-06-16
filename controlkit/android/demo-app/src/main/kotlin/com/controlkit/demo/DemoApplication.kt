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
            defaults = ControlKitDefaults(
                features = mapOf(
                    "new_home" to false,
                    "show_banner" to false,
                ),
                config = mapOf(
                    "welcome_text" to "Hello!",
                    "max_items" to 5,
                    "banner_text" to "",
                ),
            ),
        )
    }
}
