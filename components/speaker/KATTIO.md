# speaker (ESPHome 2026.10.2, patched)

A copy of ESPHome's `speaker` component (with `speaker/media_player`) from ESPHome 2026.10.2, so one constant can
change. The only change: `INITIAL_BUFFER_MS` in `media_player/audio_pipeline.cpp`, 1000 -> 100 (playback starts
after 100 ms of a file instead of 1 s; see the comment there).

When ESPHome is upgraded: copy the new version's `esphome/components/speaker` over this directory and apply the
same one-line change (or drop this copy, if ESPHome makes the buffer configurable).
