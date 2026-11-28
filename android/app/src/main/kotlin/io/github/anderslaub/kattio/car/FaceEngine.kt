package io.github.anderslaub.kattio.car

import android.graphics.Bitmap

/** Kattio's face: the firmware's face engine (components/kattio_face), through src/main/cpp/face_jni.cpp */
class FaceEngine(seed: Int) {
  /** What the assistant is doing (the panel's FaceState) */
  enum class State(val mood: Int) { IDLE(1), LISTENING(4), THINKING(5), SPEAKING(6), ERROR(8) }

  private var handle = nativeCreate(seed)

  fun setState(state: State) {
    // from idle the engine finds its own resting mood (and sleeps after a while)
    nativeSetMood(handle, state.mood)
  }

  fun setLevel(level: Float) = nativeSetLevel(handle, level)

  fun setSleepTimeout(seconds: Float) = nativeSetSleepTimeout(handle, seconds)

  /** Advance the animation; true while something moves fast */
  fun update(dt: Float): Boolean = nativeUpdate(handle, dt)

  /** The mood's colour (0xRRGGBB) for the glow behind the face */
  fun glow(dark: Boolean): Int = nativeGlow(handle, dark)

  /** Draw the face into an ARGB_8888 bitmap, over transparency */
  fun render(bitmap: Bitmap, dark: Boolean) = nativeRender(handle, bitmap, dark)

  fun destroy() {
    if (handle != 0L) nativeDestroy(handle)
    handle = 0
  }

  companion object {
    init {
      System.loadLibrary("kattio_face")
    }

    @JvmStatic private external fun nativeCreate(seed: Int): Long
    @JvmStatic private external fun nativeDestroy(handle: Long)
    @JvmStatic private external fun nativeSetMood(handle: Long, mood: Int)
    @JvmStatic private external fun nativeGetMood(handle: Long): Int
    @JvmStatic private external fun nativeSetLevel(handle: Long, level: Float)
    @JvmStatic private external fun nativeSetSleepTimeout(handle: Long, seconds: Float)
    @JvmStatic private external fun nativeUpdate(handle: Long, dt: Float): Boolean
    @JvmStatic private external fun nativeGlow(handle: Long, dark: Boolean): Int
    @JvmStatic private external fun nativeRender(handle: Long, bitmap: Bitmap, dark: Boolean)
  }
}
