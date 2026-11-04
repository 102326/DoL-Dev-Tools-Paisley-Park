plugins { id("com.android.application"); id("org.jetbrains.kotlin.android") }

android {
    namespace = "org.paisleypark.tuskprobe"
    compileSdk = 35
    defaultConfig {
        applicationId = "org.paisleypark.tuskprobe"
        minSdk = 23
        targetSdk = 35
        versionCode = 1
        versionName = "0.1"
    }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    kotlinOptions { jvmTarget = "17" }
}
