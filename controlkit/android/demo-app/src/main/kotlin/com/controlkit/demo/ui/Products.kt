package com.controlkit.demo.ui

/** A single demo product rendered in the storefront. */
data class Product(
    val emoji: String,
    val name: String,
    val tagline: String,
    val price: String,
)

/**
 * Static catalog the demo renders. `max_items` (config) decides how many of these
 * are shown, so editing that value in the portal visibly grows/shrinks the feed.
 */
val SAMPLE_PRODUCTS: List<Product> = listOf(
    Product("🎧", "Wireless Headphones", "Noise cancelling • 30h battery", "$199"),
    Product("⌚", "Smart Watch", "Fitness & sleep tracking", "$149"),
    Product("⌨️", "Mechanical Keyboard", "Hot-swappable switches", "$89"),
    Product("🖱️", "Ergonomic Mouse", "Silent clicks • 6 buttons", "$45"),
    Product("🔋", "Power Bank", "20,000mAh • fast charge", "$59"),
    Product("💡", "Smart Lamp", "16M colors • app control", "$39"),
    Product("🎒", "Laptop Backpack", "Water resistant • USB port", "$79"),
    Product("🔊", "Bluetooth Speaker", "360° sound • IPX7", "$69"),
    Product("📷", "Action Camera", "4K60 • waterproof", "$249"),
    Product("🖥️", "USB-C Monitor", "27\" 4K • single cable", "$329"),
    Product("🪑", "Desk Chair", "Lumbar support • mesh", "$219"),
    Product("🧴", "Cleaning Kit", "Screens & lenses", "$19"),
)
