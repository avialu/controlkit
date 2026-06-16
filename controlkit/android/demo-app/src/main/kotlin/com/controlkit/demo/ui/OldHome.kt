package com.controlkit.demo.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

@Composable
fun OldHome(welcomeText: String, maxItems: Int) {
    Box(modifier = Modifier.fillMaxSize().background(Color(0xFFF1F5F9))) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(text = welcomeText, style = MaterialTheme.typography.headlineMedium)
            Text(
                text = "Classic home screen",
                style = MaterialTheme.typography.bodyMedium,
                color = Color(0xFF475569),
            )
            Spacer(modifier = Modifier.height(16.dp))

            val items = (1..maxItems.coerceAtLeast(0)).map { "Item #$it" }
            LazyColumn(modifier = Modifier.fillMaxWidth()) {
                items(items) { item ->
                    Text(
                        text = "• $item",
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 6.dp),
                        style = MaterialTheme.typography.bodyLarge,
                    )
                }
            }
        }
    }
}
