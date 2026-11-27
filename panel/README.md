# Kattio panel

Kattio's page in Home Assistant: in the sidebar, and in the Home Assistant apps on Android and iPhone.

On a phone the face sits on the top third, with the conversation below. On a wide screen (a tablet on its side,
a desktop) the face is on the left and the conversation on the right. It follows Home Assistant's light or dark
theme; in the dark, Kattio's lines turn light. The background shows through, and the mood's colour glows softly
behind the face.

Requests go through an Assist pipeline (the same way the voice satellites go). A typed question uses only the
conversation step, and the answer is text only.

**Talking.** The microphone button starts a spoken conversation, as the wake word does on a box: Kattio listens, the
answer is shown and spoken, and Kattio listens again, until nobody says anything for 8 seconds, someone says goodbye
("bye bye", "stop talking", "farvel", ... as on the box), or the button is tapped again. Each request is the full
pipeline (speech-to-text, conversation, text-to-speech). The microphone stays open for the whole conversation; its
audio goes over the page's own connection to Home Assistant. Tap the face while Kattio talks to stop it and talk.
The screen stays on during a conversation (a phone turns the microphone off for a page out of sight; that ends the
conversation).

With a **turn detection server** set in the integration (the same service the boxes use, e.g. wygate), the
microphone also goes there, relayed by the integration in the boxes' protocol (`turn_stream`, UDP): it decides when
you are done (through "erhm" pauses, with a TV in the background), and when you interrupt Kattio, the answer stops
and what you said from the start of the interruption is passed on. The phone's own echo cancellation keeps
Kattio's voice out of the microphone. Without one, Home Assistant's own end-of-speech detection ends each request
(after a short pause), and only a tap interrupts.

The page makes each conversation's id itself (`kattio-...`), not Home Assistant: Home Assistant replaces an id it has
forgotten (after 5 quiet minutes) with a new one, unless it is one of its own making. So a conversation stays the
same one for the conversation agent when it is continued later, or when its first answer was interrupted.

The conversation follows new text. Scroll back and it stays where you are; when more text arrives, an arrow button
appears that jumps to the newest and follows again.

**Settings on this device** (the gear; kept in this browser only, so a phone and a wall tablet can differ):

- **Appearance:** Auto (follows Home Assistant), Light or Dark.
- **Start in:** Text or Speak. Text means nothing is said out loud and the microphone stays off until tapped.
  Speak (with a wake word) comes later; until then the page opens in text mode and a tap starts talking.
- **Keep the screen on:** while the page is open (Wake Lock; most browsers have it).
- **Greeting:** what the page says before a conversation starts; the first line is the large one.
- **Conversation history:** on: conversations are kept in Home Assistant and listed under the history button
  (off on a shared tablet, say).
- **Continue the last conversation:** when the page opens. **From any device:** your most recent conversation
  wherever it was (needs the history); off: the last one on this device. Both off: a new conversation each time.
  (A reload of the page always keeps the conversation on screen.)

**Conversation history.** The integration keeps each Home Assistant user's 20 most recently active conversations
(in Home Assistant's own storage, `.storage/kattio.conversations`). Each person sees and continues only their own.
Administrators can also read everyone's (Mine / Everyone in the list), but not continue them, and can delete them.
The allow list applies here too, on the server.

Continuing an old conversation sends its id again, and the conversation agent decides what it remembers: Home
Assistant itself forgets a conversation's messages after 5 quiet minutes (the id stays, see above). pi-agent (ha-pi-agent) reopens the conversation's
saved session, for as long as it keeps those (30 days by default).

The face is the box's own: the firmware's face engine (`components/kattio_face/face_engine.cpp`, unchanged), built
as WebAssembly and drawn at the phone's resolution. Tap it to pet the cat.

Coming next: a wake word for a wall tablet (Speak mode), then attachments and the camera.

## Parts

| Where | What |
|---|---|
| `panel/src/` | The page (TypeScript, Lit) |
| `panel/src/face.ts` | The face interface. The page only gives a face the state and the voice level, so a face can be swapped |
| `panel/src/assist.ts` | A typed question through the Assist pipeline, and reading the reply from its events |
| `panel/src/talk.ts` | A spoken conversation: the microphone to Home Assistant (and the turn detection), each answer played with its loudness for the face, listening again, interruptions |
| `panel/src/history.ts` | The conversation history, through the integration's websocket commands |
| `panel/src/settings.ts` | The per-device settings, and keeping the screen on |
| `panel/src/kattio-face.ts` | Kattio's face on a canvas (falls back to a plain icon where WebAssembly can't run) |
| `panel/face/` | The WebAssembly wrapper around the firmware's face engine, and its build script |
| `custom_components/kattio/` | The Home Assistant integration: adds the panel, holds its settings |
| `custom_components/kattio/history.py` | Each user's conversation history, and the `kattio/history/*` websocket commands |
| `custom_components/kattio/voice.py` | Relays a spoken conversation's microphone to the turn detection server (`kattio/voice/stream`) |
| `custom_components/kattio/brand/` | The integration's icon (Kattio's listening face, light and dark); Home Assistant shows a custom integration's own `brand/` images |
| `custom_components/kattio/www/` | The built page (committed: Home Assistant installs from git) |

The page and the integration don't depend on anything else in this repository. To remove the panel, delete
`panel/`, `custom_components/kattio/`, `tests/`, `hacs.json` and `pyproject.toml`.

## Install

1. In HACS, add this repository as a custom repository (type: Integration) and download "Kattio".
   Alternatively, copy `custom_components/kattio` into Home Assistant's `custom_components` folder.
2. Restart Home Assistant. Then go to Settings → Devices & services → Add integration → Kattio.
3. The settings can be changed later under Configure:
   - **Title and icon:** shown in the sidebar and at the top of the page.
   - **Assist pipeline:** the assistant the page talks to. Empty means the preferred pipeline.
   - **Who may use it:** Home Assistant users (admins or not). Empty means everyone with a login.
     Everyone can already use Assist in Home Assistant, so for text this only decides who sees the page.
     The history and the turn detection relay check the list on the server.
   - **Turn detection server:** optional, `host` or `host:port` (UDP, port 10330 if none is given): the turn
     detection service the boxes use. Home Assistant must be able to reach it. Empty means Home Assistant's own
     end-of-speech detection.

## Build

```sh
cd panel
npm install
npm run check   # type check
npm run build   # writes custom_components/kattio/www/kattio-panel.js
```

The face engine, after a change to `components/kattio_face/face_engine.cpp`, needs `clang` and `wasm-ld` (LLVM) plus
a WASI sysroot and compiler-rt from [wasi-sdk](https://github.com/WebAssembly/wasi-sdk/releases)
(`wasi-sysroot-*.tar.gz` and `libclang_rt-*.tar.gz`, unpacked anywhere):

```sh
WASI_SYSROOT=/path/to/wasi-sysroot-34.0 WASI_RT=/path/to/libclang_rt-34.0 panel/face/build.sh
# writes custom_components/kattio/www/kattio-face.wasm
```

`preview/index.html` shows the page outside Home Assistant, with a fake connection that answers with a canned
reply. Build first, then serve the repository folder (browsers don't load WebAssembly from `file://`):
`python3 -m http.server 8765` and open http://localhost:8765/panel/preview/. `?ask=Hello` sends a message when
it opens.

## Tests

The tests for the integration use `pytest-homeassistant-custom-component`:

```sh
pip install pytest-homeassistant-custom-component
pytest
```
