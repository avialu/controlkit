package com.controlkit.demo

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.controlkit.demo.ui.DebugScreen
import com.controlkit.demo.ui.HomeScreen
import com.controlkit.sdk.ControlKit
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
                    DemoApp()
                }
            }
        }
    }
}

@Composable
private fun DemoApp() {
    val nav = rememberNavController()
    val scope = rememberCoroutineScope()

    // A simple counter that re-keys Compose state after a refresh so reads pick up
    // the new values from the SDK without us needing a full reactive layer.
    var refreshTick by remember { mutableIntStateOf(0) }
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
                    refreshTick += 1
                }
            }
        }
    }

    NavHost(navController = nav, startDestination = "home") {
        composable("home") {
            HomeScreen(
                refreshTick = refreshTick,
                refreshing = refreshing,
                lastError = lastError,
                onRefresh = onRefresh,
                onOpenDebug = { nav.navigate("debug") },
            )
        }
        composable("debug") {
            DebugScreen(
                refreshTick = refreshTick,
                refreshing = refreshing,
                lastError = lastError,
                onRefresh = onRefresh,
                onBack = { nav.popBackStack() },
            )
        }
    }
}
