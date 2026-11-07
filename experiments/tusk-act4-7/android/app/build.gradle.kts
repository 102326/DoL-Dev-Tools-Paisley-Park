plugins { id("com.android.application"); id("org.jetbrains.kotlin.android") }

android {
    namespace = "org.paisleypark.tuskprobe"
    compileSdk = 35
    defaultConfig {
        applicationId = "org.paisleypark.tuskprobe"
        minSdk = 23
        targetSdk = 35
        versionCode = 2
        versionName = "0.2"
    }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    kotlinOptions { jvmTarget = "17" }
}
