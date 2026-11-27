"""The Kattio panel: set up, options, removed."""

from homeassistant import config_entries
from homeassistant.components.frontend import DATA_PANELS
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResultType

from custom_components.kattio.const import DEFAULT_OPTIONS, DOMAIN, PANEL_URL_PATH


def _config(panel) -> dict:
    """What the page gets as panel.config (without Home Assistant's own part)"""
    return {k: v for k, v in panel.config.items() if k != "_panel_custom"}


async def _add(hass: HomeAssistant, **options):
    result = await hass.config_entries.flow.async_init(DOMAIN, context={"source": config_entries.SOURCE_USER})
    assert result["type"] is FlowResultType.FORM
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {**{k: v for k, v in DEFAULT_OPTIONS.items() if v != ""}, **options}
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    await hass.async_block_till_done()
    return hass.config_entries.async_entries(DOMAIN)[0]


async def test_setup_adds_the_panel(hass: HomeAssistant) -> None:
    entry = await _add(hass)
    panel = hass.data[DATA_PANELS][PANEL_URL_PATH]
    custom = panel.config["_panel_custom"]
    assert panel.sidebar_title == "Kattio"
    assert panel.sidebar_icon == "mdi:cat"
    assert custom["name"] == "kattio-panel"
    assert custom["module_url"].startswith("/kattio_static/kattio-panel.js?v=")
    assert not custom["module_url"].endswith("v=0")  # the built page is there
    assert _config(panel) == {"title": "Kattio", "pipeline": None, "users": [], "turn_detection": False}
    assert not panel.require_admin
    assert entry.title == "Kattio"


async def test_only_one(hass: HomeAssistant) -> None:
    await _add(hass)
    result = await hass.config_entries.flow.async_init(DOMAIN, context={"source": config_entries.SOURCE_USER})
    assert result["type"] is FlowResultType.ABORT


async def test_options_change_the_panel(hass: HomeAssistant) -> None:
    entry = await _add(hass)
    user = await hass.auth.async_create_user("Kid")
    result = await hass.config_entries.options.async_init(entry.entry_id)
    labels = {o["label"] for o in result["data_schema"].schema["users"].config["options"]}
    assert "Kid" in labels
    result = await hass.config_entries.options.async_configure(
        result["flow_id"],
        {"title": "Assistant", "icon": "mdi:robot", "pipeline": "abc123", "users": [user.id]},
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    await hass.async_block_till_done()
    panel = hass.data[DATA_PANELS][PANEL_URL_PATH]
    assert panel.sidebar_title == "Assistant"
    assert not panel.require_admin
    assert _config(panel) == {"title": "Assistant", "pipeline": "abc123", "users": [user.id], "turn_detection": False}


async def test_unload_removes_the_panel(hass: HomeAssistant) -> None:
    entry = await _add(hass)
    assert await hass.config_entries.async_unload(entry.entry_id)
    assert PANEL_URL_PATH not in hass.data[DATA_PANELS]
