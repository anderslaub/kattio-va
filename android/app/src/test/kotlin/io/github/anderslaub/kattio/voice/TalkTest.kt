package io.github.anderslaub.kattio.voice

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class TalkTest {
  @Test
  fun goodbyes() {
    assertTrue(Talk.isGoodbye("Bye bye!"))
    assertTrue(Talk.isGoodbye("okay, stop talking."))
    assertTrue(Talk.isGoodbye("Farvel"))
    assertFalse(Talk.isGoodbye("goodbye yellow brick road"))
    assertFalse(Talk.isGoodbye("stop talking about the weather".replace("talking", "walking")))
  }

  @Test
  fun loudness() {
    assertEquals(0.0, Talk.rms(ByteArray(640)), 1e-9)
    // full scale square wave
    val loud = ByteArray(640) { i -> if (i % 2 == 0) 0xff.toByte() else 0x7f }
    assertEquals(1.0, Talk.rms(loud), 0.001)
  }

  @Test
  fun historyKeepsTheLastAudio() {
    val h = AudioHistory(100) // 100 ms = 3200 bytes
    for (k in 0 until 10) h.add(ByteArray(640) { k.toByte() }) // 10 x 20 ms
    val last = h.last(40) // 1280 bytes: the last two chunks
    assertEquals(1280, last.size)
    assertArrayEquals(ByteArray(640) { 8 } + ByteArray(640) { 9 }, last)
    // never more than it keeps (100 ms, whole chunks)
    assertTrue(h.last(10_000).size in 3200..3840)
  }
}
