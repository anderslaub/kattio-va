package io.github.anderslaub.kattio

import android.content.Context
import android.net.Uri
import okhttp3.FormBody
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.io.IOException
import java.security.SecureRandom
import java.util.concurrent.TimeUnit

/**
 * The Home Assistant this app talks to, and the login to it.
 *
 * The app logs in the way any Home Assistant client does (OAuth, the login page of Home Assistant itself), as its own
 * client (shown in your Home Assistant profile under "Refresh tokens"). The page in the app gets its access tokens
 * from here (Home Assistant's "external authentication", the same as the Companion apps), and so does the car screen.
 * Nothing about a particular Home Assistant is built in: its address is asked for the first time.
 */
class HomeAssistant private constructor(context: Context) {
  private val prefs = context.applicationContext.getSharedPreferences("kattio", Context.MODE_PRIVATE)

  /** The address, e.g. https://homeassistant.local:8123 (no path); null: not set up yet */
  val url: String? get() = prefs.getString(KEY_URL, null)

  val loggedIn: Boolean get() = url != null && prefs.getString(KEY_REFRESH, null) != null

  private val clientId: String get() = "${url}/$APP_PATH"
  val redirectUri: String get() = "${url}/$APP_PATH/auth_callback"

  private var accessToken: String? = null
  private var expiresAt = 0L
  private var state: String? = null

  /** Start a new login to this Home Assistant: the page to open */
  @Synchronized
  fun beginLogin(address: String): String {
    if (address != url) clear()
    prefs.edit().putString(KEY_URL, address).apply()
    val s = ByteArray(16).also { SecureRandom().nextBytes(it) }.joinToString("") { "%02x".format(it) }
    state = s
    return Uri.parse("$address/auth/authorize").buildUpon()
      .appendQueryParameter("response_type", "code")
      .appendQueryParameter("client_id", clientId)
      .appendQueryParameter("redirect_uri", redirectUri)
      .appendQueryParameter("state", s)
      .build().toString()
  }

  /** Home Assistant sent the login back (the redirect): exchange the code for tokens. Blocking. */
  fun finishLogin(redirect: Uri): Result<Unit> {
    val code = redirect.getQueryParameter("code") ?: return Result.failure(IOException("No login code"))
    synchronized(this) {
      if (state == null || redirect.getQueryParameter("state") != state) {
        return Result.failure(IOException("The login didn't match; try again"))
      }
      state = null
    }
    return token(FormBody.Builder().add("grant_type", "authorization_code").add("code", code)).map { json ->
      synchronized(this) {
        prefs.edit().putString(KEY_REFRESH, json.getString("refresh_token")).apply()
      }
    }
  }

  /**
   * A valid access token (refreshed when it's about to expire, or when forced). Blocking: call off the main thread.
   * Null with [LoginNeeded] as the failure: the login was revoked; log in again.
   */
  @Synchronized
  fun accessToken(force: Boolean = false): Result<Token> {
    val now = System.currentTimeMillis()
    val cached = accessToken
    if (!force && cached != null && expiresAt - now > 60_000) {
      return Result.success(Token(cached, ((expiresAt - now) / 1000).toInt()))
    }
    val refresh = prefs.getString(KEY_REFRESH, null) ?: return Result.failure(LoginNeeded())
    return token(FormBody.Builder().add("grant_type", "refresh_token").add("refresh_token", refresh)).map { json ->
      val expires = json.optInt("expires_in", 1800)
      accessToken = json.getString("access_token")
      expiresAt = System.currentTimeMillis() + expires * 1000L
      Token(accessToken!!, expires)
    }
  }

  /** Log out: the token is revoked in Home Assistant, and forgotten here. Blocking. */
  fun logout() {
    val base = url
    val refresh = synchronized(this) { prefs.getString(KEY_REFRESH, null).also { clear() } }
    if (base != null && refresh != null) {
      try {
        http.newCall(
          Request.Builder().url("$base/auth/revoke").post(FormBody.Builder().add("token", refresh).build()).build()
        ).execute().close()
      } catch (_: IOException) {
        // offline: the token stays in Home Assistant's list until removed there
      }
    }
  }

  @Synchronized
  private fun clear() {
    prefs.edit().remove(KEY_REFRESH).apply()
    accessToken = null
    expiresAt = 0
  }

  private fun token(form: FormBody.Builder): Result<JSONObject> {
    val base = url ?: return Result.failure(LoginNeeded())
    val request = Request.Builder().url("$base/auth/token").post(form.add("client_id", clientId).build()).build()
    return try {
      http.newCall(request).execute().use { response ->
        val body = response.body?.string().orEmpty()
        when {
          response.isSuccessful -> Result.success(JSONObject(body))
          // the refresh token is no longer valid (removed in Home Assistant)
          response.code in 400..403 -> {
            clear()
            Result.failure(LoginNeeded())
          }
          else -> Result.failure(IOException("Home Assistant answered ${response.code}"))
        }
      }
    } catch (e: IOException) {
      Result.failure(e)
    } catch (e: org.json.JSONException) {
      Result.failure(IOException("Home Assistant's answer wasn't understood"))
    }
  }

  /** The websocket API's address */
  fun websocketUrl(): String? = url?.replaceFirst(Regex("^http"), "ws")?.plus("/api/websocket")

  /** A path on Home Assistant (e.g. the answer's sound, /api/tts_proxy/...) as a full address */
  fun absolute(path: String): String = if (path.startsWith("http")) path else "$url$path"

  data class Token(val value: String, val expiresIn: Int)

  class LoginNeeded : IOException("Log in to Home Assistant again")

  companion object {
    private const val KEY_URL = "url"
    private const val KEY_REFRESH = "refresh_token"
    private const val APP_PATH = "kattio-app"

    val http: OkHttpClient by lazy {
      OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .pingInterval(30, TimeUnit.SECONDS)
        .build()
    }

    @Volatile
    private var instance: HomeAssistant? = null

    fun get(context: Context): HomeAssistant =
      instance ?: synchronized(this) { instance ?: HomeAssistant(context).also { instance = it } }

    /** "ha.example.com", "http://10.0.0.2:8123/lovelace" -> "https://ha.example.com", "http://10.0.0.2:8123" */
    fun normalise(input: String): String? {
      var text = input.trim()
      if (text.isEmpty()) return null
      if (!text.contains("://")) text = "https://$text"
      val uri = Uri.parse(text)
      val scheme = uri.scheme?.lowercase()
      if (scheme != "http" && scheme != "https" || uri.host.isNullOrEmpty()) return null
      val port = if (uri.port > 0) ":${uri.port}" else ""
      return "$scheme://${uri.host}$port"
    }
  }
}
