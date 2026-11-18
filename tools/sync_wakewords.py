#!/usr/bin/env python3
"""Turns wakewords/<name>/latest.{json,tflite} (as delivered by the training pipeline) into
wakewords/<name>/esphome/<name>.{json,tflite}, the layout the firmware loads.

    python3 tools/sync_wakewords.py

ESPHome loads the .tflite named in the manifest's "model" field, next to the manifest, so the two files
must agree. Run this after dropping in a newly trained model, then rebuild.
"""

import json
import shutil
from pathlib import Path

root = Path(__file__).resolve().parent.parent / "wakewords"
for latest in sorted(root.glob("*/latest.json")):
    name = latest.parent.name
    manifest = json.loads(latest.read_text())
    manifest.pop("calibration", None)  # training metadata, not needed on the device
    manifest["model"] = f"{name}.tflite"
    out = latest.parent / "esphome"
    out.mkdir(exist_ok=True)
    shutil.copyfile(latest.parent / "latest.tflite", out / f"{name}.tflite")
    (out / f"{name}.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"{name}: \"{manifest['wake_word']}\", cutoff {manifest['micro']['probability_cutoff']}")
