package io.github.anderslaub.kattio.car

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.os.Handler
import android.os.HandlerThread
import android.os.Looper
import androidx.car.app.CarContext
import androidx.core.content.ContextCompat
import io.github.anderslaub.kattio.HomeAssistant
import io.github.anderslaub.kattio.voice.AnswerPlayer
import io.github.anderslaub.kattio.voice.CarMic
import io.github.anderslaub.kattio.voice.HaSocket
import io.github.anderslaub.kattio.voice.Mic
import io.github.anderslaub.kattio.voice.PhoneMic
import io.github.anderslaub.kattio.voice.Talk
import org.json.JSONArray
import org.json.JSONObject
import java.security.SecureRandom

/**
 * Kattio in the car: voice only. One conversation per car session (each "Talk" continues it), shown as text on the
 * car screen and kept in the Kattio integration's history, so it can be read and continued on the phone later.
 * Uses the same login, pipeline and turn detection as the page (read from the Kattio panel's settings).
 */
class CarVoice(
  private val context: Context,
  private val face: FaceSurface,
  private val host: Host,
  private val onTalking: (Boolean) -> Unit,
) {
  /** Where it runs: the car (its microphone, permissions asked on the phone), or the debug preview */
  interface Host {
    fun mic(): Mic
    /** Ask for the microphone permission; [done] on the main thread */
    fun askForMic(done: (Boolean) -> Unit)
  }

  /** In the car: the car's microphone where the car has one for apps (car API level 5), else the phone's */
  class CarHost(private val car: CarContext) : Host {
    override fun mic(): Mic = if (car.carAppApiLevel >= 5) CarMic(car) else PhoneMic(car)
    override fun askForMic(done: (Boolean) -> Unit) =
      car.requestPermissions(listOf(Manifest.permission.RECORD_AUDIO)) { granted, _ -> done(granted.isNotEmpty()) }
  }

  private val thread = HandlerThread("kattio-voice").apply { start() }
  private val handler = Handler(thread.looper)
  private val main = Handler(Looper.getMainLooper())
  private val ha = HomeAssistant.get(context)
  private val audio = context.getSystemService(AudioManager::class.java)

  private var socket: HaSocket? = null
  private var connecting = false
  private var player: AnswerPlayer? = null
  private var talk: Talk? = null
  private var focus: AudioFocusRequest? = null
  private var closed = false

  private var title = "Kattio"
  private var pipeline: String? = null
  private var turnDetection = false
  private var allowed = true
  private var configured = false
  /** Start talking as soon as connected */
  private var talkWhenReady = false

  private val conversationId = newConversationId()
  private val messages = ArrayList<JSONObject>()
  private var heard = ""
  private var reply = ""
  private var replyDone = false

  /** Connect; [talk]: and start a conversation right away */
  fun open(talk: Boolean) {
    handler.post {
      talkWhenReady = talk
      show(status = "Connecting…")
      connect()
    }
  }

  /** The Talk button */
  fun toggle() {
    handler.post {
      val t = talk
      if (t != null) t.stop() else startTalk()
    }
  }

  fun close() {
    handler.post {
      closed = true
      talk?.stop()
      handler.post {
        player?.release()
        player = null
        socket?.close()
        abandonFocus()
        thread.quitSafely()
      }
    }
  }

  private val usage = AudioAttributes.USAGE_ASSISTANCE_NAVIGATION_GUIDANCE

  private fun connect() {
    if (closed || connecting || socket?.ready == true) return
    if (!ha.loggedIn) {
      show(status = "Open Kattio on your phone and log in to Home Assistant first.", error = true)
      return
    }
    connecting = true
    val s = HaSocket(ha, handler, object : HaSocket.Listener {
      override fun onReady() {
        connecting = false
        loadConfig()
      }

      override fun onClosed(error: String?, loginNeeded: Boolean) {
        connecting = false
        socket = null
        if (closed) return
        talk?.stop()
        show(
          status = if (loginNeeded) "Open Kattio on your phone and log in to Home Assistant again."
          else "No connection to Home Assistant${error?.let { ": $it" } ?: ""}. Tap Talk to try again.",
          error = true,
        )
      }
    })
    socket = s
    s.connect()
  }

  /** The panel's settings (pipeline, turn detection, who may use it) */
  private fun loadConfig() {
    val s = socket ?: return
    s.send(JSONObject().put("type", "get_panels")) { ok, result, _ ->
      val config = (result as? JSONObject)?.optJSONObject(PANEL)?.optJSONObject("config")
      if (!ok || config == null) {
        show(status = "The Kattio integration isn't set up in Home Assistant.", error = true)
        return@send
      }
      title = config.optString("title").ifEmpty { "Kattio" }
      pipeline = config.optString("pipeline").takeIf { it.isNotEmpty() && it != "null" }
      turnDetection = config.optBoolean("turn_detection")
      val users = config.optJSONArray("users") ?: JSONArray()
      s.send(JSONObject().put("type", "auth/current_user")) { _, me, _ ->
        val id = (me as? JSONObject)?.optString("id").orEmpty()
        allowed = users.length() == 0 || (0 until users.length()).any { users.optString(it) == id }
        configured = true
        if (!allowed) {
          show(status = "$title is not set up for you. Ask whoever runs this Home Assistant.", error = true)
        } else if (talkWhenReady) {
          talkWhenReady = false
          startTalk()
        } else {
          showIdle()
        }
      }
    }
  }

  private fun startTalk() {
    if (closed || talk != null) return
    val s = socket
    if (s == null || !s.ready || !configured) {
      talkWhenReady = true
      return connect()
    }
    if (!allowed) return
    if (ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
      main.post {
        host.askForMic { granted ->
          if (granted) handler.post { startTalk() }
          else handler.post { show(status = "Kattio needs the microphone. Allow it on your phone.", error = true) }
        }
      }
      return
    }
    if (!takeFocus()) {
      show(status = "The car's audio is busy. Try again.", error = true)
      return
    }
    val p = player ?: AnswerPlayer(context, handler, usage).also { player = it }
    val t = Talk(s, handler, Talk.Options(pipeline, { conversationId }, turnDetection), host.mic(), p, talkHandlers)
    talk = t
    main.post { onTalking(true) }
    t.start()
  }

  private val talkHandlers = object : Talk.Handlers {
    override fun onState(state: Talk.State) {
      face.setState(
        when (state) {
          Talk.State.STARTING, Talk.State.LISTENING -> FaceEngine.State.LISTENING
          Talk.State.THINKING -> FaceEngine.State.THINKING
          Talk.State.SPEAKING -> FaceEngine.State.SPEAKING
        }
      )
      when (state) {
        Talk.State.STARTING, Talk.State.LISTENING -> show(status = "Listening…", heard = heard, reply = reply)
        Talk.State.THINKING -> show(status = "", heard = heard, reply = reply.ifEmpty { "…" })
        Talk.State.SPEAKING -> show(status = "", heard = heard, reply = reply)
      }
    }

    override fun onTurn() {
      // the last exchange stays in sight until something new is heard
      replyDone = false
    }

    override fun onHeard(text: String) {
      if (text.isEmpty()) return
      heard = text
      reply = ""
      messages += JSONObject().put("role", "user").put("text", text)
      show(status = "", heard = heard, reply = "…")
    }

    override fun onText(text: String, newMessage: Boolean) {
      reply += (if (newMessage && reply.isNotEmpty()) "\n\n" else "") + text
      show(status = "", heard = heard, reply = reply)
    }

    override fun onDone(speech: String, conversationId: String?) {
      if (reply.isBlank()) reply = speech
      if (reply.isNotBlank()) messages += JSONObject().put("role", "assistant").put("text", reply.trim())
      replyDone = true
      show(status = "", heard = heard, reply = reply)
      save()
    }

    override fun onError(message: String) {
      face.setState(FaceEngine.State.ERROR)
      messages += JSONObject().put("role", "error").put("text", message)
      // in the answer's place, under what was heard
      show(status = "", heard = heard, reply = message, error = true)
    }

    override fun onInterrupted() {
      if (reply.isNotBlank() && !replyDone) {
        messages += JSONObject().put("role", "assistant").put("text", reply.trimEnd() + " …")
        replyDone = true
      }
    }

    override fun onLevel(level: Float) = face.setLevel(level)

    override fun onEnd(reason: Talk.End) {
      talk = null
      abandonFocus()
      main.post { onTalking(false) }
      if (reason != Talk.End.ERROR) face.setState(FaceEngine.State.IDLE)
      if (reason != Talk.End.ERROR) showIdle()
      save()
    }
  }

  private fun showIdle() = show(status = "Tap Talk to speak to $title.", heard = heard, reply = reply)

  private fun show(status: String, heard: String = "", reply: String = "", error: Boolean = false) =
    face.show(FaceSurface.Shown(status, heard, reply, error))

  /** Keep the conversation in the Kattio integration's history (shown on the phone too) */
  private fun save() {
    val s = socket ?: return
    if (messages.isEmpty()) return
    val list = JSONArray()
    messages.takeLast(MAX_MESSAGES).forEach { list.put(it) }
    s.send(
      JSONObject().put("type", "kattio/history/save").put("conversation_id", conversationId).put("messages", list)
    )
  }

  /** The car's audio for the whole conversation: music pauses while you talk with Kattio */
  private fun takeFocus(): Boolean {
    if (focus != null) return true
    val request = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_EXCLUSIVE)
      .setAudioAttributes(
        AudioAttributes.Builder().setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).setUsage(usage).build()
      )
      .setOnAudioFocusChangeListener({ change ->
        if (change == AudioManager.AUDIOFOCUS_LOSS) talk?.stop()
      }, handler)
      .build()
    if (audio?.requestAudioFocus(request) != AudioManager.AUDIOFOCUS_REQUEST_GRANTED) return false
    focus = request
    return true
  }

  private fun abandonFocus() {
    focus?.let { audio?.abandonAudioFocusRequest(it) }
    focus = null
  }

  companion object {
    /** The Kattio integration's panel (custom_components/kattio/const.py PANEL_URL_PATH) */
    private const val PANEL = "kattio"
    private const val MAX_MESSAGES = 200

    /** As the panel makes them (panel/src/history.ts newConversationId): kept as they are by Home Assistant */
    fun newConversationId(): String {
      val random = ByteArray(8).also { SecureRandom().nextBytes(it) }.joinToString("") { "%02x".format(it) }
      return "kattio-${System.currentTimeMillis().toString(36)}-$random"
    }
  }
}
