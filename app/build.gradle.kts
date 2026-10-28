plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// İmza şifresi GitHub gizli değerinden (KEYSTORE_PASSWORD) gelir
val ksPass: String? = System.getenv("KEYSTORE_PASSWORD")

android {
    namespace = "com.mutfak.asistan"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.mutfak.asistan"
        minSdk = 24
        targetSdk = 35
        // Her derlemede sürüm numarası artar, güncelleme eskisinin üzerine kurulur
        versionCode = System.getenv("GITHUB_RUN_NUMBER")?.toIntOrNull() ?: 1
        versionName = "1.2"
    }

    signingConfigs {
        create("release") {
            storeFile = file("release.keystore")
            storePassword = ksPass
            keyAlias = "mutfak"
            keyPassword = ksPass
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            // Sabit anahtarla imzalanır, böylece güncellemeler silmeden kurulur
            signingConfig = if (!ksPass.isNullOrEmpty()) signingConfigs.getByName("release")
                            else signingConfigs.getByName("debug")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.activity:activity-ktx:1.9.3")
    implementation("androidx.webkit:webkit:1.12.1")
    implementation("androidx.core:core-splashscreen:1.0.1")
    implementation("com.android.billingclient:billing-ktx:7.1.1")
}
