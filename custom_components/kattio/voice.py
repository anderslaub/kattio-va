"""Turn detection for a conversation spoken on the page: the page's microphone, relayed to a turn detection service.

A browser cannot send UDP, so the page streams its microphone (16 kHz s16le mono) over its websocket connection to
Home Assistant, and this relays it to the turn detection service in the same protocol the Kattio boxes use (see
components/turn_stream: "KTS2" packets with the conversation's state, "KTE2" events back). The page hears from the
service when the speaker is done and when someone interrupts the answer.

The websocket command `kattio/voice/stream` (a subscription; one per conversation):
    events to the page   {"type": "ready", "handler_id": n}: send binary messages to handler n:
                             u8 n, u8 flags (4 LISTENING, 8 SPEAKING), u8 turn, then the audio (may be empty: the state
                             changed)
                         {"type": "end_of_turn", "turn": t, "reason": 1 complete | 2 the speaker is quiet | 3 too long}
                         {"type": "interrupt", "turn": t, "ago_ms": ms}: someone talks to the assistant while it speaks;
                             their speech began ms before
    ending the subscription ends the conversation.
Errors: "not_configured" when no turn detection service is set (the page then uses the pipeline's own end-of-speech
detection), "unauthorized" for someone who may not use the page.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
import logging
import secrets
import socket
import struct
import time
from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback

from .const import DEFAULT_TURN_PORT, DOMAIN
from .history import DATA_HISTORY, DATA_LOADED, History

_LOGGER = logging.getLogger(__name__)

DATA_VOICE = f"{DOMAIN}_voice"
DATA_COMMANDS = f"{DOMAIN}_voice_commands"

FLAG_START = 1
FLAG_STOP = 2
FLAG_LISTENING = 4
FLAG_SPEAKING = 8
# Flags the page may set
PAGE_FLAGS = FLAG_LISTENING | FLAG_SPEAKING
# Audio per packet: 40 ms
MAX_AUDIO = 1280
# The state goes out at least this often while no audio flows (the service ends a silent conversation)
KEEPALIVE_S = 1.0
EVENT_END = {1, 2, 3}
EVENT_INTERRUPT = 16


@dataclass
class VoiceConfig:
    """The turn detection service: host and port (no host: none)"""

    host: str = ""
    port: int = DEFAULT_TURN_PORT


def parse_server(server: str | None) -> VoiceConfig:
    """ "host" or "host:port" """
    server = (server or "").strip()
    if not server:
        return VoiceConfig()
    host, _, port = server.rpartition(":")
    if host and port.isdigit() and 0 < int(port) < 65536:
        return VoiceConfig(host.strip("[]"), int(port))
    return VoiceConfig(server)


async def async_setup(hass: HomeAssistant, server: str | None) -> None:
    """Use this turn detection service (empty: none); the commands are added once per Home Assistant run"""
    hass.data[DATA_VOICE] = parse_server(server)
    if not hass.data.get(DATA_COMMANDS):
        hass.data[DATA_COMMANDS] = True
        websocket_api.async_register_command(hass, ws_stream)


class _Receiver(asyncio.DatagramProtocol):
    def __init__(self, relay: "Relay") -> None:
        self.relay = relay

    def datagram_received(self, data: bytes, addr: Any) -> None:
        self.relay.received(data)

    def error_received(self, exc: Exception) -> None:
        # e.g. nothing listens on the port (yet): the page keeps working with the pipeline's own detection
        _LOGGER.debug("Turn detection service: %s", exc)


class Relay:
    """One conversation: the page's audio to the service, its events back to the page"""

    def __init__(self, hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg_id: int) -> None:
        self.hass = hass
        self.connection = connection
        self.msg_id = msg_id
        self.session = secrets.randbits(32)
        self.seq = 0
        self.flags = 0
        self.turn = 0
        self.started = False
        self.closed = False
        self.last_send = 0.0
        self.transport: asyncio.DatagramTransport | None = None
        self.unregister: Any = None
        self.keepalive: asyncio.TimerHandle | None = None

    async def open(self, config: VoiceConfig) -> None:
        loop = self.hass.loop
        infos = await loop.getaddrinfo(config.host, config.port, family=socket.AF_INET, type=socket.SOCK_DGRAM)
        if not infos:
            raise OSError(f"{config.host} not found")
        self.transport, _ = await loop.create_datagram_endpoint(
            lambda: _Receiver(self), remote_addr=infos[0][4], family=socket.AF_INET
        )
        self._schedule()

    def _packet(self, extra: int, audio: bytes = b"") -> None:
        if self.transport is None or self.transport.is_closing():
            return
        if not self.started:
            self.started = True
            extra |= FLAG_START
        header = b"KTS2" + struct.pack("<IIBB", self.session, self.seq, (self.flags | extra) & 0xFF, self.turn & 0xFF)
        self.seq = (self.seq + 1) & 0xFFFFFFFF
        self.transport.sendto(header + audio)
        self.last_send = time.monotonic()

    @callback
    def from_page(self, _hass: HomeAssistant, _connection: websocket_api.ActiveConnection, data: bytes) -> None:
        """A binary message: flags, turn, then audio"""
        if self.closed or len(data) < 2:
            return
        flags, turn = data[0] & PAGE_FLAGS, data[1]
        audio = data[2:]
        changed = flags != self.flags or turn != self.turn
        self.flags, self.turn = flags, turn
        if not audio:
            if changed or not self.started:
                self._packet(0)
            return
        if len(audio) % 2:
            audio = audio[:-1]
        for i in range(0, len(audio), MAX_AUDIO):
            self._packet(0, audio[i : i + MAX_AUDIO])

    def _schedule(self) -> None:
        self.keepalive = self.hass.loop.call_later(KEEPALIVE_S, self._tick)

    def _tick(self) -> None:
        if self.closed:
            return
        if time.monotonic() - self.last_send >= KEEPALIVE_S:
            self._packet(0)
        self._schedule()

    def received(self, data: bytes) -> None:
        if self.closed or len(data) < 10 or data[:4] != b"KTE2":
            return
        session, turn, event = struct.unpack_from("<IBB", data, 4)
        if session != self.session:
            return
        if event == EVENT_INTERRUPT:
            ago = struct.unpack_from("<H", data, 10)[0] if len(data) >= 12 else 0
            self._event({"type": "interrupt", "turn": turn, "ago_ms": ago})
        elif event in EVENT_END:
            self._event({"type": "end_of_turn", "turn": turn, "reason": event})

    def _event(self, event: dict[str, Any]) -> None:
        self.connection.send_message(websocket_api.event_message(self.msg_id, event))

    @callback
    def close(self) -> None:
        if self.closed:
            return
        self.flags = 0
        self._packet(FLAG_STOP)
        self.closed = True
        if self.keepalive:
            self.keepalive.cancel()
        if self.unregister:
            self.unregister()
        if self.transport:
            self.transport.close()


