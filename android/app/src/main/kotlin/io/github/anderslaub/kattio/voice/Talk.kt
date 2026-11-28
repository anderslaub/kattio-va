package io.github.anderslaub.kattio.voice

import android.os.Handler
import org.json.JSONObject
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt
import kotlin.math.sqrt

/**
 * A spoken conversation, as with a Kattio box (the app's copy of the panel's panel/src/talk.ts, for the car screen):
 * the microphone stays open for the whole conversation, each request goes through Home Assistant's Assist pipeline
 * (speech to text, the agent, the answer out loud), and after each answer it listens again, until nobody says
 * anything, a goodbye ("bye bye", "stop talking"), or [stop].
 *
 * With a turn detection service (the Kattio integration's "Turn detection server"), the microphone also goes there,
 * through the integration (custom_components/kattio/voice.py): it says when the speaker is done, and when someone
 * interrupts the answer. Without one, Home Assistant's own end-of-speech detection ends each request.
 *
 * Everything runs on [handler]'s thread (the socket's callbacks, the microphone's audio and the player too).
 */
class Talk(
  private val socket: HaSocket,
  private val handler: Handler,
  private val options: Options,
  private val mic: Mic,
  private val player: AnswerPlayer,
  private val handlers: Handlers,
) {
  enum class State { STARTING, LISTENING, THINKING, SPEAKING }

  /** STOPPED: by the app; QUIET: nobody spoke; DISMISSED: a goodbye */
  enum class End { STOPPED, QUIET, DISMISSED, ERROR }

  class Options(
    val pipeline: String?,
    /** The conversation to continue (read at each request) */
    val conversationId: () -> String,
    val turnDetection: Boolean,
  )

  interface Handlers {
    fun onState(state: State)
    /** A new request is listened for */
    fun onTurn()
    /** What was heard in this request (empty: nothing) */
    fun onHeard(text: String)
    /** More of the reply's text; newMessage: the agent started a new message (e.g. after using a tool) */
    fun onText(text: String, newMessage: Boolean)
    /** The reply is complete: its full text (when not streamed) and the conversation */
    fun onDone(speech: String, conversationId: String?)
    fun onError(message: String)
    /** The answer was cut off */
    fun onInterrupted()
    /** How loud the answer is now, 0..1 */
    fun onLevel(level: Float)
    fun onEnd(reason: End)
  }

  private class Run(var replay: ByteArray?) {
    var handlerId: Int? = null
    var open = true
    val pending = ArrayList<ByteArray>()
    var subscription: Int? = null
    var heard = false
    var ttsUrl: String? = null
    var streamable = false
    var ended = false
    var playing = false
    var failed = false
    val read = ReplyReader()
    val timers = ArrayList<Runnable>()
  }

  private val history = AudioHistory(HISTORY_MS)
  private var over = false
  private var run: Run? = null
  private var turn = 0
  private var flags = 0
  private var speechMs = 0.0
  private var turnsHandler: Int? = null
  private var turnsSubscription: Int? = null
  private var turnsOn = false

  // ------------------------------------------------------------------ the turn detection service (optional)
  private fun sendBinary(handlerId: Int, head: ByteArray, pcm: ByteArray?) {
    val n = pcm?.size ?: 0
    val msg = ByteArray(1 + head.size + n)
    msg[0] = handlerId.toByte()
    head.copyInto(msg, 1)
    pcm?.copyInto(msg, 1 + head.size)
    socket.sendBinary(msg)
  }

  private fun toTurns(pcm: ByteArray? = null) {
    val id = turnsHandler ?: return
    sendBinary(id, byteArrayOf(flags.toByte(), (turn and 0xff).toByte()), pcm)
  }

  private fun setFlags(f: Int) {
    if (f == flags) return
    flags = f
    toTurns()
  }

  private fun onTurnsEvent(ev: JSONObject) {
    if (over) return
    when (ev.optString("type")) {
      "ready" -> {
        turnsHandler = ev.optInt("handler_id")
        toTurns()
      }
      "end_of_turn" -> {
        val r = run
        if (ev.optInt("turn") == (turn and 0xff) && r != null && r.open && flags and FLAG_LISTENING != 0) endRequest()
      }
      "interrupt" -> if (run?.playing == true) interrupt(ev.optInt("ago_ms") + REPLAY_EXTRA_MS)
    }
  }

  // ------------------------------------------------------------------ the pipeline: one run per request
  private fun toRun(r: Run, pcm: ByteArray?) {
    val id = r.handlerId ?: return
    sendBinary(id, ByteArray(0), pcm)
  }

  private fun endRequest() {
    val r = run ?: return
    if (!r.open) return
    r.open = false
    r.timers.forEach(handler::removeCallbacks)
    setFlags(flags and FLAG_LISTENING.inv())
    if (r.handlerId != null) toRun(r, null)
    if (!r.heard) handlers.onState(State.THINKING)
  }

  private fun dropRun(r: Run) {
    r.open = false
    r.ended = true
    r.timers.forEach(handler::removeCallbacks)
    r.subscription?.let(socket::unsubscribe)
  }

  private fun stopPlaying() {
    player.stop()
    val r = run
    if (r != null && r.playing) {
      r.playing = false
      setFlags(flags and FLAG_SPEAKING.inv())
    }
  }

  private fun finish(reason: End) {
    if (over) return
    over = true
    run?.let(::dropRun)
    stopPlaying()
    mic.stop()
    flags = 0
    turnsSubscription?.let(socket::unsubscribe)
    handlers.onLevel(0f)
    handlers.onEnd(reason)
  }

  private fun maybeNext(r: Run) {
    if (over || r !== run || !r.ended || r.playing) return
    if (r.failed) return finish(End.ERROR)
    listen(0)
  }

  private fun play(r: Run, url: String) {
    if (r.playing || over || r !== run) return
    r.playing = true
    setFlags(flags or FLAG_SPEAKING)
    player.play(url, onStarted = {
      if (r.playing) handlers.onState(State.SPEAKING)
    }, onLevel = { level ->
      if (r.playing) handlers.onLevel(level)
    }, onEnded = {
      if (r.playing) {
        r.playing = false
        setFlags(flags and FLAG_SPEAKING.inv())
        handlers.onLevel(0f)
        maybeNext(r)
      }
    })
  }

  private fun onRunEvent(r: Run, ev: JSONObject) {
    if (over || r !== run || r.ended) return
    val type = ev.optString("type")
    val data = ev.optJSONObject("data") ?: JSONObject()
    when (type) {
      "run-start" -> {
        r.handlerId = data.optJSONObject("runner_data")?.optInt("stt_binary_handler_id")
        val tts = data.optJSONObject("tts_output")
        r.ttsUrl = tts?.optString("url")?.ifEmpty { null }
        r.streamable = tts?.optBoolean("stream_response") == true
        r.pending.forEach { toRun(r, it) }
        r.pending.clear()
        if (!r.open) toRun(r, null)
      }
      "stt-vad-end" -> endRequest()
      "stt-end" -> {
        endRequest()
        r.heard = true
        val text = data.optJSONObject("stt_output")?.optString("text").orEmpty().trim()
        handlers.onHeard(text)
        if (text.isNotEmpty() && isGoodbye(text)) return finish(End.DISMISSED)
        handlers.onState(State.THINKING)
      }
      "intent-progress" ->
        if (data.optBoolean("tts_start_streaming") && r.streamable) r.ttsUrl?.let { play(r, it) }
      "tts-end" -> data.optJSONObject("tts_output")?.optString("url")?.ifEmpty { null }?.let { play(r, it) }
      "error" -> {
        endRequest()
        if (data.optString("code") == "stt-no-text-recognized") {
          if (!r.heard) handlers.onHeard("")
          dropRun(r)
          return finish(End.QUIET)
        }
        r.failed = true
      }
    }
    r.read.read(type, data, handlers)
    if (type == "run-end" || type == "error") {
      r.ended = true
      r.subscription?.let(socket::unsubscribe)
      maybeNext(r)
    }
  }

  /** Listen for the next request; replayMs: start with the last ms of audio (an interruption's words) */
  private fun listen(replayMs: Int) {
    if (over) return
    turn++
    val r = Run(if (replayMs > 0) history.last(replayMs) else null)
    r.replay?.let { r.pending.add(it) }
    run = r
    speechMs = if (replayMs > 0) SPEECH_MS.toDouble() else 0.0
    setFlags((flags and FLAG_SPEAKING) or FLAG_LISTENING)
    handlers.onTurn()
    handlers.onState(State.LISTENING)
    val quiet = Runnable {
      if (r === run && r.open && speechMs < SPEECH_MS) {
        dropRun(r)
        handlers.onHeard("")
        finish(End.QUIET)
      }
    }
    val tooLong = Runnable { if (r === run) endRequest() }
    r.timers += quiet
    r.timers += tooLong
    handler.postDelayed(quiet, QUIET_MS)
    handler.postDelayed(tooLong, MAX_REQUEST_MS)
    val input = JSONObject().put("sample_rate", RATE)
    if (turnsOn) input.put("no_vad", true)
    val msg = JSONObject()
      .put("type", "assist_pipeline/run")
      .put("start_stage", "stt")
      .put("end_stage", "tts")
      .put("input", input)
      .put("conversation_id", options.conversationId())
    options.pipeline?.let { msg.put("pipeline", it) }
    r.subscription = socket.send(msg, onEvent = { onRunEvent(r, it) }) { ok, _, error ->
      if (ok || r !== run || over) return@send
      handlers.onError(error ?: "Home Assistant refused the request.")
      finish(End.ERROR)
    }
  }

  private fun interrupt(replayMs: Int) {
    val r = run
    if (over || r == null || !r.playing) return
    stopPlaying()
    handlers.onLevel(0f)
    dropRun(r)
    handlers.onInterrupted()
    listen(replayMs)
  }

  // ------------------------------------------------------------------ the microphone
  private fun onSamples(pcm: ByteArray) {
    if (over || pcm.size < 2) return
    history.add(pcm)
    val r = run
    if (r != null && r.open) {
      val rms = rms(pcm)
      val ms = pcm.size / 2 * 1000.0 / RATE
      speechMs = if (rms >= SPEECH_RMS) speechMs + ms else max(0.0, speechMs - 5)
    }
    toTurns(pcm)
    if (r != null && r.open) {
      if (r.handlerId == null) r.pending.add(pcm) else toRun(r, pcm)
    }
  }

  /** Start: the microphone, the turn detection, then the first request */
  fun start() {
    handlers.onState(State.STARTING)
    val error = mic.start { pcm -> handler.post { onSamples(pcm) } }
    if (error != null) {
      handlers.onError(error)
      return finish(End.ERROR)
    }
    if (!options.turnDetection) return listen(0)
    turnsSubscription = socket.send(JSONObject().put("type", "kattio/voice/stream"), onEvent = ::onTurnsEvent) { ok, _, _ ->
      if (over) return@send
      turnsOn = ok
      if (!ok) turnsSubscription = null
      listen(0)
    }
  }

  /** End the conversation */
  fun stop() {
    handler.post { finish(End.STOPPED) }
  }

  /** While the answer plays: stop it and listen */
  fun interrupt() {
    handler.post { interrupt(0) }
  }

  companion object {
    const val RATE = 16000
    private const val QUIET_MS = 8000L
    private const val MAX_REQUEST_MS = 30000L
    private const val HISTORY_MS = 8000
    private const val SPEECH_RMS = 0.02
    private const val SPEECH_MS = 250
    private const val REPLAY_EXTRA_MS = 400
    private const val FLAG_LISTENING = 4
    private const val FLAG_SPEAKING = 8

    /** Ends the conversation right away, without an answer (as on the boxes and the panel) */
    private val GOODBYES = listOf(
      "stop talking", "shut up", "bye bye", "go back to sleep",
      "hold mund", "hold op med at snakke", "farvel", "gå i seng",
    )

    fun isGoodbye(text: String): Boolean {
      val t = " " + text.lowercase().replace(Regex("[-,.!?]"), " ").replace(Regex("\\s+"), " ").trim() + " "
      return GOODBYES.any { t.contains(" $it ") }
    }

    fun rms(pcm: ByteArray): Double {
      var sum = 0.0
      val n = pcm.size / 2
      for (i in 0 until n) {
        val s = ((pcm[2 * i + 1].toInt() shl 8) or (pcm[2 * i].toInt() and 0xff)).toShort().toDouble()
        sum += s * s
      }
      return sqrt(sum / max(1, n)) / 32768.0
    }
  }
}

