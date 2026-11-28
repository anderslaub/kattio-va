# Kattio – cat face voice assistant for the ESP32-S3-BOX-3

ESPHome firmware for the ESP32-S3-BOX-3. The cat face is drawn in code with anti-aliased vector shapes,
no bitmaps, and it reacts to the Home Assistant voice assistant.

```
kattio-common.yaml              shared ESPHome config
kattio-box-1.yaml, kattio-box-2.yaml   per-box files (device name / hostname kattio-box-N)
secrets.yaml                    Wi-Fi (recovered from the old firmware), API key, OTA password
components/va_arbiter/          only the closest box answers a wake word (UDP between boxes)
components/kattio_face/
  face_engine.{h,cpp}           portable face animator + rasteriser (also builds on a PC)
  kattio_face.{h,cpp}           ESPHome component: render task that writes to the panel
  voice_enhancer.{h,cpp}        speaker platform: EQ + limiter + lip-sync level meter
  __init__.py, speaker.py       ESPHome codegen
wakewords/<name>/latest.*       models as delivered by training ("hey_kattio", "okay_kattio")
wakewords/<name>/esphome/       what the firmware loads; regenerate with tools/sync_wakewords.py
tools/preview.cpp               renders a storyboard of all moods to frames on a PC
custom_components/kattio/, panel/   Kattio's page in Home Assistant (see panel/README.md)
android/                        Kattio app: phone assistant + Android Auto screen (see android/README.md)
kattio-face-preview.mp4         output of the above
backup/old_firmware_full.bin    full 16 MB flash dump of the previous firmware (ESPHome 2025.7.3)
```

## Build / flash

```sh
distrobox enter esp-box
esphome compile kattio-box-1.yaml
esphome upload kattio-box-1.yaml --device /dev/ttyACM0   # or OTA: --device kattio-box-1.local
esphome logs kattio-box-1.yaml
```

Restore the old firmware: `esptool --port /dev/ttyACM0 write-flash 0 backup/old_firmware_full.bin`

## Moods

| Mood | When | Look |
|---|---|---|
| booting | power on | grey, eyes shut → left eye opens → right eye opens → blink |
| idle | ready | light grey on white, half-shut eyes, blinks, glances left/right (an ear may follow), ear twitches, gentle head tilts, breathing, an occasional yawn |
| sleeping | idle for *Sleep after* (10 min) | yawns, gets drowsy, then grey, eyes closed, floating zzz, deep breathing, backlight dims to 35 % |
| waking | "Hey Kattio" | small jump, ears perk, eyes pop wide with sparkle, "!", double blink, turns green |
| listening | STT running | green on light green, big shiny eyes, ears up, curious head tilts |
| thinking | speech ended, waiting for the answer | orange, narrowed eyes looking up and around, thought bubbles. |
| answering | the answer is there, its speech is being generated | blue, eyes on you, small "o" mouth, pulsing dots; turns into *speaking* with the first sound that actually plays |
| speaking | TTS playing | blue, mouth opens with the *actual* audio loudness (synced to the speaker), whiskers wiggle, head bobs |
| bored | "Stop" or a dismissal ("bye bye", "go back to sleep") in a follow-up, or silence in a follow-up, or tap while talking | rolls eyes up-right, head tilts, ears droop, sighs, fades to grey → idle |
| error | pipeline error | red, X eyes, head shake, frown → idle after 3.5 s |
| confused | nothing was heard | head tilt, uneven eyes, "?" |
| muted | mute switch | zipped mouth, ears flat |
| offline | no Wi-Fi / HA | sad slanted eyes, "?" |
| alarm | timer finished | purple, flashing background, ringing lines, open mouth, shakes |
| happy | tap the screen / *Pet the cat* button | ^^ eyes, blush, hearts, pink, purrs (`sounds/purr.flac`) |
| working | pi works on a task in the background (Pi Agent integration) | teal, focused eyes, a spinning cog where the thought bubbles go, small nods. Stays until the result is announced (or 15 min) |
| loading | the assistant is starting up: model loading, warm-up, or the bridge unreachable (Pi Agent integration, `pi_agent_loading`) | indigo, both eyes are spinning loaders, the head sways. Ends when the assistant is ready, or a minute after the integration stops refreshing it |
| snapping | 1 in *Snaps at 1 in N pets* (default 4, 0 = never) of those pets | hiss + growl (`sounds/growl.flac`), lunges, angry slanted eyes, ears flat, snarl, growl shake, three claw scratches swiped across the screen; then looks away offended. Ignores petting until it's over |

A timer progress bar is drawn along the bottom while a timer runs.

## Controls

