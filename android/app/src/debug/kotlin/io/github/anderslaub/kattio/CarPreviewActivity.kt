package io.github.anderslaub.kattio

import android.Manifest
import android.os.Bundle
import android.view.Gravity
import android.view.SurfaceHolder
import android.view.SurfaceView
import android.widget.Button
import android.widget.FrameLayout
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.car.app.SurfaceContainer
import io.github.anderslaub.kattio.car.CarVoice
import io.github.anderslaub.kattio.car.FaceSurface
import io.github.anderslaub.kattio.voice.Mic
import io.github.anderslaub.kattio.voice.PhoneMic

/**
 * Debug builds only: the car screen (the face, the conversation as text, Talk) on the phone, with the phone's
 * microphone, through the same code as in the car. Start it with
 *   adb shell am start -n io.github.anderslaub.kattio/.CarPreviewActivity [--ez talk false] [--ez fakemic true]
 * (fakemic: quiet noise instead of the microphone, for an emulator)
 */
class CarPreviewActivity : ComponentActivity() {
  private val surface = FaceSurface()
  private lateinit var voice: CarVoice
  private lateinit var button: Button
  private var askDone: ((Boolean) -> Unit)? = null
  private val ask = registerForActivityResult(ActivityResultContracts.RequestPermission()) {
    askDone?.invoke(it)
    askDone = null
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    val root = FrameLayout(this)
    val view = SurfaceView(this)
    root.addView(view)
    button = Button(this).apply {
      text = getString(R.string.car_talk)
      setOnClickListener { voice.toggle() }
    }
    root.addView(button, FrameLayout.LayoutParams(
      FrameLayout.LayoutParams.WRAP_CONTENT, FrameLayout.LayoutParams.WRAP_CONTENT, Gravity.END or Gravity.TOP,
    ).apply { setMargins(0, 48, 48, 0) })
    setContentView(root)
    view.holder.addCallback(object : SurfaceHolder.Callback {
      override fun surfaceCreated(holder: SurfaceHolder) {}

      override fun surfaceChanged(holder: SurfaceHolder, format: Int, width: Int, height: Int) {
        surface.onSurfaceAvailable(SurfaceContainer(holder.surface, width, height, resources.displayMetrics.densityDpi))
      }

      override fun surfaceDestroyed(holder: SurfaceHolder) {
        surface.onSurfaceDestroyed(SurfaceContainer(holder.surface, 0, 0, 0))
      }
    })
    voice = CarVoice(this, surface, object : CarVoice.Host {
      override fun mic(): Mic =
        if (intent.getBooleanExtra("fakemic", false)) FakeMic() else PhoneMic(this@CarPreviewActivity)
      override fun askForMic(done: (Boolean) -> Unit) {
        askDone = done
        ask.launch(Manifest.permission.RECORD_AUDIO)
      }
    }) { talking ->
      button.text = getString(if (talking) R.string.car_stop else R.string.car_talk)
    }
    voice.open(talk = intent.getBooleanExtra("talk", true))
  }

  override fun onDestroy() {
    voice.close()
    surface.destroy()
    super.onDestroy()
  }
}

/** Quiet noise, 40 ms at a time, in real time */
class FakeMic : Mic {
  @Volatile private var running = false

  override fun start(onAudio: (ByteArray) -> Unit): String? {
    running = true
    kotlin.concurrent.thread(name = "fake-mic") {
      val random = java.util.Random()
      while (running) {
        val buf = ByteArray(1280)
        for (i in 0 until 640) {
          val v = (random.nextGaussian() * 100).toInt()
          buf[2 * i] = v.toByte()
          buf[2 * i + 1] = (v shr 8).toByte()
        }
        onAudio(buf)
        Thread.sleep(40)
      }
    }
    return null
  }

  override fun stop() {
    running = false
  }
}