/** The last few seconds of the microphone (s16le, 16 kHz) */
class AudioHistory(private val keepMs: Int) {
  private val chunks = ArrayDeque<ByteArray>()
  private var bytes = 0

  fun add(pcm: ByteArray) {
    chunks.addLast(pcm)
    bytes += pcm.size
    val max = keepMs * Talk.RATE / 1000 * 2
    while (chunks.size > 1 && bytes - chunks.first().size >= max) bytes -= chunks.removeFirst().size
  }

  fun last(ms: Int): ByteArray {
    val want = min(bytes, (ms / 1000.0 * Talk.RATE).roundToInt() * 2)
    val out = ByteArray(want)
    var at = want
    for (c in chunks.reversed()) {
      if (at <= 0) break
      val take = min(at, c.size)
      c.copyInto(out, at - take, c.size - take, c.size)
      at -= take
    }
    return out
  }
}

/** Reads the reply out of the pipeline's events (as the panel's replyReader in panel/src/assist.ts) */
class ReplyReader {
  private var finished = false
  private var streamed = false

  fun read(type: String, data: JSONObject, handlers: Talk.Handlers) {
    when (type) {
      "intent-progress" -> {
        val delta = data.optJSONObject("chat_log_delta") ?: return
        val isNew = delta.optString("role") == "assistant"
        val content = delta.opt("content")
        if (content is String && content.isNotEmpty()) {
          handlers.onText(content, isNew && streamed)
          streamed = true
        } else if (isNew && streamed) {
          handlers.onText("", true)
        }
      }
      "intent-end" -> {
        if (finished) return
        val out = data.optJSONObject("intent_output") ?: JSONObject()
        val response = out.optJSONObject("response")
        val speech = response?.optJSONObject("speech")?.optJSONObject("plain")?.optString("speech").orEmpty()
        if (response?.optString("response_type") == "error" && !streamed) {
          handlers.onError(speech.ifEmpty { "The assistant could not answer." })
        } else {
          handlers.onDone(speech, out.optString("conversation_id").ifEmpty { null })
        }
        finished = true
      }
      "error" -> {
        if (!finished) handlers.onError(errorText(data))
        finished = true
      }
      "run-end" -> {
        if (!finished) handlers.onError("The assistant did not answer.")
        finished = true
      }
    }
  }

  companion object {
    fun errorText(data: JSONObject): String = when (data.optString("code")) {
      "stt-no-text-recognized" -> "I didn't catch that."
      "stt-stream-failed", "stt-provider-unsupported-metadata" -> "I couldn't hear you: speech recognition isn't working."
      "tts-failed" -> "I couldn't say the answer out loud."
      "timeout" -> "That took too long."
      else -> data.optString("message").ifEmpty { data.optString("code").ifEmpty { "The assistant could not answer." } }
    }
  }
}
