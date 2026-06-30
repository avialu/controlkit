package com.controlkit.demo.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.controlkit.sdk.ControlKit

@Composable
fun HomeScreen(
    version: Int,
    refreshing: Boolean,
    lastError: String?,
    onRefresh: () -> Unit,
    onOpenDebug: () -> Unit,
) {
    // `version` comes from ControlKit.configVersion (StateFlow). Every time the SDK
    // swaps the document — manual fetch OR background poll — these reads re-fire so
    // flipping a flag in the portal updates the UI within seconds.
    val showUpdate    = remember(version) { ControlKit.isEnabled("new_version_available", false) }
    val showPromo     = remember(version) { ControlKit.isEnabled("show_promo_banner", false) }
    val showBuyButton = remember(version) { ControlKit.isEnabled("show_buy_button", false) }

    val welcomeText   = remember(version) { ControlKit.getString("welcome_text", "ControlKit Store") }
    val promoText     = remember(version) { ControlKit.getString("promo_text", "") }
    val updateMessage = remember(version) { ControlKit.getString("update_message", "A new version is available.") }
    val maxItems      = remember(version) { ControlKit.getInt("max_items", 6) }

    val products = remember(version) { SAMPLE_PRODUCTS.take(maxItems.coerceAtLeast(0)) }

    Column(modifier = Modifier.fillMaxSize()) {
        LazyColumn(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f),
            contentPadding = PaddingValues(top = 16.dp, bottom = 8.dp),
        ) {
            item {
                Column(modifier = Modifier.padding(horizontal = 16.dp)) {
                    Text(
                        text = welcomeText,
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                    Text(
                        text = "${products.size} products",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Spacer(Modifier.height(12.dp))
                }
            }

            if (showUpdate) {
                item { UpdatePrompt(message = updateMessage, onUpdate = onRefresh) }
            }

            if (showPromo && promoText.isNotBlank()) {
                item { PromoBanner(text = promoText) }
            }

            items(products) { product ->
                ProductCard(product = product, showBuyButton = showBuyButton)
            }
        }

        Footer(
            version = version,
            refreshing = refreshing,
            lastError = lastError,
            onRefresh = onRefresh,
            onOpenDebug = onOpenDebug,
        )
    }
}

@Composable
private fun Footer(
    version: Int,
    refreshing: Boolean,
    lastError: String?,
    onRefresh: () -> Unit,
    onOpenDebug: () -> Unit,
) {
    Column(modifier = Modifier.padding(16.dp)) {
        if (lastError != null) {
            Text(
                text = "Refresh failed: $lastError",
                style = MaterialTheme.typography.bodySmall,
                color = Color(0xFFEF4444),
                modifier = Modifier.padding(bottom = 8.dp),
            )
        }
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = "Config v$version",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Row(verticalAlignment = Alignment.CenterVertically) {
                OutlinedButton(onClick = onOpenDebug) { Text("Debug") }
                Spacer(Modifier.width(8.dp))
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
