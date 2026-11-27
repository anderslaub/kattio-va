"""Constants for the Kattio integration (the Kattio panel in Home Assistant)."""

from typing import Final

DOMAIN: Final = "kattio"

CONF_TITLE: Final = "title"
CONF_ICON: Final = "icon"
CONF_PIPELINE: Final = "pipeline"
CONF_USERS: Final = "users"
CONF_TURN_SERVER: Final = "turn_server"

DEFAULT_OPTIONS: Final = {
    CONF_TITLE: "Kattio",
    CONF_ICON: "mdi:cat",
    # empty: the preferred Assist pipeline
    CONF_PIPELINE: "",
    # who may use the panel (Home Assistant user ids); empty: everyone
    CONF_USERS: [],
    # a turn detection service ("host" or "host:port", UDP); empty: Home Assistant's own end-of-speech detection
    CONF_TURN_SERVER: "",
}

# The turn detection service's port when none is given
DEFAULT_TURN_PORT: Final = 10330

# Where the panel lives in the frontend (/kattio) and where its files are served from
PANEL_URL_PATH: Final = "kattio"
STATIC_URL: Final = "/kattio_static"
PANEL_ELEMENT: Final = "kattio-panel"
PANEL_MODULE: Final = "kattio-panel.js"
