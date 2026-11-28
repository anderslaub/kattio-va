/**
 * Settings for this device only (a phone in a pocket and a tablet on the wall want different things), kept in the
 * browser's local storage. Without storage (a private window, cleared site data) the defaults apply.
 */
import { kattioApp } from "./app";

export type ThemeSetting = "auto" | "light" | "dark";
export type StartMode = "text" | "speak";

export interface Settings {
  /** auto: as Home Assistant's theme */
  theme: ThemeSetting;
  /** How the page opens: text (quiet) or speak (listening, answers out loud) */
  start: StartMode;
  /** Keep the screen on while the page is open */
  keepAwake: boolean;
  /** Shown before the conversation starts; the first line large. Empty: the page's own greeting */
  greeting: string;
  /** Conversations are kept (in Home Assistant, per user) and listed for picking up again */
  history: boolean;
  /** When the page opens: continue the most recent conversation (else a new one) */
  resume: boolean;
  /** ... the user's most recent from any device (needs the history), else the last one on this device */
  resumeAnyDevice: boolean;
}

export const DEFAULT_SETTINGS: Settings = { theme: "auto", start: "text", keepAwake: false, greeting: "",
  history: true,
  resume: false,
  resumeAnyDevice: false,
};
/** Longest greeting kept */
export const GREETING_MAX = 300;

const KEY = "kattio-panel:settings:v1";

const bool = (value: unknown, fallback: boolean): boolean => (typeof value === "boolean" ? value : fallback);

export function loadSettings(): Settings {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "null");
    if (saved && typeof saved === "object") {
      return {
        theme: ["auto", "light", "dark"].includes(saved.theme) ? saved.theme : DEFAULT_SETTINGS.theme,
        start: ["text", "speak"].includes(saved.start) ? saved.start : DEFAULT_SETTINGS.start,
        keepAwake: bool(saved.keepAwake, DEFAULT_SETTINGS.keepAwake),
        greeting: typeof saved.greeting === "string" ? saved.greeting.slice(0, GREETING_MAX) : DEFAULT_SETTINGS.greeting,
        history: bool(saved.history, DEFAULT_SETTINGS.history),
        resume: bool(saved.resume, DEFAULT_SETTINGS.resume),
        resumeAnyDevice: bool(saved.resumeAnyDevice, DEFAULT_SETTINGS.resumeAnyDevice),
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
    return "wakeLock" in navigator || !!kattioApp()?.keepScreenOn;
  }

  set(wanted: boolean): void {
    if (wanted === this.wanted) return;
    this.wanted = wanted;
    // in the Kattio app, the app keeps the screen on
    const app = kattioApp();
    if (app?.keepScreenOn) return app.keepScreenOn(wanted);
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

/** A conversation as the page keeps it */
export interface SavedConversation {
  conversationId: string | null;
  messages: { role: string; text: string }[];
}

const LAST_KEY = "kattio-panel:last:v1";

/** The last conversation on this device, for whichever Home Assistant user had it (a shared tablet changes hands) */
export function loadLast(userId: string): SavedConversation | null {
  try {
    const saved = JSON.parse(localStorage.getItem(LAST_KEY) || "null");
    if (saved && saved.userId === userId && Array.isArray(saved.messages)) {
      return { conversationId: saved.conversationId ?? null, messages: saved.messages };
    }
  } catch {
    // nothing kept
  }
  return null;
}

export function saveLast(userId: string, conversation: SavedConversation): void {
  try {
    localStorage.setItem(LAST_KEY, JSON.stringify({ userId, ...conversation }));
  } catch {
    // not kept
  }
}
