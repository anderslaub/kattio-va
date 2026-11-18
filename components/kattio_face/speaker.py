import esphome.codegen as cg
from esphome.components import audio, speaker
import esphome.config_validation as cv
from esphome.const import (
    CONF_BITS_PER_SAMPLE,
    CONF_ID,
    CONF_NUM_CHANNELS,
    CONF_OUTPUT_SPEAKER,
    CONF_SAMPLE_RATE,
    PLATFORM_ESP32,
)
from esphome.core.entity_helpers import inherit_property_from

from . import VoiceEnhancer

AUTO_LOAD = ["audio"]

CONF_LOUDNESS_BOOST = "loudness_boost"
CONF_HIGHPASS = "highpass"
CONF_PRESENCE = "presence"


def _set_stream_limits(config):
    audio.set_stream_limits(min_bits_per_sample=16, max_bits_per_sample=16)(config)
    return config


def _final_validate(config):
    inherit_property_from(CONF_NUM_CHANNELS, CONF_OUTPUT_SPEAKER)(config)
    inherit_property_from(CONF_SAMPLE_RATE, CONF_OUTPUT_SPEAKER)(config)
    inherit_property_from(CONF_BITS_PER_SAMPLE, CONF_OUTPUT_SPEAKER)(config)
    audio.final_validate_audio_schema(
        "kattio_face voice enhancer",
        audio_device=CONF_OUTPUT_SPEAKER,
        bits_per_sample=config.get(CONF_BITS_PER_SAMPLE),
        channels=config.get(CONF_NUM_CHANNELS),
        sample_rate=config.get(CONF_SAMPLE_RATE),
    )(config)


CONFIG_SCHEMA = cv.All(
    speaker.SPEAKER_SCHEMA.extend(
        {
            cv.GenerateID(): cv.declare_id(VoiceEnhancer),
            cv.Required(CONF_OUTPUT_SPEAKER): cv.use_id(speaker.Speaker),
            cv.Optional(CONF_LOUDNESS_BOOST, default=4.0): cv.float_range(min=0, max=18),
            cv.Optional(CONF_HIGHPASS, default="170Hz"): cv.All(
                cv.frequency, cv.float_range(min=40, max=600)
            ),
            cv.Optional(CONF_PRESENCE, default=3.0): cv.float_range(min=-6, max=9),
        }
    ).extend(cv.COMPONENT_SCHEMA),
    cv.only_on([PLATFORM_ESP32]),
    _set_stream_limits,
)

FINAL_VALIDATE_SCHEMA = _final_validate


async def to_code(config):
    var = cg.new_Pvariable(config[CONF_ID])
    await cg.register_component(var, config)
    await speaker.register_speaker(var, config)
    out = await cg.get_variable(config[CONF_OUTPUT_SPEAKER])
    cg.add(var.set_output_speaker(out))
    cg.add(var.set_boost_db(config[CONF_LOUDNESS_BOOST]))
    cg.add(var.set_highpass_hz(config[CONF_HIGHPASS]))
    cg.add(var.set_presence_db(config[CONF_PRESENCE]))
