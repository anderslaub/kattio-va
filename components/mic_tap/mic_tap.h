#pragma once

#include "esphome/components/microphone/microphone.h"
#include "esphome/components/microphone/microphone_source.h"
#include "esphome/core/component.h"
#include "esphome/core/helpers.h"

#include <cstdint>
#include <vector>

namespace esphome::mic_tap {

/// A microphone that passes another microphone's audio through, with its own mute state (see microphone.py).
///
/// Optionally it keeps the last `history` of the source's audio, so a consumer that starts late can be given what
/// was said just before (replay: sent faster than real time until it has caught up), and it can go silent from a
/// point in the stream (silence_now: whatever is still being replayed up to that point gets through first).
class MicTap : public microphone::Microphone, public Component {
 public:
  void setup() override;
  void loop() override;
  void dump_config() override;

  void set_source(microphone::MicrophoneSource *source) { this->source_ = source; }
  void set_history_ms(uint32_t ms) { this->history_ms_ = ms; }
  void set_replay_speed(float speed) { this->replay_speed_ = speed; }

  void start() override;
  void stop() override;

  /// Pass on the audio of the last `ms` (as far as the history goes) before the live audio, faster than real time
  void replay(uint32_t ms);
  /// Silence from the live audio of now on (replayed audio from before now still gets through)
  void silence_now();
  /// Sound again
  void unsilence();
  bool is_silenced() const { return this->silence_from_ != NONE; }
  bool is_replaying() const { return this->replaying_; }

 protected:
  static constexpr uint64_t NONE = UINT64_MAX;

  void on_source_data_(const std::vector<uint8_t> &data);
  /// Copy `len` bytes of history from stream position `pos` into out (zeros from silence_from_ on)
  void copy_out_(uint64_t pos, size_t len, std::vector<uint8_t> &out);

  microphone::MicrophoneSource *source_{nullptr};
  bool want_running_{false};

  uint32_t history_ms_{0};
  float replay_speed_{3.0f};
  Mutex lock_;
  uint8_t *history_{nullptr};
  size_t capacity_{0};
  size_t frame_{2};
  uint64_t written_{0};  // stream position: bytes the source delivered so far
  uint64_t cursor_{0};   // replay: the next byte to pass on
  bool replaying_{false};
  uint64_t silence_from_{NONE};
  std::vector<uint8_t> out_;
};

}  // namespace esphome::mic_tap
