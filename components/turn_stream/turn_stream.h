#pragma once

#include "esphome/components/microphone/microphone_source.h"
#include "esphome/components/socket/ipv4_resolve.h"
#include "esphome/components/text/text.h"
#include "esphome/core/automation.h"
#include "esphome/core/component.h"

#include <atomic>
#include <string>
#include <vector>

namespace esphome::turn_stream {

/// Streams the microphone to a turn detection service (UDP) for the whole conversation, with what the satellite is
/// doing (listening for a request, speaking), and fires on_end_of_turn when the service says the speaker is done,
/// on_interrupt when it says the speaker interrupts the assistant.
///
/// The protocol (UDP, little endian, version 2), for anyone writing a service:
///   to the service    "KTS2" u32 session, u32 seq, u8 flags, u8 turn, then s16le mono 16 kHz audio
///                     (at most 1280 bytes of audio per packet; state packets have none, and are sent on every
///                     change of state and once a second while no audio flows).
///                     flags: 1 START (a new session: a conversation), 2 STOP (the conversation is over),
///                            4 LISTENING (the assistant waits for a request), 8 SPEAKING (the assistant talks).
///                     turn: counts the listening turns of the session (1, 2, ...).
///   from the service  "KTE2" u32 session, u8 turn, u8 event: 1 end of turn: complete, 2 end of turn: the speaker
///                     is quiet, 3 end of turn: too long, 16 interrupt (someone talks to the assistant while it
///                     speaks). An interrupt may carry a u16 after the event: how many ms before sending it the
///                     interrupting speech began (so the satellite can pass those words on). Sent back to the
///                     address the audio came from; duplicates are ignored. An end of turn only counts for the
///                     current turn while listening, an interrupt only while speaking.
class TurnStream : public Component {
 public:
  void setup() override;
  void loop() override;
  void dump_config() override;
  float get_setup_priority() const override { return setup_priority::AFTER_WIFI; }

  void set_microphone_source(microphone::MicrophoneSource *src) { this->mic_source_ = src; }
  void set_microphone(microphone::Microphone *mic) { this->mic_ = mic; }
  /// Keep the microphone running for the whole conversation, while the assistant thinks and speaks too (full
  /// duplex: that is when interruptions are heard). Off: only copy what others capture (half duplex, where the
  /// microphone must give the shared audio bus to the speaker).
  void set_hold_microphone(bool hold) { this->hold_mic_ = hold; }
  /// The service: "host" or "host:port" (IPv4 address or hostname); the text entity, when not empty, wins
  void set_server(const std::string &server) { this->server_ = server; }
  void set_server_text(text::Text *server_text) { this->server_text_ = server_text; }
  void set_port(uint16_t port) { this->port_ = port; }
  void set_idle_timeout(uint32_t ms) { this->idle_timeout_ms_ = ms; }

  /// A listening turn starts (the assistant waits for a request); starts the session if there is none
  void listen();
  /// The listening turn is over (Home Assistant has the request)
  void listen_done();
  /// The assistant speaks / stopped speaking
  void set_speaking(bool speaking);
  /// The conversation is over: stop streaming (also happens by itself after idle_timeout without listening or
  /// speaking)
  void stop();

  bool is_streaming() const { return this->streaming_; }
  bool is_listening() const { return this->flags_ & FLAG_LISTENING; }
  uint8_t get_turn() const { return this->turn_; }

  Trigger<uint8_t> *get_end_trigger() { return &this->end_trigger_; }
  Trigger<uint32_t> *get_interrupt_trigger() { return &this->interrupt_trigger_; }

  static constexpr uint8_t FLAG_START = 1;
  static constexpr uint8_t FLAG_STOP = 2;
  static constexpr uint8_t FLAG_LISTENING = 4;
  static constexpr uint8_t FLAG_SPEAKING = 8;

 protected:
  void on_audio_(const std::vector<uint8_t> &data);
  void send_(uint8_t extra_flags, const uint8_t *audio, size_t len);
  void start_session_();
  /// The server in use ("host" or "host:port"): the text entity's value, else server
  std::string wanted_server_() const;
  /// Look up the host again (new host, a failed lookup, or now and then: the address may move)
  void resolve_(uint32_t now);

  microphone::MicrophoneSource *mic_source_{nullptr};
  microphone::Microphone *mic_{nullptr};
  bool hold_mic_{false};
  bool holding_mic_{false};
  std::string server_;
  text::Text *server_text_{nullptr};
  uint16_t port_{10330};       // the default port
  std::atomic<uint16_t> dest_port_{10330};
  int sock_{-1};
  /// The server being looked up / last looked up, and its address (network order, 0 = none yet). The address
  /// stays while a new lookup of the same host runs, so a slow DNS answer never stops a turn.
  std::string resolving_server_;
  socket::Ipv4Resolve resolver_;
  std::atomic<uint32_t> addr_{0};
  uint32_t last_lookup_{0};
  bool looking_up_{false};

  std::atomic<bool> streaming_{false};
  std::atomic<uint32_t> session_{0};
  std::atomic<uint32_t> seq_{0};
  std::atomic<uint8_t> flags_{0};  // LISTENING | SPEAKING
  std::atomic<uint8_t> turn_{0};
  std::atomic<uint32_t> last_send_{0};
  uint32_t idle_since_{0};  // when neither listening nor speaking began (0: busy)
  uint32_t idle_timeout_ms_{5000};
  uint32_t sent_bytes_{0};
  Trigger<uint8_t> end_trigger_;
  Trigger<uint32_t> interrupt_trigger_;
  uint32_t last_interrupt_{0};
};

}  // namespace esphome::turn_stream
