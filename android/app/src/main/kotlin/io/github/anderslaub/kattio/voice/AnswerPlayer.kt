package io.github.anderslaub.kattio.voice

import android.content.Context
import android.media.AudioManager
import android.media.audiofx.Visualizer
import android.os.Handler
import androidx.annotation.OptIn
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer

/**
 * Plays the answers (Home Assistant's text-to-speech, also while it is still being made), with how loud they are
 * for the face's mouth. Made and used on [handler]'s thread.
 */
@OptIn(UnstableApi::class)
class AnswerPlayer(context: Context, private val handler: Handler, usage: Int) {
  private val sessionId = (context.getSystemService(Context.AUDIO_SERVICE) as AudioManager).generateAudioSessionId()
  private val player = ExoPlayer.Builder(context)
    .setLooper(handler.looper)
    .setAudioAttributes(
      AudioAttributes.Builder().setUsage(usage).setContentType(C.AUDIO_CONTENT_TYPE_SPEECH).build(),
      // the conversation holds the audio focus as a whole (see CarVoice)
      false,
    )
    .build()
    .also { it.setAudioSessionId(sessionId) }
  private var visualizer: Visualizer? = null
  private var listener: Player.Listener? = null
  private var meter: Runnable? = null
  private var released = false

  /** Play the answer at [url]; [onEnded] also when it fails */
  fun play(url: String, onStarted: () -> Unit, onLevel: (Float) -> Unit, onEnded: () -> Unit) {
    stop()
    var started = false
    val l = object : Player.Listener {
      override fun onPlaybackStateChanged(state: Int) {
        if (state == Player.STATE_READY && !started) {
          started = true
          onStarted()
        }
        if (state == Player.STATE_ENDED) finish(onEnded)
      }

      override fun onPlayerError(error: PlaybackException) = finish(onEnded)
    }
    listener = l
    player.addListener(l)
    player.setMediaItem(MediaItem.fromUri(url))
    player.prepare()
    player.playWhenReady = true
    startMeter(onLevel)
  }

  private fun finish(onEnded: () -> Unit) {
    stop()
    onEnded()
  }

  private fun startMeter(onLevel: (Float) -> Unit) {
    val v = visualizer ?: try {
      Visualizer(sessionId).apply {
        measurementMode = Visualizer.MEASUREMENT_MODE_PEAK_RMS
        enabled = true
      }.also { visualizer = it }
    } catch (_: Exception) {
      null
    }
    val m = Visualizer.MeasurementPeakRms()
    var t = 0
    val tick = object : Runnable {
      override fun run() {
        if (meter !== this) return
        val level = if (v != null && v.getMeasurementPeakRms(m) == Visualizer.SUCCESS) {
          // millibels, -9600 (silence) .. 0
          ((m.mRms / 100f + 45f) / 35f).coerceIn(0f, 1f)
        } else {
          // no measurement allowed: a plain talking movement
          t++
          if (player.isPlaying) 0.35f + 0.3f * kotlin.math.sin(t * 0.9f) else 0f
        }
        onLevel(level)
        handler.postDelayed(this, 33)
      }
    }
    meter = tick
    handler.post(tick)
  }

  fun stop() {
    meter?.let(handler::removeCallbacks)
    meter = null
    listener?.let(player::removeListener)
    listener = null
    if (!released) {
      player.stop()
      player.clearMediaItems()
    }
  }

  fun release() {
    stop()
    released = true
    visualizer?.release()
    visualizer = null
    player.release()
  }
}
