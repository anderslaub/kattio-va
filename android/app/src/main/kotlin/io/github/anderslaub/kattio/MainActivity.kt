package io.github.anderslaub.kattio

import android.Manifest
import android.annotation.SuppressLint
import android.app.AlertDialog
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import android.widget.FrameLayout
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.updatePadding
import org.json.JSONObject
import kotlin.concurrent.thread

/**
 * Kattio's page in Home Assistant (the Kattio integration's panel), full screen. Also the phone's digital assistant:
 * the assistant gesture (or the headset button) opens it straight into a spoken conversation.
 *
 * The page logs in with the app's tokens through Home Assistant's external authentication (window.externalApp, as
 * the Companion apps do), so there is one login for the page and the car screen.
 */
class MainActivity : ComponentActivity() {
  private lateinit var ha: HomeAssistant
  private var web: WebView? = null
  /** A spoken conversation was asked for (the assistant gesture) and the page hasn't taken it yet */
  @Volatile private var talkRequested = false
  private var pendingMicGrant: PermissionRequest? = null
  private var container: FrameLayout? = null

  private val login = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) {
    if (ha.loggedIn) openPanel() else finish()
  }

  private val micPermission = registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
    val request = pendingMicGrant ?: return@registerForActivityResult
    pendingMicGrant = null
    if (granted) request.grant(arrayOf(PermissionRequest.RESOURCE_AUDIO_CAPTURE)) else request.deny()
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    ha = HomeAssistant.get(this)
    talkRequested = isAssist(intent)
    onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
      override fun handleOnBackPressed() {
        val w = web
        if (w != null && w.canGoBack()) w.goBack() else finish()
      }
    })
    if (ha.loggedIn) openPanel() else login.launch(Intent(this, LoginActivity::class.java))
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    // the page is told once it shows again (onResume): a hidden page can't open the microphone
    if (isAssist(intent)) talkRequested = true
  }

  private fun isAssist(intent: Intent?): Boolean = intent?.action in ASSIST_ACTIONS

  private fun isHomeAssistant(url: String?): Boolean {
    val base = ha.url ?: return false
    return url != null && (url == base || url.startsWith("$base/"))
  }

  @SuppressLint("SetJavaScriptEnabled", "JavascriptInterface")
  private fun openPanel() {
    val base = ha.url ?: return
    if (web != null) return
    val w = WebView(this)
    w.settings.apply {
      javaScriptEnabled = true
      domStorageEnabled = true
      // the answers are spoken without a tap first (the page asks for a spoken conversation itself)
      mediaPlaybackRequiresUserGesture = false
      userAgentString = "$userAgentString KattioApp/${BuildConfig.VERSION_NAME}"
    }
    w.addJavascriptInterface(ExternalApp(), "externalApp")
    w.addJavascriptInterface(KattioBridge(), "kattioApp")
    w.webViewClient = object : WebViewClient() {
      override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
        if (isHomeAssistant(request.url.toString())) return false
        // links elsewhere open in the browser
        try {
          startActivity(Intent(Intent.ACTION_VIEW, request.url))
        } catch (_: ActivityNotFoundException) {
        }
        return true
      }
    }
    w.webChromeClient = object : WebChromeClient() {
      override fun onPermissionRequest(request: PermissionRequest) {
        runOnUiThread { grant(request) }
      }
    }
    web = w
    // the page between the phone's bars (a WebView ignores its own padding); the bars take the page's colour
    val box = FrameLayout(this)
    box.addView(w, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT))
    container = box
    setContentView(box)
    ViewCompat.setOnApplyWindowInsetsListener(box) { v, insets ->
      val bars = insets.getInsets(
        WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout() or WindowInsetsCompat.Type.ime()
      )
      v.updatePadding(top = bars.top, bottom = bars.bottom, left = bars.left, right = bars.right)
      WindowInsetsCompat.CONSUMED
    }
    w.loadUrl("$base/$PANEL_PATH")
  }

  /** The page asks for the microphone: only Home Assistant's own pages get it */
  private fun grant(request: PermissionRequest) {
    if (!isHomeAssistant(request.origin.toString().trimEnd('/')) ||
      PermissionRequest.RESOURCE_AUDIO_CAPTURE !in request.resources
    ) {
      request.deny()
      return
    }
    if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
      request.grant(arrayOf(PermissionRequest.RESOURCE_AUDIO_CAPTURE))
    } else {
      pendingMicGrant?.deny()
      pendingMicGrant = request
      micPermission.launch(Manifest.permission.RECORD_AUDIO)
    }
  }

  override fun onResume() {
    super.onResume()
    web?.onResume()
    if (talkRequested) web?.post { js("window.dispatchEvent(new Event('kattio-app-talk'))") }
  }

  override fun onPause() {
    web?.onPause()
    super.onPause()
  }

  override fun onDestroy() {
    web?.destroy()
    web = null
    super.onDestroy()
  }

  /** Run in the page, if it is still Home Assistant's */
  private fun js(code: String) = runOnUiThread {
    val w = web ?: return@runOnUiThread
    if (isHomeAssistant(w.url)) w.evaluateJavascript(code, null)
  }

  private fun onLoginLost() = runOnUiThread {
    web?.let { it.destroy(); web = null }
    container = null
    setContentView(View(this))
    login.launch(Intent(this, LoginActivity::class.java))
  }

  private fun showAppSettings() = runOnUiThread {
    AlertDialog.Builder(this)
      .setTitle(R.string.app_name)
      .setMessage(getString(R.string.settings_text, ha.url ?: ""))
      .setPositiveButton(R.string.settings_close, null)
      .setNegativeButton(R.string.settings_logout) { _, _ ->
        thread {
          ha.logout()
          onLoginLost()
        }
      }
      .show()
  }

  /**
   * Home Assistant's external app interface (https://developers.home-assistant.io/docs/frontend/external-authentication
   * and .../external-bus): the page asks the app for access tokens, and a little about what the app can do.
   */
  inner class ExternalApp {
    @JavascriptInterface
    fun getExternalAuth(payload: String) {
      val (callback, force) = parse(payload) ?: return
      runOnUiThread {
        if (!isHomeAssistant(web?.url)) return@runOnUiThread
        thread {
          ha.accessToken(force).onSuccess { token ->
            val auth = JSONObject().put("access_token", token.value).put("expires_in", token.expiresIn)
            js("window.$callback(true, $auth)")
          }.onFailure { err ->
            js("window.$callback(false)")
            if (err is HomeAssistant.LoginNeeded) onLoginLost()
          }
        }
      }
    }

    @JavascriptInterface
    fun revokeExternalAuth(payload: String) {
      val (callback, _) = parse(payload) ?: return
      thread {
        ha.logout()
        js("window.$callback(true)")
        onLoginLost()
      }
    }

    @JavascriptInterface
    fun externalBus(message: String) {
      val msg = try { JSONObject(message) } catch (_: org.json.JSONException) { return }
      when (msg.optString("type")) {
        "config/get" -> {
          val config = JSONObject()
            .put("hasSettingsScreen", true)
            .put("canWriteTag", false)
            .put("hasExoPlayer", false)
            .put("canCommissionMatter", false)
            .put("canImportThreadCredentials", false)
            .put("hasAssist", false)
            .put("hasBarCodeScanner", 0)
          val reply = JSONObject().put("id", msg.optInt("id")).put("type", "result").put("success", true)
            .put("result", config)
          js("window.externalBus($reply)")
        }
        "config_screen/show" -> showAppSettings()
      }
    }

    private fun parse(payload: String): Pair<String, Boolean>? = try {
      val json = JSONObject(payload)
      val callback = json.getString("callback")
      if (!callback.matches(Regex("[A-Za-z0-9_]+"))) null else callback to json.optBoolean("force", false)
    } catch (_: org.json.JSONException) {
      null
    }
  }

  /** For the Kattio page: it is in the app (window.kattioApp) */
  inner class KattioBridge {
    /** A spoken conversation was asked for (the assistant gesture): true once, then false */
    @JavascriptInterface
    fun takeTalkRequest(): Boolean {
      val wanted = talkRequested
      talkRequested = false
      return wanted
    }

    /** The page wants the screen kept on (or not any more) */
    @JavascriptInterface
    fun keepScreenOn(on: Boolean) = runOnUiThread {
      if (on) window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
      else window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    }

    /** The page's colours: the phone's bars around it match */
    @JavascriptInterface
    fun setTheme(dark: Boolean, background: String) = runOnUiThread {
      cssColor(background)?.let { container?.setBackgroundColor(it) }
      WindowCompat.getInsetsController(window, window.decorView).apply {
        isAppearanceLightStatusBars = !dark
        isAppearanceLightNavigationBars = !dark
      }
    }

    @JavascriptInterface
    fun version(): String = BuildConfig.VERSION_NAME
  }

  /** "rgb(17, 17, 20)" or "#111114" */
  private fun cssColor(css: String): Int? {
    val rgb = Regex("""rgba?\((\d+),\s*(\d+),\s*(\d+)""").find(css)
    if (rgb != null) {
      val (r, g, b) = rgb.destructured
      return android.graphics.Color.rgb(r.toInt(), g.toInt(), b.toInt())
    }
    return try { android.graphics.Color.parseColor(css.trim()) } catch (_: IllegalArgumentException) { null }
  }

  companion object {
    /** The Kattio integration's panel (custom_components/kattio/const.py PANEL_URL_PATH) */
    private const val PANEL_PATH = "kattio"
    private val ASSIST_ACTIONS = setOf(Intent.ACTION_ASSIST, Intent.ACTION_VOICE_COMMAND)
  }
}
