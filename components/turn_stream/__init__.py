"""Turn stream: a live copy of the microphone to a turn detection service for the whole conversation.

The satellite tells the service what it is doing (listening for a request, speaking); the service follows the
speaker's voice and answers "end of turn" when the speaker is done (also when a TV keeps talking), or "interrupt"
when someone talks to the assistant while it speaks. on_end_of_turn can then silence what Home Assistant hears, so
its VAD ends the turn the normal way. Any service that speaks the small UDP protocol in turn_stream.h works
(wygate is one).

Actions: turn_stream.listen (a listening turn starts; starts the conversation stream), turn_stream.listen_done,
turn_stream.speaking / turn_stream.not_speaking, turn_stream.stop (the conversation is over; also happens by
itself after idle_timeout without listening or speaking).
"""

import esphome.codegen as cg
from esphome import automation
from esphome.components import microphone, socket, text
import esphome.config_validation as cv
from esphome.const import CONF_ID, CONF_MICROPHONE, CONF_PORT

CONF_SERVER = "server"
CONF_SERVER_TEXT = "server_text"

DEPENDENCIES = ["microphone", "network", "socket"]
CODEOWNERS = []

CONF_ON_END_OF_TURN = "on_end_of_turn"
CONF_ON_INTERRUPT = "on_interrupt"
CONF_IDLE_TIMEOUT = "idle_timeout"

turn_stream_ns = cg.esphome_ns.namespace("turn_stream")
TurnStream = turn_stream_ns.class_("TurnStream", cg.Component)



def validate_server(value):
    value = cv.string(value).strip()
    if not value:
        return ""
    host, sep, port = value.rpartition(":")
    if sep:
        socket.ipv4_host(host)
        cv.port(int(port) if port.isdigit() else port)
    else:
        socket.ipv4_host(value)
    return value


CONFIG_SCHEMA = cv.All(cv.Schema(
    {
        cv.GenerateID(): cv.declare_id(TurnStream),
        cv.Optional(CONF_MICROPHONE, default={}): microphone.microphone_source_schema(
            min_bits_per_sample=16, max_bits_per_sample=16
        ),
        # The service: "host" or "host:port" (IPv4 address or hostname; port defaults to `port`). server_text (a
        # text entity, editable in Home Assistant) wins when it is not empty; server is the fallback. Neither set:
        # start() does nothing (no turn detection).
        cv.Optional(CONF_SERVER, default=""): validate_server,
        cv.Optional(CONF_SERVER_TEXT): cv.use_id(text.Text),
        cv.Optional(CONF_PORT, default=10330): cv.port,
        cv.Optional(CONF_IDLE_TIMEOUT, default="5s"): cv.positive_time_period_milliseconds,
        cv.Optional(CONF_ON_END_OF_TURN): automation.validate_automation(single=True),
        cv.Optional(CONF_ON_INTERRUPT): automation.validate_automation(single=True),
    }
).extend(cv.COMPONENT_SCHEMA))

FINAL_VALIDATE_SCHEMA = cv.Schema(
    {
        cv.Optional(CONF_MICROPHONE): microphone.final_validate_microphone_source_schema(
            "turn_stream", sample_rate=16000
        ),
    },
    extra=cv.ALLOW_EXTRA,
)

ACTION_SCHEMA = cv.Schema({cv.GenerateID(): cv.use_id(TurnStream)})

automation.register_apply_action("turn_stream.listen", ACTION_SCHEMA, automation.ApplyCall("listen()"))
automation.register_apply_action("turn_stream.listen_done", ACTION_SCHEMA, automation.ApplyCall("listen_done()"))
automation.register_apply_action("turn_stream.speaking", ACTION_SCHEMA, automation.ApplyCall("set_speaking(true)"))
automation.register_apply_action(
    "turn_stream.not_speaking", ACTION_SCHEMA, automation.ApplyCall("set_speaking(false)")
)
automation.register_apply_action("turn_stream.stop", ACTION_SCHEMA, automation.ApplyCall("stop()"))


async def to_code(config):
    var = cg.new_Pvariable(config[CONF_ID])
    await cg.register_component(var, config)
    # passive: it never starts the microphone, it only copies what the wake word / voice assistant capture anyway
    mic_source = await microphone.microphone_source_to_code(config[CONF_MICROPHONE], passive=True)
    cg.add(var.set_microphone_source(mic_source))
    socket.require_ipv4_resolve()
    cg.add(var.set_server(config[CONF_SERVER]))
    if CONF_SERVER_TEXT in config:
        cg.add(var.set_server_text(await cg.get_variable(config[CONF_SERVER_TEXT])))
    cg.add(var.set_port(config[CONF_PORT]))
    cg.add(var.set_idle_timeout(config[CONF_IDLE_TIMEOUT]))
    if CONF_ON_END_OF_TURN in config:
        await automation.build_automation(
            var.get_end_trigger(), [(cg.uint8, "reason")], config[CONF_ON_END_OF_TURN]
        )
    if CONF_ON_INTERRUPT in config:
        await automation.build_automation(
            var.get_interrupt_trigger(), [(cg.uint32, "speech_ms_ago")], config[CONF_ON_INTERRUPT]
        )
