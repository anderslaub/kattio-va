# Kattio for Android

A thin app around the Kattio page in Home Assistant (the Kattio integration's panel, `custom_components/kattio`), so
that:

- **Kattio is the phone's digital assistant.** The assistant gesture (hold the power button, swipe up from a bottom
  corner, or a headset's button) opens Kattio straight into a spoken conversation, as the wake word does on a box.
- **Kattio is in the car (Android Auto)**, voice only. The screen shows Kattio's face, with the conversation as text
  beside it.

Everything else is the page: text and spoken conversations, the history, the per-device settings. Nothing about a
particular home is built in. The app asks for your Home Assistant's address the first time.

## On the phone

The first start asks for your Home Assistant's address (as in the browser, e.g. `https://ha.example.com` or
`http://homeassistant.local:8123`), then shows Home Assistant's own login page. The app never sees your password: Home
Assistant hands back a login code, and the app exchanges it for its own tokens. It appears in your Home Assistant
profile under *Refresh tokens* as `…/kattio-app`. The page in the app gets its access tokens from the app (Home
Assistant's
[external authentication](https://developers.home-assistant.io/docs/frontend/external-authentication), as the
Companion apps do), and so does the car screen. That makes one login for both.

**Make it the assistant:** Settings › Apps › Default apps › Digital assistant app › Kattio. (The menu names vary a
little between phone makers.) Then the gesture opens Kattio and it starts listening. A conversation ends as on the
page: after 8 quiet seconds, on a goodbye, or on a tap. It stays on screen, and you can continue it by text or by
the microphone button.

Home Assistant's sidebar has *App configuration*, which shows where the app is connected and lets you log out.

The page's microphone needs HTTPS (or `localhost`), as in a browser. The car screen doesn't (it is the app's own
code), but your login travels in the clear over plain HTTP, so use HTTPS beyond your own network.

## In the car

Android Auto lets only navigation apps draw their own picture, so Kattio declares itself as one (it doesn't
navigate). That's why it isn't for an app store. It is installed by hand, and Android Auto must allow apps from
outside the Play Store:

1. In the Android Auto app on the phone: Settings, tap *Version* about ten times, and allow developer settings.
2. In the menu (⋮): *Developer settings* › enable **Unknown sources**.
3. Kattio is then in the car's app list. Opening it starts a conversation; **Talk** / **Stop** in the corner
   starts or ends one.

The car uses the car's microphone where the car offers it to apps (car app API level 5, recent Android Auto),
else the phone's. It takes the car's audio for the whole conversation (music pauses while you talk with Kattio) and
plays the answers as navigation voice.

Each time Kattio opens in the car, a new conversation starts. Every Talk continues it until the car is switched off
or the app is closed. It is saved in the Kattio integration's history (when the history is on), so you can read and
continue it on the phone later. The car uses the same pipeline and turn detection server as the page, from the
integration's settings: the turn detection decides when you're done talking, and when you interrupt Kattio,
Kattio stops and hears what you said from where you began.

## Build

Needs JDK 17+ and the Android SDK with NDK 29 and CMake 3.31 (`android sdk install ndk/29.0.14206865 cmake/3.31.6`,
or through Android Studio):

```sh
cd android
./gradlew assembleRelease     # app/build/outputs/apk/release/app-release.apk
adb install -r app/build/outputs/apk/release/app-release.apk
```

The release build is signed with the debug key unless you add your own signing setup in `app/build.gradle.kts`.
Installed by hand, that's fine; keep using the same key, or Android refuses the update. `./gradlew testDebugUnitTest`
runs the unit tests.

**Without a car:** debug builds have a car preview on the phone (the same code: the face, the text, Talk, the
microphone):

```sh
./gradlew installDebug
adb shell am start -n io.github.anderslaub.kattio/.CarPreviewActivity
#   --ez talk false     don't start talking right away
#   --ez fakemic true   quiet noise instead of the microphone (an emulator)
```

Google's [Desktop Head Unit](https://developer.android.com/training/cars/testing/dhu) shows the real car screen,
from a phone with Android Auto.

## Parts

| Where | What |
|---|---|
| `MainActivity.kt` | The page in a WebView; the assistant gesture; the bridge for the page (`window.kattioApp`: talk on request, keep the screen on, the bars' colours) and Home Assistant's external auth (`window.externalApp`) |
| `LoginActivity.kt`, `HomeAssistant.kt` | The address, Home Assistant's login, the tokens |
| `car/KattioCarService.kt` | Android Auto: the session, the screen (navigation template with the Talk button) |
| `car/FaceSurface.kt` | Draws the face and the conversation on the car's surface |
| `car/FaceEngine.kt`, `src/main/cpp/` | Kattio's face: the firmware's face engine (`components/kattio_face/face_engine.cpp`, unchanged), built with the NDK |
| `car/CarVoice.kt` | The car's conversation: connecting, the panel's settings, the history, the audio focus |
| `voice/Talk.kt` | A spoken conversation, as the page's `panel/src/talk.ts` (the same steps, in Kotlin) |
| `voice/HaSocket.kt` | Home Assistant's websocket API |
| `voice/Mic.kt`, `voice/AnswerPlayer.kt` | The car's (or the phone's) microphone; playing the answers with their loudness for the mouth |

The app depends on the Kattio integration (its panel and websocket commands) and on the face engine in
`components/kattio_face`, nothing else in this repository.
