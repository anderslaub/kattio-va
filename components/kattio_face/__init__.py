import esphome.codegen as cg
from esphome.components import display, speaker
import esphome.config_validation as cv
from esphome.const import CONF_ID

CODEOWNERS = ["@kattio"]
DEPENDENCIES = ["esp32"]
AUTO_LOAD = ["speaker"]
MULTI_CONF = False

CONF_DISPLAY_ID = "display_id"
CONF_SPEAKER_ID = "speaker_id"
CONF_FPS = "fps"
CONF_RESTING_FPS = "resting_fps"
CONF_SLEEP_TIMEOUT = "sleep_timeout"
CONF_SNAP_ONE_IN = "snap_one_in"

kattio_face_ns = cg.esphome_ns.namespace("kattio_face")
KattioFace = kattio_face_ns.class_("KattioFace", cg.Component)
VoiceEnhancer = kattio_face_ns.class_("VoiceEnhancer", cg.Component, speaker.Speaker)

kattio_ns = cg.global_ns.namespace("kattio")
Mood = kattio_ns.enum("Mood")

CONFIG_SCHEMA = cv.Schema(
    {
        cv.GenerateID(): cv.declare_id(KattioFace),
        cv.Required(CONF_DISPLAY_ID): cv.use_id(display.Display),
        cv.Optional(CONF_SPEAKER_ID): cv.use_id(VoiceEnhancer),
        cv.Optional(CONF_FPS, default=30): cv.int_range(min=5, max=60),
        cv.Optional(CONF_RESTING_FPS, default=12): cv.int_range(min=1, max=60),
        cv.Optional(
            CONF_SLEEP_TIMEOUT, default="10min"
        ): cv.positive_time_period_milliseconds,
        # When petted, the cat snaps at 1 in this many pets (0 = never)
        cv.Optional(CONF_SNAP_ONE_IN, default=6): cv.int_range(min=0, max=1000),
    }
).extend(cv.COMPONENT_SCHEMA)


async def to_code(config):
    var = cg.new_Pvariable(config[CONF_ID])
    await cg.register_component(var, config)
    disp = await cg.get_variable(config[CONF_DISPLAY_ID])
    cg.add(var.set_display(disp))
    if CONF_SPEAKER_ID in config:
        spk = await cg.get_variable(config[CONF_SPEAKER_ID])
        cg.add(var.set_level_source(spk))
    cg.add(var.set_fps(config[CONF_FPS], config[CONF_RESTING_FPS]))
    cg.add(var.set_sleep_timeout(config[CONF_SLEEP_TIMEOUT]))
    cg.add(var.set_snap_one_in(config[CONF_SNAP_ONE_IN]))
