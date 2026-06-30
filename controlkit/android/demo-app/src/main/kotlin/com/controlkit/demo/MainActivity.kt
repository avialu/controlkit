package com.controlkit.demo

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.controlkit.demo.ui.DebugScreen
import com.controlkit.demo.ui.DemoTheme
import com.controlkit.demo.ui.HomeScreen
import com.controlkit.sdk.ControlKit
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            DemoApp()
        }
    }
}

@Composable
private fun DemoApp() {
    val nav = rememberNavController()
    val scope = rememberCoroutineScope()

    // Subscribe to the SDK's version flow. Every time the SDK swaps the in-memory
    // document — manual fetch OR the background poll — `version` updates and
    // every `remember(version) { ... }` below re-reads the latest values.
    val version by ControlKit.configVersion.collectAsStateWithLifecycle()

    // `dark_mode` flips the whole app theme, so it has to be read here, above the
    // theme wrapper, rather than inside an individual screen.
    val darkMode = remember(version) { ControlKit.isEnabled("dark_mode", false) }

    var refreshing by remember { mutableStateOf(false) }
    var lastError by remember { mutableStateOf<String?>(null) }

    val onRefresh: () -> Unit = {
        if (!refreshing) {
            refreshing = true
            lastError = null
            scope.launch {
                try {
                    ControlKit.fetch()
                } catch (t: Throwable) {
                    lastError = t.message
                } finally {
                    refreshing = false
                }
            }
        }
    }

    DemoTheme(darkMode = darkMode) {
        Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
            NavHost(navController = nav, startDestination = "home") {
                composable("home") {
                    HomeScreen(
                        version = version,
                        refreshing = refreshing,
                        lastError = lastError,
                        onRefresh = onRefresh,
                        onOpenDebug = { nav.navigate("debug") },
                    )
                }
                composable("debug") {
                    DebugScreen(
                        version = version,
                        refreshing = refreshing,
                        lastError = lastError,
                        onRefresh = onRefresh,
                        onBack = { nav.popBackStack() },
                    )
                }
            }
        }
    }
}
