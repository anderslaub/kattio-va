/**
 * The Kattio app for Android (android/ in this repository): the page inside it, as the phone's digital assistant.
 * The app adds `window.kattioApp`; in a browser or Home Assistant's own app there is none, and nothing changes.
 */
export interface KattioApp {
  /** A spoken conversation was asked for (the assistant gesture): true once */
  takeTalkRequest?(): boolean;
  /** Keep the screen on (the app does it: a WebView has no Wake Lock) */
  keepScreenOn?(on: boolean): void;
  /** The page is dark (or light), with this background colour (CSS): the app colours the phone's bars to match */
  setTheme?(dark: boolean, background: string): void;
  version?(): string;
}

/** The app asks again (the assistant gesture while the page is open): the page then calls takeTalkRequest */
export const APP_TALK_EVENT = "kattio-app-talk";

export function kattioApp(): KattioApp | undefined {
  return (window as unknown as { kattioApp?: KattioApp }).kattioApp;
}
