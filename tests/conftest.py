"""Fixtures for the Kattio integration's tests."""

import pytest

from homeassistant.core import HomeAssistant
from homeassistant.setup import async_setup_component

from pytest_homeassistant_custom_component.common import mock_component

pytest_plugins = "pytest_homeassistant_custom_component"


@pytest.fixture(autouse=True)
async def auto_enable_custom_integrations(hass: HomeAssistant, enable_custom_integrations):
    """Enable custom integrations and what the panel depends on."""
    assert await async_setup_component(hass, "homeassistant", {})
    assert await async_setup_component(hass, "http", {})
    # the real frontend needs its built files (not installed for tests); panels are kept in its data either way
    mock_component(hass, "frontend")
    mock_component(hass, "panel_custom")
