"""Voice assistant arbiter: only the device closest to the speaker answers a wake word."""

import esphome.codegen as cg
from esphome import automation
from esphome.components import microphone, udp
import esphome.config_validation as cv
from esphome.const import CONF_ID, CONF_MICROPHONE, CONF_TRIGGER_ID

DEPENDENCIES = ["udp", "microphone"]
CODEOWNERS = []

CONF_UDP_ID = "udp_id"
CONF_WINDOW = "window"
CONF_KEY = "key"
CONF_ON_WON = "on_won"
CONF_ON_LOST = "on_lost"

va_arbiter_ns = cg.esphome_ns.namespace("va_arbiter")
VAArbiter = va_arbiter_ns.class_("VAArbiter", cg.Component)

CONFIG_SCHEMA = cv.Schema(
    {
        cv.GenerateID(): cv.declare_id(VAArbiter),
        cv.Required(CONF_UDP_ID): cv.use_id(udp.UDPComponent),
        cv.Optional(CONF_MICROPHONE, default={}): microphone.microphone_source_schema(
            min_bits_per_sample=16, max_bits_per_sample=16
        ),
        cv.Optional(CONF_WINDOW, default="250ms"): cv.All(
            cv.positive_time_period_milliseconds,
            cv.Range(max=cv.TimePeriod(milliseconds=2000)),
        ),
        cv.Optional(CONF_KEY): cv.string_strict,
        cv.Optional(CONF_ON_WON): automation.validate_automation(single=True),
        cv.Optional(CONF_ON_LOST): automation.validate_automation(single=True),
    }
).extend(cv.COMPONENT_SCHEMA)

FINAL_VALIDATE_SCHEMA = cv.Schema(
    {
        cv.Optional(CONF_MICROPHONE): microphone.final_validate_microphone_source_schema(
            "va_arbiter", sample_rate=16000
        ),
    },
    extra=cv.ALLOW_EXTRA,
)


async def to_code(config):
    var = cg.new_Pvariable(config[CONF_ID])
    await cg.register_component(var, config)
    udp_var = await cg.get_variable(config[CONF_UDP_ID])
    cg.add(var.set_udp(udp_var))
    cg.add(udp_var.set_should_listen())
    cg.add(udp_var.set_should_broadcast())
    mic_source = await microphone.microphone_source_to_code(config[CONF_MICROPHONE], passive=True)
    cg.add(var.set_microphone_source(mic_source))
    cg.add(var.set_window(config[CONF_WINDOW]))
    if CONF_KEY in config:
        cg.add(var.set_key(config[CONF_KEY]))
    if CONF_ON_WON in config:
        await automation.build_automation(var.get_won_trigger(), [(cg.std_string, "wake_word")], config[CONF_ON_WON])
    if CONF_ON_LOST in config:
        await automation.build_automation(var.get_lost_trigger(), [(cg.std_string, "wake_word")], config[CONF_ON_LOST])
