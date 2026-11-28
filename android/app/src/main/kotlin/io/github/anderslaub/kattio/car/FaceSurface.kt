package io.github.anderslaub.kattio.car

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RadialGradient
import android.graphics.Rect
import android.graphics.RectF
import android.graphics.Shader
import android.graphics.Typeface
import android.os.Handler
import android.os.HandlerThread
import android.os.SystemClock
import android.text.Layout
import android.text.SpannableStringBuilder
import android.text.Spanned
import android.text.StaticLayout
import android.text.TextPaint
import android.text.style.AbsoluteSizeSpan
import android.text.style.ForegroundColorSpan
import android.view.Surface
import androidx.car.app.SurfaceCallback
import androidx.car.app.SurfaceContainer
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

/**
 * The car screen's picture: Kattio's face (the firmware's face engine), with the conversation as text beside it (or
 * below, on a tall screen). Drawn on the surface the car gives the app, on its own thread, always dark.
 */
class FaceSurface : SurfaceCallback {
  /** What the text part shows */
  data class Shown(
    /** "Listening…", "Thinking…", or what to do */
    val status: String = "",
    /** What was heard in this request */
    val heard: String = "",
    /** The answer (as far as it has come) */
    val reply: String = "",
    val error: Boolean = false,
  )

  private val thread = HandlerThread("kattio-face").apply { start() }
  private val handler = Handler(thread.looper)
  private var face: FaceEngine? = null
  private var surface: Surface? = null
  private var width = 0
  private var height = 0
  private var dpi = 160
  private var visible: Rect? = null
  private var bitmap: Bitmap? = null
  private var last = 0L
  private var running = false

  @Volatile private var state = FaceEngine.State.IDLE
  @Volatile private var level = 0f
  @Volatile private var shown = Shown()
  private var appliedState: FaceEngine.State? = null

