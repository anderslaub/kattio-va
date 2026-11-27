"""Turn detection relay: the page's audio goes out as the boxes' KTS2 packets, KTE2 events come back to the page."""

import asyncio
import struct

from homeassistant import config_entries
from homeassistant.core import HomeAssistant
from homeassistant.setup import async_setup_component

from custom_components.kattio.const import DEFAULT_OPTIONS, DOMAIN
from custom_components.kattio.voice import parse_server


class FakeService(asyncio.DatagramProtocol):
    """A turn detection service that keeps what it receives"""

    def __init__(self) -> None:
        self.packets: list[tuple[bytes, object]] = []
        self.got = asyncio.Event()

    def connection_made(self, transport) -> None:
        self.transport = transport

    def datagram_received(self, data: bytes, addr) -> None:
        self.packets.append((data, addr))
        self.got.set()

    async def wait(self, n: int) -> None:
        while len(self.packets) < n:
            self.got.clear()
            await asyncio.wait_for(self.got.wait(), 2)


async def _add(hass: HomeAssistant, turn_server: str) -> None:
    assert await async_setup_component(hass, "websocket_api", {})
    result = await hass.config_entries.flow.async_init(DOMAIN, context={"source": config_entries.SOURCE_USER})
    options = {k: v for k, v in DEFAULT_OPTIONS.items() if v != ""}
    if turn_server:
        options["turn_server"] = turn_server
    await hass.config_entries.flow.async_configure(result["flow_id"], options)
    await hass.async_block_till_done()


def test_parse_server() -> None:
    assert parse_server("").host == ""
    assert (parse_server("turns.local").host, parse_server("turns.local").port) == ("turns.local", 10330)
    assert (parse_server(" 10.0.0.5:9000 ").host, parse_server("10.0.0.5:9000").port) == ("10.0.0.5", 9000)


async def test_not_configured(hass: HomeAssistant, hass_ws_client, hass_admin_user) -> None:
    await _add(hass, "")
    ws = await hass_ws_client(hass)
    await ws.send_json_auto_id({"type": "kattio/voice/stream"})
    r = await ws.receive_json()
    assert not r["success"] and r["error"]["code"] == "not_configured"


async def test_relay(hass: HomeAssistant, hass_ws_client, hass_admin_user) -> None:
    loop = asyncio.get_running_loop()
    transport, service = await loop.create_datagram_endpoint(FakeService, local_addr=("127.0.0.1", 0))
    port = transport.get_extra_info("sockname")[1]
    try:
        await _add(hass, f"127.0.0.1:{port}")
        ws = await hass_ws_client(hass)
        await ws.send_json_auto_id({"type": "kattio/voice/stream"})
        r = await ws.receive_json()
        assert r["success"]
        sub = r["id"]
        ready = await ws.receive_json()
        assert ready["event"]["type"] == "ready"
        handler = ready["event"]["handler_id"]

        # listening, turn 1, 100 ms of audio: split into 40 ms packets, the first one starts the session
        audio = bytes(range(256)) * 12 + bytes(128)
        await ws.send_bytes(bytes([handler, 4, 1]) + audio)
        await service.wait(3)
        first = service.packets[0][0]
        assert first[:4] == b"KTS2"
        session, seq, flags, turn = struct.unpack_from("<IIBB", first, 4)
        assert (seq, flags, turn) == (0, 1 | 4, 1)
        assert b"".join(p[14:] for p, _ in service.packets[:3]) == audio
        assert [len(p) - 14 for p, _ in service.packets[:3]] == [1280, 1280, 640]

        # the service: end of turn 1 (complete), then an interruption that began 700 ms ago
        addr = service.packets[0][1]
        transport.sendto(b"KTE2" + struct.pack("<IBB", session, 1, 1), addr)
        ev = await ws.receive_json()
        assert ev["id"] == sub and ev["event"] == {"type": "end_of_turn", "turn": 1, "reason": 1}
        transport.sendto(b"KTE2" + struct.pack("<IBBH", session, 1, 16, 700), addr)
        ev = await ws.receive_json()
        assert ev["event"] == {"type": "interrupt", "turn": 1, "ago_ms": 700}
        # another conversation's events are not passed on
        transport.sendto(b"KTE2" + struct.pack("<IBB", session ^ 1, 1, 1), addr)

        # the end of the conversation: a STOP packet
        n = len(service.packets)
        await ws.send_json_auto_id({"type": "unsubscribe_events", "subscription": sub})
        r = await ws.receive_json()
        assert r["success"]
        await service.wait(n + 1)
        assert service.packets[-1][0][12] & 2
    finally:
        transport.close()
