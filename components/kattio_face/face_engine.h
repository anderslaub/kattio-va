// Kattio face engine: procedural, anti-aliased cat face renderer + animator.
// Portable C++ (no ESPHome dependencies) so it can also be built on a PC for previews.
#pragma once

#include <cmath>
#include <cstdint>
#include <cstring>
#include <vector>
#ifdef ESP_PLATFORM
#include <cstdlib>
#include <esp_heap_caps.h>
#endif

namespace kattio {

enum Mood : uint8_t {
  MOOD_BOOT = 0,   // power on: eyes shut, one eye opens, then the other, then a blink
  MOOD_IDLE,       // ready: light grey, half-shut eyes, blinks, glances, ear twitches, yawns
  MOOD_SLEEP,      // idle for a long time: eyes shut, zzz
  MOOD_WAKE,       // wake word: eyes pop wide, "!" -> automatically becomes LISTEN
  MOOD_LISTEN,     // green, ears up, wide eyes
  MOOD_THINK,      // orange, narrow eyes, thought bubbles
  MOOD_SPEAK,      // blue, mouth follows the TTS audio envelope
  MOOD_BORED,      // "ahhw, boring human": looks up-right, fades to grey -> resting
  MOOD_ERROR,      // red, X eyes, head shake -> resting
  MOOD_MUTED,      // microphone muted: zipped mouth, ears flat
  MOOD_OFFLINE,    // no Wi-Fi / Home Assistant: sad eyes and a "?"
  MOOD_ALARM,      // timer finished: ringing, wide eyes, open mouth
  MOOD_HAPPY,      // petted via touchscreen: ^^ eyes, blush, hearts -> resting
  MOOD_CONFUSED,   // nothing heard: head tilt + "?" -> resting
  MOOD_COUNT
};

struct RGBf {
  float r, g, b;
};

// A drawing primitive. Coverage of all primitives in a layer combines with max(), so polylines made of many
// capsules have seamless joints. Each layer is then composited with its own colour.
enum Layer : uint8_t { LAYER_BLUSH = 0, LAYER_MAIN, LAYER_TONGUE, LAYER_SHINE, LAYER_COUNT };

struct Prim {
  uint8_t kind;   // 0 = capsule (line with round caps), 1 = ellipse (optionally cut by planes / clipped by ellipse)
  uint8_t layer;
  uint8_t nplanes;
  uint8_t clip;
  float alpha;
  // capsule
  float ax, ay, bx, by, r;
  // ellipse
  float cx, cy, rx, ry;
  // half planes, signed distance = nx*x + ny*y - d (inside where negative)
  float pnx[2], pny[2], pd[2];
  // clip ellipse
  float ccx, ccy, crx, cry;
  // bounding box (inclusive, screen pixels)
  int x0, y0, x1, y1;
};

struct Spring {
  float x{0}, v{0}, t{0};
  float k{140};   // stiffness
  float z{1.0f};  // damping ratio (1 = critically damped, < 1 overshoots)
  void set(float target, float stiffness, float damping) {
    t = target;
    k = stiffness;
    z = damping;
  }
  void snap(float val) { x = t = val, v = 0; }
  void step(float dt) {
    float w = sqrtf(k);
    float a = k * (t - x) - 2.0f * z * w * v;
    v += a * dt;
    x += v * dt;
  }
};

// Keep the primitive lists in internal RAM on the ESP32: they are read for every strip, and in PSRAM they compete
// for cache with the wake word models.
#ifdef ESP_PLATFORM
template<class T> struct InternalAlloc {
  using value_type = T;
  InternalAlloc() = default;
  template<class U> InternalAlloc(const InternalAlloc<U> &) {}
  T *allocate(size_t n) {
    void *p = heap_caps_malloc(n * sizeof(T), MALLOC_CAP_INTERNAL | MALLOC_CAP_8BIT);
    return static_cast<T *>(p != nullptr ? p : malloc(n * sizeof(T)));
  }
  void deallocate(T *p, size_t) { free(p); }
  bool operator==(const InternalAlloc &) const { return true; }
  bool operator!=(const InternalAlloc &) const { return false; }
};
using PrimVec = std::vector<Prim, InternalAlloc<Prim>>;
#else
using PrimVec = std::vector<Prim>;
#endif

class FaceEngine {
 public:
  static constexpr int W = 320;
  static constexpr int H = 240;

  FaceEngine();

  // ---- control (call from any one thread, guarded by the owner) ----
  void set_mood(Mood m);
  Mood get_mood() const { return mood_; }
  // The mood transient moods (wake/bored/error/happy/confused) return to.
  void set_connected(bool c);
  void set_muted(bool m);
  void set_sleep_timeout(float s) { sleep_timeout_ = s; }
  void set_speech_level(float level) { speech_level_ = level; }  // 0..1, live TTS envelope
  void set_timer(bool show, float fraction, bool running) {
    timer_show_ = show;
    timer_frac_ = fraction;
    timer_running_ = running;
  }
  void poke();  // user interaction (touch): wake from sleep / pet
  bool is_sleeping() const { return mood_ == MOOD_SLEEP; }
  Mood resting_mood() const;

