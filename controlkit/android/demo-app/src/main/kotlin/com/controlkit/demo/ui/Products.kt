package com.controlkit.demo.ui

/** A single demo product rendered in the storefront. */
data class Product(
    val emoji: String,
    val name: String,
    val tagline: String,
    val price: String,
    val rating: Double,
)

/**
 * Static catalog the demo renders. `max_items` (config) decides how many of these
 * are shown, so editing that value in the portal visibly grows/shrinks the feed.
 */
val SAMPLE_PRODUCTS: List<Product> = listOf(
    Product("🎧", "Wireless Headphones", "Noise cancelling • 30h battery", "$199", 4.7),
    Product("⌚", "Smart Watch", "Fitness & sleep tracking", "$149", 4.5),
    Product("⌨️", "Mechanical Keyboard", "Hot-swappable switches", "$89", 4.8),
    Product("🖱️", "Ergonomic Mouse", "Silent clicks • 6 buttons", "$45", 4.3),
    Product("🔋", "Power Bank", "20,000mAh • fast charge", "$59", 4.6),
    Product("💡", "Smart Lamp", "16M colors • app control", "$39", 4.2),
    Product("🎒", "Laptop Backpack", "Water resistant • USB port", "$79", 4.4),
    Product("🔊", "Bluetooth Speaker", "360° sound • IPX7", "$69", 4.9),
    Product("📷", "Action Camera", "4K60 • waterproof", "$249", 4.1),
    Product("🖥️", "USB-C Monitor", "27\" 4K • single cable", "$329", 4.6),
    Product("🪑", "Desk Chair", "Lumbar support • mesh", "$219", 4.5),
    Product("🧴", "Cleaning Kit", "Screens & lenses", "$19", 4.0),
)
