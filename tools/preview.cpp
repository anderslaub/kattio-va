// Host-side preview of the Kattio face: renders a scripted storyboard to PPM frames.
//   g++ -O2 -std=c++17 -I../components/kattio_face preview.cpp ../components/kattio_face/face_engine.cpp -o preview
//   ./preview outdir && ffmpeg -framerate 30 -i outdir/f%05d.ppm preview.mp4
#include <cstdio>
#include <cstdlib>
#include <string>
#include <vector>

#include "face_engine.h"

using namespace kattio;

struct Step {
  float at;
  const char *what;
};

int main(int argc, char **argv) {
  std::string out = argc > 1 ? argv[1] : "frames";
  float only_from = argc > 2 ? atof(argv[2]) : 0;
  float only_to = argc > 3 ? atof(argv[3]) : 1e9;
  FaceEngine f;
  f.set_sleep_timeout(26);  // shortened for the preview

  // storyboard (seconds)
  std::vector<Step> story = {
      {0.5f, "connect"},  {7.0f, "wake"},    {9.5f, "think"},  {11.5f, "speak"}, {15.5f, "listen"},
      {17.0f, "think"},   {18.5f, "speak"},  {20.5f, "listen"}, {22.5f, "bored"}, {29.0f, "error"},
      {33.5f, "poke"},    {37.5f, "alarm"},  {40.5f, "idle"},  {41.0f, "mute"},  {44.0f, "unmute"},
      {44.5f, "confused"}, {47.5f, "offline"}, {51.0f, "online"}, {80.0f, "wake"}, {82.0f, "end"},
  };
  // Sleep happens via the shortened timeout around t=~70

  const float dt = 1.0f / 30.0f;
  std::vector<uint16_t> px(320 * 240);
  std::vector<uint8_t> cov(320 * 240 * LAYER_COUNT);
  size_t si = 0;
  int frame = 0;
  for (float t = 0; t < 82.0f; t += dt) {
    while (si < story.size() && story[si].at <= t) {
      std::string w = story[si].what;
      if (w == "connect")
        f.set_connected(true);
      else if (w == "wake")
        f.set_mood(MOOD_WAKE);
      else if (w == "think")
        f.set_mood(MOOD_THINK);
      else if (w == "speak")
        f.set_mood(MOOD_SPEAK);
      else if (w == "listen")
        f.set_mood(MOOD_LISTEN);
      else if (w == "bored")
        f.set_mood(MOOD_BORED);
      else if (w == "error")
        f.set_mood(MOOD_ERROR);
      else if (w == "poke")
        f.poke();
      else if (w == "alarm")
        f.set_mood(MOOD_ALARM);
      else if (w == "idle")
        f.set_mood(MOOD_IDLE);
      else if (w == "mute")
        f.set_muted(true);
      else if (w == "unmute")
        f.set_muted(false);
      else if (w == "confused")
        f.set_mood(MOOD_CONFUSED);
      else if (w == "offline")
        f.set_connected(false);
      else if (w == "online")
        f.set_connected(true);
      si++;
    }
    // fake speech envelope: syllables
    float lvl = 0;
    if (f.get_mood() == MOOD_SPEAK) {
      float s = sinf(t * 2 * 3.14159f * 4.2f) * 0.5f + 0.5f;
      float w = sinf(t * 2 * 3.14159f * 0.9f) * 0.5f + 0.5f;
      lvl = s * (0.4f + 0.6f * w);
    }
    f.set_speech_level(lvl);
    f.set_timer(t > 37 && t < 60, 1.0f - (t - 37) / 23.0f, true);
    f.update(dt);
    f.build_scene();
    if (t < only_from || t > only_to) {
      frame++;
      continue;
    }
    f.render_rect(0, 0, 320, 240, px.data(), cov.data());
    char name[512];
    snprintf(name, sizeof(name), "%s/f%05d.ppm", out.c_str(), frame++);
    FILE *fp = fopen(name, "wb");
    fprintf(fp, "P6 320 240 255\n");
    for (uint16_t v : px) {
      uint16_t c = (uint16_t) ((v >> 8) | (v << 8));
      uint8_t r = (c >> 11) << 3, g = ((c >> 5) & 0x3F) << 2, b = (c & 0x1F) << 3;
      fputc(r, fp);
      fputc(g, fp);
      fputc(b, fp);
    }
    fclose(fp);
  }
  fprintf(stderr, "%d frames, %zu prims in last frame\n", frame, f.prims().size());
  return 0;
}