  // ---- per frame ----
  // Advance the animation by dt seconds. Returns true if anything is moving fast (render at full frame rate).
  bool update(float dt);
  // Build the primitive list for the current pose.
  void build_scene();
  // Render a rectangle of the screen into big-endian RGB565 (pixels laid out with stride w).
  // cov_scratch must hold LAYER_COUNT * w * h bytes.
  void render_rect(int x0, int y0, int w, int h, uint16_t *out, uint8_t *cov_scratch) const;

  // Scene bookkeeping for dirty rectangles
  uint32_t scene_hash() const;
  uint32_t colors_hash() const;
  static bool prim_same(const Prim &a, const Prim &b);
  void scene_bbox(int &x0, int &y0, int &x1, int &y1) const;
  uint32_t bg565() const;
  const PrimVec &prims() const { return prims_; }

 protected:
  // animation helpers
  float rnd();  // 0..1
  float rnd(float a, float b) { return a + (b - a) * rnd(); }
  void enter_mood_(Mood m);
  void apply_mood_targets_(float dt);
  void schedule_blink_(float min_s, float max_s);
  void start_blink_(bool dbl);
  float blink_factor_() const;

  // geometry helpers (local face coordinates -> screen)
  void xf(float lx, float ly, float &sx, float &sy) const;
  void capsule_l(float ax, float ay, float bx, float by, float r, uint8_t layer = LAYER_MAIN, float alpha = 1.0f);
  void cubic_l(float x0, float y0, float x1, float y1, float x2, float y2, float x3, float y3, float r, int segs,
               uint8_t layer = LAYER_MAIN, float alpha = 1.0f);
  void quad_l(float x0, float y0, float cx, float cy, float x1, float y1, float r, int segs, uint8_t layer = LAYER_MAIN,
              float alpha = 1.0f);
  Prim &ellipse_l(float cx, float cy, float rx, float ry, uint8_t layer = LAYER_MAIN, float alpha = 1.0f);
  void add_plane_l(Prim &p, float px, float py, float nx, float ny);  // keep the side opposite to the normal
  void finish_bbox_(Prim &p);
  void heart_l(float x, float y, float s, float alpha);
  void zee_l(float x, float y, float s, float alpha);

  void draw_head_();
  void draw_eye_(int side, float open);
  void draw_mouth_();
  void draw_extras_();

  // state
  Mood mood_{MOOD_BOOT};
  Mood prev_mood_{MOOD_BOOT};
  float mood_t_{0};    // time in current mood
  float idle_t_{0};    // time spent in idle (for sleep)
  float time_{0};      // global time
  bool connected_{false};
  bool muted_{false};
  float sleep_timeout_{600};
  float speech_level_{0};
  bool timer_show_{false}, timer_running_{false};
  float timer_frac_{0};
  uint32_t rng_{0x12345678};

  // events
  float next_blink_{2.0f};
  float blink_t_{-1};
  bool blink_double_{false};
  float next_glance_{5.0f};
  float glance_end_{-1};
  float gaze_glance_x_{0}, gaze_glance_y_{0};
  float next_twitch_{6.0f};
  float next_yawn_{180.0f};
  float yawn_t_{-1};
  bool pre_sleep_{false};
  float drowsy_t_{0};
  float next_tilt_{3.0f};
  float talk_env_{0};

  // pose springs
  Spring head_x_, head_y_, tilt_, squash_;
  Spring ear_l_, ear_r_, twist_l_, twist_r_;
  Spring eye_l_, eye_r_, eye_scale_, lid_top_, lid_bot_, lid_slant_, curve_;
  Spring gaze_x_, gaze_y_;
  Spring mouth_open_, mouth_smile_, mouth_w_, zip_;
  Spring whisker_, blush_, cross_, shine_;
  Spring exclaim_, question_, zzz_, dots_, ring_, hearts_;

  // colours
  RGBf fg_{0.42f, 0.42f, 0.42f}, bg_{1, 1, 1};
  RGBf fg_t_{0.42f, 0.42f, 0.42f}, bg_t_{1, 1, 1};
  float color_tau_{0.3f};

  // scene
  PrimVec prims_;
  RGBf layer_col_[LAYER_COUNT];
  float cx_{160}, cy_{128};  // face centre on screen
  float breathe_{0};
  float tilt_cos_{1}, tilt_sin_{0};
  float gx_{0}, gy_{0};      // gaze offset applied to eyes (local px)
};

}  // namespace kattio
