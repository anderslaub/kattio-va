// Kattio's face for the app (the car screen): the firmware's face engine (components/kattio_face/face_engine.cpp,
// unchanged), drawn into an Android bitmap at the screen's own resolution. The same idea as the panel's WebAssembly
// wrapper (panel/face/face_wasm.cpp): the shapes are scaled from the box's 320x240 screen to the bitmap before they
// are rendered, so the face is sharp at any size, and the layers are composited over transparency (the app draws the
// mood's colour as a glow behind it). Light lines for a dark screen.
#include <jni.h>
#include <android/bitmap.h>

#include <algorithm>
#include <cmath>
#include <cstdint>
#include <vector>

#include "face_engine.h"

namespace {

class AppFace : public kattio::FaceEngine {
 public:
  void fit(int w, int h) {
    const float s = std::min(w / float(W), h / float(H));
    const float ox = (w - W * s) * 0.5f, oy = (h - H * s) * 0.5f;
    for (kattio::Prim &p : prims_) {
      p.ax = p.ax * s + ox, p.ay = p.ay * s + oy, p.bx = p.bx * s + ox, p.by = p.by * s + oy, p.r *= s;
      p.cx = p.cx * s + ox, p.cy = p.cy * s + oy, p.rx *= s, p.ry *= s;
      p.ccx = p.ccx * s + ox, p.ccy = p.ccy * s + oy, p.crx *= s, p.cry *= s;
      for (int k = 0; k < p.nplanes; k++) p.pd[k] = p.pd[k] * s + p.pnx[k] * ox + p.pny[k] * oy;
      p.x0 = std::max(0, int(floorf(p.x0 * s + ox)));
      p.y0 = std::max(0, int(floorf(p.y0 * s + oy)));
      p.x1 = std::min(w - 1, int(ceilf((p.x1 + 1) * s + ox)));
      p.y1 = std::min(h - 1, int(ceilf((p.y1 + 1) * s + oy)));
    }
  }

  uint32_t light_colour() const { return hex(bg_); }
  uint32_t dark_colour() const { return hex(fg_); }

  // The layers over transparency, premultiplied (Android's ARGB_8888: bytes R, G, B, A), with the stride in pixels
  void composite(const uint8_t *cov, int w, int h, uint32_t *out, int stride, bool dark) const {
    kattio::RGBf col[kattio::LAYER_COUNT];
    for (int l = 0; l < kattio::LAYER_COUNT; l++) col[l] = layer_col_[l];
    if (dark) {
      const kattio::RGBf main = mix(bg_, fg_, 0.3f);
      col[kattio::LAYER_MAIN] = main;
      col[kattio::LAYER_SHINE] = mix(main, {1, 1, 1}, 0.85f);
    }
    int cr[kattio::LAYER_COUNT], cg[kattio::LAYER_COUNT], cb[kattio::LAYER_COUNT];
    for (int l = 0; l < kattio::LAYER_COUNT; l++)
      cr[l] = int(col[l].r * 255 + 0.5f), cg[l] = int(col[l].g * 255 + 0.5f), cb[l] = int(col[l].b * 255 + 0.5f);
    const size_t n = size_t(w) * h;
    for (int y = 0; y < h; y++) {
      uint32_t *row = out + size_t(y) * stride;
      for (int x = 0; x < w; x++) {
        const size_t i = size_t(y) * w + x;
        int a = 0, r = 0, g = 0, b = 0;
        for (int l = 0; l < kattio::LAYER_COUNT; l++) {
          const int c = cov[l * n + i];
          if (!c) continue;
          const int k = 255 - c;
          r = (cr[l] * c + r * k) / 255, g = (cg[l] * c + g * k) / 255, b = (cb[l] * c + b * k) / 255;
          a = c + a * k / 255;
        }
        row[x] = (uint32_t(a) << 24) | (uint32_t(std::min(b, a)) << 16) | (uint32_t(std::min(g, a)) << 8) |
                 uint32_t(std::min(r, a));
      }
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

struct Native {
  AppFace face;
  std::vector<uint16_t> px565;
  std::vector<uint8_t> cov;
  int w = 0, h = 0;
};

Native *of(jlong handle) { return reinterpret_cast<Native *>(handle); }

}  // namespace

#define FN(name) extern "C" JNIEXPORT
#define CLS(name) Java_io_github_anderslaub_kattio_car_FaceEngine_##name

FN() jlong JNICALL CLS(nativeCreate)(JNIEnv *, jclass, jint seed) {
  auto *n = new Native();
  n->face.seed(uint32_t(seed));
  n->face.set_connected(true);
  return reinterpret_cast<jlong>(n);
}

FN() void JNICALL CLS(nativeDestroy)(JNIEnv *, jclass, jlong h) { delete of(h); }

FN() void JNICALL CLS(nativeSetMood)(JNIEnv *, jclass, jlong h, jint mood) {
  if (mood >= 0 && mood < kattio::MOOD_COUNT) of(h)->face.set_mood(kattio::Mood(mood));
}

FN() jint JNICALL CLS(nativeGetMood)(JNIEnv *, jclass, jlong h) { return of(h)->face.get_mood(); }

FN() void JNICALL CLS(nativeSetLevel)(JNIEnv *, jclass, jlong h, jfloat level) { of(h)->face.set_speech_level(level); }

FN() void JNICALL CLS(nativeSetSleepTimeout)(JNIEnv *, jclass, jlong h, jfloat s) {
  of(h)->face.set_sleep_timeout(s);
}

FN() jboolean JNICALL CLS(nativeUpdate)(JNIEnv *, jclass, jlong h, jfloat dt) { return of(h)->face.update(dt); }

FN() jint JNICALL CLS(nativeGlow)(JNIEnv *, jclass, jlong h, jboolean dark) {
  return jint(dark ? of(h)->face.dark_colour() : of(h)->face.light_colour());
}

// Draw the current pose into an ARGB_8888 bitmap
FN() void JNICALL CLS(nativeRender)(JNIEnv *env, jclass, jlong h, jobject bitmap, jboolean dark) {
  Native *n = of(h);
  AndroidBitmapInfo info;
  if (AndroidBitmap_getInfo(env, bitmap, &info) != ANDROID_BITMAP_RESULT_SUCCESS) return;
  if (info.format != ANDROID_BITMAP_FORMAT_RGBA_8888) return;
  const int w = int(info.width), hh = int(info.height);
  if (w != n->w || hh != n->h) {
    n->w = w, n->h = hh;
    n->px565.assign(size_t(w) * hh, 0);
    n->cov.assign(size_t(w) * hh * kattio::LAYER_COUNT, 0);
  }
  void *pixels = nullptr;
  if (AndroidBitmap_lockPixels(env, bitmap, &pixels) != ANDROID_BITMAP_RESULT_SUCCESS) return;
  n->face.build_scene();
  n->face.fit(w, hh);
  std::fill(n->cov.begin(), n->cov.end(), 0);
  n->face.render_rect(0, 0, w, hh, n->px565.data(), n->cov.data());
  n->face.composite(n->cov.data(), w, hh, static_cast<uint32_t *>(pixels), int(info.stride / 4), dark);
  AndroidBitmap_unlockPixels(env, bitmap);
}
