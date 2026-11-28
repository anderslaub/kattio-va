package io.github.anderslaub.kattio.voice

import android.os.Handler
import io.github.anderslaub.kattio.HomeAssistant
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import okio.ByteString.Companion.toByteString
import org.json.JSONArray
import org.json.JSONObject
import kotlin.concurrent.thread

/**
 * Home Assistant's websocket API (https://developers.home-assistant.io/docs/api/websocket), for the car screen: commands,
 * subscriptions and binary messages (a spoken request's audio). Every callback runs on [handler]'s thread.
 */
class HaSocket(
  private val ha: HomeAssistant,
  private val handler: Handler,
  private val listener: Listener,
) {
  interface Listener {
    fun onReady()
    /** The connection is gone (error: why, null: closed by the app) */
    fun onClosed(error: String?, loginNeeded: Boolean)
  }

  private class Pending(
    val onResult: (ok: Boolean, result: Any?, error: String?) -> Unit,
    val onEvent: ((JSONObject) -> Unit)?,
  )

  private var ws: WebSocket? = null
  private var nextId = 1
  private val pending = HashMap<Int, Pending>()
  private var closed = false
  var ready = false
    private set

  fun connect() {
    val url = ha.websocketUrl() ?: return fail("Not set up", true)
    thread {
      val token = ha.accessToken()
      handler.post {
        if (closed) return@post
        token.onFailure { return@post fail(it.message, it is HomeAssistant.LoginNeeded) }
        val request = Request.Builder().url(url).build()
        ws = HomeAssistant.http.newWebSocket(request, object : WebSocketListener() {
          override fun onMessage(webSocket: WebSocket, text: String) {
            handler.post { if (webSocket === ws) received(webSocket, text, token.getOrNull()!!.value) }
          }

          override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
            handler.post { if (webSocket === ws) fail(t.message ?: "Connection failed", false) }
          }

          override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
            handler.post { if (webSocket === ws) fail("Home Assistant closed the connection", false) }
          }
        })
      }
    }
  }

  private fun received(socket: WebSocket, text: String, token: String) {
    val messages = try {
      if (text.startsWith("[")) JSONArray(text).let { a -> List(a.length()) { a.getJSONObject(it) } }
      else listOf(JSONObject(text))
    } catch (_: org.json.JSONException) {
      return
    }
    for (msg in messages) {
      when (msg.optString("type")) {
        "auth_required" -> socket.send(JSONObject().put("type", "auth").put("access_token", token).toString())
        "auth_ok" -> {
          ready = true
          listener.onReady()
        }
        "auth_invalid" -> fail("Home Assistant refused the login", true)
        "result" -> {
          val id = msg.optInt("id")
          val p = pending[id] ?: continue
          val ok = msg.optBoolean("success")
          if (!ok || p.onEvent == null) pending.remove(id)
          val error = msg.optJSONObject("error")
          p.onResult(ok, msg.opt("result"), error?.optString("message")?.ifEmpty { null } ?: error?.optString("code"))
        }
        "event" -> pending[msg.optInt("id")]?.onEvent?.invoke(msg.optJSONObject("event") ?: JSONObject())
      }
    }
  }

  private fun fail(error: String?, loginNeeded: Boolean) {
    if (closed) return
    closed = true
    ready = false
    ws?.cancel()
    ws = null
    val waiting = pending.values.toList()
    pending.clear()
    waiting.forEach { it.onResult(false, null, error) }
    listener.onClosed(error, loginNeeded)
  }

  /** A command; with [onEvent], a subscription (its events until [unsubscribe]). Returns its id. */
  fun send(
    msg: JSONObject,
    onEvent: ((JSONObject) -> Unit)? = null,
    onResult: (ok: Boolean, result: Any?, error: String?) -> Unit = { _, _, _ -> },
  ): Int {
    val id = nextId++
    val socket = ws
    if (socket == null || !ready) {
      handler.post { onResult(false, null, "Not connected to Home Assistant") }
      return id
    }
    pending[id] = Pending(onResult, onEvent)
    socket.send(msg.put("id", id).toString())
    return id
  }

  fun unsubscribe(id: Int) {
    if (pending.remove(id) == null) return
    ws?.send(JSONObject().put("id", nextId++).put("type", "unsubscribe_events").put("subscription", id).toString())
  }

  fun sendBinary(bytes: ByteArray) {
    if (ready) ws?.send(bytes.toByteString())
  }

  fun close() {
    if (closed) return
    closed = true
    ready = false
    pending.clear()
    ws?.close(1000, null)
    ws = null
  }
}
