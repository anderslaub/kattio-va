/**
 * Settings for this device only (a phone in a pocket and a tablet on the wall want different things), kept in the
 * browser's local storage. Without storage (a private window, cleared site data) the defaults apply.
 */
export type ThemeSetting = "auto" | "light" | "dark";
export type StartMode = "text" | "speak";

export interface Settings {
  /** auto: as Home Assistant's theme */
  theme: ThemeSetting;
  /** How the page opens: text (quiet) or speak (listening, answers out loud) */
  start: StartMode;
  /** Keep the screen on while the page is open */
  keepAwake: boolean;
}

export const DEFAULT_SETTINGS: Settings = { theme: "auto", start: "text", keepAwake: false };

const KEY = "kattio-panel:settings:v1";

export function loadSettings(): Settings {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "null");
    if (saved && typeof saved === "object") {
      return {
        theme: ["auto", "light", "dark"].includes(saved.theme) ? saved.theme : DEFAULT_SETTINGS.theme,
        start: ["text", "speak"].includes(saved.start) ? saved.start : DEFAULT_SETTINGS.start,
        keepAwake: typeof saved.keepAwake === "boolean" ? saved.keepAwake : DEFAULT_SETTINGS.keepAwake,
      };
    }
  } catch {
    // no storage: defaults
  }
  return { ...DEFAULT_SETTINGS };
}

/** Returns false when the settings could not be kept (they still apply until the page closes) */
export function saveSettings(settings: Settings): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}

/**
 * Keeps the screen on while wanted and the page is visible (the browser lets go when the page is hidden; it is
 * asked again when the page shows).
 */
export class ScreenAwake {
  private lock: { release(): Promise<void> } | null = null;
  private wanted = false;
  private readonly onVisible = () => {
    if (document.visibilityState === "visible") void this.acquire();
  };

  static get supported(): boolean {
    return "wakeLock" in navigator;
  }

  set(wanted: boolean): void {
    if (wanted === this.wanted) return;
    this.wanted = wanted;
    if (wanted) {
      document.addEventListener("visibilitychange", this.onVisible);
      void this.acquire();
    } else {
      document.removeEventListener("visibilitychange", this.onVisible);
      void this.lock?.release().catch(() => {});
      this.lock = null;
    }
  }

  private async acquire(): Promise<void> {
    if (!this.wanted || this.lock || !ScreenAwake.supported || document.visibilityState !== "visible") return;
    try {
      const lock = await (navigator as any).wakeLock.request("screen");
      if (!this.wanted) {
        void lock.release();
        return;
      }
      this.lock = lock;
      lock.addEventListener?.("release", () => {
        if (this.lock === lock) this.lock = null;
      });
    } catch {
      // refused (battery saver, or not allowed here): the screen goes dark as usual
    }
  }
}
