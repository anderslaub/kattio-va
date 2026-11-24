"""Microphone tap: a microphone that passes another microphone's audio through, with its own mute.

ESPHome mutes per microphone: muting a microphone silences every consumer of it (wake word, voice assistant,
anything else). A tap gives one consumer its own microphone to mute, e.g. silence only the copy the voice
assistant streams to Home Assistant, while the wake word and other listeners keep hearing the room.

    microphone:
      - platform: mic_tap
        id: va_mic
        source: box_mic
        history: 6s        # optional: keep the last 6 s, for replay()
        replay_speed: 3    # replayed audio goes out this many times faster than real time

From a lambda: ``replay(ms)`` passes on the last ``ms`` of audio before the live audio (e.g. what someone said
just before the consumer started listening), ``silence_now()`` / ``unsilence()`` silence the live audio from now
on (audio still being replayed from before that point gets through first).
"""

import esphome.codegen as cg
from esphome.components import audio, microphone
import esphome.config_validation as cv
from esphome.const import CONF_BITS_PER_SAMPLE, CONF_CHANNELS, CONF_ID, CONF_SAMPLE_RATE, CONF_SOURCE

CODEOWNERS = []
DEPENDENCIES = ["microphone"]

CONF_HISTORY = "history"
CONF_REPLAY_SPEED = "replay_speed"

mic_tap_ns = cg.esphome_ns.namespace("mic_tap")
MicTap = mic_tap_ns.class_("MicTap", microphone.Microphone, cg.Component)

def _set_stream_limits(config):
    # the tap passes on what its source delivers
    src = config[CONF_SOURCE]
    channels = len(src[CONF_CHANNELS])
    audio.set_stream_limits(
        min_bits_per_sample=src[CONF_BITS_PER_SAMPLE],
        max_bits_per_sample=src[CONF_BITS_PER_SAMPLE],
        min_channels=channels,
        max_channels=channels,
        min_sample_rate=config[CONF_SAMPLE_RATE],
        max_sample_rate=config[CONF_SAMPLE_RATE],
    )(config)
    return config


CONFIG_SCHEMA = cv.All(
    microphone.MICROPHONE_SCHEMA.extend(
        {
            cv.GenerateID(): cv.declare_id(MicTap),
            cv.Optional(CONF_SOURCE, default={}): microphone.microphone_source_schema(),
            # the source microphone's sample rate (checked against it)
            cv.Optional(CONF_SAMPLE_RATE, default=16000): cv.int_range(min=8000, max=96000),
            cv.Optional(CONF_HISTORY, default="0ms"): cv.All(
                cv.positive_time_period_milliseconds, cv.Range(max=cv.TimePeriod(seconds=30))
            ),
            cv.Optional(CONF_REPLAY_SPEED, default=3.0): cv.float_range(min=1.5, max=8.0),
        }
    ).extend(cv.COMPONENT_SCHEMA),
    _set_stream_limits,
)


def _final_validate(config):
    return cv.Schema(
        {
            cv.Optional(CONF_SOURCE): microphone.final_validate_microphone_source_schema(
                "mic_tap", sample_rate=config[CONF_SAMPLE_RATE]
            )
        },
        extra=cv.ALLOW_EXTRA,
    )(config)


FINAL_VALIDATE_SCHEMA = _final_validate




async def to_code(config):
    var = cg.new_Pvariable(config[CONF_ID])
    await cg.register_component(var, config)
    await microphone.register_microphone(var, config)
    src = await microphone.microphone_source_to_code(config[CONF_SOURCE])
    cg.add(var.set_source(src))
    cg.add(var.set_history_ms(config[CONF_HISTORY]))
    cg.add(var.set_replay_speed(config[CONF_REPLAY_SPEED]))
