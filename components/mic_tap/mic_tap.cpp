#include "mic_tap.h"

#include "esphome/core/log.h"

#include <algorithm>
#include <cstring>

namespace esphome::mic_tap {

static const char *const TAG = "mic_tap";

void MicTap::setup() {
  if (this->history_ms_ > 0) {
    auto info = this->source_->get_audio_stream_info();
    this->frame_ = std::max<size_t>(1, info.frames_to_bytes(1));
    this->capacity_ = info.ms_to_bytes(this->history_ms_) / this->frame_ * this->frame_;
    RAMAllocator<uint8_t> allocator;  // PSRAM when there is some
    this->history_ = allocator.allocate(this->capacity_);
    if (this->history_ == nullptr) {
      ESP_LOGE(TAG, "No memory for %u ms of history", (unsigned) this->history_ms_);
      this->capacity_ = 0;
    }
  }
  this->source_->add_data_callback([this](const std::vector<uint8_t> &data) { this->on_source_data_(data); });
}

void MicTap::dump_config() {
  ESP_LOGCONFIG(TAG, "Microphone tap");
  if (this->capacity_ > 0)
    ESP_LOGCONFIG(TAG, "  History: %u ms (%u bytes), replay speed %.1fx", (unsigned) this->history_ms_,
                  (unsigned) this->capacity_, this->replay_speed_);
}

void MicTap::copy_out_(uint64_t pos, size_t len, std::vector<uint8_t> &out) {
  out.resize(len);
  size_t done = 0;
  while (done < len) {
    size_t at = (size_t) ((pos + done) % this->capacity_);
    size_t n = std::min(len - done, this->capacity_ - at);
    memcpy(out.data() + done, this->history_ + at, n);
    done += n;
  }
  if (this->silence_from_ != NONE && pos + len > this->silence_from_) {
    size_t from = this->silence_from_ > pos ? (size_t) (this->silence_from_ - pos) : 0;
    memset(out.data() + from, 0, len - from);
  }
}

// Runs in the source's task
void MicTap::on_source_data_(const std::vector<uint8_t> &data) {
  if (this->capacity_ == 0) {
    // no history: live audio only
    if (this->state_ == microphone::STATE_RUNNING) {
      if (this->silence_from_ != NONE) {
        this->out_.assign(data.size(), 0);
        this->data_callbacks_.call(this->out_);
      } else {
        this->data_callbacks_.call(data);  // the tap's mute is applied by each consumer's callback wrapper
      }
    }
    return;
  }
  {
    LockGuard guard(this->lock_);
    // keep the history (also while nobody listens to the tap)
    const uint8_t *src = data.data();
    size_t len = data.size();
    if (len > this->capacity_) {
      src += len - this->capacity_;
      this->written_ += len - this->capacity_;
      len = this->capacity_;
    }
    size_t done = 0;
    while (done < len) {
      size_t at = (size_t) ((this->written_ + done) % this->capacity_);
      size_t n = std::min(len - done, this->capacity_ - at);
      memcpy(this->history_ + at, src + done, n);
      done += n;
    }
    this->written_ += len;
    if (this->state_ != microphone::STATE_RUNNING)
      return;
    uint64_t oldest = this->written_ > this->capacity_ ? this->written_ - this->capacity_ : 0;
    if (this->replaying_) {
      this->cursor_ = std::max(this->cursor_, oldest);
      size_t n = (size_t) std::min<uint64_t>((uint64_t) (data.size() * this->replay_speed_), this->written_ - this->cursor_);
      n = n / this->frame_ * this->frame_;
      this->copy_out_(this->cursor_, n, this->out_);
      this->cursor_ += n;
      if (this->cursor_ >= this->written_) {
        this->replaying_ = false;
        ESP_LOGD(TAG, "Replay caught up");
      }
    } else {
      this->copy_out_(this->written_ - data.size(), data.size(), this->out_);
    }
  }
  if (!this->out_.empty())
    this->data_callbacks_.call(this->out_);
}

void MicTap::replay(uint32_t ms) {
  if (this->capacity_ == 0)
    return;
  LockGuard guard(this->lock_);
  auto info = this->source_->get_audio_stream_info();
  uint64_t back = std::min<uint64_t>(info.ms_to_bytes(ms) / this->frame_ * this->frame_, this->capacity_);
  back = std::min<uint64_t>(back, this->written_);
  this->cursor_ = this->written_ - back;
  this->replaying_ = back > 0;
  ESP_LOGD(TAG, "Replaying the last %u ms", (unsigned) info.bytes_to_ms(back));
}

void MicTap::silence_now() {
  LockGuard guard(this->lock_);
  this->silence_from_ = this->written_;
}

void MicTap::unsilence() {
  LockGuard guard(this->lock_);
  this->silence_from_ = NONE;
}

void MicTap::start() {
  if (this->want_running_)
    return;
  this->want_running_ = true;
  this->state_ = microphone::STATE_STARTING;
  this->source_->start();
}

void MicTap::stop() {
  if (!this->want_running_)
    return;
  this->want_running_ = false;
  this->state_ = microphone::STATE_STOPPING;
  this->source_->stop();
  LockGuard guard(this->lock_);
  this->replaying_ = false;
}

void MicTap::loop() {
  // follow the source: running once it runs, stopped once it stops
  if (this->state_ == microphone::STATE_STARTING && this->source_->is_running()) {
    this->audio_stream_info_ = this->source_->get_audio_stream_info();
    this->state_ = microphone::STATE_RUNNING;
  } else if (this->state_ == microphone::STATE_STOPPING && !this->source_->is_running()) {
    this->state_ = microphone::STATE_STOPPED;
  } else if (this->state_ == microphone::STATE_STOPPING && !this->want_running_) {
    // the source may stay running for other consumers: the tap itself is stopped
    this->state_ = microphone::STATE_STOPPED;
  }
}

}  // namespace esphome::mic_tap
