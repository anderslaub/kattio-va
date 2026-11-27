// Kattio's face for the browser: the firmware's face engine (components/kattio_face/face_engine.cpp, unchanged)
// built as WebAssembly, rendered at the page's own resolution instead of the box's 320x240.
//
// The engine draws shapes with a one pixel soft edge. Before rendering, the wrapper scales the shapes from the
// box's screen to the canvas (centred, the box's 4:3 picture made as large as fits), so the face is sharp at any
// size. The page's own background shows through: the wrapper composites the engine's layers itself, onto
// transparency instead of the mood's background colour (the page shows that colour as a glow behind the face).
// On a dark page the lines take the light colour of the mood and the glow the dark one.
// Build: panel/face/build.sh
#include <cmath>
#include <cstdint>
#include <algorithm>
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

  // The mood's colours now (0xRRGGBB): the light one and the dark one
  uint32_t light_colour() const { return hex(bg_); }
  uint32_t dark_colour() const { return hex(fg_); }

  // The rendered layers (coverage planes in cov) over transparency, into straight RGBA
  void composite(const uint8_t *cov, size_t n, uint32_t *out, bool dark) const {
    kattio::RGBf col[kattio::LAYER_COUNT];
    for (int l = 0; l < kattio::LAYER_COUNT; l++) col[l] = layer_col_[l];
    if (dark) {
      // light lines on a dark page: the mood's light colour, a touch of its dark one; the eye shine stays bright
      const kattio::RGBf main = mix(bg_, fg_, 0.3f);
      col[kattio::LAYER_MAIN] = main;
      col[kattio::LAYER_SHINE] = mix(main, {1, 1, 1}, 0.85f);
    }
    int cr[kattio::LAYER_COUNT], cg[kattio::LAYER_COUNT], cb[kattio::LAYER_COUNT];
    for (int l = 0; l < kattio::LAYER_COUNT; l++)
      cr[l] = int(col[l].r * 255 + 0.5f), cg[l] = int(col[l].g * 255 + 0.5f), cb[l] = int(col[l].b * 255 + 0.5f);
    for (size_t i = 0; i < n; i++) {
      // premultiplied "over", layer by layer, in 0..255 fixed point
      int a = 0, r = 0, g = 0, b = 0;
      for (int l = 0; l < kattio::LAYER_COUNT; l++) {
        const int c = cov[l * n + i];
        if (!c) continue;
        const int k = 255 - c;
        r = (cr[l] * c + r * k) / 255, g = (cg[l] * c + g * k) / 255, b = (cb[l] * c + b * k) / 255;
        a = c + a * k / 255;
      }
      if (!a) {
        out[i] = 0;
        continue;
      }
      r = std::min(255, r * 255 / a), g = std::min(255, g * 255 / a), b = std::min(255, b * 255 / a);
      out[i] = (uint32_t(a) << 24) | (uint32_t(b) << 16) | (uint32_t(g) << 8) | uint32_t(r);
    }
  }

 private:
  static kattio::RGBf mix(const kattio::RGBf &a, const kattio::RGBf &b, float t) {
    return {a.r + (b.r - a.r) * t, a.g + (b.g - a.g) * t, a.b + (b.b - a.b) * t};
  }
  static uint32_t hex(const kattio::RGBf &c) {
    auto u = [](float v) { return uint32_t(std::min(255.0f, std::max(0.0f, v * 255 + 0.5f))); };
    return (u(c.r) << 16) | (u(c.g) << 8) | u(c.b);
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

// Draw the current pose into the picture (RGBA over transparency); dark: for a dark page
EXPORT(face_render) void face_render(int dark) {
  if (!face || rgba.empty()) return;
  face->build_scene();
  face->fit(cw, ch);
  // the engine only clears the coverage of layers that have shapes: start from nothing
  std::fill(cov.begin(), cov.end(), 0);
  face->render_rect(0, 0, cw, ch, px565.data(), cov.data());
  face->composite(cov.data(), px565.size(), rgba.data(), dark != 0);
}

// The mood's colour (0xRRGGBB) for the glow behind the face: its light colour, or for a dark page its dark one
EXPORT(face_glow) uint32_t face_glow(int dark) {
  if (!face) return dark ? 0x000000 : 0xFFFFFF;
  return dark ? face->dark_colour() : face->light_colour();
}
