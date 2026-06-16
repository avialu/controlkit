package com.controlkit.demo.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.controlkit.sdk.ControlKit

@Composable
fun HomeScreen(
    refreshTick: Int,
    refreshing: Boolean,
    lastError: String?,
    onRefresh: () -> Unit,
    onOpenDebug: () -> Unit,
) {
    // Re-read every refresh so the UI reflects the latest config.
    val showBanner  = remember(refreshTick) { ControlKit.isEnabled("show_banner", false) }
    val bannerText  = remember(refreshTick) { ControlKit.getString("banner_text", "") }
    val useNewHome  = remember(refreshTick) { ControlKit.isEnabled("new_home", false) }
    val welcomeText = remember(refreshTick) { ControlKit.getString("welcome_text", "Hello!") }
    val maxItems    = remember(refreshTick) { ControlKit.getInt("max_items", 5) }
    val version     = remember(refreshTick) { ControlKit.version() }

    Column(modifier = Modifier.fillMaxSize()) {
        if (showBanner && bannerText.isNotBlank()) {
            Banner(text = bannerText)
        }

        Box(modifier = Modifier.fillMaxWidth().weight(1f)) {
            if (useNewHome) {
                NewHome(welcomeText = welcomeText, maxItems = maxItems)
            } else {
                OldHome(welcomeText = welcomeText, maxItems = maxItems)
            }
        }

        Column(modifier = Modifier.padding(16.dp)) {
            if (lastError != null) {
                Text(
                    text = "Refresh failed: $lastError",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color(0xFFB91C1C),
                    modifier = Modifier.padding(bottom = 8.dp),
                )
            }
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = "Config v$version  •  Variant: ${if (useNewHome) "new_home" else "old_home"}",
                    style = MaterialTheme.typography.bodySmall,
                )
                Row {
                    OutlinedButton(onClick = onOpenDebug) { Text("Debug") }
                    Spacer(Modifier.height(0.dp).padding(start = 8.dp))
                    Button(onClick = onRefresh, enabled = !refreshing) {
                        if (refreshing) {
                            CircularProgressIndicator(
                                modifier = Modifier.height(16.dp),
                                strokeWidth = 2.dp,
                            )
                        } else {
                            Text("Refresh")
                        }
                    }
                }
            }
        }
    }
}
