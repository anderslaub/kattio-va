#if defined(__GNUC__) && !defined(__clang__)
#pragma GCC optimize("O3", "fast-math")
#endif
#include "face_engine.h"

#include <algorithm>

namespace kattio {

namespace {

constexpr float PI = 3.14159265f;

inline float clampf(float v, float lo, float hi) { return v < lo ? lo : (v > hi ? hi : v); }
inline float lerpf(float a, float b, float t) { return a + (b - a) * t; }
inline float smooth01(float t) {
  t = clampf(t, 0, 1);
  return t * t * (3 - 2 * t);
}
inline RGBf rgb(uint32_t hex) {
  return {((hex >> 16) & 0xFF) / 255.0f, ((hex >> 8) & 0xFF) / 255.0f, (hex & 0xFF) / 255.0f};
}
inline RGBf mix(RGBf a, RGBf b, float t) { return {lerpf(a.r, b.r, t), lerpf(a.g, b.g, t), lerpf(a.b, b.b, t)}; }

// Palette (line colour, background tint)
const RGBf WHITE = rgb(0xFFFFFF);
const RGBf GREY_MED = rgb(0x6E6E6E);
const RGBf GREY_LIGHT = rgb(0xA3A3A3);
// Active states get a strongly coloured background with darker line art: a pale tint washes out to white
// when the screen is seen from the side, a saturated one stays recognisable across the room.
const RGBf GREEN = rgb(0x0B6B2C), GREEN_BG = rgb(0x6FE08F);    // listening
const RGBf ORANGE = rgb(0x7A4A00), ORANGE_BG = rgb(0xFFC53D);  // thinking: amber, clearly not the error red
const RGBf BLUE = rgb(0x123F8C), BLUE_BG = rgb(0x86B4F7);      // speaking
const RGBf RED = rgb(0x8E1411), RED_BG = rgb(0xF58C88);        // error
const RGBf PURPLE = rgb(0x5E1E8F), PURPLE_BG = rgb(0xCFA2F2);
const RGBf PINK = rgb(0x8F1D4C), PINK_BG = rgb(0xF7A8C8);
const RGBf ANGRY = rgb(0x7A2405), ANGRY_BG = rgb(0xFF9F6E);    // burnt orange: angry, but not the error red
const RGBf TEAL = rgb(0x05555F), TEAL_BG = rgb(0x6FD0DB);
const RGBf INDIGO = rgb(0x2E2A8F), INDIGO_BG = rgb(0xA9B2FA);  // loading: not any of the conversation colours      // working: calm, not listening-green or speaking-blue
const RGBf BLUSH = rgb(0xFF8FA6);
const RGBf TONGUE = rgb(0xFF7F93);


inline float sd_ellipse_fast(float px, float py, float irx, float iry, float irx2, float iry2) {
  float ax = px * irx, ay = py * iry;
  float bx = px * irx2, by = py * iry2;
  float k0 = sqrtf(ax * ax + ay * ay);
  float k1 = sqrtf(bx * bx + by * by);
  if (k1 < 1e-6f)
    return -1.0f / std::max(irx, iry);
  return k0 * (k0 - 1.0f) / k1;
}

}  // namespace

FaceEngine::FaceEngine() {
  prims_.reserve(160);
  // Initial pose: eyes shut, medium grey
  eye_l_.snap(0);
  eye_r_.snap(0);
  eye_scale_.snap(1);
  size_l_.snap(1);
  size_r_.snap(1);
  curve_.snap(0.6f);
  mouth_smile_.snap(0.4f);
  mouth_w_.snap(0.9f);
  fg_ = fg_t_ = GREY_MED;
  bg_ = bg_t_ = WHITE;
  enter_mood_(MOOD_BOOT);
}

float FaceEngine::rnd() {
  // xorshift32
  rng_ ^= rng_ << 13;
  rng_ ^= rng_ >> 17;
  rng_ ^= rng_ << 5;
  return (rng_ & 0xFFFFFF) / 16777216.0f;
}

Mood FaceEngine::resting_mood() const {
  if (!connected_)
    return MOOD_OFFLINE;
  if (muted_)
    return MOOD_MUTED;
  return MOOD_IDLE;
}

void FaceEngine::set_connected(bool c) {
  if (c == connected_)
    return;
  connected_ = c;
  if (mood_ == MOOD_OFFLINE || mood_ == MOOD_IDLE || mood_ == MOOD_MUTED || mood_ == MOOD_SLEEP)
    set_mood(resting_mood());
}

void FaceEngine::set_muted(bool m) {
  if (m == muted_)
    return;
  muted_ = m;
  if (mood_ == MOOD_IDLE || mood_ == MOOD_MUTED || mood_ == MOOD_SLEEP)
    set_mood(resting_mood());
}

bool FaceEngine::poke() {
  idle_t_ = 0;
  if (mood_ != MOOD_IDLE && mood_ != MOOD_SLEEP && mood_ != MOOD_MUTED && mood_ != MOOD_HAPPY)
    return false;  // busy, or still grumpy from the last time: leave it alone
  if (snap_one_in_ > 0 && rnd() * snap_one_in_ < 1.0f) {
    set_mood(MOOD_SNAP);
    return true;
  }
  set_mood(MOOD_HAPPY);
  return false;
}

void FaceEngine::notice() {
  twist_l_.v += 7.0f;
  twist_r_.v += 7.0f;
  if (mood_ == MOOD_IDLE && !pre_sleep_)
    next_glance_ = 0;
}

void FaceEngine::set_mood(Mood m) {
  if (m >= MOOD_COUNT)
    return;
  // Boot sequence finishes on its own, then goes to the resting mood.
  if (mood_ == MOOD_BOOT && (m == MOOD_IDLE || m == MOOD_OFFLINE || m == MOOD_MUTED) && mood_t_ < 3.0f)
    return;
  // Resting moods are re-evaluated (e.g. IDLE while muted -> MUTED)
  if (m == MOOD_IDLE || m == MOOD_MUTED || m == MOOD_OFFLINE)
    m = resting_mood();
  if (m == mood_ && m != MOOD_WAKE && m != MOOD_HAPPY)
    return;
  // Let the wake-up animation finish; it continues into LISTEN by itself.
  if (mood_ == MOOD_WAKE && m == MOOD_LISTEN)
    return;
  enter_mood_(m);
}

void FaceEngine::enter_mood_(Mood m) {
  prev_mood_ = mood_;
  mood_ = m;
  mood_t_ = 0;
  if (m != MOOD_IDLE && m != MOOD_SLEEP)
    idle_t_ = 0;
  if (m == MOOD_IDLE && prev_mood_ != MOOD_SLEEP)
    idle_t_ = 0;
  color_tau_ = 0.28f;
  yawn_t_ = -1;
  glance_end_ = -1;
  pre_sleep_ = false;

  switch (m) {
    case MOOD_WAKE:
      // Little jump, ears and eyes pop
      head_y_.v -= 160.0f;
      squash_.v += 0.6f;
      next_blink_ = 0.42f;
      blink_double_ = true;
      if (prev_mood_ == MOOD_SLEEP)
        next_blink_ = 0.3f;
      break;
    case MOOD_ERROR:
      next_blink_ = 99;
      break;
    case MOOD_BORED:
      color_tau_ = 0.9f;
      next_blink_ = 0.15f;
      blink_double_ = false;
      break;
    case MOOD_HAPPY:
      head_y_.v -= 90.0f;
      break;
    case MOOD_SNAP:
      // Lunge at the finger
      head_y_.v -= 170.0f;
      squash_.v += 0.9f;
      eye_scale_.v += 2.5f;
      twist_l_.v -= 6.0f;
      twist_r_.v -= 6.0f;
      next_blink_ = 99;
      color_tau_ = 0.1f;
      claw_flip_ = rnd() < 0.5f ? -1.0f : 1.0f;
      claw_x_ = rnd(-40, 40);
      claws_.snap(1);
      break;
    case MOOD_IDLE:
      color_tau_ = (prev_mood_ == MOOD_BORED) ? 0.9f : 0.45f;
      schedule_blink_(1.0f, 3.0f);
      next_glance_ = rnd(3, 8);
      next_twitch_ = rnd(4, 12);
      next_yawn_ = rnd(150, 400);
      break;
    case MOOD_SLEEP:
      color_tau_ = 1.5f;
      next_twitch_ = rnd(15, 30);
      break;
    case MOOD_SPEAK:
      schedule_blink_(1.0f, 3.0f);
      break;
    case MOOD_THINK:
      schedule_blink_(2.0f, 4.0f);
      break;
    case MOOD_LISTEN:
      schedule_blink_(2.0f, 5.0f);
      next_twitch_ = rnd(1.5f, 4);
      next_tilt_ = rnd(1.5f, 3);
      break;
    default:
      schedule_blink_(1.5f, 4.0f);
      break;
  }
}

void FaceEngine::schedule_blink_(float min_s, float max_s) {
  next_blink_ = rnd(min_s, max_s);
  blink_double_ = rnd() < 0.2f;
}

void FaceEngine::start_blink_(bool dbl) {
  blink_t_ = 0;
  blink_double_ = dbl;
}

float FaceEngine::blink_factor_() const {
  if (blink_t_ < 0)
    return 1.0f;
  auto one = [](float t) {
    if (t < 0)
      return 1.0f;
    if (t < 0.07f)
      return 1.0f - t / 0.07f;
    if (t < 0.11f)
      return 0.0f;
    if (t < 0.24f)
      return smooth01((t - 0.11f) / 0.13f);
    return 1.0f;
  };
  float f = one(blink_t_);
  if (blink_double_)
    f = std::min(f, one(blink_t_ - 0.3f));
  return f;
}

bool FaceEngine::update(float dt) {
  dt = clampf(dt, 0.0f, 0.1f);
  time_ += dt;
  mood_t_ += dt;

  // ---- automatic mood transitions ----
  if (mood_ == MOOD_BOOT && mood_t_ > 3.0f && connected_)
    enter_mood_(resting_mood());
  else if (mood_ == MOOD_BOOT && mood_t_ > 45.0f)
    enter_mood_(MOOD_OFFLINE);
  else if (mood_ == MOOD_WAKE && mood_t_ > 1.1f)
    enter_mood_(MOOD_LISTEN);
  else if (mood_ == MOOD_BORED && mood_t_ > 3.6f)
    enter_mood_(resting_mood());
  else if (mood_ == MOOD_ERROR && mood_t_ > 3.5f)
    enter_mood_(resting_mood());
  else if (mood_ == MOOD_HAPPY && mood_t_ > 3.0f)
    enter_mood_(resting_mood());
  else if (mood_ == MOOD_CONFUSED && mood_t_ > 2.6f)
    enter_mood_(resting_mood());
  else if (mood_ == MOOD_SNAP && mood_t_ > 3.6f)
    enter_mood_(resting_mood());
  if (mood_ == MOOD_IDLE) {
    idle_t_ += dt;
    // Getting sleepy: yawn, get drowsy for a moment, then fall asleep
    if (idle_t_ > sleep_timeout_ && !pre_sleep_) {
      pre_sleep_ = true;
      drowsy_t_ = 0;
      if (yawn_t_ < 0)
        yawn_t_ = 0;
    }
    if (pre_sleep_ && yawn_t_ < 0) {
      drowsy_t_ += dt;
      if (drowsy_t_ > 1.8f)
        enter_mood_(MOOD_SLEEP);
    }
  }

  // ---- blinks ----
  if (blink_t_ >= 0) {
    blink_t_ += dt;
    if (blink_t_ > (blink_double_ ? 0.6f : 0.3f))
      blink_t_ = -1;
  }
  bool blinky = mood_ != MOOD_SLEEP && mood_ != MOOD_ERROR && mood_ != MOOD_HAPPY && !(mood_ == MOOD_BOOT && mood_t_ < 2.2f);
  if (blinky) {
    next_blink_ -= dt;
    if (next_blink_ <= 0 && blink_t_ < 0) {
      start_blink_(blink_double_);
      switch (mood_) {
        case MOOD_IDLE:
        case MOOD_MUTED:
        case MOOD_OFFLINE:
          schedule_blink_(2.5f, 7.0f);
          break;
        case MOOD_THINK:
          schedule_blink_(3.0f, 6.0f);
          break;
        case MOOD_BORED:
          next_blink_ = 99;
          break;
        default:
          schedule_blink_(2.0f, 5.0f);
          break;
      }
    }
  }
  if (mood_ == MOOD_BOOT && mood_t_ > 2.25f && mood_t_ - dt <= 2.25f)
    start_blink_(false);

  // The answer was on its way: start talking with the first sound that actually plays
  if (mood_ == MOOD_READY && speech_level_ > 0.04f)
    set_mood(MOOD_SPEAK);

  // ---- speech envelope smoothing ----
  float lvl = clampf(speech_level_, 0, 1);
  if (mood_ != MOOD_SPEAK)
    lvl = 0;
  talk_env_ += (lvl - talk_env_) * clampf(dt * (lvl > talk_env_ ? 35.0f : 14.0f), 0, 1);

  apply_mood_targets_(dt);

  // ---- integrate springs (sub-stepped for stability) ----
  Spring *all[] = {&head_x_, &head_y_, &tilt_,   &squash_,  &ear_l_,       &ear_r_,   &twist_l_, &twist_r_,
                   &eye_l_,  &eye_r_,  &eye_scale_, &size_l_, &size_r_, &lid_top_, &lid_bot_,  &lid_slant_, &curve_, &gaze_x_,
                   &gaze_y_, &mouth_open_, &mouth_smile_, &mouth_w_, &zip_, &whisker_, &blush_, &cross_,
                   &shine_,  &exclaim_, &question_, &zzz_, &dots_, &ring_, &hearts_, &claws_, &gear_, &spinner_};
  int n = std::max(1, (int) ceilf(dt / (1.0f / 240.0f)));
  float sdt = dt / n;
  for (int i = 0; i < n; i++)
    for (auto *s : all)
      s->step(sdt);

  // ---- colours ----
  float a = 1.0f - expf(-dt / color_tau_);
  fg_ = mix(fg_, fg_t_, a);
  bg_ = mix(bg_, bg_t_, a);

  // Fast-motion detection (to choose frame rate)
  float vmax = 0;
  for (auto *s : all)
    vmax = std::max(vmax, fabsf(s->v));
  bool color_moving = fabsf(fg_.r - fg_t_.r) + fabsf(fg_.g - fg_t_.g) + fabsf(fg_.b - fg_t_.b) +
                          fabsf(bg_.r - bg_t_.r) + fabsf(bg_.g - bg_t_.g) + fabsf(bg_.b - bg_t_.b) >
                      0.01f;
  return vmax > 0.6f || blink_t_ >= 0 || color_moving || mood_ == MOOD_SPEAK || mood_ == MOOD_ALARM ||
         mood_ == MOOD_WAKE || mood_ == MOOD_ERROR || mood_ == MOOD_HAPPY || mood_ == MOOD_THINK ||
         mood_ == MOOD_BORED || mood_ == MOOD_SNAP || mood_ == MOOD_WORK || mood_ == MOOD_READY ||
         mood_ == MOOD_LOADING ||
         claws_.x > 0.02f;
}

void FaceEngine::apply_mood_targets_(float dt) {
  const float t = mood_t_;
  // Defaults
  float hx = 0, hy = 0, tilt = 0, squash = 0;
  float ear_l = 0, ear_r = 0;
  float eye_l = 1, eye_r = 1, eye_scale = 1, size_l = 1, size_r = 1, lid_top = 0, lid_bot = 0, slant = 0, curve = 0;
  float gx = 0, gy = 0;
  float mopen = 0, smile = 0.55f, mw = 1.0f, zip = 0;
  float whisker = 0, blush = 0, cross = 0, shine = 0;
  float exclaim = 0, question = 0, zzz = 0, dots = 0, ring = 0, hearts = 0, claws = 0, gear = 0, spinner = 0;
  float breathe_amp = 0.010f, breathe_period = 4.2f;
  float lid_k = 90;
  float eye_k = 160, eye_z = 0.9f, gaze_k = 260, ear_k = 140, ear_z = 0.65f, head_k = 140, head_z = 0.55f;

  bool glances = false, twitches = false;
  float glance_amt = 0.85f;
  float twitch_min = 7, twitch_max = 20;

  switch (mood_) {
    case MOOD_BOOT: {
      fg_t_ = GREY_MED;
      bg_t_ = WHITE;
      eye_l = t < 0.8f ? 0 : 1;
      eye_r = t < 1.5f ? 0 : 1;
      curve = 0.5f;
      eye_k = 220;
      eye_z = 0.45f;
      lid_top = t > 2.6f ? 0.2f : 0.0f;
      ear_l = t > 1.0f ? 0.2f : -0.2f;
      ear_r = t > 1.7f ? 0.2f : -0.2f;
      smile = 0.4f;
      mw = 0.9f;
      if (t > 3.0f) {  // still waiting for Wi-Fi / HA: look around a little
        glances = true;
        glance_amt = 0.5f;
      }
      break;
    }
    case MOOD_IDLE: {
      fg_t_ = GREY_LIGHT;
      bg_t_ = WHITE;
      lid_top = 0.34f;
      breathe_amp = 0;
      smile = 0.5f;
      glances = twitches = true;
      // Yawn now and then
      next_yawn_ -= dt;
      if (next_yawn_ <= 0 && yawn_t_ < 0 && glance_end_ < 0 && !pre_sleep_) {
        yawn_t_ = 0;
        next_yawn_ = rnd(150, 420);
      }
      if (yawn_t_ >= 0) {
        yawn_t_ += dt;
        if (yawn_t_ < 1.9f) {
          eye_l = eye_r = 0;
          curve = -0.7f;
          // big wide yawn (deliberately past the normal 0..1 range)
          mopen = yawn_t_ < 0.25f ? 0.2f : 1.45f;
          mw = 1.15f;
          hy = -5;
          tilt = 0.07f;
          ear_l = ear_r = -0.45f;
          eye_k = 90;
        } else if (yawn_t_ > 2.8f) {
          yawn_t_ = -1;
        }
      }
      // After the bedtime yawn: heavy lids, sagging ears, head drooping
      if (pre_sleep_ && yawn_t_ < 0) {
        lid_top = 0.72f;
        ear_l = ear_r = -0.3f;
        hy = 3;
        tilt = 0.05f;
        glance_end_ = -1;
      }
      // A gentle random head tilt now and then
      next_tilt_ -= dt;
      if (next_tilt_ <= 0)
        next_tilt_ = rnd(6, 16);
      break;
    }
    case MOOD_SLEEP: {
      fg_t_ = GREY_MED;
      bg_t_ = WHITE;
      eye_l = eye_r = 0;
      curve = 0.75f;
      smile = 0.3f;
      mw = 0.8f;
      ear_l = ear_r = -0.3f;
      hy = 4;
      zzz = 1;
      breathe_amp = 0.028f;
      breathe_period = 5.5f;
      twitches = true;
      twitch_min = 15;
      twitch_max = 40;
      break;
    }
    case MOOD_WAKE: {
      fg_t_ = GREEN;
      bg_t_ = GREEN_BG;
      color_tau_ = 0.22f;
      eye_l = eye_r = 1.3f;
      lid_k = 700;
      eye_k = 340;
      eye_z = 0.32f;
      shine = 1;
      ear_l = ear_r = 1.0f;
      ear_k = 300;
      ear_z = 0.35f;
      exclaim = t < 0.85f ? 1 : 0;
      whisker = 0.6f;
      smile = 0.8f;
      break;
    }
    case MOOD_LISTEN: {
      fg_t_ = GREEN;
      bg_t_ = GREEN_BG;
      eye_l = eye_r = 1.12f;
      shine = 1;
      ear_l = ear_r = 1.0f;
      smile = 0.7f;
      mw = 0.9f;
      twitches = true;
      twitch_min = 2.5f;
      twitch_max = 6;
      // Curious head tilts
      next_tilt_ -= dt;
      if (next_tilt_ <= 0)
        next_tilt_ = rnd(2.5f, 5.0f);
      tilt = 0.07f * sinf(time_ * 0.9f);
      glances = true;
      glance_amt = 0.25f;
      break;
    }
    case MOOD_THINK: {
      fg_t_ = ORANGE;
      bg_t_ = ORANGE_BG;
      // Pondering: one eye squeezed small, the other wide open, both twitching now and then
      size_l = 0.72f;
      size_r = 1.2f;
      next_eye_twitch_ -= dt;
      if (next_eye_twitch_ <= 0) {
        next_eye_twitch_ = rnd(0.35f, 1.1f);
        Spring &e = (rnd(0, 1) < 0.5f) ? size_l_ : size_r_;
        e.v += rnd(0, 1) < 0.5f ? -rnd(1.2f, 2.2f) : rnd(1.2f, 2.2f);
      }
      gx = 0.55f + 0.3f * sinf(time_ * 1.3f);
      gy = -0.6f + 0.15f * sinf(time_ * 2.1f);
      gaze_k = 60;
      dots = 1;
      smile = -0.12f;
      mw = 0.7f;
      // Slow side-to-side head tilt while it ponders (about 6 s per sway)
      tilt = 0.11f * sinf(time_ * 1.05f);
      ear_l = 0.2f;
      ear_r = 0.5f;
      break;
    }
    case MOOD_READY: {
      // About to answer: already in the speaking colour, eyes on you, a small breath in, "..." pulsing
      fg_t_ = BLUE;
      bg_t_ = BLUE_BG;
      eye_l = eye_r = 1.06f;
      shine = 1;
      ear_l = ear_r = 0.5f;
      mopen = 0.12f + 0.05f * sinf(time_ * 3.0f);
      mw = 0.75f;
      smile = 0.45f;
      squash = -0.015f * sinf(time_ * 1.5f);
      dots = 0.8f;
      break;
    }
    case MOOD_WORK: {
      // Busy in the background: eyes follow the spinning cog, a little concentrated nod now and then
      fg_t_ = TEAL;
      bg_t_ = TEAL_BG;
      gear = 1;
      lid_top = 0.12f;
      lid_bot = 0.12f;
      eye_scale = 1.04f;
      gx = 0.62f + 0.06f * sinf(time_ * 2.2f);
      gy = -0.55f + 0.05f * cosf(time_ * 2.2f);
      gaze_k = 90;
      smile = 0.1f;
      mw = 0.6f;
      tilt = 0.06f + 0.02f * sinf(time_ * 0.7f);
      hy = 1.5f * powf(fmaxf(0.0f, sinf(time_ * 1.6f)), 6.0f);  // small nod
      ear_l = 0.35f;
      ear_r = 0.55f + 0.15f * sinf(time_ * 3.1f);
      break;
    }
    case MOOD_LOADING: {
      // Starting up: both eyes are spinning loaders, the head sways gently while it waits
      fg_t_ = INDIGO;
      bg_t_ = INDIGO_BG;
      spinner = 1;
      smile = 0.25f;
      mw = 0.6f;
      tilt = 0.05f * sinf(time_ * 0.8f);
      hy = 1.2f * sinf(time_ * 1.6f);
      ear_l = ear_r = 0.25f;
      break;
    }
    case MOOD_SPEAK: {
      fg_t_ = BLUE;
      bg_t_ = BLUE_BG;
      eye_l = eye_r = 1.08f;
      shine = 1;
      ear_l = ear_r = 0.6f;
      float e = talk_env_;
      mopen = clampf(e * 1.5f, 0, 1);
      smile = 0.6f;
      whisker = clampf(e * 1.4f, 0, 1);
      tilt = 0.03f;
      glances = true;
      glance_amt = 0.2f;
      break;
    }
    case MOOD_BORED: {
      fg_t_ = GREY_LIGHT;
      bg_t_ = WHITE;
      if (t > 0.3f) {
        lid_top = 0.55f;
        gx = 0.95f;
        gy = -0.9f;
        gaze_k = 30;
        tilt = 0.13f;
        ear_l = -0.2f;
        ear_r = -0.45f;
        smile = -0.35f;
        mw = 0.75f;
      }
      if (t > 2.1f && t < 2.7f) {  // sigh
        squash = -0.035f;
        hy = 3;
      }
      if (t > 2.8f) {  // settle back towards idle
        lid_top = 0.45f;
        gx = 0.2f;
        gy = 0;
        tilt = 0.03f;
      }
      break;
    }
    case MOOD_ERROR: {
      fg_t_ = RED;
      bg_t_ = RED_BG;
      cross = 1;
      eye_l = eye_r = 0.0f;
      eye_k = 300;
      eye_z = 0.45f;
      if (t < 1.4f)
        hx = 9.0f * sinf(t * 2 * PI * 4.2f) * expf(-t * 2.0f);
      head_k = 1200;
      head_z = 1.0f;
      ear_l = ear_r = -0.75f;
      smile = -0.8f;
      mw = 0.85f;
      break;
    }
    case MOOD_MUTED: {
      fg_t_ = GREY_MED;
      bg_t_ = WHITE;
      lid_top = 0.32f;
      zip = 1;
      ear_l = ear_r = -0.65f;
      glances = twitches = true;
      break;
    }
    case MOOD_OFFLINE: {
      fg_t_ = GREY_MED;
      bg_t_ = WHITE;
      lid_top = 0.3f;
      slant = 0.55f;
      question = 1;
      ear_l = ear_r = -0.5f;
      smile = -0.4f;
      mw = 0.8f;
      gx = 0.6f * sinf(time_ * 0.5f);
      gaze_k = 40;
      tilt = -0.06f;
      break;
    }
    case MOOD_ALARM: {
      fg_t_ = PURPLE;
      float flash = 0.5f + 0.5f * sinf(time_ * 2 * PI * 2.0f);
      bg_t_ = mix(PURPLE_BG, WHITE, flash * 0.8f);
      color_tau_ = 0.08f;
      eye_l = eye_r = 1.3f;
      shine = 1;
      ring = 1;
      mopen = 0.55f + 0.3f * sinf(time_ * 2 * PI * 3.0f);
      hx = 4.0f * sinf(time_ * 2 * PI * 7.0f) * (sinf(time_ * 2 * PI * 1.0f) > 0 ? 1.0f : 0.0f);
      head_k = 1200;
      head_z = 1.0f;
      ear_l = ear_r = 1.0f;
      break;
    }
    case MOOD_HAPPY: {
      fg_t_ = PINK;
      bg_t_ = PINK_BG;
      eye_l = eye_r = 0;
      curve = -0.85f;
      blush = 1;
      smile = 1;
      mw = 1.1f;
      ear_l = ear_r = 0.5f;
      tilt = 0.09f * sinf(t * 2 * PI * 0.9f);
      hearts = t < 2.4f ? 1 : 0;
      whisker = 0.5f;
      break;
    }
    case MOOD_SNAP: {
      fg_t_ = ANGRY;
      bg_t_ = ANGRY_BG;
      claws = t < 2.0f ? 1 : 0;
      ear_k = 400;
      ear_z = 0.5f;
      if (t < 1.9f) {
        // Angry slanted eyes, ears flat, snarling, shaking with a growl
        eye_l = eye_r = 0.95f;
        slant = -0.95f;
        lid_top = 0.22f;
        lid_k = 500;
        ear_l = ear_r = -1.0f;
        whisker = 1;
        mopen = 0.42f + 0.07f * sinf(t * 2 * PI * 9.0f);
        mw = 1.1f;
        smile = -0.6f;
        if (t > 0.25f) {
          hx = 1.8f * sinf(time_ * 2 * PI * 17.0f);
          head_k = 1200;
          head_z = 1.0f;
        }
      } else {
        // Still offended: looks away
        color_tau_ = 0.6f;
        slant = -0.45f;
        lid_top = 0.45f;
        gx = 0.9f * claw_flip_;
        gy = 0.15f;
        gaze_k = 60;
        ear_l = ear_r = -0.45f;
        smile = -0.35f;
        mw = 0.8f;
        tilt = -0.05f * claw_flip_;
      }
      break;
    }
    case MOOD_CONFUSED: {
      fg_t_ = (resting_mood() == MOOD_IDLE) ? GREY_LIGHT : GREY_MED;
      bg_t_ = WHITE;
      tilt = -0.15f;
      question = 1;
      eye_l = 1.05f;
      eye_r = 0.7f;
      smile = -0.2f;
      mw = 0.7f;
      ear_l = 0.3f;
      ear_r = -0.4f;
      gx = -0.3f;
      gy = -0.3f;
      break;
    }
    default:
      break;
  }

  // ---- random glances ----
  if (glances) {
    if (glance_end_ >= 0) {
      if (time_ > glance_end_)
        glance_end_ = -1;
      else {
        gx += gaze_glance_x_;
        gy += gaze_glance_y_;
      }
    } else {
      next_glance_ -= dt;
      if (next_glance_ <= 0) {
        gaze_glance_x_ = (rnd() < 0.5f ? -1.0f : 1.0f) * glance_amt * rnd(0.7f, 1.0f);
        gaze_glance_y_ = rnd(-0.25f, 0.2f) * glance_amt;
        glance_end_ = time_ + rnd(1.0f, 2.8f);
        next_glance_ = (mood_ == MOOD_IDLE ? rnd(5, 14) : rnd(2, 6));
        // Sometimes the ear on that side follows the glance
        if (rnd() < 0.4f)
          (gaze_glance_x_ > 0 ? twist_r_ : twist_l_).v += 5.0f;
      }
    }
  }

  // ---- ear twitches ----
  if (twitches) {
    next_twitch_ -= dt;
    if (next_twitch_ <= 0) {
      Spring &e = rnd() < 0.5f ? twist_l_ : twist_r_;
      e.v += rnd(5.0f, 8.0f) * (rnd() < 0.3f ? -1.0f : 1.0f);
      next_twitch_ = rnd(twitch_min, twitch_max);
    }
  }

  // ---- breathing ----
  breathe_ = breathe_amp * sinf(time_ * 2 * PI / breathe_period);

  head_x_.set(hx, head_k, head_z);
  head_y_.set(hy, head_k, head_z);
  tilt_.set(tilt, 60, 0.8f);
  squash_.set(squash + breathe_, 200, 0.5f);
  ear_l_.set(ear_l, ear_k, ear_z);
  ear_r_.set(ear_r, ear_k, ear_z);
  twist_l_.set(0, 320, 0.16f);
  twist_r_.set(0, 320, 0.16f);
  eye_l_.set(eye_l, eye_k, eye_z);
  eye_r_.set(eye_r, eye_k, eye_z);
  eye_scale_.set(eye_scale, 120, 0.8f);
  size_l_.set(size_l, 220, 0.45f);
  size_r_.set(size_r, 220, 0.45f);
  lid_top_.set(lid_top, lid_k, 1.0f);
  lid_bot_.set(lid_bot, lid_k, 1.0f);
  lid_slant_.set(slant, lid_k, 1.0f);
  curve_.set(curve, 120, 1.0f);
  gaze_x_.set(gx, gaze_k, 1.0f);
  gaze_y_.set(gy, gaze_k, 1.0f);
  mouth_open_.set(mopen, mood_ == MOOD_SPEAK ? 700.0f : 90.0f, mood_ == MOOD_SPEAK ? 0.75f : 0.9f);
  mouth_smile_.set(smile, 100, 1.0f);
  mouth_w_.set(mw, 100, 1.0f);
  zip_.set(zip, 120, 1.0f);
  whisker_.set(whisker, 80, 1.0f);
  blush_.set(blush, 60, 1.0f);
  cross_.set(cross, 300, 0.45f);
  shine_.set(shine, 100, 1.0f);
  exclaim_.set(exclaim, 320, 0.4f);
  question_.set(question, 120, 0.6f);
  zzz_.set(zzz, 15, 1.0f);
  dots_.set(dots, 100, 0.7f);
  ring_.set(ring, 200, 1.0f);
  hearts_.set(hearts, 40, 1.0f);
  claws_.set(claws, 25, 1.0f);
  gear_.set(gear, 60, 0.8f);
  spinner_.set(spinner, 120, 0.9f);
}

// ------------------------------------------------------------------------------------------------
// Geometry
// ------------------------------------------------------------------------------------------------

void FaceEngine::xf(float lx, float ly, float &sx, float &sy) const {
  // squash/stretch about the chin
  float s = 1.0f + squash_.x;
  float x = lx * (1.0f + (1.0f - s) * 0.6f);
  float y = 79.0f + (ly - 79.0f) * s;
  // tilt about the middle of the face
  float c = tilt_cos_, sn = tilt_sin_;
  float dy = y - 20.0f;
  float rx = x * c - dy * sn;
  float ry = x * sn + dy * c + 20.0f;
  sx = cx_ + head_x_.x + rx;
  sy = cy_ + head_y_.x + ry;
}

void FaceEngine::finish_bbox_(Prim &p) {
  float x0, y0, x1, y1;
  if (p.kind == 0) {
    x0 = std::min(p.ax, p.bx) - p.r - 1;
    x1 = std::max(p.ax, p.bx) + p.r + 1;
    y0 = std::min(p.ay, p.by) - p.r - 1;
    y1 = std::max(p.ay, p.by) + p.r + 1;
  } else {
    x0 = p.cx - p.rx - 1;
    x1 = p.cx + p.rx + 1;
    y0 = p.cy - p.ry - 1;
    y1 = p.cy + p.ry + 1;
    if (p.clip) {
      x0 = std::max(x0, p.ccx - p.crx - 1);
      x1 = std::min(x1, p.ccx + p.crx + 1);
      y0 = std::max(y0, p.ccy - p.cry - 1);
      y1 = std::min(y1, p.ccy + p.cry + 1);
    }
  }
  p.x0 = std::max(0, (int) floorf(x0));
  p.y0 = std::max(0, (int) floorf(y0));
  p.x1 = std::min(W - 1, (int) ceilf(x1));
  p.y1 = std::min(H - 1, (int) ceilf(y1));
}

void FaceEngine::capsule_l(float ax, float ay, float bx, float by, float r, uint8_t layer, float alpha) {
  if (alpha <= 0.01f || r <= 0.05f)
    return;
  Prim p{};
  p.kind = 0;
  p.layer = layer;
  p.alpha = clampf(alpha, 0, 1);
  xf(ax, ay, p.ax, p.ay);
  xf(bx, by, p.bx, p.by);
  p.r = r;
  finish_bbox_(p);
  if (p.x0 <= p.x1 && p.y0 <= p.y1)
    prims_.push_back(p);
}

void FaceEngine::capsule_s(float ax, float ay, float bx, float by, float r, float alpha) {
  if (alpha <= 0.01f || r <= 0.05f)
    return;
  Prim p{};
  p.kind = 0;
  p.layer = LAYER_MAIN;
  p.alpha = clampf(alpha, 0, 1);
  p.ax = ax;
  p.ay = ay;
  p.bx = bx;
  p.by = by;
  p.r = r;
  finish_bbox_(p);
  if (p.x0 <= p.x1 && p.y0 <= p.y1)
    prims_.push_back(p);
}

void FaceEngine::cubic_l(float x0, float y0, float x1, float y1, float x2, float y2, float x3, float y3, float r,
                         int segs, uint8_t layer, float alpha) {
  float px = x0, py = y0;
  for (int i = 1; i <= segs; i++) {
    float t = (float) i / segs, u = 1 - t;
    float x = u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3;
    float y = u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3;
    capsule_l(px, py, x, y, r, layer, alpha);
    px = x;
    py = y;
  }
}

void FaceEngine::quad_l(float x0, float y0, float cx, float cy, float x1, float y1, float r, int segs, uint8_t layer,
                        float alpha) {
  float px = x0, py = y0;
  for (int i = 1; i <= segs; i++) {
    float t = (float) i / segs, u = 1 - t;
    float x = u * u * x0 + 2 * u * t * cx + t * t * x1;
    float y = u * u * y0 + 2 * u * t * cy + t * t * y1;
    capsule_l(px, py, x, y, r, layer, alpha);
    px = x;
    py = y;
  }
}

Prim &FaceEngine::ellipse_l(float cx, float cy, float rx, float ry, uint8_t layer, float alpha) {
  Prim p{};
  p.kind = 1;
  p.layer = layer;
  p.alpha = clampf(alpha, 0, 1);
  xf(cx, cy, p.cx, p.cy);
  float s = 1.0f + squash_.x;
  p.rx = std::max(0.3f, rx * (1.0f + (1.0f - s) * 0.6f));
  p.ry = std::max(0.3f, ry * s);
  finish_bbox_(p);
  prims_.push_back(p);
  return prims_.back();
}

void FaceEngine::add_plane_l(Prim &p, float px, float py, float nx, float ny) {
  if (p.nplanes >= 2)
    return;
  float sx, sy;
  xf(px, py, sx, sy);
  float c = tilt_cos_, sn = tilt_sin_;
  float rnx = nx * c - ny * sn, rny = nx * sn + ny * c;
  p.pnx[p.nplanes] = rnx;
  p.pny[p.nplanes] = rny;
  p.pd[p.nplanes] = rnx * sx + rny * sy;
  p.nplanes++;
}

void FaceEngine::heart_l(float x, float y, float s, float alpha) {
  // Two fat capsules in a V make a nice heart
  float r = s * 0.42f;
  capsule_l(x, y + s * 0.55f, x - s * 0.42f, y - s * 0.05f, r, LAYER_BLUSH, alpha);
  capsule_l(x, y + s * 0.55f, x + s * 0.42f, y - s * 0.05f, r, LAYER_BLUSH, alpha);
}

void FaceEngine::zee_l(float x, float y, float s, float alpha) {
  float r = 2.6f;
  capsule_l(x - s, y - s, x + s, y - s, r, LAYER_MAIN, alpha);
  capsule_l(x + s, y - s, x - s, y + s, r, LAYER_MAIN, alpha);
  capsule_l(x - s, y + s, x + s, y + s, r, LAYER_MAIN, alpha);
}

void FaceEngine::draw_head_() {
  // Round head (a slightly wide circle). The outline follows the circle everywhere, the ears are separate
  // strokes sitting on it, and the circle line runs on a little under each ear like a quick hand drawing.
  const float R = 8.0f;                     // main stroke radius (16px wide line)
  const float HRX = 92, HRY = 79;          // head radii
  const float DEG = PI / 180.0f;
  auto on_head = [&](float t, float &x, float &y) {  // t: angle from the top, clockwise
    x = HRX * sinf(t);
    y = -HRY * cosf(t);
  };
  auto arc = [&](float t0, float t1, int segs) {
    float px, py;
    on_head(t0, px, py);
    for (int i = 1; i <= segs; i++) {
      float x, y;
      on_head(t0 + (t1 - t0) * i / segs, x, y);
      capsule_l(px, py, x, y, R);
      px = x;
      py = y;
    }
  };
  arc(-26 * DEG, 26 * DEG, 8);             // top, continuing under the inner ear bases
  arc(56 * DEG, 304 * DEG, 34);            // sides and chin, continuing up under the outer ear bases

  for (int side = -1; side <= 1; side += 2) {
    float sgn = (float) side;
    float e = side < 0 ? ear_l_.x : ear_r_.x;
    float tw = side < 0 ? twist_l_.x : twist_r_.x;
    float ibx, iby, obx, oby;
    on_head(18 * DEG, ibx, iby);
    on_head(64 * DEG, obx, oby);
    // Ear tip (right-side coordinates, mirrored below)
    const float TX0 = 84, TY0 = -112;
    float tx = TX0, ty = TY0;
    if (e >= 0) {
      tx += -2 * e;
      ty += -5 * e;
    } else {
      tx += 10 * -e;
      ty += 14 * -e;
    }
    // twitch: rotate the tip around the middle of the ear base
    float pvx = (ibx + obx) * 0.5f, pvy = (iby + oby) * 0.5f;
    float ang = clampf(tw, -1.5f, 1.5f) * 0.12f;
    float dx = tx - pvx, dy = ty - pvy;
    float ca = cosf(ang), sa = sinf(ang);
    tx = pvx + dx * ca - dy * sa;
    ty = pvy + dx * sa + dy * ca;

    auto X = [sgn](float x) { return x * sgn; };
    // pointy ear: two slightly convex edges meeting at the tip
    cubic_l(X(ibx), iby, X(ibx + (tx - ibx) * 0.35f - 3), iby + (ty - iby) * 0.35f - 3,
            X(ibx + (tx - ibx) * 0.72f - 2), iby + (ty - iby) * 0.72f - 2, X(tx), ty, R, 6);
    cubic_l(X(tx), ty, X(tx + (obx - tx) * 0.28f + 4), ty + (oby - ty) * 0.28f,
            X(tx + (obx - tx) * 0.65f + 4), ty + (oby - ty) * 0.65f, X(obx), oby, R, 6);

    // Whiskers: two short strokes crossing the cheek outline, wiggling with the whisker parameter
    float wig = whisker_.x;
    float a1 = wig * 0.16f * sinf(time_ * 17.0f) - 0.03f;
    float a2 = wig * 0.16f * sinf(time_ * 17.0f + 1.7f) + 0.03f;
    auto whisk = [&](float x0, float y0, float x1, float y1, float a) {
      float vx = x1 - x0, vy = y1 - y0;
      float c = cosf(a), s = sinf(a);
      float rx = vx * c - vy * s, ry = vx * s + vy * c;
      capsule_l(X(x0), y0, X(x0 + rx), y0 + ry, 6.0f);
    };
    whisk(74, 10, 116, 3, -a1);
    whisk(71, 30, 111, 39, a2);
  }
}

void FaceEngine::draw_eye_(int side, float open) {
  float sgn = (float) side;
  float es = eye_scale_.x;
  float ecx = 37 * sgn + gx_, ecy = 4 + gy_;
  es *= side < 0 ? size_l_.x : size_r_.x;
  float rx = 13.0f * es, ry = 16.5f * es;

  // Loading: the eye becomes a spinner, a ring of dots with a fading tail (like a web page loading)
  const float sp = clampf(spinner_.x, 0, 1);
  if (sp > 0.03f) {
    const int N = 8;
    const float R = 15.0f, lead = time_ * N * 1.1f;  // ~1.1 turns per second
    for (int i = 0; i < N; i++) {
      float age = fmodf(lead - i + 64.0f * N, (float) N) / N;  // 0 = the leading dot
      float a = i * 2 * PI / N - PI / 2;
      float r = (5.2f - 2.6f * age) * sp;
      ellipse_l(ecx + R * cosf(a) * sp, ecy + R * sinf(a) * sp, r, r, LAYER_MAIN, (1.0f - 0.7f * age) * sp);
    }
    open *= 1.0f - sp;
    if (open < 0.05f)
      return;
  }

  // Error: X eyes
  float cr = cross_.x;
  if (cr > 0.02f) {
    float s = 11.0f * clampf(cr, 0, 1.3f);
    capsule_l(ecx - s, ecy - s, ecx + s, ecy + s, 5.6f);
    capsule_l(ecx - s, ecy + s, ecx + s, ecy - s, 5.6f);
    open *= clampf(1.0f - cr * 2.0f, 0, 1);
    if (open < 0.05f)
      return;
  }

  const float CLOSE_AT = 0.28f;
  if (open < CLOSE_AT) {
    // Closed eye: a curved line. curve > 0: peaceful U (sleep), < 0: happy ^.
    float k = 1.0f - open / CLOSE_AT;
    float c = curve_.x * k * 13.0f;
    float w = rx * 1.08f;
    quad_l(ecx - w, ecy + 2 - c * 0.3f, ecx, ecy + 2 + c, ecx + w, ecy + 2 - c * 0.3f, 5.2f, 8);
    return;
  }
  float ery, erx = rx;
  if (open <= 1.0f) {
    ery = 4.6f + (ry - 4.6f) * ((open - CLOSE_AT) / (1.0f - CLOSE_AT));
  } else {
    ery = ry * open;
    erx = rx * (1.0f + (open - 1.0f) * 0.7f);
  }
  Prim &p = ellipse_l(ecx, ecy, erx, ery);
  // Lids
  float lt = clampf(lid_top_.x, 0, 0.95f);
  float lb = clampf(lid_bot_.x, 0, 0.9f);
  float a = lid_slant_.x * 0.45f;
  float nx = sinf(a) * sgn, ny = -cosf(a);
  float lid_y = ecy - ery + 2 * ery * lt;
  bool has_top = lt > 0.01f || fabsf(a) > 0.02f;
  if (has_top)
    add_plane_l(p, ecx, lid_y, nx, ny);
  if (lb > 0.01f)
    add_plane_l(p, ecx, ecy + ery - 2 * ery * lb, 0, 1);
  // Copy for later use (p may be invalidated by further push_backs)
  Prim eye = p;
  finish_bbox_(prims_.back());

  // Eyelid line
  if (lt > 0.45f) {
    float tx = -ny, ty = nx;  // along the lid
    float len = erx + 3.0f;
    float lr = 3.2f * clampf((lt - 0.45f) * 8.0f, 0, 1);
    capsule_l(ecx - tx * len, lid_y - ty * len, ecx + tx * len, lid_y + ty * len, lr);
  }

  // Shine / catch-light
  float sh = shine_.x * clampf((open - 0.5f) * 3.0f, 0, 1);
  if (sh > 0.05f) {
    float sx, sy;
    xf(ecx - erx * 0.3f - gx_ * 0.15f, ecy - ery * 0.36f, sx, sy);
    Prim s = eye;
    s.layer = LAYER_SHINE;
    s.cx = sx;
    s.cy = sy;
    s.rx = s.ry = 3.8f * es * sh;
    s.clip = 1;
    s.ccx = eye.cx;
    s.ccy = eye.cy;
    s.crx = eye.rx;
    s.cry = eye.ry;
    finish_bbox_(s);
    prims_.push_back(s);
    // tiny secondary sparkle
    xf(ecx + erx * 0.3f, ecy + ery * 0.35f, sx, sy);
    s.cx = sx;
    s.cy = sy;
    s.rx = s.ry = 1.7f * es * sh;
    finish_bbox_(s);
    prims_.push_back(s);
  }
}

void FaceEngine::draw_mouth_() {
  float mx = gx_ * 0.4f, my = gy_ * 0.3f + 12.0f;
  float o = mouth_open_.x;
  float mw = mouth_w_.x;
  if (zip_.x > 0.5f) {
    float hw = 15 * mw;
    capsule_l(mx - hw, 27 + my, mx + hw, 27 + my, 3.4f);
    for (int i = -1; i <= 2; i++) {
      float x = mx + (i - 0.5f) * 7.0f;
      capsule_l(x, 22 + my, x, 32 + my, 2.0f);
    }
    return;
  }
  if (o > 0.08f) {
    float rx = (9 + 7 * o) * mw, ry = 3.5f + 13 * o;
    float ccy = 26 + 5 * o + my;
    Prim &m = ellipse_l(mx, ccy, rx, ry);
    finish_bbox_(m);
    Prim mouth = m;
    if (o > 0.35f) {
      Prim &tg = ellipse_l(mx, ccy + ry * 0.55f, rx * 0.6f, ry * 0.5f, LAYER_TONGUE, clampf((o - 0.35f) * 4, 0, 1));
      tg.clip = 1;
      // shrink the clip a little so the tongue stays inside the outline
      tg.ccx = mouth.cx;
      tg.ccy = mouth.cy;
      tg.crx = mouth.rx - 2.0f;
      tg.cry = mouth.ry - 2.0f;
      finish_bbox_(tg);
    }
    return;
  }
  float s = mouth_smile_.x;
  float hw = 13 * mw;
  if (s >= 0) {
    float d = 3 + 8 * s;
    float y = 21 + my;
    cubic_l(mx - hw, y, mx - hw * 0.85f, y + d, mx - hw * 0.12f, y + d, mx, y + 1.5f, 4.6f, 7);
    cubic_l(mx + hw, y, mx + hw * 0.85f, y + d, mx + hw * 0.12f, y + d, mx, y + 1.5f, 4.6f, 7);
  } else {
    float y = 28 + my;
    quad_l(mx - hw, y, mx, y + 16 * s, mx + hw, y, 4.6f, 8);
  }
}

void FaceEngine::draw_extras_() {
  // "!" on wake
  float e = exclaim_.x;
  if (e > 0.03f) {
    float s = clampf(e, 0, 1.4f);
    capsule_l(0, -118 - 5 * s, 0, -118 + 4 * s, 4.4f * std::min(s, 1.0f));
    capsule_l(0, -106, 0, -106, 4.4f * std::min(s, 1.0f));
  }
  // "?" when lost / confused
  float q = question_.x;
  if (q > 0.03f) {
    float bob = 3.0f * sinf(time_ * 3.0f);
    float cx = 118, cy = -84 + bob;
    auto P = [&](float x, float y, float &ox, float &oy) {
      ox = (x - cx) * q * 0.62f;
      oy = -112 + bob + (y - cy) * q * 0.62f;
    };
    float a, b, c, d, f, g;
    P(106, -90 + bob, a, b);
    P(108, -108 + bob, c, d);
    P(120, -107 + bob, f, g);
    quad_l(a, b, c, d, f, g, 3.6f, 6);
    float h, i, j, k;
    P(133, -102 + bob, h, i);
    P(125, -88 + bob, j, k);
    quad_l(f, g, h, i, j, k, 3.6f, 6);
    float l, m, n2, o2;
    P(117, -83 + bob, l, m);
    P(118, -74 + bob, n2, o2);
    quad_l(j, k, l, m, n2, o2, 3.6f, 5);
    float px, py;
    P(118, -63 + bob, px, py);
    capsule_l(px, py, px, py, 4.4f * q);
  }
  // zzz when sleeping
  float z = zzz_.x;
  if (z > 0.03f) {
    for (int i = 0; i < 3; i++) {
      float p = fmodf(time_ * 0.22f + i / 3.0f, 1.0f);
      float a = z * sinf(p * PI);
      zee_l(116 + 26 * p + 5 * sinf(p * 6), -64 - 46 * p, 4.5f + 6.0f * p, a);
    }
  }
  // thought bubbles
  float dt = dots_.x;
  if (dt > 0.03f) {
    const float px[3] = {114, 128, 144}, py[3] = {-84, -100, -112}, pr[3] = {3.8f, 5.5f, 7.5f};
    for (int i = 0; i < 3; i++) {
      float appear = clampf((mood_t_ - i * 0.22f) * 4.0f, 0, 1);
      if (mood_ != MOOD_THINK)
        appear = 1;
      float pulse = 0.8f + 0.2f * sinf(time_ * 5.0f - i * 1.1f);
      float r = pr[i] * dt * appear * pulse;
      if (r > 0.3f)
        ellipse_l(px[i], py[i], r, r);
    }
  }
  // spinning cog (working)
  float gs = gear_.x;
  if (gs > 0.03f) {
    const float cx = 122, cy = -84, R = 11.0f * gs, ang = time_ * 1.8f;
    const int RIM = 14, TEETH = 7;
    for (int i = 0; i < RIM; i++) {
      float a0 = ang + i * 2 * PI / RIM, a1 = ang + (i + 1) * 2 * PI / RIM;
      capsule_l(cx + R * cosf(a0), cy + R * sinf(a0), cx + R * cosf(a1), cy + R * sinf(a1), 2.6f * gs);
    }
    for (int i = 0; i < TEETH; i++) {
      float a = ang + i * 2 * PI / TEETH;
      capsule_l(cx + (R + 1.5f) * cosf(a), cy + (R + 1.5f) * sinf(a), cx + (R + 6.0f * gs) * cosf(a),
                cy + (R + 5.5f * gs) * sinf(a), 3.2f * gs);
    }
    ellipse_l(cx, cy, 3.4f * gs, 3.4f * gs);
  }
  // ringing lines (alarm)
  float rg = ring_.x;
  if (rg > 0.03f) {
    for (int side = -1; side <= 1; side += 2) {
      for (int k = 0; k < 2; k++) {
        float R = 14.0f + 10.0f * k;
        float a = rg * (0.5f + 0.5f * sinf(time_ * 22.0f + k * 1.6f));
        float cx = 116 * side, cy = -86;
        float a0 = side > 0 ? -1.2f : PI + 1.2f;
        float a1 = side > 0 ? 0.1f : PI - 0.1f;
        float am = (a0 + a1) * 0.5f;
        quad_l(cx + R * cosf(a0), cy + R * sinf(a0), cx + R * 1.15f * cosf(am), cy + R * 1.15f * sinf(am),
               cx + R * cosf(a1), cy + R * sinf(a1), 3.0f, 6, LAYER_MAIN, a);
      }
    }
  }
  draw_claws_();
  // floating hearts (petting)
  float hh = hearts_.x;
  if (hh > 0.03f) {
    for (int i = 0; i < 3; i++) {
      float p = fmodf(mood_t_ * 0.55f + i / 3.0f, 1.0f);
      float side = (i % 2) ? 1.0f : -1.0f;
      float a = hh * sinf(p * PI);
      heart_l(side * (122 + 10 * p), -62 - 48 * p, 10.0f + 5 * p, a);
    }
  }
}

// Three claw scratches swiped across the screen glass (screen coordinates, they don't move with the head)
void FaceEngine::draw_claws_() {
  float alpha = claws_.x;
  if (alpha <= 0.02f || (mood_ != MOOD_SNAP && mood_t_ > 3.0f))
    return;
  const float t = mood_ == MOOD_SNAP ? mood_t_ : 10.0f;
  // direction of the swipe: from the top, down and sideways
  float dx = -0.62f * claw_flip_, dy = 1.0f;
  float dl = sqrtf(dx * dx + dy * dy);
  dx /= dl;
  dy /= dl;
  float px = -dy, py = dx;  // perpendicular: spacing between the claws
  const float len = 190.0f;
  const int SEGS = 14;
  for (int c = 0; c < 3; c++) {
    float prog = clampf((t - 0.08f - 0.035f * c) / 0.13f, 0, 1);
    if (prog <= 0)
      continue;
    float off = (c - 1) * 30.0f;
    float l = len * (c == 1 ? 1.0f : 0.86f);
    float sx = W * 0.5f + claw_x_ - dx * l * 0.5f + px * off;
    float sy = H * 0.5f - dy * l * 0.5f + py * off;
    float rmax = c == 1 ? 7.5f : 6.0f;
    float lx = sx, ly = sy;
    int n = std::max(1, (int) ceilf(SEGS * prog));
    for (int i = 1; i <= n; i++) {
      float u = std::min(prog, (float) i / SEGS);
      float bow = 10.0f * sinf(u * PI) * claw_flip_;
      float x = sx + dx * l * u + px * bow;
      float y = sy + dy * l * u + py * bow;
      float um = u - 0.5f / SEGS;
      float r = 1.0f + rmax * powf(std::max(0.0f, sinf(um * PI)), 0.6f);
      capsule_s(lx, ly, x, y, r, alpha);
      lx = x;
      ly = y;
    }
  }
}

void FaceEngine::build_scene() {
  prims_.clear();
  tilt_cos_ = cosf(tilt_.x);
  tilt_sin_ = sinf(tilt_.x);
  gx_ = gaze_x_.x * 7.0f;
  gy_ = gaze_y_.x * 5.0f;

  // Blush under everything
  float b = blush_.x;
  if (b > 0.02f) {
    for (int side = -1; side <= 1; side += 2) {
      Prim &p = ellipse_l(57.0f * side, 31, 11, 6.5f, LAYER_BLUSH, 0.6f * b);
      finish_bbox_(p);
    }
  }
  draw_head_();
  float bf = blink_factor_();
  draw_eye_(-1, std::max(0.0f, eye_l_.x) * bf);
  draw_eye_(1, std::max(0.0f, eye_r_.x) * bf);
  draw_mouth_();
  draw_extras_();

  // Timer progress bar (screen coordinates, not attached to the head)
  if (timer_show_) {
    auto bar = [&](float x0, float x1, float a) {
      Prim p{};
      p.kind = 0;
      p.layer = LAYER_MAIN;
      p.alpha = a;
      p.ax = x0;
      p.bx = x1;
      p.ay = p.by = 232;
      p.r = 3.5f;
      finish_bbox_(p);
      prims_.push_back(p);
    };
    bar(40, 280, 0.18f);
    float f = clampf(timer_frac_, 0, 1);
    if (f > 0.005f)
      bar(40, 40 + 240 * f, timer_running_ ? 0.9f : 0.5f);
  }

  layer_col_[LAYER_BLUSH] = (mood_ == MOOD_HAPPY) ? mix(BLUSH, fg_, 0.25f) : BLUSH;
  layer_col_[LAYER_MAIN] = fg_;
  layer_col_[LAYER_TONGUE] = TONGUE;
  layer_col_[LAYER_SHINE] = mix(bg_, WHITE, 0.8f);
}

// ------------------------------------------------------------------------------------------------
// Rasteriser
// ------------------------------------------------------------------------------------------------

static inline uint16_t to565be(int r, int g, int b) {
  uint16_t v = (uint16_t) (((r & 0xF8) << 8) | ((g & 0xFC) << 3) | (b >> 3));
  return (uint16_t) ((v >> 8) | (v << 8));
}

uint32_t FaceEngine::bg565() const {
  return to565be((int) (bg_.r * 255 + 0.5f), (int) (bg_.g * 255 + 0.5f), (int) (bg_.b * 255 + 0.5f));
}

void FaceEngine::render_rect(int rx0, int ry0, int w, int h, uint16_t *out, uint8_t *cov) const {
  // cov must hold LAYER_COUNT * w * h bytes: one coverage plane per layer
  const int rx1 = rx0 + w - 1, ry1 = ry0 + h - 1;
  const int n = w * h;
  static const uint8_t BAYER[16] = {0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5};
  const int br = (int) (bg_.r * 255 + 0.5f), bgc = (int) (bg_.g * 255 + 0.5f), bb = (int) (bg_.b * 255 + 0.5f);
  // Dithered background pattern
  uint16_t bgpat[16];
  for (int i = 0; i < 16; i++) {
    int d = BAYER[i];
    bgpat[i] = to565be(std::min(255, br + (d >> 1)), std::min(255, bgc + (d >> 2)), std::min(255, bb + (d >> 1)));
  }

  // 1) coverage per layer
  const uint8_t *planes[LAYER_COUNT] = {nullptr, nullptr, nullptr, nullptr};
  for (int layer = 0; layer < LAYER_COUNT; layer++) {
    uint8_t *lcov = cov + layer * n;
    for (const Prim &p : prims_) {
      if (p.layer != layer || p.x1 < rx0 || p.x0 > rx1 || p.y1 < ry0 || p.y0 > ry1)
        continue;
      if (planes[layer] == nullptr) {
        memset(lcov, 0, n);
        planes[layer] = lcov;
      }
      int xa = std::max(p.x0, rx0), xb = std::min(p.x1, rx1);
      int ya = std::max(p.y0, ry0), yb = std::min(p.y1, ry1);
      const float amax = p.alpha * 255.0f;
      if (p.kind == 0) {
        const float bax = p.bx - p.ax, bay = p.by - p.ay;
        const float bb2 = bax * bax + bay * bay;
        const float inv = bb2 > 1e-6f ? 1.0f / bb2 : 0.0f;
        const float ro = (p.r + 0.5f) * (p.r + 0.5f);
        const float ri = p.r > 0.5f ? (p.r - 0.5f) * (p.r - 0.5f) : -1.0f;
        for (int y = ya; y <= yb; y++) {
          const float pyy = y + 0.5f - p.ay;
          uint8_t *row = lcov + (y - ry0) * w - rx0;
          for (int x = xa; x <= xb; x++) {
            const float pxx = x + 0.5f - p.ax;
            float hh = (pxx * bax + pyy * bay) * inv;
            hh = hh < 0 ? 0 : (hh > 1 ? 1 : hh);
            const float dx = pxx - bax * hh, dy = pyy - bay * hh;
            const float d2 = dx * dx + dy * dy;
            if (d2 >= ro)
              continue;
            const float cv = d2 <= ri ? 1.0f : (p.r + 0.5f - sqrtf(d2));
            const uint8_t v = (uint8_t) (cv * amax);
            if (v > row[x])
              row[x] = v;
          }
        }
      } else {
        const float irx = 1.0f / p.rx, iry = 1.0f / p.ry;
        const float irx2 = irx * irx, iry2 = iry * iry;
        const float icrx = p.clip ? 1.0f / p.crx : 0, icry = p.clip ? 1.0f / p.cry : 0;
        for (int y = ya; y <= yb; y++) {
          const float py = y + 0.5f;
          const float ey = py - p.cy;
          uint8_t *row = lcov + (y - ry0) * w - rx0;
          for (int x = xa; x <= xb; x++) {
            const float px = x + 0.5f;
            float d = sd_ellipse_fast(px - p.cx, ey, irx, iry, irx2, iry2);
            if (d >= 0.5f)
              continue;
            for (int k = 0; k < p.nplanes; k++)
              d = std::max(d, p.pnx[k] * px + p.pny[k] * py - p.pd[k]);
            if (p.clip)
              d = std::max(d, sd_ellipse_fast(px - p.ccx, ey + p.cy - p.ccy, icrx, icry, icrx * icrx, icry * icry));
            if (d >= 0.5f)
              continue;
            const float cv = d <= -0.5f ? 1.0f : 0.5f - d;
            const uint8_t v = (uint8_t) (cv * amax);
            if (v > row[x])
              row[x] = v;
          }
        }
      }
    }
  }

  // 2) composite all layers per pixel, straight to dithered RGB565
  int lr[LAYER_COUNT], lg[LAYER_COUNT], lb[LAYER_COUNT];
  for (int l = 0; l < LAYER_COUNT; l++) {
    lr[l] = (int) (layer_col_[l].r * 255 + 0.5f);
    lg[l] = (int) (layer_col_[l].g * 255 + 0.5f);
    lb[l] = (int) (layer_col_[l].b * 255 + 0.5f);
  }
  const uint8_t *p0 = planes[0], *p1 = planes[1], *p2 = planes[2], *p3 = planes[3];
  for (int y = 0; y < h; y++) {
    const int by = ((ry0 + y) & 3) * 4;
    const int row = y * w;
    for (int x = 0; x < w; x++) {
      const int i = row + x;
      const int c0 = p0 ? p0[i] : 0, c1 = p1 ? p1[i] : 0, c2 = p2 ? p2[i] : 0, c3 = p3 ? p3[i] : 0;
      const int bi = by + ((rx0 + x) & 3);
      if ((c0 | c1 | c2 | c3) == 0) {
        out[i] = bgpat[bi];
        continue;
      }
      int r = br, g = bgc, b = bb;
      const int cs[4] = {c0, c1, c2, c3};
      for (int l = 0; l < LAYER_COUNT; l++) {
        int c = cs[l];
        if (!c)
          continue;
        if (c == 255) {
          r = lr[l], g = lg[l], b = lb[l];
        } else {
          c += c >> 7;  // 0..256
          r += ((lr[l] - r) * c) >> 8;
          g += ((lg[l] - g) * c) >> 8;
          b += ((lb[l] - b) * c) >> 8;
        }
      }
      const int d = BAYER[bi];
      out[i] = to565be(std::min(255, r + (d >> 1)), std::min(255, g + (d >> 2)), std::min(255, b + (d >> 1)));
    }
  }
}

bool FaceEngine::prim_same(const Prim &a, const Prim &b) {
  auto q = [](float v) { return (int32_t) lrintf(v * 16.0f); };
  if (a.kind != b.kind || a.layer != b.layer || a.nplanes != b.nplanes || a.clip != b.clip ||
      q(a.alpha * 16) != q(b.alpha * 16))
    return false;
  if (a.kind == 0)
    return q(a.ax) == q(b.ax) && q(a.ay) == q(b.ay) && q(a.bx) == q(b.bx) && q(a.by) == q(b.by) && q(a.r) == q(b.r);
  if (q(a.cx) != q(b.cx) || q(a.cy) != q(b.cy) || q(a.rx) != q(b.rx) || q(a.ry) != q(b.ry))
    return false;
  for (int k = 0; k < a.nplanes; k++)
    if (q(a.pnx[k] * 64) != q(b.pnx[k] * 64) || q(a.pny[k] * 64) != q(b.pny[k] * 64) || q(a.pd[k]) != q(b.pd[k]))
      return false;
  if (a.clip && (q(a.ccx) != q(b.ccx) || q(a.ccy) != q(b.ccy) || q(a.crx) != q(b.crx) || q(a.cry) != q(b.cry)))
    return false;
  return true;
}

uint32_t FaceEngine::colors_hash() const {
  uint32_t h = 2166136261u;
  for (int l = 0; l < LAYER_COUNT; l++) {
    h = (h ^ to565be((int) (layer_col_[l].r * 255), (int) (layer_col_[l].g * 255), (int) (layer_col_[l].b * 255))) *
        16777619u;
  }
  return (h ^ bg565()) * 16777619u;
}

uint32_t FaceEngine::scene_hash() const {
  uint32_t h = 2166136261u;
  auto mixi = [&h](int32_t v) {
    h ^= (uint32_t) v;
    h *= 16777619u;
  };
  auto q = [](float v) { return (int32_t) lrintf(v * 16.0f); };
  for (const Prim &p : prims_) {
    mixi(p.kind | (p.layer << 8) | (p.nplanes << 16) | (p.clip << 24));
    mixi(q(p.alpha * 16));
    if (p.kind == 0) {
      mixi(q(p.ax));
      mixi(q(p.ay));
      mixi(q(p.bx));
      mixi(q(p.by));
      mixi(q(p.r));
    } else {
      mixi(q(p.cx));
      mixi(q(p.cy));
      mixi(q(p.rx));
      mixi(q(p.ry));
      for (int k = 0; k < p.nplanes; k++) {
        mixi(q(p.pnx[k] * 64));
        mixi(q(p.pny[k] * 64));
        mixi(q(p.pd[k]));
      }
      if (p.clip) {
        mixi(q(p.ccx));
        mixi(q(p.ccy));
      }
    }
  }
  for (int l = 0; l < LAYER_COUNT; l++)
    mixi(to565be((int) (layer_col_[l].r * 255), (int) (layer_col_[l].g * 255), (int) (layer_col_[l].b * 255)));
  mixi((int32_t) bg565());
  return h;
}

void FaceEngine::scene_bbox(int &x0, int &y0, int &x1, int &y1) const {
  x0 = W;
  y0 = H;
  x1 = -1;
  y1 = -1;
  for (const Prim &p : prims_) {
    x0 = std::min(x0, p.x0);
    y0 = std::min(y0, p.y0);
    x1 = std::max(x1, p.x1);
    y1 = std::max(y1, p.y1);
  }
}

}  // namespace kattio
