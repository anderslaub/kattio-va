"""Config flow for Kattio: one entry; what the panel uses is set in its options."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.config_entries import ConfigEntry, ConfigFlow, ConfigFlowResult, OptionsFlow
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.selector import (
    AssistPipelineSelector,
    IconSelector,
    SelectOptionDict,
    SelectSelector,
    SelectSelectorConfig,
    SelectSelectorMode,
    TextSelector,
)

from .const import CONF_ICON, CONF_PIPELINE, CONF_TITLE, CONF_USERS, DEFAULT_OPTIONS, DOMAIN


async def _schema(hass: HomeAssistant, chosen: list[str]) -> vol.Schema:
    """The options; the people to choose from are Home Assistant's users (admins or not)"""
    users = [u for u in await hass.auth.async_get_users() if not u.system_generated and u.is_active]
    choices = [SelectOptionDict(value=u.id, label=u.name or u.id) for u in sorted(users, key=lambda u: u.name or "")]
    # someone chosen earlier and since removed stays listed, so saving does not fail
    known = {c["value"] for c in choices}
    choices += [SelectOptionDict(value=i, label=i) for i in chosen if i not in known]
    return vol.Schema(
        {
            vol.Required(CONF_TITLE): TextSelector(),
            vol.Required(CONF_ICON): IconSelector(),
            vol.Optional(CONF_PIPELINE): AssistPipelineSelector(),
            vol.Optional(CONF_USERS): SelectSelector(
                SelectSelectorConfig(options=choices, multiple=True, mode=SelectSelectorMode.DROPDOWN)
            ),
        }
    )


def _clean(user_input: dict[str, Any]) -> dict[str, Any]:
    return {**DEFAULT_OPTIONS, **{k: v for k, v in user_input.items() if v is not None}}


class KattioConfigFlow(ConfigFlow, domain=DOMAIN):
    """Add the Kattio panel."""

    VERSION = 1

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if self._async_current_entries():
            return self.async_abort(reason="single_instance_allowed")
        if user_input is not None:
            options = _clean(user_input)
            return self.async_create_entry(title=options[CONF_TITLE], data={}, options=options)
        return self.async_show_form(
            step_id="user",
            data_schema=self.add_suggested_values_to_schema(await _schema(self.hass, []), DEFAULT_OPTIONS),
        )

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> OptionsFlow:
        return KattioOptionsFlow()


class KattioOptionsFlow(OptionsFlow):
    """Change what the panel uses."""

    async def async_step_init(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if user_input is not None:
            # a field cleared in the form is left out: back to its default
            return self.async_create_entry(data=_clean(user_input))
        current = {**DEFAULT_OPTIONS, **self.config_entry.options}
        return self.async_show_form(
            step_id="init",
            data_schema=self.add_suggested_values_to_schema(
                await _schema(self.hass, list(current[CONF_USERS] or [])), current
            ),
        )
