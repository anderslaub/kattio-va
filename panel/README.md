# Kattio panel

Kattio's page in Home Assistant: in the sidebar, and in the Home Assistant apps on Android and iPhone. The face is
on the top half; the conversation and the input are below.

It always opens in **text mode**: nothing is said out loud and the microphone stays off. Requests go through an
Assist pipeline (the same way the voice satellites go), with only the conversation step used.

The face is the box's own: the firmware's face engine (`components/kattio_face/face_engine.cpp`, unchanged), built
as WebAssembly and drawn at the phone's resolution. Tap it to pet the cat.

Coming next: Speak mode (live speech-to-text, also while Kattio talks, like the box), then attachments and the
camera.

## Parts

| Where | What |
|---|---|
| `panel/src/` | The page (TypeScript, Lit) |
| `panel/src/face.ts` | The face interface. The page only gives a face the state and the voice level, so a face can be swapped |
| `panel/src/kattio-face.ts` | Kattio's face on a canvas (falls back to a plain icon where WebAssembly can't run) |
| `panel/face/` | The WebAssembly wrapper around the firmware's face engine, and its build script |
| `custom_components/kattio/` | The Home Assistant integration: adds the panel, holds its settings |
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
     What the integration adds later (Speak mode) checks the list on the server.

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
