"""Conversation history: own conversations, administrators read everyone's, the most recent 20 kept."""

from homeassistant import config_entries
from homeassistant.core import HomeAssistant
from homeassistant.setup import async_setup_component

from custom_components.kattio.const import DEFAULT_OPTIONS, DOMAIN
from custom_components.kattio.history import KEEP_PER_USER


async def _add(hass: HomeAssistant, users: list[str] | None = None) -> None:
    assert await async_setup_component(hass, "websocket_api", {})
    result = await hass.config_entries.flow.async_init(DOMAIN, context={"source": config_entries.SOURCE_USER})
    options = {k: v for k, v in DEFAULT_OPTIONS.items() if v != ""}
    if users is not None:
        options["users"] = users
    await hass.config_entries.flow.async_configure(result["flow_id"], options)
    await hass.async_block_till_done()


async def _call(ws, **msg):
    await ws.send_json_auto_id(msg)
    return await ws.receive_json()


def _messages(question: str) -> list[dict]:
    return [{"role": "user", "text": question}, {"role": "assistant", "text": "An answer"}]


async def test_own_conversations(hass: HomeAssistant, hass_ws_client, hass_admin_user) -> None:
    await _add(hass)
    ws = await hass_ws_client(hass)
    r = await _call(ws, type="kattio/history/save", conversation_id="c1", messages=_messages("Is anyone  home?"))
    assert r["success"]
    await _call(ws, type="kattio/history/save", conversation_id="c2", messages=_messages("Lights on"))
    r = await _call(ws, type="kattio/history/list")
    assert [c["id"] for c in r["result"]["conversations"]] == ["c2", "c1"]
    assert r["result"]["conversations"][1]["title"] == "Is anyone home?"
    assert r["result"]["conversations"][1]["mine"]
    # the most recent: c2; continuing c1 makes it the most recent
    r = await _call(ws, type="kattio/history/get")
    assert r["result"]["id"] == "c2"
    await _call(ws, type="kattio/history/save", conversation_id="c1", messages=_messages("Is anyone home?") * 2)
    r = await _call(ws, type="kattio/history/get")
    assert r["result"]["id"] == "c1" and len(r["result"]["messages"]) == 4
    r = await _call(ws, type="kattio/history/delete", conversation_id="c1")
    assert r["success"]
    r = await _call(ws, type="kattio/history/get", conversation_id="c1")
    assert r["result"] is None


async def test_keeps_the_most_recent(hass: HomeAssistant, hass_ws_client, hass_admin_user) -> None:
    await _add(hass)
    ws = await hass_ws_client(hass)
    for i in range(KEEP_PER_USER + 3):
        await _call(ws, type="kattio/history/save", conversation_id=f"c{i}", messages=_messages(f"Q{i}"))
    r = await _call(ws, type="kattio/history/list")
    ids = [c["id"] for c in r["result"]["conversations"]]
    assert len(ids) == KEEP_PER_USER
    assert ids[0] == f"c{KEEP_PER_USER + 2}" and "c0" not in ids


async def test_others_and_administrators(hass: HomeAssistant, hass_ws_client, hass_admin_user) -> None:
    await _add(hass)
    kid = await hass.auth.async_create_user("Kid", group_ids=["system-users"])
    kid_token = hass.auth.async_create_access_token(await hass.auth.async_create_refresh_token(kid, "test"))
    kid_ws = await hass_ws_client(hass, kid_token)
    admin_ws = await hass_ws_client(hass)
    await _call(kid_ws, type="kattio/history/save", conversation_id="k1", messages=_messages("Homework?"))
    await _call(admin_ws, type="kattio/history/save", conversation_id="a1", messages=_messages("Mine"))

    # the kid: own only
    r = await _call(kid_ws, type="kattio/history/list")
    assert [c["id"] for c in r["result"]["conversations"]] == ["k1"]
    assert not (await _call(kid_ws, type="kattio/history/list", everyone=True))["success"]
    assert (await _call(kid_ws, type="kattio/history/get", conversation_id="a1"))["result"] is None
    assert not (await _call(kid_ws, type="kattio/history/save", conversation_id="a1", messages=_messages("x")))[
        "success"
    ]
    assert not (await _call(kid_ws, type="kattio/history/delete", conversation_id="a1"))["success"]

    # the administrator: everyone's, read (not continued: saving into it is refused)
    r = await _call(admin_ws, type="kattio/history/list", everyone=True)
    by_id = {c["id"]: c for c in r["result"]["conversations"]}
    assert set(by_id) == {"k1", "a1"}
    assert by_id["k1"]["user_name"] == "Kid" and not by_id["k1"]["mine"]
    r = await _call(admin_ws, type="kattio/history/get", conversation_id="k1")
    assert r["result"]["messages"][0]["text"] == "Homework?" and not r["result"]["mine"]
    assert not (await _call(admin_ws, type="kattio/history/save", conversation_id="k1", messages=_messages("x")))[
        "success"
    ]
    # the administrator's own list is still only their own
    r = await _call(admin_ws, type="kattio/history/list")
    assert [c["id"] for c in r["result"]["conversations"]] == ["a1"]


async def test_allow_list(hass: HomeAssistant, hass_ws_client, hass_admin_user) -> None:
    other = await hass.auth.async_create_user("Guest")
    await _add(hass, users=[other.id])
    ws = await hass_ws_client(hass)  # the administrator, not on the list
    r = await _call(ws, type="kattio/history/list")
    assert not r["success"] and r["error"]["code"] == "unauthorized"
