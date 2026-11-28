plugins {
  alias(libs.plugins.android.application)
}

android {
  namespace = "io.github.anderslaub.kattio"
  compileSdk = 36
  ndkVersion = "29.0.14206865"
  defaultConfig {
    applicationId = "io.github.anderslaub.kattio"
    // Android 8: the car app library's minimum, and what the assistant role needs
    minSdk = 26
    targetSdk = 36
    versionCode = 1
    versionName = "0.1"
    externalNativeBuild { cmake { arguments += "-DANDROID_STL=c++_static" } }
    ndk { abiFilters += listOf("arm64-v8a", "armeabi-v7a", "x86_64") }
  }

  buildTypes {
    release {
      isMinifyEnabled = false
      // signed with the debug key unless you set up your own (it's installed by hand, not from a store)
      signingConfig = signingConfigs.getByName("debug")
    }
  }
  compileOptions {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
  }
  externalNativeBuild {
    cmake {
      path = file("src/main/cpp/CMakeLists.txt")
      version = "3.31.6"
    }
  }
  buildFeatures { buildConfig = true }
}

kotlin {
  jvmToolchain(17)
}

dependencies {
  implementation(libs.androidx.core.ktx)
  implementation(libs.androidx.activity)
  implementation(libs.androidx.webkit)
  implementation(libs.car.app)
  implementation(libs.car.app.projected)
  implementation(libs.media3.exoplayer)
  implementation(libs.okhttp)
  testImplementation(libs.junit)
}
