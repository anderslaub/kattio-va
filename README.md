# Kattio – cat face voice assistant for the ESP32-S3-BOX-3

ESPHome firmware for the ESP32-S3-BOX-3. The cat face is drawn in code with anti-aliased vector shapes,
no bitmaps, and it reacts to the Home Assistant voice assistant.

```
kattio-box.yaml                 main ESPHome config (device: cat-in-a-box-1)
secrets.yaml                    Wi-Fi (recovered from the old firmware), API key, OTA password
components/kattio_face/
  face_engine.{h,cpp}           portable face animator + rasteriser (also builds on a PC)
  kattio_face.{h,cpp}           ESPHome component: render task that writes to the panel
  voice_enhancer.{h,cpp}        speaker platform: EQ + limiter + lip-sync level meter
  __init__.py, speaker.py       ESPHome codegen
wakewords/hey_kattio/esphome/   cleaned manifest + model for "Hey Kattio"
tools/preview.cpp               renders a storyboard of all moods to frames on a PC
kattio-face-preview.mp4         output of the above
backup/old_firmware_full.bin    full 16 MB flash dump of the previous firmware (ESPHome 2025.7.3)
```

## Build / flash

```sh
distrobox enter esp-box
esphome compile kattio-box.yaml
esphome upload kattio-box.yaml --device /dev/ttyACM0     # or OTA: --device cat-in-a-box-1.local
esphome logs kattio-box.yaml
```

Restore the old firmware: `esptool --port /dev/ttyACM0 write-flash 0 backup/old_firmware_full.bin`

## Moods

| Mood | When | Look |
|---|---|---|
| booting | power on | grey, eyes shut → left eye opens → right eye opens → blink |
| idle | ready | light grey on white, half-shut eyes, blinks, glances left/right (an ear may follow), ear twitches, gentle head tilts, breathing, an occasional yawn |
| sleeping | idle for *Sleep after* (10 min) | grey, eyes closed, floating zzz, deep breathing, backlight dims to 35 % |
| waking | "Hey Kattio" | small jump, ears perk, eyes pop wide with sparkle, "!", double blink, turns green |
| listening | STT running | green on light green, big shiny eyes, ears up, curious head tilts |
| thinking | speech ended | orange, narrowed eyes looking up and around, thought bubbles |
| speaking | TTS playing | blue, mouth opens with the *actual* audio loudness (synced to the speaker), whiskers wiggle, head bobs |
| bored | "Stop" in a follow-up, or silence in a follow-up, or tap while talking | rolls eyes up-right, head tilts, ears droop, sighs, fades to grey → idle |
| error | pipeline error | red, X eyes, head shake, frown → idle after 3.5 s |
| confused | nothing was heard | head tilt, uneven eyes, "?" |
| muted | mute switch | zipped mouth, ears flat |
| offline | no Wi-Fi / HA | sad slanted eyes, "?" |
| alarm | timer finished | purple, flashing background, ringing lines, open mouth, shakes |
| happy | tap the screen / *Pet the cat* button | ^^ eyes, blush, hearts, pink |

A timer progress bar is drawn along the bottom while a timer runs.

## Controls

* **Hey Kattio**: start a conversation. In a follow-up (multi-turn), saying **"Stop"** ends it.
* **Tap the screen**: pet the cat. While it's talking, a tap interrupts it. While an alarm rings, a tap stops it.
* **Red circle under the screen / top button**: push to talk (the top button also stops a ringing timer; hold it 10 s to factory reset).

The BOX-3's microphone and speaker share one I2S bus, so the cat can't hear anything while it talks.
That's why the stop word only works while it's listening, and why tapping is how you interrupt it.

## Speaker improvements

All audio goes through `voice_out` (the `kattio_face` speaker platform) before the I2S speaker:

* 4th-order high-pass at 170 Hz. The tiny speaker can't reproduce bass, and removing it
  frees headroom and cuts distortion.
* −2.5 dB dip at 450 Hz (box resonance) and +3 dB presence at 3 kHz for clarity.
* Loudness boost (0–12 dB, default 4, adjustable from HA) with a smooth peak limiter and soft clipper,
  so it gets louder without harsh clipping.
* Media player volume range 0.45–0.75. In the ES8311 driver 0.75 is 0 dB and anything above is
  digital gain that clips after the limiter, which is what made the first build distort.
* Larger I2S buffer (150 ms) against dropouts; TTS is requested as 48 kHz mono FLAC, so no resampling.
* The *Voice enhancer* switch in HA bypasses the processing for an A/B comparison.

## Previewing the face on a PC

```sh
cd tools
g++ -O2 -std=c++17 -I../components/kattio_face preview.cpp ../components/kattio_face/face_engine.cpp -o preview
mkdir -p frames && ./preview frames && ffmpeg -framerate 30 -i frames/f%05d.ppm preview.mp4
```
# Kattio voiceassistant
