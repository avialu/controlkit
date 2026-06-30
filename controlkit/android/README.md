# ControlKit Android

Two Gradle modules in one project:

- `controlkit-sdk/` – the **Kotlin Android library** apps integrate against.
- `demo-app/`      – a **Jetpack Compose** demo that exercises every public SDK API.

## Open & run

1. Start the backend and seed it (see `controlkit/backend/README.md`). Grab the `production` API key printed by `npm run seed`.
2. In `controlkit/android/`, copy `local.properties.example` to `local.properties` and fill in:
   ```
   sdk.dir=/path/to/Android/sdk
   controlkit.apiKey=ck_…
   controlkit.baseUrl=http://10.0.2.2:4000
   controlkit.env=production
   ```
   - `10.0.2.2` is the Android emulator's alias for your laptop. On a physical device use your laptop's LAN IP.
3. Open the `android/` folder in Android Studio (Hedgehog or newer). Sync, then Run **demo-app** on an emulator.

## SDK in a nutshell

```kotlin
ControlKit.init(
    context     = this,
    apiKey      = BuildConfig.CONTROLKIT_API_KEY,
    environment = "production",
    baseUrl     = "http://10.0.2.2:4000",
    defaults    = ControlKitDefaults(
        features = mapOf("show_promo_banner" to false),
        config   = mapOf("welcome_text" to "ControlKit Store", "max_items" to 6),
    ),
)

lifecycleScope.launch { ControlKit.fetch() }

val showPromo = ControlKit.isEnabled("show_promo_banner", defaultValue = false)
val welcome   = ControlKit.getString("welcome_text", "ControlKit Store")
val maxItems  = ControlKit.getInt("max_items", 6)
val themeJson  = ControlKit.getJson("theme")
ControlKit.refresh() // fire-and-forget
```

### Behavior

- On `init`, the local SharedPreferences cache is loaded synchronously, so the first reads after a relaunch already see real data.
- Two background refreshers start after `init`:
  - an **in-process coroutine timer** (`refreshIntervalMillis`, default 15 min — the demo overrides it to 5 s) for fast updates while the app is alive; pass `0` to disable it.
  - a **WorkManager** periodic job (`persistentRefreshMinutes`, default 30 min, clamped to WorkManager's 15-min minimum) that keeps the cache fresh even after the process is killed, so the next launch finds recent data. Pass `enablePersistentRefresh = false` to skip it (handy in tests).
- The SDK serves the latest **published** config from the backend — draft edits in the portal aren't fetched until they're published.
- `fetch()` is a `suspend` function. Network errors are thrown to the caller. The in-memory document and cache stay intact, so the app keeps working with the last good config.
- Missing keys fall back to the per-app `defaults` provided to `init` (and then to the per-call `defaultValue`).

## Demo flow

1. App launches → `DemoApplication.onCreate` calls `ControlKit.init(...)`.
2. The cached config (if any) is loaded immediately. The home screen renders.
3. The user taps **Refresh** (or the background poll fires) → `ControlKit.fetch()` runs, the in-memory config is updated, and the screen recomposes. Four feature flags each map to one obvious visual change:
   - `dark_mode` → the whole app switches between light and dark themes.
   - `new_version_available` → an "Update available" prompt appears at the top (copy from `update_message`).
   - `show_promo_banner` → a marketing banner appears (copy from `promo_text`).
   - `show_buy_button` → a "Buy" button is shown on every product card.
   - `welcome_text` is the store headline; `max_items` caps how many products are listed.
4. The **Debug** screen shows the raw JSON document and the current config version.

## Module layout

```text
android/
  settings.gradle.kts                # includes :controlkit-sdk and :demo-app
  build.gradle.kts                   # top-level plugin versions
  gradle.properties
  local.properties.example           # copy → local.properties, then fill in

  controlkit-sdk/
    build.gradle.kts                 # library module
    src/main/kotlin/com/controlkit/sdk/
      ControlKit.kt                  # public API (object)
      ControlKitConfig.kt            # ControlKitDefaults
      internal/
        ConfigDocument.kt
        ConfigParser.kt
        ConfigCache.kt
        NetworkClient.kt
        BackgroundRefresher.kt          # in-process polling timer
        ConfigRefreshWorker.kt          # WorkManager job (survives process death)
        PersistedInitConfig.kt          # init params saved for the worker

  demo-app/
    build.gradle.kts                 # application module, depends on :controlkit-sdk
    src/main/
      AndroidManifest.xml
      kotlin/com/controlkit/demo/
        DemoApplication.kt           # ControlKit.init() lives here
        MainActivity.kt              # Compose nav: home → debug
        ui/
          HomeScreen.kt              # storefront; reads the four flags + config
          Products.kt                # static product catalog
          ProductCard.kt             # product row + optional Buy button
          Banner.kt                  # promo banner (show_promo_banner)
          UpdatePrompt.kt            # "Update available" prompt (new_version_available)
          Theme.kt                   # light/dark color schemes (dark_mode)
          DebugScreen.kt             # raw JSON + version + refresh
      res/values/{strings,themes}.xml
```

## Gradle versions used

- Android Gradle Plugin **8.5.2**
- Kotlin **1.9.24**
- Compose Compiler **1.5.14**
- compileSdk **34**, minSdk **24** (demo-app) / **23** (sdk module)

If your installed Android Studio is older and refuses to sync, bump these in `controlkit/android/build.gradle.kts`.
