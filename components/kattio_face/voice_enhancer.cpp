#include "voice_enhancer.h"

#ifdef USE_ESP32

#include "esphome/core/hal.h"
#include "esphome/core/log.h"

#include <cmath>
#include <cstring>

namespace esphome::kattio_face {

static const char *const TAG = "voice_enhancer";
static constexpr float PI_F = 3.14159265f;

void Biquad::highpass(float fs, float f0, float q) {
  float w0 = 2 * PI_F * f0 / fs, c = cosf(w0), al = sinf(w0) / (2 * q);
  float a0 = 1 + al;
  b0 = (1 + c) / 2 / a0;
  b1 = -(1 + c) / a0;
  b2 = (1 + c) / 2 / a0;
  a1 = -2 * c / a0;
  a2 = (1 - al) / a0;
}

void Biquad::peaking(float fs, float f0, float q, float db) {
  float A = powf(10.0f, db / 40.0f);
  float w0 = 2 * PI_F * f0 / fs, c = cosf(w0), al = sinf(w0) / (2 * q);
  float a0 = 1 + al / A;
  b0 = (1 + al * A) / a0;
  b1 = -2 * c / a0;
  b2 = (1 - al * A) / a0;
  a1 = -2 * c / a0;
  a2 = (1 - al / A) / a0;
}

void Biquad::lowshelf(float fs, float f0, float db) {
  float A = powf(10.0f, db / 40.0f);
  float w0 = 2 * PI_F * f0 / fs, c = cosf(w0), s = sinf(w0);
  float al = s / 2 * sqrtf(2.0f);  // shelf slope 1
  float sa = 2 * sqrtf(A) * al;
  float a0 = (A + 1) + (A - 1) * c + sa;
  b0 = A * ((A + 1) - (A - 1) * c + sa) / a0;
  b1 = 2 * A * ((A - 1) - (A + 1) * c) / a0;
  b2 = A * ((A + 1) - (A - 1) * c - sa) / a0;
  a1 = -2 * ((A - 1) + (A + 1) * c) / a0;
  a2 = ((A + 1) + (A - 1) * c - sa) / a0;
}

void VoiceEnhancer::setup() {
  this->output_->add_audio_output_callback([this](uint32_t frames, int64_t timestamp) {
    this->played_frames_.fetch_add(frames, std::memory_order_relaxed);
    this->audio_output_callback_.call(frames, timestamp);
  });
}

void VoiceEnhancer::dump_config() {
  ESP_LOGCONFIG(TAG,
                "Voice enhancer:\n"
                "  Enabled: %s\n"
                "  High-pass: %.0f Hz\n"
                "  Presence: %.1f dB\n"
                "  Loudness boost: %.1f dB",
                YESNO(this->enabled_), this->highpass_hz_, this->presence_db_, this->boost_db_);
}

void VoiceEnhancer::design_filters_() {
  float fs = (float) this->fs_;
  for (int ch = 0; ch < 2; ch++) {
    // 4th order (24 dB/oct) Linkwitz-Riley-ish high-pass: two cascaded 2nd order Butterworths
    this->hp1_[ch].highpass(fs, this->highpass_hz_, 0.7071f);
    this->hp2_[ch].highpass(fs, this->highpass_hz_, 0.7071f);
    // small plastic enclosures resonate/boom in the low mids: gentle dip
    this->dip_[ch].peaking(fs, 450.0f, 1.0f, -2.5f);
    // presence lift for intelligibility
    this->pres_[ch].peaking(fs, 3000.0f, 0.9f, this->presence_db_);
  }
  this->pre_gain_ = powf(10.0f, this->boost_db_ / 20.0f);
  this->att_coef_ = 1.0f - expf(-1.0f / (0.0015f * fs));  // 1.5 ms attack
  this->rel_coef_ = 1.0f - expf(-1.0f / (0.120f * fs));   // 120 ms release
  this->dirty_ = false;
}

void VoiceEnhancer::start() {
  std::lock_guard<std::mutex> lock(this->mtx_);
  auto info = this->audio_stream_info_;
  this->fs_ = info.get_sample_rate();
  this->block_frames_ = std::max<uint32_t>(1, this->fs_ / 100);  // 10 ms blocks
  this->design_filters_();
  for (int ch = 0; ch < 2; ch++) {
    this->hp1_[ch].reset();
    this->hp2_[ch].reset();
    this->dip_[ch].reset();
    this->pres_[ch].reset();
  }
  this->env_ = 0;
  this->gain_ = 1.0f;
  this->pending_len_ = 0;
  this->pending_off_ = 0;
  this->finish_requested_ = false;
  this->written_blocks_ = 0;
  this->played_frames_ = 0;
  this->block_count_ = 0;
  this->block_sumsq_ = 0;

  this->output_->set_audio_stream_info(info);
  this->output_->start();
  this->state_ = speaker::STATE_STARTING;
  this->start_ms_ = millis();
}

void VoiceEnhancer::stop() {
  std::lock_guard<std::mutex> lock(this->mtx_);
  this->pending_len_ = 0;
  this->finish_requested_ = false;
  this->output_->stop();
  if (this->state_ != speaker::STATE_STOPPED)
    this->state_ = speaker::STATE_STOPPING;
}

void VoiceEnhancer::finish() {
  std::lock_guard<std::mutex> lock(this->mtx_);
  if (this->pending_len_ > 0) {
    this->finish_requested_ = true;  // loop() flushes, then finishes the output
  } else {
    this->output_->finish();
  }
}

bool VoiceEnhancer::has_buffered_data() const {
  return this->pending_len_.load() > 0 || this->output_->has_buffered_data();
}

void VoiceEnhancer::flush_pending_(TickType_t ticks) {
  size_t len = this->pending_len_;
  if (len == 0)
    return;
  size_t n = this->output_->play(this->pending_ + this->pending_off_, len, ticks);
  this->pending_off_ += n;
  this->pending_len_ = len - n;
}

void VoiceEnhancer::loop() {
  // Never block the main loop: if the audio task is busy writing, try again next loop
  if ((this->pending_len_ > 0 || this->finish_requested_) && this->mtx_.try_lock()) {
    this->flush_pending_(0);
    if (this->finish_requested_ && this->pending_len_ == 0) {
      this->finish_requested_ = false;
      this->output_->finish();
    }
    this->mtx_.unlock();
  }
  // Mirror the output speaker's state
  if (this->output_->is_running()) {
    this->state_ = speaker::STATE_RUNNING;
  } else if (this->output_->is_stopped()) {
    if (this->state_ != speaker::STATE_STARTING || millis() - this->start_ms_ > 2000)
      if (this->pending_len_ == 0)
        this->state_ = speaker::STATE_STOPPED;
  } else if (this->state_ == speaker::STATE_RUNNING) {
    this->state_ = speaker::STATE_STOPPING;
  }
}

size_t VoiceEnhancer::play(const uint8_t *data, size_t length, TickType_t ticks_to_wait) {
  // Like ESPHome's own speakers: writing to a stopped speaker (re)starts it
  if (this->state_ != speaker::STATE_RUNNING && this->state_ != speaker::STATE_STARTING)
    this->start();
  std::lock_guard<std::mutex> lock(this->mtx_);
  if (this->pending_len_ > 0) {
    this->flush_pending_(ticks_to_wait);
    if (this->pending_len_ > 0)
      return 0;
  }
  auto &info = this->audio_stream_info_;
  const int ch = info.get_channels();
  const int bps = info.get_bits_per_sample();
  const size_t frame_bytes = (size_t) ch * (bps / 8);
  size_t take = std::min(length, BUF_BYTES);
  take -= take % frame_bytes;
  if (take == 0)
    return 0;
  memcpy(this->scratch_, data, take);
  if (bps == 16 && ch >= 1 && ch <= 2) {
    if (this->dirty_)
      this->design_filters_();
    this->process_(reinterpret_cast<int16_t *>(this->scratch_), take / frame_bytes, ch);
  }
  size_t n = this->output_->play(this->scratch_, take, ticks_to_wait);
  if (n < take) {
    memcpy(this->pending_, this->scratch_ + n, take - n);
    this->pending_off_ = 0;
    this->pending_len_ = take - n;
  }
  return take;
}

void VoiceEnhancer::process_(int16_t *s, size_t frames, int channels) {
  const bool en = this->enabled_;
  const float thr = 0.89f;  // -1 dBFS
  for (size_t f = 0; f < frames; f++) {
    float peak = 0;
    float v[2];
    for (int c = 0; c < channels; c++) {
      float x = s[f * channels + c] * (1.0f / 32768.0f);
      if (en) {
        x = this->hp1_[c].process(x);
        x = this->hp2_[c].process(x);
        x = this->dip_[c].process(x);
        x = this->pres_[c].process(x);
        x *= this->pre_gain_;
      }
      v[c] = x;
      peak = std::max(peak, fabsf(x));
    }
    if (en) {
      // Peak envelope follower -> limiter gain
      float coef = peak > this->env_ ? this->att_coef_ : this->rel_coef_;
      this->env_ += (peak - this->env_) * coef;
      float target = this->env_ > thr ? thr / this->env_ : 1.0f;
      this->gain_ += (target - this->gain_) * (target < this->gain_ ? this->att_coef_ * 2 : this->rel_coef_);
    }
    float sq = 0;
    for (int c = 0; c < channels; c++) {
      float x = v[c];
      if (en) {
        x *= this->gain_;
        // soft clip whatever the limiter missed (transients)
        float ax = fabsf(x);
        if (ax > 0.9f) {
          float over = ax - 0.9f;
          ax = 0.9f + 0.1f * over / (0.1f + over);
          x = x < 0 ? -ax : ax;
        }
      }
      sq += x * x;
      int32_t o = (int32_t) lrintf(x * 32767.0f);
      s[f * channels + c] = (int16_t) (o > 32767 ? 32767 : (o < -32768 ? -32768 : o));
    }
    // loudness meter in 10 ms blocks
    this->block_sumsq_ += sq / channels;
    if (++this->block_count_ >= this->block_frames_) {
      float rms = sqrtf(this->block_sumsq_ / this->block_count_);
      float db = 20.0f * log10f(rms + 1e-6f);
      // -48 dBFS .. -8 dBFS -> 0..1
      float lvl = (db + 48.0f) / 40.0f;
      lvl = lvl < 0 ? 0 : (lvl > 1 ? 1 : lvl);
      uint32_t wb = this->written_blocks_.load(std::memory_order_relaxed);
      this->ring_[wb % RING] = (uint8_t) (lvl * 255.0f);
      this->written_blocks_.store(wb + 1, std::memory_order_release);
      this->block_count_ = 0;
      this->block_sumsq_ = 0;
    }
  }
}

float VoiceEnhancer::get_level() const {
  if (this->state_ == speaker::STATE_STOPPED)
    return 0;
  uint32_t wb = this->written_blocks_.load(std::memory_order_acquire);
  uint32_t pb = this->played_frames_.load(std::memory_order_relaxed) / this->block_frames_;
  if (pb >= wb || wb - pb >= RING)
    return 0;
  return this->ring_[pb % RING] / 255.0f;
}

}  // namespace esphome::kattio_face

#endif