  private val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)
  private val textPaint = TextPaint(Paint.ANTI_ALIAS_FLAG)

  fun setState(s: FaceEngine.State) {
    state = s
    wake()
  }

  fun setLevel(l: Float) {
    level = l
  }

  fun show(s: Shown) {
    shown = s
    wake()
  }

  private fun wake() = handler.post {
    if (running) {
      handler.removeCallbacks(frame)
      handler.post(frame)
    }
  }

  override fun onSurfaceAvailable(container: SurfaceContainer) {
    handler.post {
      surface = container.surface
      width = container.width
      height = container.height
      dpi = container.dpi
      if (face == null) face = FaceEngine(SystemClock.uptimeMillis().toInt()).also { it.setSleepTimeout(600f) }
      appliedState = null
      running = surface != null
      last = SystemClock.uptimeMillis()
      handler.removeCallbacks(frame)
      if (running) handler.post(frame)
    }
  }

  override fun onVisibleAreaChanged(visibleArea: Rect) {
    handler.post {
      visible = Rect(visibleArea)
      bitmap = null
      wake()
    }
  }

  override fun onStableAreaChanged(stableArea: Rect) {}

  override fun onSurfaceDestroyed(container: SurfaceContainer) {
    // the car wants the surface back now: wait for the frame being drawn
    val done = java.util.concurrent.CountDownLatch(1)
    handler.post {
      running = false
      handler.removeCallbacks(frame)
      surface = null
      done.countDown()
    }
    done.await(500, java.util.concurrent.TimeUnit.MILLISECONDS)
  }

  fun destroy() {
    handler.post {
      running = false
      handler.removeCallbacks(frame)
      face?.destroy()
      face = null
      thread.quitSafely()
    }
  }

  private val frame = object : Runnable {
    override fun run() {
      if (!running) return
      val f = face ?: return
      val now = SystemClock.uptimeMillis()
      val dt = min(0.1f, (now - last) / 1000f)
      last = now
      val s = state
      if (s != appliedState) {
        appliedState = s
        f.setState(s)
      }
      f.setLevel(if (s == FaceEngine.State.SPEAKING) level else 0f)
      val moving = f.update(dt)
      draw(f)
      // full frame rate while something moves or Kattio talks, else a calm one
      val busy = moving || s != FaceEngine.State.IDLE
      handler.postDelayed(this, if (busy) 33L else 100L)
    }
  }

  private fun dp(v: Float) = v * dpi / 160f

  private fun draw(f: FaceEngine) {
    val sf = surface ?: return
    if (!sf.isValid) return
    val canvas: Canvas = try {
      sf.lockHardwareCanvas()
    } catch (_: Exception) {
      return
    }
    try {
      canvas.drawColor(BACKGROUND)
      val area = visible?.takeIf { !it.isEmpty } ?: Rect(0, 0, width, height)
      val pad = dp(16f).roundToInt()
      val inner = Rect(area.left + pad, area.top + pad, area.right - pad, area.bottom - pad)
      if (inner.width() <= 0 || inner.height() <= 0) return
      val wide = inner.width() >= inner.height() * 1.2f
      val faceBox: Rect
      val textBox: Rect
      if (wide) {
        val fw = min((inner.height() * 4f / 3f).roundToInt(), (inner.width() * 0.48f).roundToInt())
        faceBox = Rect(inner.left, inner.top, inner.left + fw, inner.bottom)
        textBox = Rect(faceBox.right + pad, inner.top, inner.right, inner.bottom)
      } else {
        val fh = (inner.height() * 0.45f).roundToInt()
        faceBox = Rect(inner.left, inner.top, inner.right, inner.top + fh)
        textBox = Rect(inner.left, faceBox.bottom + pad, inner.right, inner.bottom)
      }
      drawFace(canvas, f, faceBox)
      drawText(canvas, textBox, f.glow(false))
    } finally {
      sf.unlockCanvasAndPost(canvas)
    }
  }

  private fun drawFace(canvas: Canvas, f: FaceEngine, box: Rect) {
    // the mood's colour as a soft glow behind the face
    val glow = f.glow(true)
    val cx = box.exactCenterX()
    val cy = box.exactCenterY()
    val radius = max(box.width(), box.height()) * 0.55f
    paint.shader = RadialGradient(
      cx, cy, radius,
      intArrayOf(Color.argb(150, Color.red(glow), Color.green(glow), Color.blue(glow)), Color.TRANSPARENT),
      null, Shader.TileMode.CLAMP,
    )
    canvas.drawCircle(cx, cy, radius, paint)
    paint.shader = null
    // rendered at most at ~0.4 megapixels (the engine draws every pixel on the CPU), then scaled up smoothly
    val scale = min(1f, kotlin.math.sqrt(400_000f / max(1, box.width() * box.height())))
    val bw = max(1, (box.width() * scale).roundToInt())
    val bh = max(1, (box.height() * scale).roundToInt())
    var b = bitmap
    if (b == null || b.width != bw || b.height != bh) {
      b = Bitmap.createBitmap(bw, bh, Bitmap.Config.ARGB_8888)
      bitmap = b
    }
    f.render(b!!, true)
    canvas.drawBitmap(b, null, RectF(box), paint)
  }

  private fun drawText(canvas: Canvas, box: Rect, accent: Int) {
    val s = shown
    val big = dp(26f).roundToInt()
    val small = dp(19f).roundToInt()
    val text = SpannableStringBuilder()
    fun add(part: String, size: Int, color: Int, bold: Boolean = false) {
      if (part.isEmpty()) return
      if (text.isNotEmpty()) text.append("\n\n")
      val start = text.length
      text.append(part)
      text.setSpan(AbsoluteSizeSpan(size), start, text.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
      text.setSpan(ForegroundColorSpan(color), start, text.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
      if (bold) text.setSpan(android.text.style.StyleSpan(Typeface.BOLD), start, text.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
    }
    add(s.status, small, if (s.error) ERROR else lighten(accent), bold = true)
    add(s.heard, small, TEXT_DIM)
    add(s.reply, big, if (s.error) ERROR else TEXT)
    if (text.isEmpty()) return
    textPaint.textSize = big.toFloat()
    val layout = StaticLayout.Builder.obtain(text, 0, text.length, textPaint, box.width())
      .setAlignment(Layout.Alignment.ALIGN_NORMAL)
      .setLineSpacing(0f, 1.15f)
      .build()
    canvas.save()
    canvas.clipRect(box)
    // centred when it fits; else the newest words stay in sight
    val dy = if (layout.height <= box.height()) (box.height() - layout.height) / 2f else (box.height() - layout.height).toFloat()
    canvas.translate(box.left.toFloat(), box.top + dy)
    layout.draw(canvas)
    canvas.restore()
  }

  /** The mood's light colour, made light enough to read on the dark screen */
  private fun lighten(c: Int): Int {
    val hsv = FloatArray(3)
    Color.colorToHSV(c or 0xff000000.toInt(), hsv)
    hsv[1] = min(hsv[1], 0.55f)
    hsv[2] = max(hsv[2], 0.9f)
    return Color.HSVToColor(hsv)
  }

  companion object {
    private const val BACKGROUND = 0xff101216.toInt()
    private const val TEXT = 0xffeef0f3.toInt()
    private const val TEXT_DIM = 0xff9aa1ab.toInt()
    private const val ERROR = 0xffff8a80.toInt()
  }
}
