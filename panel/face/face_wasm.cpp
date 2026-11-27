// Kattio's face for the browser: the firmware's face engine (components/kattio_face/face_engine.cpp, unchanged)
// built as WebAssembly, rendered at the page's own resolution instead of the box's 320x240.
//
// The engine draws shapes with a one pixel soft edge. Before rendering, the wrapper scales the shapes from the
// box's screen to the canvas (centred, the box's 4:3 picture made as large as fits), so the face is sharp at any
// size; the rest of the canvas is the face's background. Build: panel/face/build.sh
#include <cmath>
#include <cstdint>
#include <cstdlib>
#include <vector>

#include "face_engine.h"

#define EXPORT(name) extern "C" __attribute__((export_name(#name)))

namespace {

class WebFace : public kattio::FaceEngine {
 public:
  // Scale the current scene from the box's screen to a w x h canvas
  void fit(int w, int h) {
    const float s = std::min(w / float(W), h / float(H));
    const float ox = (w - W * s) * 0.5f, oy = (h - H * s) * 0.5f;
    for (kattio::Prim &p : prims_) {
      p.ax = p.ax * s + ox, p.ay = p.ay * s + oy, p.bx = p.bx * s + ox, p.by = p.by * s + oy, p.r *= s;
      p.cx = p.cx * s + ox, p.cy = p.cy * s + oy, p.rx *= s, p.ry *= s;
      p.ccx = p.ccx * s + ox, p.ccy = p.ccy * s + oy, p.crx *= s, p.cry *= s;
      // a plane n.p < d becomes n.p' < d*s + n.o (the same distance, in canvas pixels)
      for (int k = 0; k < p.nplanes; k++) p.pd[k] = p.pd[k] * s + p.pnx[k] * ox + p.pny[k] * oy;
      p.x0 = std::max(0, int(floorf(p.x0 * s + ox)));
      p.y0 = std::max(0, int(floorf(p.y0 * s + oy)));
      p.x1 = std::min(w - 1, int(ceilf((p.x1 + 1) * s + ox)));
      p.y1 = std::min(h - 1, int(ceilf((p.y1 + 1) * s + oy)));
    }
  }
};

WebFace *face = nullptr;
int cw = 0, ch = 0;
std::vector<uint16_t> px565;
std::vector<uint8_t> cov;
std::vector<uint32_t> rgba;

}  // namespace

EXPORT(face_init) void face_init(uint32_t seed) {
  if (!face) face = new WebFace();
  face->seed(seed);
  face->set_connected(true);
}

// The canvas size in pixels; returns where the picture (RGBA, w*h*4 bytes) will be
EXPORT(face_resize) uint32_t face_resize(int w, int h) {
  cw = std::max(1, w), ch = std::max(1, h);
  px565.assign(size_t(cw) * ch, 0);
  cov.assign(size_t(cw) * ch * kattio::LAYER_COUNT, 0);
  rgba.assign(size_t(cw) * ch, 0);
  return uint32_t(uintptr_t(rgba.data()));
}

EXPORT(face_set_mood) void face_set_mood(int mood) {
  if (face && mood >= 0 && mood < kattio::MOOD_COUNT) face->set_mood(kattio::Mood(mood));
}
EXPORT(face_get_mood) int face_get_mood() { return face ? face->get_mood() : 0; }
EXPORT(face_set_level) void face_set_level(float level) {
  if (face) face->set_speech_level(level);
}
EXPORT(face_set_connected) void face_set_connected(int c) {
  if (face) face->set_connected(c != 0);
}
EXPORT(face_set_sleep_timeout) void face_set_sleep_timeout(float s) {
  if (face) face->set_sleep_timeout(s);
}
// Petted: returns 1 when the cat snaps instead of enjoying it
EXPORT(face_poke) int face_poke() { return face && face->poke() ? 1 : 0; }

// Advance the animation; returns 1 while something moves fast (draw at the full frame rate)
EXPORT(face_update) int face_update(float dt) { return face && face->update(dt) ? 1 : 0; }

// Draw the current pose into the picture
EXPORT(face_render) void face_render() {
  if (!face || rgba.empty()) return;
  face->build_scene();
  face->fit(cw, ch);
  face->render_rect(0, 0, cw, ch, px565.data(), cov.data());
  // big-endian RGB565 -> RGBA (little endian: 0xAABBGGRR)
  const size_t n = px565.size();
  for (size_t i = 0; i < n; i++) {
    const uint16_t v = uint16_t((px565[i] >> 8) | (px565[i] << 8));
    uint32_t r = (v >> 11) & 31, g = (v >> 5) & 63, b = v & 31;
    r = (r << 3) | (r >> 2), g = (g << 2) | (g >> 4), b = (b << 3) | (b >> 2);
    rgba[i] = 0xFF000000u | (b << 16) | (g << 8) | r;
  }
}

// The background colour now (0xRRGGBB), for around the canvas
EXPORT(face_background) uint32_t face_background() {
  if (!face) return 0xFFFFFF;
  const uint32_t v = face->bg565();
  const uint16_t le = uint16_t((v >> 8) | (v << 8));
  uint32_t r = (le >> 11) & 31, g = (le >> 5) & 63, b = le & 31;
  return (((r << 3) | (r >> 2)) << 16) | (((g << 2) | (g >> 4)) << 8) | ((b << 3) | (b >> 2));
}
