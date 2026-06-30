package com.controlkit.demo.ui

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val LightColors = lightColorScheme(
    primary = Color(0xFF4F46E5),
    onPrimary = Color.White,
    background = Color(0xFFF8FAFC),
    surface = Color.White,
    surfaceVariant = Color(0xFFEEF2FF),
    onSurface = Color(0xFF0F172A),
    onSurfaceVariant = Color(0xFF475569),
)

private val DarkColors = darkColorScheme(
    primary = Color(0xFF818CF8),
    onPrimary = Color(0xFF111827),
    background = Color(0xFF0B1120),
    surface = Color(0xFF1E293B),
    surfaceVariant = Color(0xFF273449),
    onSurface = Color(0xFFE2E8F0),
    onSurfaceVariant = Color(0xFF94A3B8),
)

/**
 * Wraps the app in a light or dark Material theme. Driven by the `dark_mode`
 * feature flag, so toggling it in the portal flips the entire UI's colors.
 */
@Composable
fun DemoTheme(darkMode: Boolean, content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = if (darkMode) DarkColors else LightColors,
        content = content,
    )
}
