#include "va_arbiter.h"

#include "esphome/components/network/util.h"
#include "esphome/core/hal.h"
#include "esphome/core/helpers.h"
#include "esphome/core/log.h"

#include "mbedtls/md.h"

#include <algorithm>
#include <cmath>
#include <cstring>

namespace esphome::va_arbiter {

static const char *const TAG = "va_arbiter";

static constexpr uint8_t MAGIC[4] = {'K', 'V', 'A', 1};
static constexpr size_t BODY_LEN = 13;  // magic(4) type(1) id(4) seq(2) score(2)
static constexpr size_t MAC_LEN = 8;
static constexpr uint32_t HELLO_INTERVAL_MS = 30000;
static constexpr uint32_t PEER_TIMEOUT_MS = 95000;
static constexpr uint32_t CLAIM_LOOKBACK_MS = 1500;  // a peer that claimed shortly before us counts too
static constexpr uint32_t FRAME_SAMPLES = 160;        // 10 ms at 16 kHz
static constexpr size_t SCORE_FRAMES = 150;           // look at the last 1.5 s (the wake word)
static constexpr size_t SCORE_TOP = 15;               // loudest 150 ms of it

void VAArbiter::setup() {
  uint8_t mac[6];
  get_mac_address_raw(mac);
  uint32_t h = 2166136261u;
  for (uint8_t b : mac)
    h = (h ^ b) * 16777619u;
  this->my_id_ = h ? h : 1;
  for (auto &v : this->hist_)
    v = -100.0f;

  if (this->mic_source_ != nullptr)
    this->mic_source_->add_data_callback([this](const std::vector<uint8_t> &data) { this->on_audio_(data); });
  this->udp_->add_listener([this](std::span<const uint8_t> data) { this->on_packet_(data); });
}

void VAArbiter::dump_config() {
  ESP_LOGCONFIG(TAG,
                "Voice assistant arbiter:\n"
                "  Device id: %08" PRIx32 "\n"
                "  Window: %" PRIu32 " ms\n"
                "  Signed: %s",
                this->my_id_, this->window_ms_, YESNO(!this->key_.empty()));
}

// ------------------------------------------------------------------------------------------- loudness

void VAArbiter::on_audio_(const std::vector<uint8_t> &data) {
  // 16 bit mono at 16 kHz (guaranteed by the microphone source schema)
  const int16_t *s = reinterpret_cast<const int16_t *>(data.data());
  const size_t n = data.size() / 2;
  constexpr float A = 0.962f;  // ~100 Hz high-pass: ignore rumble and DC
  for (size_t i = 0; i < n; i++) {
    float x = s[i] * (1.0f / 32768.0f);
    float y = x - this->hp_prev_x_ + A * this->hp_prev_y_;
    this->hp_prev_x_ = x;
    this->hp_prev_y_ = y;
    this->frame_sumsq_ += (double) y * y;
    if (++this->frame_n_ >= FRAME_SAMPLES) {
      float db = 10.0f * log10f((float) (this->frame_sumsq_ / this->frame_n_) + 1e-10f);
      uint32_t p = this->hist_pos_.load(std::memory_order_relaxed);
      this->hist_[p % HIST] = db;
      this->hist_pos_.store(p + 1, std::memory_order_release);
      this->frame_sumsq_ = 0;
      this->frame_n_ = 0;
    }
  }
}

float VAArbiter::score_() const {
  uint32_t end = this->hist_pos_.load(std::memory_order_acquire);
  size_t n = std::min<size_t>(SCORE_FRAMES, std::min<uint32_t>(end, HIST));
  if (n < SCORE_TOP)
    return -100.0f;
  float tmp[SCORE_FRAMES];
  for (size_t i = 0; i < n; i++)
    tmp[i] = this->hist_[(end - 1 - i) % HIST];
  std::partial_sort(tmp, tmp + SCORE_TOP, tmp + n, [](float a, float b) { return a > b; });
  float sum = 0;
  for (size_t i = 0; i < SCORE_TOP; i++)
    sum += tmp[i];
  return sum / SCORE_TOP;
}

// -------------------------------------------------------------------------------------------- network

void VAArbiter::sign_(const uint8_t *msg, size_t len, uint8_t *out8) const {
  uint8_t full[32];
  mbedtls_md_hmac(mbedtls_md_info_from_type(MBEDTLS_MD_SHA256), reinterpret_cast<const uint8_t *>(this->key_.data()),
                  this->key_.size(), msg, len, full);
  memcpy(out8, full, MAC_LEN);
}

void VAArbiter::send_(MsgType type, uint16_t seq, int16_t score_cdb) {
  if (!network::is_connected() || this->udp_->is_failed())
    return;
  uint8_t buf[BODY_LEN + MAC_LEN];
  memcpy(buf, MAGIC, 4);
  buf[4] = type;
  memcpy(buf + 5, &this->my_id_, 4);
  memcpy(buf + 9, &seq, 2);
  memcpy(buf + 11, &score_cdb, 2);
  size_t len = BODY_LEN;
  if (!this->key_.empty()) {
    this->sign_(buf, BODY_LEN, buf + BODY_LEN);
    len += MAC_LEN;
  }
  this->udp_->send_packet(buf, len);
}

void VAArbiter::seen_(uint32_t id) {
  uint32_t now = millis();
  for (auto &p : this->peers_) {
    if (p.id == id) {
      p.last_seen = now;
      return;
    }
  }
  this->peers_.push_back({id, now});
  ESP_LOGI(TAG, "New peer %08" PRIx32, id);
  // introduce ourselves right away so the new peer knows about us too
  this->send_(MSG_HELLO, 0, 0);
}

uint8_t VAArbiter::peer_count() const {
  uint32_t now = millis();
  uint8_t n = 0;
  for (const auto &p : this->peers_)
    if (now - p.last_seen < PEER_TIMEOUT_MS)
      n++;
  return n;
}

void VAArbiter::on_packet_(std::span<const uint8_t> data) {
  const size_t want = BODY_LEN + (this->key_.empty() ? 0 : MAC_LEN);
  if (data.size() != want || memcmp(data.data(), MAGIC, 4) != 0)
    return;
  if (!this->key_.empty()) {
    uint8_t mac[MAC_LEN];
    this->sign_(data.data(), BODY_LEN, mac);
    uint8_t diff = 0;
    for (size_t i = 0; i < MAC_LEN; i++)
      diff |= mac[i] ^ data[BODY_LEN + i];
    if (diff != 0) {
      ESP_LOGW(TAG, "Ignoring packet with a bad signature (different key?)");
      return;
    }
  }
  uint8_t type = data[4];
  uint32_t id;
  uint16_t seq;
  int16_t score;
  memcpy(&id, data.data() + 5, 4);
  memcpy(&seq, data.data() + 9, 2);
  memcpy(&score, data.data() + 11, 2);
  if (id == this->my_id_)
    return;  // our own broadcast
  this->seen_(id);
  uint32_t now = millis();
  switch (type) {
    case MSG_CLAIM:
      for (const auto &c : this->claims_)
        if (c.id == id && c.seq == seq)
          return;  // claims are sent twice
      this->claims_.push_back({id, seq, score, now});
      ESP_LOGD(TAG, "Peer %08" PRIx32 " claims with %.1f dB", id, score / 100.0f);
      break;
    case MSG_TAKEN:
      this->taken_at_ = now;
      this->taken_by_ = id;
      ESP_LOGD(TAG, "Peer %08" PRIx32 " is answering", id);
      break;
    default:
      break;
  }
}

// ------------------------------------------------------------------------------------------- decision

void VAArbiter::claim(const std::string &wake_word) {
  if (this->pending_)
    return;
  uint32_t now = millis();
  this->wake_word_ = wake_word;
  this->last_score_ = this->score_();
  this->my_score_cdb_ = (int16_t) std::max(-32000.0f, std::min(32000.0f, this->last_score_ * 100.0f));
  this->seq_++;
  this->claim_at_ = now;

  if (this->taken_by_ != 0 && now - this->taken_at_ < CLAIM_LOOKBACK_MS) {
    this->decide_(false, "another device is already answering");
    return;
  }
  if (this->peer_count() == 0) {
    this->decide_(true, "no other devices around");
    return;
  }
  this->send_(MSG_CLAIM, this->seq_, this->my_score_cdb_);
  this->send_(MSG_CLAIM, this->seq_, this->my_score_cdb_);
  this->pending_ = true;
}

void VAArbiter::decide_(bool won, const char *why) {
  this->pending_ = false;
  if (won) {
    // tell everyone, also devices that detect the wake word after us
    this->send_(MSG_TAKEN, this->seq_, this->my_score_cdb_);
    this->send_(MSG_TAKEN, this->seq_, this->my_score_cdb_);
    ESP_LOGI(TAG, "Answering \"%s\" (%.1f dB, %s)", this->wake_word_.c_str(), this->last_score_, why);
    this->won_trigger_.trigger(this->wake_word_);
  } else {
    ESP_LOGI(TAG, "Not answering \"%s\" (%.1f dB, %s)", this->wake_word_.c_str(), this->last_score_, why);
    this->lost_trigger_.trigger(this->wake_word_);
  }
}

void VAArbiter::loop() {
  uint32_t now = millis();
  if (network::is_connected() && (now - this->last_hello_ > HELLO_INTERVAL_MS || this->last_hello_ == 0)) {
    this->last_hello_ = now;
    this->send_(MSG_HELLO, 0, 0);
  }

  if (this->pending_) {
    if (this->taken_by_ != 0 && (int32_t) (this->taken_at_ - (this->claim_at_ - CLAIM_LOOKBACK_MS)) >= 0) {
      this->decide_(false, "another device is already answering");
    } else if (now - this->claim_at_ >= this->window_ms_) {
      const PeerClaim *best = nullptr;
      for (const auto &c : this->claims_) {
        if ((int32_t) (c.at - (this->claim_at_ - CLAIM_LOOKBACK_MS)) < 0)
          continue;
        bool beats = c.score_cdb > this->my_score_cdb_ || (c.score_cdb == this->my_score_cdb_ && c.id < this->my_id_);
        if (beats && (best == nullptr || c.score_cdb > best->score_cdb))
          best = &c;
      }
      if (best != nullptr) {
        char why[64];
        snprintf(why, sizeof(why), "peer %08" PRIx32 " heard it louder: %.1f dB", best->id, best->score_cdb / 100.0f);
        this->decide_(false, why);
      } else {
        this->decide_(true, "loudest");
      }
    }
  }

  // forget old claims
  this->claims_.erase(std::remove_if(this->claims_.begin(), this->claims_.end(),
                                     [now](const PeerClaim &c) { return now - c.at > 5000; }),
                      this->claims_.end());
}

}  // namespace esphome::va_arbiter
