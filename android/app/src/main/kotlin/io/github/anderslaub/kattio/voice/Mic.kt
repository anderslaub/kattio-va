package io.github.anderslaub.kattio.voice

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.media.audiofx.AcousticEchoCanceler
import android.media.audiofx.NoiseSuppressor
import androidx.car.app.CarContext
import androidx.car.app.media.CarAudioRecord
import androidx.core.content.ContextCompat
import kotlin.concurrent.thread

/** A microphone: 16 kHz, 16-bit mono (s16le) */
interface Mic {
  /** Start; each chunk of audio goes to [onAudio] (on the microphone's own thread). Returns an error, or null. */
  fun start(onAudio: (ByteArray) -> Unit): String?
  fun stop()
}

private fun allowed(context: Context) =
  ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED

private const val NOT_ALLOWED = "The microphone isn't allowed for Kattio. Allow it in the app's settings on the phone."

/** The car's microphone (Android Auto, car API level 5 and up) */
class CarMic(private val car: CarContext) : Mic {
  @Volatile private var running = false
  private var record: CarAudioRecord? = null

  @SuppressLint("MissingPermission")
  override fun start(onAudio: (ByteArray) -> Unit): String? {
    if (!allowed(car)) return NOT_ALLOWED
    val r = try {
      CarAudioRecord.create(car).also { it.startRecording() }
    } catch (e: Exception) {
      return "The car's microphone could not be opened: ${e.message}"
    }
    record = r
    running = true
    thread(name = "car-mic") {
      val size = CarAudioRecord.AUDIO_CONTENT_BUFFER_SIZE
      val buf = ByteArray(size)
      while (running) {
        val n = r.read(buf, 0, size)
        if (n < 0) break
        if (n > 0) onAudio(buf.copyOf(n))
      }
    }
    return null
  }

  override fun stop() {
    running = false
    try {
      record?.stopRecording()
    } catch (_: Exception) {
    }
    record = null
  }
}

/** The phone's own microphone, with the phone's echo cancellation (when the car has no microphone for apps) */
class PhoneMic(private val context: Context) : Mic {
  @Volatile private var running = false
  private var record: AudioRecord? = null
  private val effects = ArrayList<android.media.audiofx.AudioEffect>()

  @SuppressLint("MissingPermission")
  override fun start(onAudio: (ByteArray) -> Unit): String? {
    if (!allowed(context)) return NOT_ALLOWED
    val min = AudioRecord.getMinBufferSize(Talk.RATE, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT)
    val r = try {
      AudioRecord(
        MediaRecorder.AudioSource.VOICE_COMMUNICATION, Talk.RATE, AudioFormat.CHANNEL_IN_MONO,
        AudioFormat.ENCODING_PCM_16BIT, maxOf(min, 6400),
      )
    } catch (e: Exception) {
      return "The microphone could not be opened: ${e.message}"
    }
    if (r.state != AudioRecord.STATE_INITIALIZED) {
      r.release()
      return "The microphone could not be opened."
    }
    if (AcousticEchoCanceler.isAvailable()) AcousticEchoCanceler.create(r.audioSessionId)?.let { it.enabled = true; effects += it }
    if (NoiseSuppressor.isAvailable()) NoiseSuppressor.create(r.audioSessionId)?.let { it.enabled = true; effects += it }
    r.startRecording()
    record = r
    running = true
    thread(name = "phone-mic") {
      // 40 ms chunks
      val buf = ByteArray(1280)
      while (running) {
        val n = r.read(buf, 0, buf.size)
        if (n < 0) break
        if (n > 0) onAudio(buf.copyOf(n))
      }
      r.stop()
      r.release()
    }
    return null
  }

  override fun stop() {
    running = false
    effects.forEach { it.release() }
    effects.clear()
    record = null
  }
}
