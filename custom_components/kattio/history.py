"""Conversation history: each Home Assistant user's recent conversations with the assistant, kept by Home Assistant.

The page saves a conversation after each answer and lists, opens and deletes them through the websocket commands
below. Everyone sees and continues only their own; administrators can also read everyone else's (not continue
them). Only the most recent conversations of each user are kept.

The assistant's own memory of a conversation is the conversation agent's business: the page continues a conversation
by its id, and the agent may (or may not) still remember it.
"""

from __future__ import annotations

from dataclasses import dataclass, field
import time
from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.storage import Store

from .const import DOMAIN

STORAGE_KEY = f"{DOMAIN}.conversations"
STORAGE_VERSION = 1
SAVE_DELAY_S = 2

# Kept per user: the most recently active conversations
KEEP_PER_USER = 20
MAX_MESSAGES = 200
MAX_TEXT = 20_000
TITLE_LENGTH = 80
ROLES = ("user", "assistant", "note", "error")

DATA_HISTORY = f"{DOMAIN}_history"
DATA_COMMANDS = f"{DOMAIN}_history_commands"
DATA_LOADED = f"{DOMAIN}_history_loaded"


@dataclass
class History:
    """The conversations, by id; who may use the page (empty: everyone)"""

    store: Store
    conversations: dict[str, dict[str, Any]] = field(default_factory=dict)
    users: list[str] = field(default_factory=list)

    def allowed(self, user) -> bool:
        return not self.users or user.id in self.users

    def mine(self, user_id: str) -> list[tuple[str, dict[str, Any]]]:
        return sorted(
            ((cid, c) for cid, c in self.conversations.items() if c["user_id"] == user_id),
            key=lambda item: item[1]["updated"],
            reverse=True,
        )

    @callback
    def save(self, user_id: str, conversation_id: str, messages: list[dict[str, str]], title: str | None) -> None:
        now = time.time()
        old = self.conversations.get(conversation_id)
        self.conversations[conversation_id] = {
            "user_id": user_id,
            "title": (title or (old or {}).get("title") or _title(messages))[:TITLE_LENGTH],
            "created": (old or {}).get("created", now),
            "updated": now,
            "messages": messages[-MAX_MESSAGES:],
        }
        for cid, _ in self.mine(user_id)[KEEP_PER_USER:]:
            del self.conversations[cid]
        self._save()

    @callback
    def delete(self, conversation_id: str) -> None:
        self.conversations.pop(conversation_id, None)
        self._save()

    @callback
    def _save(self) -> None:
        self.store.async_delay_save(lambda: {"conversations": self.conversations}, SAVE_DELAY_S)


def _title(messages: list[dict[str, str]]) -> str:
    """The first question, on one line"""
    for m in messages:
        if m["role"] == "user" and m["text"].strip():
            return " ".join(m["text"].split())
    return ""


async def async_setup(hass: HomeAssistant, users: list[str]) -> None:
    """Load the conversations (once) and add the websocket commands (once per Home Assistant run)"""
    history: History | None = hass.data.get(DATA_HISTORY)
    if history is None:
        store: Store = Store(hass, STORAGE_VERSION, STORAGE_KEY, private=True)
        saved = await store.async_load() or {}
        history = History(store, dict(saved.get("conversations", {})))
        hass.data[DATA_HISTORY] = history
    history.users = list(users)
    if not hass.data.get(DATA_COMMANDS):
        hass.data[DATA_COMMANDS] = True
        for command in (ws_list, ws_get, ws_save, ws_delete):
            websocket_api.async_register_command(hass, command)


@callback
def set_loaded(hass: HomeAssistant, loaded: bool) -> None:
    """The integration is set up (the commands answer) or not"""
    hass.data[DATA_LOADED] = loaded


