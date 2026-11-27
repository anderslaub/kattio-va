"""Kattio: the Kattio voice assistant's page in Home Assistant, and each user's conversation history."""

from __future__ import annotations

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from . import history, panel
from .const import CONF_USERS


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Add the panel and the conversation history"""
    await history.async_setup(hass, list(entry.options.get(CONF_USERS) or []))
    history.set_loaded(hass, True)
    await panel.async_register(hass, dict(entry.options))
    entry.async_on_unload(entry.add_update_listener(_async_options_changed))
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Remove the panel (the history stays saved)"""
    panel.async_unregister(hass)
    history.set_loaded(hass, False)
    return True


async def _async_options_changed(hass: HomeAssistant, entry: ConfigEntry) -> None:
    await hass.config_entries.async_reload(entry.entry_id)
