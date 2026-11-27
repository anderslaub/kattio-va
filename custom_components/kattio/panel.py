"""The Kattio panel: a page in Home Assistant's sidebar (and the Companion apps) to talk to the assistant.

The page itself is built from panel/ (repository root) into www/. Everything the page needs to know comes from the
integration's options (passed as the panel's config), so nothing about a particular home is in the code.
"""

from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Any

from homeassistant.components import frontend, panel_custom
from homeassistant.components.http import StaticPathConfig
from homeassistant.core import HomeAssistant

from .const import (
    CONF_ICON,
    CONF_PIPELINE,
    CONF_TITLE,
    CONF_TURN_SERVER,
    CONF_USERS,
    DEFAULT_OPTIONS,
    DOMAIN,
    PANEL_ELEMENT,
    PANEL_MODULE,
    PANEL_URL_PATH,
    STATIC_URL,
)

WWW = Path(__file__).parent / "www"


def _version(folder: Path) -> str:
    """A short hash of the page's files (its code and the face engine), so a new version is never served from a
    browser's cache: the page asks for every file with this version"""
    digest = hashlib.sha256()
    files = sorted(folder.glob("*.js")) + sorted(folder.glob("*.wasm"))
    if not files:
        return "0"
    for f in files:
        digest.update(f.name.encode())
        digest.update(f.read_bytes())
    return digest.hexdigest()[:12]


async def async_register(hass: HomeAssistant, options: dict[str, Any]) -> None:
    """Serve the page's files (once) and add the panel with these options"""
    opts = {**DEFAULT_OPTIONS, **options}
    store = hass.data.setdefault(DOMAIN, {})
    if not store.get("static"):
        await hass.http.async_register_static_paths([StaticPathConfig(STATIC_URL, str(WWW), cache_headers=True)])
        store["static"] = True
    version = await hass.async_add_executor_job(_version, WWW)
    await panel_custom.async_register_panel(
        hass,
        frontend_url_path=PANEL_URL_PATH,
        webcomponent_name=PANEL_ELEMENT,
        sidebar_title=opts[CONF_TITLE] or DEFAULT_OPTIONS[CONF_TITLE],
        sidebar_icon=opts[CONF_ICON] or DEFAULT_OPTIONS[CONF_ICON],
        module_url=f"{STATIC_URL}/{PANEL_MODULE}?v={version}",
        config={
            "title": opts[CONF_TITLE] or DEFAULT_OPTIONS[CONF_TITLE],
            "pipeline": opts[CONF_PIPELINE] or None,
            # the page tells others it is not for them; what the integration itself does (speech, to come)
            # checks this list on the server
            "users": list(opts[CONF_USERS] or []),
            # a turn detection service is set (where it is stays on the server)
            "turn_detection": bool(str(opts.get(CONF_TURN_SERVER) or "").strip()),
        },
    )


def async_unregister(hass: HomeAssistant) -> None:
    """Remove the panel (the files stay served until Home Assistant restarts; harmless)"""
    frontend.async_remove_panel(hass, PANEL_URL_PATH, warn_if_unknown=False)
