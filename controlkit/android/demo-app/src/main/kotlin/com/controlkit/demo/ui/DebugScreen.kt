package com.controlkit.demo.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
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
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import com.controlkit.sdk.ControlKit

@Composable
fun DebugScreen(
    refreshTick: Int,
    refreshing: Boolean,
    lastError: String?,
    onRefresh: () -> Unit,
    onBack: () -> Unit,
) {
    val json    = remember(refreshTick) { ControlKit.rawJson().toString(2) }
    val version = remember(refreshTick) { ControlKit.version() }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text("Debug — config v$version", style = MaterialTheme.typography.titleLarge)
            OutlinedButton(onClick = onBack) { Text("Back") }
        }

        if (lastError != null) {
            Text(
                text = "Last error: $lastError",
                style = MaterialTheme.typography.bodySmall,
                color = Color(0xFFB91C1C),
                modifier = Modifier.padding(top = 8.dp),
            )
        }

        Box(
            modifier = Modifier
                .padding(top = 12.dp)
                .fillMaxWidth()
                .weight(1f)
                .background(Color(0xFF0F172A)),
        ) {
            Text(
                text = json,
                color = Color(0xFFE2E8F0),
                fontFamily = FontFamily.Monospace,
                style = MaterialTheme.typography.bodySmall,
                modifier = Modifier
                    .padding(12.dp)
                    .verticalScroll(rememberScrollState()),
            )
        }

        Row(
            modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
            horizontalArrangement = Arrangement.End,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Button(onClick = onRefresh, enabled = !refreshing) {
                if (refreshing) {
                    CircularProgressIndicator(strokeWidth = 2.dp)
                } else {
                    Text("Refresh config")
                }
            }
        }
    }
}