def _history(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> History | None:
    """The history if this user may use it; else an error is sent"""
    history: History | None = hass.data.get(DATA_HISTORY)
    if history is None or not hass.data.get(DATA_LOADED):
        connection.send_error(msg["id"], "not_loaded", "Kattio is not set up")
        return None
    if not history.allowed(connection.user):
        connection.send_error(msg["id"], websocket_api.ERR_UNAUTHORIZED, "Not allowed for this user")
        return None
    return history


def _summary(cid: str, c: dict[str, Any], me: str, names: dict[str, str]) -> dict[str, Any]:
    return {
        "id": cid,
        "title": c["title"],
        "updated": c["updated"],
        "count": len(c["messages"]),
        "user_id": c["user_id"],
        "user_name": names.get(c["user_id"], ""),
        "mine": c["user_id"] == me,
    }


async def _names(hass: HomeAssistant) -> dict[str, str]:
    return {u.id: u.name or "" for u in await hass.auth.async_get_users()}


@websocket_api.websocket_command(
    {vol.Required("type"): "kattio/history/list", vol.Optional("everyone", default=False): bool}
)
@websocket_api.async_response
async def ws_list(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    """This user's conversations, newest first; an administrator may ask for everyone's"""
    if (history := _history(hass, connection, msg)) is None:
        return
    me = connection.user.id
    if msg["everyone"] and not connection.user.is_admin:
        connection.send_error(msg["id"], websocket_api.ERR_UNAUTHORIZED, "Only administrators see everyone's")
        return
    items = (
        sorted(history.conversations.items(), key=lambda item: item[1]["updated"], reverse=True)
        if msg["everyone"]
        else history.mine(me)
    )
    names = await _names(hass)
    connection.send_result(msg["id"], {"conversations": [_summary(cid, c, me, names) for cid, c in items]})


@websocket_api.websocket_command(
    {
        vol.Required("type"): "kattio/history/get",
        # none: this user's most recently active conversation
        vol.Optional("conversation_id"): vol.Any(str, None),
    }
)
@websocket_api.async_response
async def ws_get(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    """One conversation with its messages (null when there is none)"""
    if (history := _history(hass, connection, msg)) is None:
        return
    me = connection.user.id
    cid = msg.get("conversation_id")
    if not cid:
        mine = history.mine(me)
        cid = mine[0][0] if mine else None
    c = history.conversations.get(cid) if cid else None
    if c is None or (c["user_id"] != me and not connection.user.is_admin):
        connection.send_result(msg["id"], None)
        return
    names = await _names(hass)
    connection.send_result(msg["id"], {**_summary(cid, c, me, names), "messages": c["messages"]})


@websocket_api.websocket_command(
    {
        vol.Required("type"): "kattio/history/save",
        vol.Required("conversation_id"): vol.All(str, vol.Length(min=1, max=100)),
        vol.Required("messages"): vol.All(
            [{vol.Required("role"): vol.In(ROLES), vol.Required("text"): vol.All(str, vol.Length(max=MAX_TEXT))}],
            vol.Length(max=MAX_MESSAGES),
        ),
        vol.Optional("title"): vol.All(str, vol.Length(max=TITLE_LENGTH)),
    }
)
@callback
def ws_save(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    """Keep (or update) one of this user's conversations"""
    if (history := _history(hass, connection, msg)) is None:
        return
    me = connection.user.id
    old = history.conversations.get(msg["conversation_id"])
    if old is not None and old["user_id"] != me:
        connection.send_error(msg["id"], websocket_api.ERR_UNAUTHORIZED, "Another user's conversation")
        return
    messages = [{"role": m["role"], "text": m["text"]} for m in msg["messages"]]
    if not messages:
        connection.send_result(msg["id"])
        return
    history.save(me, msg["conversation_id"], messages, msg.get("title"))
    connection.send_result(msg["id"])


@websocket_api.websocket_command(
    {vol.Required("type"): "kattio/history/delete", vol.Required("conversation_id"): str}
)
@callback
def ws_delete(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    """Forget a conversation: one's own; an administrator also anyone's"""
    if (history := _history(hass, connection, msg)) is None:
        return
    c = history.conversations.get(msg["conversation_id"])
    if c is not None and c["user_id"] != connection.user.id and not connection.user.is_admin:
        connection.send_error(msg["id"], websocket_api.ERR_UNAUTHORIZED, "Another user's conversation")
        return
    history.delete(msg["conversation_id"])
    connection.send_result(msg["id"])
