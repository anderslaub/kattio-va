#include "kattio_face.h"

#include <esp_random.h>

#include "esphome/core/hal.h"
#include "esphome/core/log.h"

#include <esp_heap_caps.h>
#include <esp_timer.h>

#include <algorithm>
#include <vector>

namespace esphome::kattio_face {

static const char *const TAG = "kattio_face";

static constexpr int SCREEN_W = kattio::FaceEngine::W;
static constexpr int SCREEN_H = kattio::FaceEngine::H;
static constexpr int STRIP_H = 20;  // rows rendered + sent per SPI transaction

struct Guard {
  explicit Guard(SemaphoreHandle_t s) : s_(s) { xSemaphoreTake(s_, portMAX_DELAY); }
  ~Guard() { xSemaphoreGive(s_); }
  SemaphoreHandle_t s_;
};

void KattioFace::setup() {
  this->engine_.seed(esp_random());  // different surprises after every boot
  this->lock_ = xSemaphoreCreateMutex();
}

void KattioFace::dump_config() {
  ESP_LOGCONFIG(TAG,
                "Kattio face:\n"
                "  Frame rate: %u fps (animating), %u fps (resting)\n"
                "  Lip sync source: %s",
                this->fast_fps_, this->slow_fps_, this->level_source_ ? "voice enhancer" : "none");
}

void KattioFace::loop() {
  // Start rendering once everything (including the display) has been set up.
  if (this->task_ == nullptr) {
    // Render task on core 0 at low priority: Wi-Fi/audio preempt it, the main loop on core 1 is never blocked.
    BaseType_t ok = xTaskCreatePinnedToCore(task_trampoline_, "kattio_face", 6144, this, 1, &this->task_, 1);
    if (ok != pdPASS) {
      ESP_LOGE(TAG, "Could not create render task");
      this->mark_failed();
      return;
    }
  }
  // Periodic stats
  static uint32_t last = 0;
  if (millis() - last > 15000) {
    last = millis();
    ESP_LOGD(TAG, "mood=%u frames=%u last_frame=%uus (raster %uus) area=%upx", (unsigned) this->get_mood(),
             (unsigned) this->frames_, (unsigned) this->render_us_, (unsigned) this->raster_us_,
             (unsigned) this->last_area_);
  }
}

void KattioFace::task_trampoline_(void *arg) { static_cast<KattioFace *>(arg)->run_(); }

void KattioFace::run_() {
  // Ping-pong strip buffers: one is rendered while the sender task streams the other to the panel.
  auto *cov = static_cast<uint8_t *>(
      heap_caps_malloc(kattio::LAYER_COUNT * SCREEN_W * STRIP_H, MALLOC_CAP_INTERNAL | MALLOC_CAP_8BIT));
  this->tx_q_ = xQueueCreate(NUM_STRIP_BUFS, sizeof(StripJob));
  this->free_q_ = xQueueCreate(NUM_STRIP_BUFS, sizeof(uint16_t *));
  bool ok = cov != nullptr && this->tx_q_ != nullptr && this->free_q_ != nullptr;
  for (int i = 0; ok && i < NUM_STRIP_BUFS; i++) {
    auto *buf = static_cast<uint16_t *>(
        heap_caps_malloc(SCREEN_W * STRIP_H * sizeof(uint16_t), MALLOC_CAP_DMA | MALLOC_CAP_INTERNAL));
    ok = buf != nullptr;
    if (ok)
      xQueueSend(this->free_q_, &buf, 0);
  }
  if (ok)
    ok = xTaskCreatePinnedToCore(sender_trampoline_, "kattio_tx", 3072, this, 3, nullptr, 0) == pdPASS;
  if (!ok) {
    ESP_LOGE(TAG, "Out of memory for render buffers");
    vTaskDelete(nullptr);
    return;
  }

  int64_t last_us = esp_timer_get_time();
  uint32_t last_colors = 0;
  bool first = true;
  kattio::PrimVec prev;  // primitives of the frame currently on screen
  prev.reserve(160);
  constexpr int NSTRIPS = (SCREEN_H + STRIP_H - 1) / STRIP_H;
  int dx0[NSTRIPS], dx1[NSTRIPS];
  TickType_t wake = xTaskGetTickCount();

  while (true) {
    int64_t now = esp_timer_get_time();
    float dt = (now - last_us) / 1e6f;
    last_us = now;

    bool fast;
    {
      Guard g(this->lock_);
      if (this->level_source_ != nullptr)
        this->engine_.set_speech_level(this->level_source_->get_level());
      fast = this->engine_.update(dt);
      this->engine_.build_scene();
    }
    // The scene is only modified by this task, so the rest doesn't need the lock.
    const auto &cur = this->engine_.prims();
    uint32_t colors = this->engine_.colors_hash();

    // Work out what changed, as one dirty column range per strip
    for (int s = 0; s < NSTRIPS; s++) {
      dx0[s] = SCREEN_W;
      dx1[s] = -1;
    }
    auto mark = [&](const kattio::Prim &p) {
      int s0 = std::max(0, (p.y0 - 1) / STRIP_H), s1 = std::min(NSTRIPS - 1, (p.y1 + 1) / STRIP_H);
      for (int s = s0; s <= s1; s++) {
        dx0[s] = std::min(dx0[s], std::max(0, p.x0 - 1));
        dx1[s] = std::max(dx1[s], std::min(SCREEN_W - 1, p.x1 + 1));
      }
    };
    bool any = false;
    if (first || colors != last_colors) {
      for (int s = 0; s < NSTRIPS; s++)
        dx0[s] = 0, dx1[s] = SCREEN_W - 1;
      any = true;
    } else {
      size_t n = std::max(prev.size(), cur.size());
      for (size_t i = 0; i < n; i++) {
        bool hp = i < prev.size(), hc = i < cur.size();
        if (hp && hc && kattio::FaceEngine::prim_same(prev[i], cur[i]))
          continue;
        if (hp)
          mark(prev[i]);
        if (hc)
          mark(cur[i]);
        any = true;
      }
    }

    if (any) {
      uint32_t raster_us = 0, area = 0;
      for (int s = 0; s < NSTRIPS; s++) {
        if (dx1[s] < dx0[s])
          continue;
        int y = s * STRIP_H;
        int h = std::min(STRIP_H, SCREEN_H - y);
        int w = dx1[s] - dx0[s] + 1;
        area += w * h;
        uint16_t *buf;
        xQueueReceive(this->free_q_, &buf, portMAX_DELAY);
        int64_t t0 = esp_timer_get_time();
        this->engine_.render_rect(dx0[s], y, w, h, buf, cov);
        raster_us += (uint32_t) (esp_timer_get_time() - t0);
        StripJob job{(int16_t) dx0[s], (int16_t) y, (int16_t) w, (int16_t) h, buf};
        xQueueSend(this->tx_q_, &job, portMAX_DELAY);
      }
      // Wait until every strip has been sent
      uint16_t *bufs[NUM_STRIP_BUFS];
      for (auto &b : bufs)
        xQueueReceive(this->free_q_, &b, portMAX_DELAY);
      for (auto &b : bufs)
        xQueueSend(this->free_q_, &b, 0);

      prev = cur;
      last_colors = colors;
      first = false;
      this->frames_++;
      this->render_us_ = (uint32_t) (esp_timer_get_time() - now);
      this->raster_us_ = raster_us;
      this->last_area_ = area;
    }

    uint32_t period_ms = 1000 / std::max<uint8_t>(1, fast ? this->fast_fps_ : this->slow_fps_);
    TickType_t period = std::max<TickType_t>(1, pdMS_TO_TICKS(period_ms));
    // If we fell behind (e.g. long full-screen redraws), don't try to catch up
    if (xTaskGetTickCount() - wake > period)
      wake = xTaskGetTickCount();
    vTaskDelayUntil(&wake, period);
  }
}

void KattioFace::sender_trampoline_(void *arg) {
  auto *self = static_cast<KattioFace *>(arg);
  StripJob job;
  while (true) {
    xQueueReceive(self->tx_q_, &job, portMAX_DELAY);
    self->display_->draw_pixels_at(job.x, job.y, job.w, job.h, reinterpret_cast<const uint8_t *>(job.buf),
                                   display::COLOR_ORDER_RGB, display::COLOR_BITNESS_565, true, 0, 0, 0);
    xQueueSend(self->free_q_, &job.buf, portMAX_DELAY);
  }
}

void KattioFace::set_sleep_timeout(uint32_t ms) { this->engine_.set_sleep_timeout(ms / 1000.0f); }

void KattioFace::set_mood(Mood mood) {
  if (!this->lock_)
    return;
  Guard g(this->lock_);
  this->engine_.set_mood(mood);
}

Mood KattioFace::get_mood() {
  if (!this->lock_)
    return kattio::MOOD_BOOT;
  Guard g(this->lock_);
  return this->engine_.get_mood();
}

void KattioFace::set_connected(bool connected) {
  if (!this->lock_)
    return;
  Guard g(this->lock_);
  this->engine_.set_connected(connected);
}

void KattioFace::set_muted(bool muted) {
  if (!this->lock_)
    return;
  Guard g(this->lock_);
  this->engine_.set_muted(muted);
}

void KattioFace::set_timer(bool show, float fraction, bool running) {
  if (!this->lock_)
    return;
  Guard g(this->lock_);
  this->engine_.set_timer(show, fraction, running);
}

bool KattioFace::poke() {
  if (!this->lock_)
    return false;
  Guard g(this->lock_);
  return this->engine_.poke();
}

void KattioFace::set_snap_one_in(uint16_t n) {
  if (!this->lock_) {  // before setup: the render task isn't running yet
    this->engine_.set_snap_one_in(n);
    return;
  }
  Guard g(this->lock_);
  this->engine_.set_snap_one_in(n);
}

void KattioFace::notice() {
  if (!this->lock_)
    return;
  Guard g(this->lock_);
  this->engine_.notice();
}

bool KattioFace::is_sleeping() {
  if (!this->lock_)
    return false;
  Guard g(this->lock_);
  return this->engine_.is_sleeping();
}

}  // namespace esphome::kattio_face
