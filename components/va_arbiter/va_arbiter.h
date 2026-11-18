#pragma once

#include "esphome/components/microphone/microphone_source.h"
#include "esphome/components/udp/udp_component.h"
#include "esphome/core/automation.h"
#include "esphome/core/component.h"

#include <atomic>
#include <span>
#include <string>
#include <vector>

namespace esphome::va_arbiter {

/// Decides which of several voice satellites in earshot answers a wake word.
///
/// Every device keeps a short loudness history of its microphone. When the wake word is detected, claim() scores
/// how loud the wake word was here (the closest device hears it loudest) and broadcasts the score over UDP. After a
/// short window the device with the best score wins and fires on_won, the others fire on_lost. The winner also
/// broadcasts "taken", so a device that detects the wake word late never answers too. Devices send a heartbeat,
/// and with no peers around a claim is decided immediately (no added latency for a single device).
class VAArbiter : public Component {
 public:
  void setup() override;
  void loop() override;
  void dump_config() override;
  float get_setup_priority() const override { return setup_priority::AFTER_WIFI; }

  void set_udp(udp::UDPComponent *udp) { this->udp_ = udp; }
  void set_microphone_source(microphone::MicrophoneSource *src) { this->mic_source_ = src; }
  void set_window(uint32_t ms) { this->window_ms_ = ms; }
  void set_key(const std::string &key) { this->key_ = key; }

  /// Call when the wake word was detected. Exactly one of on_won / on_lost fires later (from loop()).
  void claim(const std::string &wake_word);
  /// Whether a claim is waiting for its decision
  bool is_pending() const { return this->pending_; }
  /// Number of peers heard from recently
  uint8_t peer_count() const;
  /// Score of the last claim (dBFS of the loudest part of the wake word)
  float last_score() const { return this->last_score_; }

  Trigger<std::string> *get_won_trigger() { return &this->won_trigger_; }
  Trigger<std::string> *get_lost_trigger() { return &this->lost_trigger_; }

 protected:
  enum MsgType : uint8_t { MSG_HELLO = 1, MSG_CLAIM = 2, MSG_TAKEN = 3 };
  struct Peer {
    uint32_t id;
    uint32_t last_seen;
  };
  struct PeerClaim {
    uint32_t id;
    uint16_t seq;
    int16_t score_cdb;
    uint32_t at;
  };

  void on_audio_(const std::vector<uint8_t> &data);
  float score_() const;
  void send_(MsgType type, uint16_t seq, int16_t score_cdb);
  void on_packet_(std::span<const uint8_t> data);
  void sign_(const uint8_t *msg, size_t len, uint8_t *out8) const;
  void decide_(bool won, const char *why);
  void seen_(uint32_t id);

  udp::UDPComponent *udp_{nullptr};
  microphone::MicrophoneSource *mic_source_{nullptr};
  uint32_t window_ms_{250};
  std::string key_;
  uint32_t my_id_{0};

  // loudness history: one dB value per 10 ms frame (written from the microphone task)
  static constexpr size_t HIST = 200;  // 2 s
  float hist_[HIST]{};
  std::atomic<uint32_t> hist_pos_{0};
  float hp_prev_x_{0}, hp_prev_y_{0};
  double frame_sumsq_{0};
  uint32_t frame_n_{0};

  std::vector<Peer> peers_;
  std::vector<PeerClaim> claims_;
  uint32_t taken_at_{0};
  uint32_t taken_by_{0};

  bool pending_{false};
  uint32_t claim_at_{0};
  uint16_t seq_{0};
  int16_t my_score_cdb_{0};
  float last_score_{-100};
  std::string wake_word_;
  uint32_t last_hello_{0};

  Trigger<std::string> won_trigger_;
  Trigger<std::string> lost_trigger_;
};

}  // namespace esphome::va_arbiter
