#pragma once

#ifdef USE_ESP32

#include "esphome/components/speaker/speaker.h"
#include "esphome/core/component.h"

#include <atomic>
#include <mutex>

namespace esphome::kattio_face {

// Simple float biquad (transposed direct form II)
struct Biquad {
  float b0{1}, b1{0}, b2{0}, a1{0}, a2{0};
  float z1{0}, z2{0};
  inline float process(float x) {
    float y = b0 * x + z1;
    z1 = b1 * x - a1 * y + z2;
    z2 = b2 * x - a2 * y;
    return y;
  }
  void reset() { z1 = z2 = 0; }
  void highpass(float fs, float f0, float q);
  void peaking(float fs, float f0, float q, float db);
  void lowshelf(float fs, float f0, float db);
};

/// A pass-through speaker that sits between the media player and the real (I2S) speaker.
///  * Voice EQ tailored to the tiny ESP32-S3-BOX-3 speaker: steep high-pass (the speaker can't reproduce bass,
///    removing it lets the rest play louder without distortion), a slight "boxiness" dip and a presence lift.
///  * Loudness boost with a smooth peak limiter + soft clipper, so the volume can go up without harsh clipping.
///  * Measures the loudness envelope and reports it in sync with what is actually coming out of the speaker
///    (used to animate the cat's mouth).
class VoiceEnhancer : public Component, public speaker::Speaker {
 public:
  float get_setup_priority() const override { return setup_priority::DATA; }
  void setup() override;
  void loop() override;
  void dump_config() override;

  size_t play(const uint8_t *data, size_t length, TickType_t ticks_to_wait) override;
  size_t play(const uint8_t *data, size_t length) override { return this->play(data, length, 0); }
  void start() override;
  void stop() override;
  void finish() override;
  void set_pause_state(bool pause_state) override { this->output_->set_pause_state(pause_state); }
  bool get_pause_state() const override { return this->output_->get_pause_state(); }
  bool has_buffered_data() const override;

  void set_volume(float volume) override {
    this->volume_ = volume;
    this->output_->set_volume(volume);
  }
  float get_volume() override { return this->output_->get_volume(); }
  void set_mute_state(bool mute_state) override {
    this->mute_state_ = mute_state;
    this->output_->set_mute_state(mute_state);
  }
  bool get_mute_state() override { return this->output_->get_mute_state(); }

  void set_output_speaker(speaker::Speaker *s) { this->output_ = s; }
  void set_enabled(bool en) {
    this->enabled_ = en;
    this->dirty_ = true;
  }
  bool is_enabled() const { return this->enabled_; }
  /// Log when the speaker runs dry mid-stream (and a summary per stream): shows whether audio arrived too late
  void set_timing_log(bool on) { this->timing_log_ = on; }
  void set_boost_db(float db) {
    this->boost_db_ = db;
    this->dirty_ = true;
  }
  void set_highpass_hz(float hz) {
    this->highpass_hz_ = hz;
    this->dirty_ = true;
  }
  void set_presence_db(float db) {
    this->presence_db_ = db;
    this->dirty_ = true;
  }

  /// Loudness (0..1) of the audio currently leaving the speaker. Safe to call from any task.
  float get_level() const;
  /// True while audio is being played
  bool is_playing() const { return this->is_running() || this->has_buffered_data(); }
  /// How long the running output has had no new audio (ms), 0 when stopped
  uint32_t dry_ms() const { return this->is_running() ? millis() - this->last_audio_ms_ : 0; }

 protected:
  void design_filters_();
  void process_(int16_t *samples, size_t frames, int channels);
  void flush_pending_(TickType_t ticks);
  void pad_silence_();

  speaker::Speaker *output_{nullptr};
  std::mutex mtx_;

  static constexpr size_t BUF_BYTES = 2048;
  uint8_t scratch_[BUF_BYTES];
  uint8_t pending_[BUF_BYTES];
  size_t pending_off_{0};
  std::atomic<size_t> pending_len_{0};
  bool finish_requested_{false};
  std::atomic<bool> finishing_{false};  // the stream has ended (finish() was called): let the output stop when it runs dry
  uint32_t start_ms_{0};
  std::atomic<uint32_t> last_audio_ms_{0};

  // timing log: gaps where the stream ran dry and silence was played instead
  bool timing_log_{false};
  std::atomic<uint32_t> dry_since_ms_{0};  // 0: not dry
  uint32_t dry_total_ms_{0};
  uint32_t dry_count_{0};
  uint32_t dry_longest_ms_{0};
  uint64_t audio_bytes_{0};

  // settings
  bool enabled_{true};
  float boost_db_{4.0f};
  float highpass_hz_{170.0f};
  float presence_db_{3.0f};
  std::atomic<bool> dirty_{true};

  // dsp state (up to 2 channels)
  Biquad hp1_[2], hp2_[2], dip_[2], pres_[2];
  float pre_gain_{1.0f};
  float env_{0};
  float gain_{1.0f};
  float att_coef_{0}, rel_coef_{0};
  uint32_t fs_{48000};

  // level meter, aligned with the speaker's playback position
  static constexpr uint32_t RING = 512;
  uint8_t ring_[RING]{};
  std::atomic<uint32_t> written_blocks_{0};
  std::atomic<uint32_t> played_frames_{0};
  uint32_t block_frames_{480};
  uint32_t block_count_{0};
  float block_sumsq_{0};
};

}  // namespace esphome::kattio_face

#endif
