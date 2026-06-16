import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// Pull the API key + base URL from local.properties so they never get committed.
val localProps = Properties().apply {
    val f = rootProject.file("local.properties")
    if (f.exists()) f.inputStream().use { load(it) }
}
val controlKitApiKey  = localProps.getProperty("controlkit.apiKey")  ?: "ck_REPLACE_ME"
val controlKitBaseUrl = localProps.getProperty("controlkit.baseUrl") ?: "http://10.0.2.2:4000"
val controlKitEnv     = localProps.getProperty("controlkit.env")     ?: "production"

android {
    namespace = "com.controlkit.demo"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.controlkit.demo"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"

        buildConfigField("String", "CONTROLKIT_API_KEY",  "\"$controlKitApiKey\"")
        buildConfigField("String", "CONTROLKIT_BASE_URL", "\"$controlKitBaseUrl\"")
        buildConfigField("String", "CONTROLKIT_ENV",      "\"$controlKitEnv\"")
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }
    composeOptions { kotlinCompilerExtensionVersion = "1.5.14" }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}

dependencies {
    implementation(project(":controlkit-sdk"))

    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.activity:activity-compose:1.9.2")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.6")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.6")

    val composeBom = platform("androidx.compose:compose-bom:2024.09.02")
    implementation(composeBom)
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.navigation:navigation-compose:2.8.0")

    debugImplementation("androidx.compose.ui:ui-tooling")
}
