"""Constants for the Kattio integration (the Kattio panel in Home Assistant)."""

from typing import Final

DOMAIN: Final = "kattio"

CONF_TITLE: Final = "title"
CONF_ICON: Final = "icon"
CONF_PIPELINE: Final = "pipeline"
CONF_USERS: Final = "users"

DEFAULT_OPTIONS: Final = {
    CONF_TITLE: "Kattio",
    CONF_ICON: "mdi:cat",
    # empty: the preferred Assist pipeline
    CONF_PIPELINE: "",
    # who may use the panel (Home Assistant user ids); empty: everyone
    CONF_USERS: [],
}

# Where the panel lives in the frontend (/kattio) and where its files are served from
PANEL_URL_PATH: Final = "kattio"
STATIC_URL: Final = "/kattio_static"
PANEL_ELEMENT: Final = "kattio-panel"
PANEL_MODULE: Final = "kattio-panel.js"
