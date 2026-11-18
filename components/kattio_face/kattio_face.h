#pragma once

#include "esphome/components/display/display.h"
#include "esphome/core/component.h"

#include "face_engine.h"
#include "voice_enhancer.h"

#include <freertos/FreeRTOS.h>
#include <freertos/queue.h>
#include <freertos/semphr.h>
#include <freertos/task.h>

namespace esphome::kattio_face {

using kattio::Mood;

/// Renders the animated Kattio cat face directly to the panel from its own task.
/// All public methods are thread safe and can be called from YAML lambdas.
class KattioFace : public Component {
 public:
  float get_setup_priority() const override { return setup_priority::LATE; }
  void setup() override;
  void loop() override;
  void dump_config() override;

  void set_display(display::Display *d) { this->display_ = d; }
  void set_level_source(VoiceEnhancer *s) { this->level_source_ = s; }
  void set_fps(uint8_t fast, uint8_t slow) {
    this->fast_fps_ = fast;
    this->slow_fps_ = slow;
  }
  void set_sleep_timeout(uint32_t ms);

  void set_mood(Mood mood);
  Mood get_mood();
  void set_connected(bool connected);
  void set_muted(bool muted);
  void set_timer(bool show, float fraction, bool running);
  bool poke();
  void set_snap_one_in(uint16_t n);
  void notice();
  bool is_sleeping();

 protected:
  struct StripJob {
    int16_t x, y, w, h;
    uint16_t *buf;
  };
  static constexpr int NUM_STRIP_BUFS = 2;
  static void task_trampoline_(void *arg);
  static void sender_trampoline_(void *arg);
  void run_();

  display::Display *display_{nullptr};
  VoiceEnhancer *level_source_{nullptr};
  kattio::FaceEngine engine_;
  SemaphoreHandle_t lock_{nullptr};
  TaskHandle_t task_{nullptr};
  QueueHandle_t tx_q_{nullptr};
  QueueHandle_t free_q_{nullptr};
  uint8_t fast_fps_{30};
  uint8_t slow_fps_{12};
  uint32_t frames_{0};
  uint32_t render_us_{0};
  uint32_t raster_us_{0};
  uint32_t last_area_{0};
};

}  // namespace esphome::kattio_face
