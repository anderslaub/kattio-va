package io.github.anderslaub.kattio

import android.annotation.SuppressLint
import android.app.Activity
import android.graphics.Bitmap
import android.net.Uri
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.view.inputmethod.EditorInfo
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.updatePadding
import kotlin.concurrent.thread

/**
 * First start (or after logging out): your Home Assistant's address, then Home Assistant's own login page. The app
 * never sees your password: Home Assistant hands back a login code, which is exchanged for the app's tokens.
 */
class LoginActivity : ComponentActivity() {
  private lateinit var ha: HomeAssistant
  private lateinit var form: View
  private lateinit var address: EditText
  private lateinit var message: TextView
  private lateinit var button: Button
  private lateinit var progress: ProgressBar
  private var web: WebView? = null
  private lateinit var root: FrameLayout

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    ha = HomeAssistant.get(this)
    root = FrameLayout(this)
    form = makeForm()
    root.addView(form)
    setContentView(root)
    ViewCompat.setOnApplyWindowInsetsListener(root) { v, insets ->
      val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.ime())
      v.updatePadding(top = bars.top, bottom = bars.bottom, left = bars.left, right = bars.right)
      insets
    }
    onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
      override fun handleOnBackPressed() {
        val w = web
        if (w != null && w.canGoBack()) w.goBack()
        else if (w != null) showForm(null)
        else finish()
      }
    })
  }

  private fun dp(v: Int) = (v * resources.displayMetrics.density).toInt()

  private fun makeForm(): View {
    val column = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER_HORIZONTAL
      setPadding(dp(24), dp(48), dp(24), dp(24))
    }
    column.addView(ImageView(this).apply {
      setImageResource(R.drawable.kattio_face)
      contentDescription = null
    }, LinearLayout.LayoutParams(dp(120), dp(120)).apply { bottomMargin = dp(16) })
    column.addView(TextView(this).apply {
      text = getString(R.string.login_title)
      textSize = 24f
      gravity = Gravity.CENTER
      setTextColor(getColor(R.color.text))
    })
    column.addView(TextView(this).apply {
      text = getString(R.string.login_text)
      textSize = 15f
      gravity = Gravity.CENTER
      setTextColor(getColor(R.color.text_dim))
      setPadding(0, dp(8), 0, dp(24))
    })
    address = EditText(this).apply {
      hint = getString(R.string.login_hint)
      inputType = android.text.InputType.TYPE_CLASS_TEXT or android.text.InputType.TYPE_TEXT_VARIATION_URI
      imeOptions = EditorInfo.IME_ACTION_GO
      isSingleLine = true
      setText(ha.url ?: "")
      setOnEditorActionListener { _, id, _ ->
        if (id == EditorInfo.IME_ACTION_GO) { start(); true } else false
      }
    }
    column.addView(address, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT))
    message = TextView(this).apply {
      textSize = 14f
      setTextColor(getColor(R.color.error))
      setPadding(0, dp(8), 0, 0)
      visibility = View.GONE
    }
    column.addView(message)
    button = Button(this).apply {
      text = getString(R.string.login_button)
      setOnClickListener { start() }
    }
    column.addView(button, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { topMargin = dp(16) })
    progress = ProgressBar(this).apply { visibility = View.GONE }
    column.addView(progress, LinearLayout.LayoutParams(dp(40), dp(40)).apply { topMargin = dp(16) })
    return android.widget.ScrollView(this).apply { addView(column) }
  }

  private fun showForm(error: String?) {
    web?.let { root.removeView(it); it.destroy() }
    web = null
    form.visibility = View.VISIBLE
    button.isEnabled = true
    progress.visibility = View.GONE
    message.text = error ?: ""
    message.visibility = if (error == null) View.GONE else View.VISIBLE
  }

  private fun start() {
    val url = HomeAssistant.normalise(address.text.toString())
    if (url == null) {
      showForm(getString(R.string.login_bad_address))
      return
    }
    address.setText(url)
    openLogin(ha.beginLogin(url))
  }

  @SuppressLint("SetJavaScriptEnabled")
  private fun openLogin(page: String) {
    form.visibility = View.GONE
    val w = WebView(this)
    w.settings.javaScriptEnabled = true
    w.settings.domStorageEnabled = true
    w.webViewClient = object : WebViewClient() {
      override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean =
        catchRedirect(request.url)

      override fun onPageStarted(view: WebView, url: String, favicon: Bitmap?) {
        if (catchRedirect(Uri.parse(url))) view.stopLoading()
      }

      override fun onReceivedError(view: WebView, request: WebResourceRequest, error: android.webkit.WebResourceError) {
        if (request.isForMainFrame && !request.url.toString().startsWith(ha.redirectUri)) {
          showForm(getString(R.string.login_unreachable, error.description))
        }
      }
    }
    web = w
    root.addView(w, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT))
    w.loadUrl(page)
  }

  private var exchanging = false

  /** Home Assistant's login sends the browser to the app's redirect address with a code */
  private fun catchRedirect(uri: Uri): Boolean {
    if (!uri.toString().startsWith(ha.redirectUri)) return false
    if (exchanging) return true
    exchanging = true
    web?.visibility = View.GONE
    form.visibility = View.VISIBLE
    button.isEnabled = false
    progress.visibility = View.VISIBLE
    message.visibility = View.GONE
    thread {
      val result = ha.finishLogin(uri)
      runOnUiThread {
        exchanging = false
        result.onSuccess {
          setResult(Activity.RESULT_OK)
          finish()
        }.onFailure { showForm(it.message ?: getString(R.string.login_failed)) }
      }
    }
    return true
  }

  override fun onDestroy() {
    web?.destroy()
    super.onDestroy()
  }
}