@websocket_api.websocket_command({vol.Required("type"): "kattio/voice/stream"})
@websocket_api.async_response
async def ws_stream(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    """A spoken conversation's microphone to the turn detection service (see the module's description)"""
    history: History | None = hass.data.get(DATA_HISTORY)
    if history is None or not hass.data.get(DATA_LOADED):
        connection.send_error(msg["id"], "not_loaded", "Kattio is not set up")
        return
    if not history.allowed(connection.user):
        connection.send_error(msg["id"], websocket_api.ERR_UNAUTHORIZED, "Not allowed for this user")
        return
    config: VoiceConfig = hass.data.get(DATA_VOICE) or VoiceConfig()
    if not config.host:
        connection.send_error(msg["id"], "not_configured", "No turn detection server is set")
        return
    relay = Relay(hass, connection, msg["id"])
    try:
        await relay.open(config)
    except OSError as err:
        _LOGGER.warning("Turn detection server %s:%s: %s", config.host, config.port, err)
        relay.close()
        connection.send_error(msg["id"], "unavailable", "The turn detection server can't be reached")
        return
    handler_id, relay.unregister = connection.async_register_binary_handler(relay.from_page)
    connection.subscriptions[msg["id"]] = relay.close
    connection.send_result(msg["id"])
    relay._event({"type": "ready", "handler_id": handler_id})
