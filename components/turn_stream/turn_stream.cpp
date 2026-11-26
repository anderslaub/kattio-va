#include "turn_stream.h"

#include "esphome/components/network/util.h"
#include "esphome/core/hal.h"
#include "esphome/core/helpers.h"
#include "esphome/core/log.h"

#include <cstdlib>
#include <cstring>
#include <fcntl.h>
#include <lwip/inet.h>
#include <lwip/sockets.h>

namespace esphome::turn_stream {

static const char *const TAG = "turn_stream";

static constexpr size_t HEADER = 14;   // magic 4, session 4, seq 4, flags 1, turn 1
static constexpr size_t MAX_AUDIO = 1280;  // 40 ms of 16 kHz mono s16 per packet

static void put_u32(uint8_t *p, uint32_t v) {
  p[0] = v & 0xff;
  p[1] = (v >> 8) & 0xff;
  p[2] = (v >> 16) & 0xff;
  p[3] = (v >> 24) & 0xff;
}

static constexpr uint32_t RETRY_MS = 10 * 1000;        // after a failed lookup
static constexpr uint32_t REFRESH_MS = 10 * 60 * 1000;  // look a hostname up again now and then

void TurnStream::setup() {
  this->sock_ = lwip_socket(AF_INET, SOCK_DGRAM, IPPROTO_UDP);
  if (this->sock_ < 0) {
    ESP_LOGE(TAG, "Could not open a UDP socket");
    this->mark_failed();
    return;
  }
  int flags = lwip_fcntl(this->sock_, F_GETFL, 0);
  lwip_fcntl(this->sock_, F_SETFL, flags | O_NONBLOCK);
  if (this->mic_source_ != nullptr)
    this->mic_source_->add_data_callback([this](const std::vector<uint8_t> &data) { this->on_audio_(data); });
}

std::string TurnStream::wanted_server_() const {
  if (this->server_text_ != nullptr) {
    std::string h = this->server_text_->state;
    size_t a = h.find_first_not_of(" \t");
    size_t b = h.find_last_not_of(" \t");
    if (a != std::string::npos)
      return h.substr(a, b - a + 1);
  }
  return this->server_;
}

void TurnStream::resolve_(uint32_t now) {
  std::string server = this->wanted_server_();
  if (server != this->resolving_server_) {
    // a new server: forget the old address and look the new one up
    this->resolver_.forget();
    if (this->resolver_.ready())
      return;  // an old answer is still landing; try again next loop
    this->resolving_server_ = server;
    this->addr_ = 0;
    this->looking_up_ = false;
    this->last_lookup_ = 0;
    uint16_t port = this->port_;
    size_t colon = server.rfind(':');
    if (colon != std::string::npos) {
      int p = atoi(server.c_str() + colon + 1);
      if (p > 0 && p < 65536)
        port = p;
      else
        ESP_LOGW(TAG, "Bad port in %s, using %u", server.c_str(), port);
    }
    this->dest_port_ = port;
    if (server.empty())
      ESP_LOGI(TAG, "No turn detection server set: turn detection is off");
  }
  if (server.empty())
    return;
  std::string host = server.substr(0, server.rfind(':'));

  if (this->looking_up_) {
    if (this->resolver_.ready()) {
      struct sockaddr_in in {};
      this->resolver_.to_sockaddr(reinterpret_cast<struct sockaddr *>(&in), sizeof(in), this->dest_port_);
      uint32_t addr = in.sin_addr.s_addr;
      if (addr != this->addr_) {
        char ip[16];
        inet_ntoa_r(in.sin_addr, ip, sizeof(ip));
        ESP_LOGI(TAG, "Turn detection: %s is %s", host.c_str(), ip);
      }
      this->addr_ = addr;
      this->looking_up_ = false;
      this->last_lookup_ = now;
    } else if (this->resolver_.consume_failure()) {
      // the log says why; keep the old address (if any) and try again later
      this->looking_up_ = false;
      this->last_lookup_ = now;
    }
    return;
  }

  if (!network::is_connected())
    return;  // no lookups before Wi-Fi is up
  uint32_t wait = this->addr_ == 0 ? RETRY_MS : REFRESH_MS;
  if (this->last_lookup_ != 0 && now - this->last_lookup_ < wait)
    return;
  this->resolver_.forget();
  if (this->resolver_.ready())
    return;
  this->looking_up_ = true;
  this->resolver_.start(host.c_str(), this->dest_port_, TAG);
}

void TurnStream::dump_config() {
  std::string server = this->wanted_server_();
  char ip[16] = "not yet known";
  if (this->addr_ != 0) {
    struct in_addr a;
    a.s_addr = this->addr_;
    inet_ntoa_r(a, ip, sizeof(ip));
  }
  ESP_LOGCONFIG(TAG,
                "Turn stream:\n"
                "  Turn detection: %s port %u (%s)",
                server.empty() ? "(no server set: off)" : server.c_str(), (unsigned) this->dest_port_, ip);
}

void TurnStream::send_(uint8_t extra_flags, const uint8_t *audio, size_t len) {
  if (this->sock_ < 0 || this->addr_ == 0)
    return;
  uint8_t pkt[HEADER + MAX_AUDIO];
  memcpy(pkt, "KTS2", 4);
  put_u32(pkt + 4, this->session_);
  put_u32(pkt + 8, this->seq_++);
  pkt[12] = this->flags_ | extra_flags;
  pkt[13] = this->turn_;
  if (len > MAX_AUDIO)
    len = MAX_AUDIO;
  if (len)
    memcpy(pkt + HEADER, audio, len);
  struct sockaddr_in dest {};
  dest.sin_family = AF_INET;
  dest.sin_port = htons(this->dest_port_);
  dest.sin_addr.s_addr = this->addr_;
  lwip_sendto(this->sock_, pkt, HEADER + len, 0, reinterpret_cast<const struct sockaddr *>(&dest), sizeof(dest));
  this->last_send_ = millis();
}

void TurnStream::start_session_() {
  this->session_ = random_uint32();
  this->seq_ = 0;
  this->turn_ = 0;
  this->sent_bytes_ = 0;
  this->streaming_ = true;
  if (this->hold_mic_ && this->mic_ != nullptr && !this->holding_mic_) {
    this->holding_mic_ = true;
    this->mic_->start();  // one more listener: the others stopping no longer stops it
  }
  this->send_(FLAG_START, nullptr, 0);
  ESP_LOGD(TAG, "Streaming conversation %08" PRIx32, (uint32_t) this->session_);
}

void TurnStream::listen() {
  if (this->addr_ == 0) {
    // no address: Home Assistant's own end-of-speech detection decides
    if (!this->wanted_server_().empty())
      ESP_LOGW(TAG, "No address for %s yet; turn detection is off for this turn", this->wanted_server_().c_str());
    return;
  }
  if (!this->streaming_)
    this->start_session_();
  this->turn_ = this->turn_ + 1;
  this->flags_ = this->flags_ | FLAG_LISTENING;
  this->idle_since_ = 0;
  this->send_(0, nullptr, 0);
  ESP_LOGD(TAG, "Turn %u of %08" PRIx32, (unsigned) this->turn_, (uint32_t) this->session_);
}

void TurnStream::listen_done() {
  if (!(this->flags_ & FLAG_LISTENING))
    return;
  this->flags_ = this->flags_ & ~FLAG_LISTENING;
  if (this->streaming_)
    this->send_(0, nullptr, 0);
}

void TurnStream::set_speaking(bool speaking) {
  uint8_t before = this->flags_;
  this->flags_ = speaking ? (before | FLAG_SPEAKING) : (before & ~FLAG_SPEAKING);
  if (speaking)
    this->idle_since_ = 0;
  if (this->streaming_ && before != this->flags_)
    this->send_(0, nullptr, 0);
}

void TurnStream::stop() {
  this->flags_ = 0;
  if (!this->streaming_)
    return;
  this->send_(FLAG_STOP, nullptr, 0);
  this->streaming_ = false;
  if (this->holding_mic_) {
    this->holding_mic_ = false;
    this->mic_->stop();
  }
  ESP_LOGD(TAG, "Conversation %08" PRIx32 " stopped after %.1f s of audio", (uint32_t) this->session_,
           this->sent_bytes_ / 32000.0f);
}

// microphone task
void TurnStream::on_audio_(const std::vector<uint8_t> &data) {
  if (!this->streaming_)
    return;
  for (size_t i = 0; i < data.size(); i += MAX_AUDIO) {
    size_t n = std::min(MAX_AUDIO, data.size() - i);
    this->send_(0, data.data() + i, n);
  }
  this->sent_bytes_ += data.size();
}

void TurnStream::loop() {
  if (this->sock_ < 0)
    return;
  uint32_t now = millis();
  this->resolve_(now);

  if (this->streaming_) {
    // the conversation ends by itself once the assistant has neither listened nor spoken for a while
    if (this->flags_ == 0) {
      if (this->idle_since_ == 0)
        this->idle_since_ = now;
      else if (now - this->idle_since_ > this->idle_timeout_ms_)
        this->stop();
    }
    // the state goes out at least once a second (no audio flows while a half-duplex box speaks)
    if (this->streaming_ && now - this->last_send_ > 1000)
      this->send_(0, nullptr, 0);
  }

  uint8_t buf[32];
  for (;;) {
    ssize_t n = lwip_recvfrom(this->sock_, buf, sizeof(buf), 0, nullptr, nullptr);
    if (n <= 0)
      return;
    if (n < 10 || memcmp(buf, "KTE2", 4) != 0)
      continue;
    uint32_t session = buf[4] | (buf[5] << 8) | (buf[6] << 16) | ((uint32_t) buf[7] << 24);
    uint8_t turn = buf[8];
    uint8_t event = buf[9];
    if (!this->streaming_ || session != this->session_)
      continue;  // an old conversation
    if (event == 16) {
      // optional u16 after the event: the interrupting speech began this many ms before the service sent it
      uint32_t ago = n >= 12 ? (uint32_t) (buf[10] | (buf[11] << 8)) : 0;
      uint32_t now_ms = millis();
      if ((this->flags_ & FLAG_SPEAKING) && now_ms - this->last_interrupt_ > 1000) {
        this->last_interrupt_ = now_ms;
        ESP_LOGI(TAG, "Interrupted while speaking (turn %u), the speech began %u ms ago", (unsigned) turn,
                 (unsigned) ago);
        this->interrupt_trigger_.trigger(ago);
      }
      continue;
    }
    if (turn != this->turn_ || !(this->flags_ & FLAG_LISTENING))
      continue;  // an old turn, or the second copy of this one
    this->listen_done();
    ESP_LOGI(TAG, "End of turn %u (%u) after %.1f s of audio", (unsigned) turn, (unsigned) event,
             this->sent_bytes_ / 32000.0f);
    this->end_trigger_.trigger(event);
  }
}

}  // namespace esphome::turn_stream