* **Two wake words, two assistants:** "Hey Kattio" and "Okay Kattio". HA's device page does not show it, but the settings work in pairs by number: the wake word picked in *Wake word* starts *Assistant*, the one in *Wake word 2* starts *Assistant 2* (e.g. Hey Kattio → the pi assistant, Okay Kattio → HA's own intents). HA matches the heard phrase against both settings; a wake word that is in neither (e.g. *Wake word 2* left on "No wake word") goes to *Assistant*. Which wake words run is HA's choice alone, saved on the box; the firmware never switches them itself. Follow-up turns (multi-turn, "let's talk") stay with the assistant that was woken; push to talk uses the first one. New models: drop them in `wakewords/<name>/latest.*`, run `python3 tools/sync_wakewords.py`, rebuild.
* **Hey Kattio**: start a conversation. *Wake word sensitivity* in HA trades range for false wakes (default: moderately). In a follow-up (multi-turn), saying **"Stop"** ends it. So does a sentence containing "stop talking", "shut up", "bye bye", "go back to sleep" (or "hold mund", "hold op med at snakke", "farvel", "gå i seng"): the cat ends the conversation without answering.
* **Multi-turn** (switch, default on): the cat keeps listening after every answer until you stay silent or say "Stop". When off, it only listens again after a question, or after you said "let's talk".
* **Timing log** (switch, diagnostic, default on): logs every pipeline step in ms since the turn started (tag `timing`), and warns when the speaker runs out of audio mid-reply or restarts under a stream. Pair it with the speech services' and the conversation agent's own logs (e.g. wygate's `GET /timings`, the Pi Agent's debug mode) to see whether a slow or broken answer came from STT, the LLM, the TTS or the box.
* **Background tasks (pi):** when the [Pi Agent](https://github.com/anderslaub/ha-pi-agent) integration says pi carries on in the background, it calls the `pi_agent_working` API action: the cat shows the *working* face instead of waiting for an answer, and in multi-turn it listens again after the result has been announced.
* **TV protection (pi):** every wake word starts a new conversation, so the Pi Agent integration's noise filter can check whether the first thing heard was meant for the cat. If it was the TV, the cat either makes a remark or says nothing (its choice; for silence the integration calls the `pi_agent_listen` API action and the cat listens once more). If what it hears next is background noise too, or nothing, the integration calls the `pi_agent_dismiss` API action and the cat ends the conversation quietly (bored face), also in chat mode. A voice it knows gets through.
* **Turn detection (optional):** the cat streams its microphone to a turn detection service for the whole conversation (`turn_stream` component, protocol v2 in `components/turn_stream/turn_stream.h`) and says when it listens and when it speaks. The service follows the speaker's voice and says when they are done, also when the TV keeps talking or they pause to think; the cat then silences only what Home Assistant hears (the `va_mic` tap), so HA ends the turn without the TV tail, while the wake word keeps listening (a 5 s guard gives HA its sound back if HA does not end the turn). Set *Turn detection server* in HA to `host` or `host:port` (IP address or hostname, UDP, default port 10330; empty = off, the `turn_server` substitution is the default); hostnames are looked up again every 10 minutes. Switch *Turn detection* turns it off. [wygate](https://github.com/anderslaub/wygate) implements it.
* **Full duplex (box 2, `audio/full-duplex.yaml`):** the cat listens while it talks, with echo cancellation ([esphome-audio-stack](https://github.com/n-IA-hane/esphome-audio-stack) + `esp_aec`, the BOX-3's speaker loopback on ES7210 MIC3 as the reference). "Stop" works while it talks, and someone it knows can interrupt it: the turn detection service sends an interrupt, the cat stops and listens in the same conversation. Switch *Echo cancellation* turns the canceller off. Each box picks its audio hardware package: `audio/half-duplex.yaml` (ESPHome's own I2S drivers, the cat cannot listen while it talks) or `audio/full-duplex.yaml`.
* **Microphone tap (`components/mic_tap`):** a pass-through microphone with its own mute. The voice assistant uses `va_mic`; muting it silences only Home Assistant's copy (end of turn), while the wake word, the arbiter and turn detection keep hearing `box_mic`. The *Mute* switch mutes `box_mic` itself.
* **Diagnostics:** *Uptime* and *Reset reason* sensors show when and why the box last restarted (crashes included).
* **Tap the screen**: pet the cat. While it's talking, a tap interrupts it. While an alarm rings, a tap stops it.
* **Red circle under the screen / top button**: push to talk (the top button also stops a ringing timer; hold it 10 s to factory reset).

The BOX-3's microphone and speaker share one I2S bus, so the cat can't hear anything while it talks.
That's why the stop word only works while it's listening, and why tapping is how you interrupt it.

## Several boxes in one room

When more than one box hears "Hey Kattio", only the closest one answers:

1. Each box keeps a 2 s loudness history of its microphone, high-passed at 100 Hz to ignore rumble.
2. On a detection, it scores the loudest 150 ms of the wake word.
3. It broadcasts a claim on UDP port 18512, signed with `arbiter_key` from `secrets.yaml`, which all
   boxes must share.
4. After 250 ms, the box with the highest score answers and broadcasts "taken". A box that detects the
   wake word late sees that and stays quiet.
5. The other boxes perk their ears, glance, and go back to listening.

Boxes say hello every 30 s. A box with no peers around answers immediately, without the 250 ms wait.
The logs show each decision, e.g. `Answering "Hey Kattio" (-31.2 dB, loudest)`. Home Assistant's own
duplicate wake-up check is the backstop, and the firmware ignores its `duplicate_wake_up_detected` error.

## Speaker improvements

All audio goes through `voice_out` (the `kattio_face` speaker platform) before the I2S speaker:

* 4th-order high-pass at 170 Hz. The tiny speaker can't reproduce bass, and removing it
  frees headroom and cuts distortion.
* −2.5 dB dip at 450 Hz (box resonance) and +3 dB presence at 3 kHz for clarity.
* Loudness boost (0–12 dB, default 8, adjustable from HA) with a smooth peak limiter and soft clipper,
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
