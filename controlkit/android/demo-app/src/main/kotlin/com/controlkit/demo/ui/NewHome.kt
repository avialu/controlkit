package com.controlkit.demo.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

@Composable
fun NewHome(welcomeText: String, maxItems: Int) {
    Box(modifier = Modifier.fillMaxSize().background(Color(0xFFFEF3C7))) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(text = welcomeText, style = MaterialTheme.typography.headlineLarge)
            Text(
                text = "New home — variant from new_home flag",
                style = MaterialTheme.typography.bodyMedium,
                color = Color(0xFF92400E),
            )
            Spacer(modifier = Modifier.height(16.dp))

            val items = (1..maxItems.coerceAtLeast(0)).map { "Card #$it" }
            LazyVerticalGrid(
                columns = GridCells.Fixed(2),
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                items(items) { item ->
                    Card(
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFFFFFBEB)),
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(96.dp),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(item, style = MaterialTheme.typography.titleMedium)
                        }
                    }
                }
            }
        }
    }
}
