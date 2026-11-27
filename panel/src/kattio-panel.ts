/**
 * The Kattio page in Home Assistant: the face, the conversation and the input.
 *
 * Phone (tall): the face on the top third, the conversation below. Wide screens (a tablet on its side, a desktop):
 * the face on the left, the conversation on the right.
 *
 * It opens in text mode unless this device's settings say otherwise (Speak mode, for a tablet on the wall, comes in
 * the next version). Settings are per device: the gear in the top bar.
 */
import { LitElement, css, html, nothing, type PropertyValues } from "lit";
import { askText, type Hass } from "./assist";
import { placeholderFace, type Face, type FaceFactory } from "./face";
import { kattioFace } from "./kattio-face";
import { DEFAULT_SETTINGS, ScreenAwake, loadSettings, saveSettings, type Settings } from "./settings";

interface PanelConfig {
  title?: string;
  pipeline?: string | null;
  /** Home Assistant user ids who may use the page; empty: everyone */
  users?: string[];
}

interface Message {
  id: number;
  role: "user" | "assistant" | "error";
  text: string;
  pending?: boolean;
}

interface HassWithTheme extends Hass {
  themes?: { darkMode?: boolean };
}

const STORE_KEY = "kattio-panel:conversation:v1";
const KEEP_MESSAGES = 100;
/** Following the newest message: only when the reader is this close to the end (else they are reading back) */
const STICK_PX = 96;
/** The face and the conversation side by side from this width (and when wider than tall) */
const WIDE_PX = 720;

/** The face in use (swap this for another face); the simple one where the browser can't run Kattio's */
const makeFace: FaceFactory = kattioFace(placeholderFace);

let nextId = 1;

class KattioPanel extends LitElement {
  static properties = {
    hass: { attribute: false },
    narrow: { type: Boolean },
    panel: { attribute: false },
    _messages: { state: true },
    _busy: { state: true },
    _draft: { state: true },
    _settings: { state: true },
    _settingsOpen: { state: true },
    _wide: { type: Boolean, reflect: true, attribute: "wide" },
    _dark: { type: Boolean, reflect: true, attribute: "dark" },
  };

  hass!: HassWithTheme;
  narrow = false;
  panel?: { config?: PanelConfig };

  private _messages: Message[] = [];
  private _busy = false;
  private _draft = "";
  private _settings: Settings = { ...DEFAULT_SETTINGS };
  private _settingsOpen = false;
  private _wide = false;
  private _dark = false;
  private _conversationId: string | null = null;
  private _face?: Face;
  private _stick = true;
  private _smooth = false;
  private readonly _awake = new ScreenAwake();
  private readonly _resize = new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect;
    this._wide = width >= WIDE_PX && width > height * 1.05;
  });

  private get _config(): PanelConfig {
    return this.panel?.config ?? {};
  }

  private get _title(): string {
    return this._config.title || "Kattio";
  }

  private get _allowed(): boolean {
    const users = this._config.users ?? [];
    return users.length === 0 || (!!this.hass?.user?.id && users.includes(this.hass.user.id));
  }

  connectedCallback(): void {
    super.connectedCallback();
    this._restore();
    this._settings = loadSettings();
    this._resize.observe(this);
    window.addEventListener("keydown", this._onWindowKey);
    window.addEventListener("resize", this._fitHeight);
    window.visualViewport?.addEventListener("resize", this._fitHeight);
    requestAnimationFrame(this._fitHeight);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._resize.disconnect();
    window.removeEventListener("keydown", this._onWindowKey);
    window.removeEventListener("resize", this._fitHeight);
    window.visualViewport?.removeEventListener("resize", this._fitHeight);
    this._awake.set(false);
    this._face?.destroy();
    this._face = undefined;
  }

  protected willUpdate(changed: PropertyValues): void {
    if (changed.has("hass") || changed.has("_settings")) {
      const theme = this._settings.theme;
      this._dark = theme === "dark" || (theme === "auto" && !!this.hass?.themes?.darkMode);
    }
    if (changed.has("_settings")) this._awake.set(this._settings.keepAwake);
    // keep following the conversation only if the reader was at its end
    if (changed.has("_messages")) {
      const box = this.renderRoot?.querySelector<HTMLElement>(".messages");
      this._stick = !box || box.scrollHeight - box.scrollTop - box.clientHeight < STICK_PX;
    }
  }

  protected updated(changed: PropertyValues): void {
    if (changed.has("_messages") && this._stick) this._scrollToEnd(this._smooth);
    this._smooth = false;
    // the face is made once its place exists (not when the page is not for this user)
    const host = this.renderRoot.querySelector<HTMLElement>(".face");
    if (host && !this._face) {
      this._face = makeFace(host);
      this._face.setDark(this._dark);
      this._face.setState("idle");
    } else if (!host && this._face) {
      this._face.destroy();
      this._face = undefined;
    }
    if (changed.has("_dark")) this._face?.setDark(this._dark);
  }

  render() {
    if (!this._allowed) {
      return html`
        ${this._toolbar(false)}
        <div class="denied">${this._title} is not set up for you. Ask whoever runs this Home Assistant.</div>
      `;
    }
    return html`
      ${this._toolbar(true)}
      <div class="body">
        <div class="face" aria-hidden="true"></div>
        <div class="talk">
          <div class="messages" role="log" aria-live="polite">
            <div class="column">
              ${this._messages.length === 0
                ? html`<div class="empty">
                    <div class="empty-title">Hi, I'm ${this._title}.</div>
                    <div>Write to me below. You can pet me too.</div>
                  </div>`
                : this._messages.map((m) => this._message(m))}
            </div>
          </div>
          ${this._composer()}
        </div>
      </div>
      ${this._settingsOpen ? this._settingsSheet() : nothing}
    `;
  }

  private _toolbar(actions: boolean) {
    return html`<div class="toolbar">
      <ha-menu-button .hass=${this.hass} .narrow=${this.narrow}></ha-menu-button>
      <div class="title">${this._title}</div>
      ${actions
        ? html`<button
              class="icon"
              title="New conversation"
              aria-label="New conversation"
              ?disabled=${this._busy || this._messages.length === 0}
              @click=${this._newConversation}
            >
              <ha-icon icon="mdi:message-plus-outline"></ha-icon>
            </button>
            <button class="icon" title="Settings" aria-label="Settings" @click=${() => (this._settingsOpen = true)}>
              <ha-icon icon="mdi:cog-outline"></ha-icon>
            </button>`
        : nothing}
    </div>`;
  }

  private _message(m: Message) {
    // no whitespace around the text: the bubble keeps the text's own line breaks (pre-wrap)
    return html`<div class="msg ${m.role}">${m.text ||
      (m.pending ? html`<span class="dots" aria-label="Thinking"><i></i><i></i><i></i></span>` : nothing)}</div>`;
  }

  private _composer() {
    const canSend = !this._busy && !!this._draft.trim();
    return html`<div class="composer">
      <div class="field">
        <button class="icon small" title="Attach (coming later)" aria-label="Attach" disabled>
          <ha-icon icon="mdi:plus"></ha-icon>
        </button>
        <input
          type="text"
          enterkeyhint="send"
          autocomplete="off"
          placeholder="Message ${this._title}"
          aria-label="Message ${this._title}"
          .value=${this._draft}
          @input=${(e: Event) => (this._draft = (e.target as HTMLInputElement).value)}
          @keydown=${this._onKey}
        />
        <button class="icon small send" title="Send" aria-label="Send" ?disabled=${!canSend} @click=${this._send}>
          <ha-icon icon="mdi:send"></ha-icon>
        </button>
      </div>
      <button class="icon speak" title="Speak (coming in the next version)" aria-label="Speak" disabled>
        <ha-icon icon="mdi:microphone"></ha-icon>
      </button>
    </div>`;
  }

  private _settingsSheet() {
    const s = this._settings;
    const choice = <K extends keyof Settings>(key: K, value: Settings[K], label: string, disabled = false) =>
      html`<button
        class="choice ${s[key] === value ? "on" : ""}"
        role="radio"
        aria-checked=${s[key] === value ? "true" : "false"}
        ?disabled=${disabled}
        @click=${() => this._set(key, value)}
      >
        ${label}
      </button>`;
    return html`<div class="scrim" @click=${() => (this._settingsOpen = false)}></div>
      <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <div class="sheet-head">
          <div id="settings-title" class="sheet-title">Settings on this device</div>
          <button class="icon" aria-label="Close" title="Close" @click=${() => (this._settingsOpen = false)}>
            <ha-icon icon="mdi:close"></ha-icon>
          </button>
        </div>
        <div class="setting">
          <div class="label">Appearance</div>
          <div class="choices" role="radiogroup" aria-label="Appearance">
            ${choice("theme", "auto", "Auto")} ${choice("theme", "light", "Light")}
            ${choice("theme", "dark", "Dark")}
          </div>
        </div>
        <div class="setting">
          <div class="label">Start in</div>
          <div class="choices" role="radiogroup" aria-label="Start in">
            ${choice("start", "text", "Text")} ${choice("start", "speak", "Speak")}
          </div>
          <div class="note">
            ${s.start === "speak"
              ? html`Speak mode comes in the next version. Until then the page opens in text mode.`
              : html`Opens quietly: nothing is said out loud, and the microphone stays off.`}
          </div>
        </div>
        <label class="setting toggle">
          <div>
            <div class="label">Keep the screen on</div>
            <div class="note">
              ${ScreenAwake.supported
                ? "While this page is open, for a tablet on the wall."
                : "This browser can't keep the screen on."}
            </div>
          </div>
          <input
            type="checkbox"
            role="switch"
            .checked=${s.keepAwake}
            ?disabled=${!ScreenAwake.supported}
            @change=${(e: Event) => this._set("keepAwake", (e.target as HTMLInputElement).checked)}
          />
        </label>
        <div class="sheet-foot">Kept on this device only, in this browser.</div>
      </div>`;
  }

  private _set<K extends keyof Settings>(key: K, value: Settings[K]): void {
    this._settings = { ...this._settings, [key]: value };
    saveSettings(this._settings);
  }

  /**
   * The page fills exactly the space from its top to the bottom of what is visible: no scrolling of the whole
   * page (whatever Home Assistant puts around it), and the input stays above a phone's keyboard.
   */
  private readonly _fitHeight = () => {
    // the bottom of what is visible, in the same coordinates as the page's top
    const vv = window.visualViewport;
    const bottom = vv ? vv.offsetTop + vv.height : window.innerHeight;
    const top = this.getBoundingClientRect().top;
    this.style.height = `${Math.max(240, Math.round(bottom - Math.max(0, top)))}px`;
  };

  private readonly _onWindowKey = (e: KeyboardEvent) => {
    if (e.key === "Escape" && this._settingsOpen) this._settingsOpen = false;
  };

  private _onKey(e: KeyboardEvent): void {
    if (e.key === "Enter" && !e.isComposing) {
      e.preventDefault();
      this._send();
    }
  }

  private async _send(): Promise<void> {
    const text = this._draft.trim();
    if (!text || this._busy || !this.hass) return;
    this._draft = "";
    this._busy = true;
    const reply: Message = { id: nextId++, role: "assistant", text: "", pending: true };
    this._smooth = true;
    this._stick = true;
    this._messages = [...this._messages, { id: nextId++, role: "user", text }, reply];
    this._face?.setState("thinking");

    const refresh = () => (this._messages = [...this._messages]);
    await askText(
      this.hass,
      text,
      { pipeline: this._config.pipeline, conversationId: this._conversationId },
      {
        onText: (more, newMessage) => {
          reply.text += (newMessage && reply.text ? "\n\n" : "") + more;
          // text only, nothing said out loud: the mouth moves as the words come in
          this._face?.setState("speaking");
          if (more) this._face?.setLevel(0.45 + Math.random() * 0.4);
          refresh();
        },
        onDone: ({ speech, conversationId }) => {
          if (!reply.text.trim()) reply.text = speech;
          reply.pending = false;
          this._conversationId = conversationId ?? this._conversationId;
          this._face?.setState("idle");
          refresh();
        },
        onError: (message) => {
          reply.pending = false;
          if (!reply.text) this._messages = this._messages.filter((m) => m !== reply);
          this._messages = [...this._messages, { id: nextId++, role: "error", text: message }];
          this._face?.setState("error");
        },
      },
    );
    this._busy = false;
    this._save();
  }

  private _newConversation(): void {
    this._messages = [];
    this._conversationId = null;
    this._face?.setState("idle");
    this._save();
  }

  private _scrollToEnd(smooth: boolean): void {
    const box = this.renderRoot.querySelector<HTMLElement>(".messages");
    if (box) box.scrollTo({ top: box.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }

  /** The conversation survives a reload of the page (this browser tab only) */
  private _save(): void {
    try {
      const messages = this._messages
        .filter((m) => !m.pending)
        .slice(-KEEP_MESSAGES)
        .map(({ role, text }) => ({ role, text }));
      sessionStorage.setItem(STORE_KEY, JSON.stringify({ conversationId: this._conversationId, messages }));
    } catch {
      // storage unavailable: the conversation just isn't kept
    }
  }

  private _restore(): void {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORE_KEY) || "null");
      if (saved && Array.isArray(saved.messages)) {
        this._messages = saved.messages.map((m: Message) => ({ id: nextId++, role: m.role, text: m.text }));
        this._conversationId = saved.conversationId ?? null;
      }
    } catch {
      // nothing kept
    }
  }

  static styles = css`
    :host {
      /* light */
      --k-bg: #f6f6f8;
      --k-surface: #ffffff;
      --k-bubble: #ececf1;
      --k-text: #1d1d22;
      --k-muted: #6b6b76;
      --k-line: rgba(0, 0, 0, 0.08);
      --k-accent: var(--primary-color, #03a9f4);
      --k-on-accent: #ffffff;
      --k-error: var(--error-color, #db4437);
      --k-shadow: 0 1px 2px rgba(0, 0, 0, 0.06), 0 4px 16px rgba(0, 0, 0, 0.06);

      position: relative;
      display: flex;
      flex-direction: column;
      height: 100vh; /* until the page has measured its space */
      overflow: hidden;
      background: var(--k-bg);
      color: var(--k-text);
      font-family: var(--ha-font-family-body, Roboto, system-ui, sans-serif);
      -webkit-font-smoothing: antialiased;
    }
    :host([dark]) {
      --k-bg: #111114;
      --k-surface: #1c1c21;
      --k-bubble: #24242a;
      --k-text: #ececf1;
      --k-muted: #9a9aa6;
      --k-line: rgba(255, 255, 255, 0.08);
      --k-shadow: 0 1px 2px rgba(0, 0, 0, 0.3), 0 4px 16px rgba(0, 0, 0, 0.25);
      color-scheme: dark;
    }

    /* ---- top bar ---- */
    .toolbar {
      flex: none;
      display: flex;
      align-items: center;
      gap: 2px;
      height: 56px;
      padding: 0 6px 0 2px;
    }
    .title {
      flex: 1;
      margin-left: 6px;
      font-size: 20px;
      font-weight: 500;
      letter-spacing: 0.01em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* ---- layout ---- */
    .body {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
    }
    :host([wide]) .body {
      flex-direction: row;
    }
    .face {
      position: relative;
      flex: 0 0 33%;
      min-height: 120px;
      /* the mood's colour as a soft glow behind the face; the page's own background around it */
      background: radial-gradient(
        closest-side,
        color-mix(in srgb, var(--face-glow, transparent) 50%, transparent),
        transparent
      );
      transition: background 0.4s;
    }
    :host([dark]) .face {
      background: radial-gradient(
        closest-side,
        color-mix(in srgb, var(--face-glow, transparent) 30%, transparent),
        transparent
      );
    }
    :host([wide]) .face {
      flex: 0 0 42%;
      min-height: 0;
    }
    .face-canvas {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }
    .face .face-icon {
      --mdc-icon-size: min(40vw, 22vh, 200px);
      color: var(--k-accent);
    }
    .face:has(.face-icon) {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .face .face-status {
      min-height: 1.3em;
      color: var(--k-muted);
    }
    .talk {
      flex: 1;
      min-height: 0;
      min-width: 0;
      display: flex;
      flex-direction: column;
    }
    :host([wide]) .talk {
      padding-top: 8px;
    }

    /* ---- conversation ---- */
    .messages {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      overscroll-behavior: contain;
      -webkit-overflow-scrolling: touch;
      /* the newest messages sit just above the input; older ones fade out under the face */
      mask-image: linear-gradient(to bottom, transparent 0, #000 18px);
      -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 18px);
    }
    .column {
      box-sizing: border-box;
      min-height: 100%;
      max-width: 760px;
      margin: 0 auto;
      padding: 16px 16px 8px;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      gap: 6px;
    }
    .empty {
      margin: auto;
      text-align: center;
      color: var(--k-muted);
      line-height: 1.5;
    }
    .empty-title {
      color: var(--k-text);
      font-size: 18px;
      font-weight: 500;
      margin-bottom: 2px;
    }
    .msg {
      max-width: min(82%, 600px);
      padding: 9px 14px;
      border-radius: 20px;
      font-size: 16px;
      line-height: 1.45;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      animation: appear 0.22s ease-out both;
    }
    .msg.user {
      align-self: flex-end;
      margin-top: 6px;
      background: var(--k-accent);
      color: var(--k-on-accent);
      border-bottom-right-radius: 6px;
    }
    .msg.assistant {
      align-self: flex-start;
      background: var(--k-bubble);
      border-bottom-left-radius: 6px;
    }
    .msg.error {
      align-self: center;
      padding: 4px 12px;
      font-size: 14px;
      color: var(--k-error);
      background: color-mix(in srgb, var(--k-error) 12%, transparent);
    }
    @keyframes appear {
      from {
        opacity: 0;
        transform: translateY(6px);
      }
    }
    .dots {
      display: inline-flex;
      gap: 4px;
      padding: 6px 0;
    }
    .dots i {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: currentColor;
      opacity: 0.3;
      animation: dot 1.2s infinite ease-in-out;
    }
    .dots i:nth-child(2) {
      animation-delay: 0.15s;
    }
    .dots i:nth-child(3) {
      animation-delay: 0.3s;
    }
    @keyframes dot {
      30% {
        opacity: 0.9;
        transform: translateY(-2px);
      }
    }

    /* ---- input ---- */
    .composer {
      flex: none;
      box-sizing: border-box;
      width: 100%;
      max-width: 792px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px calc(12px + env(safe-area-inset-bottom, 0px));
    }
    .field {
      flex: 1;
      min-width: 0;
      display: flex;
      align-items: center;
      height: 48px;
      padding: 0 4px;
      border-radius: 24px;
      background: var(--k-surface);
      box-shadow: var(--k-shadow);
      border: 1px solid var(--k-line);
      transition: border-color 0.15s;
    }
    .field:focus-within {
      border-color: color-mix(in srgb, var(--k-accent) 60%, transparent);
    }
    input[type="text"] {
      flex: 1;
      min-width: 0;
      height: 100%;
      border: none;
      outline: none;
      background: transparent;
      color: inherit;
      font: inherit;
      font-size: 16px; /* 16px or more: phones don't zoom in on focus */
      padding: 0 4px;
    }
    input[type="text"]::placeholder {
      color: var(--k-muted);
    }

    /* ---- buttons ---- */
    button.icon {
      flex: none;
      width: 44px;
      height: 44px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      border: none;
      border-radius: 50%;
      background: none;
      color: inherit;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      transition: background 0.15s, color 0.15s, opacity 0.15s, transform 0.1s;
    }
    button.icon.small {
      width: 40px;
      height: 40px;
      color: var(--k-muted);
    }
    button.icon:hover:not([disabled]) {
      background: color-mix(in srgb, currentColor 10%, transparent);
    }
    button.icon:active:not([disabled]) {
      transform: scale(0.94);
    }
    button.icon[disabled] {
      opacity: 0.35;
      cursor: default;
    }
    button.icon.send:not([disabled]) {
      color: var(--k-accent);
    }
    button.icon.speak {
      width: 48px;
      height: 48px;
      background: var(--k-surface);
      box-shadow: var(--k-shadow);
      border: 1px solid var(--k-line);
    }
    button:focus-visible {
      outline: 2px solid var(--k-accent);
      outline-offset: 2px;
    }
    /* the input's pill shows the focus */
    input[type="text"]:focus-visible {
      outline: none;
    }

    /* ---- settings ---- */
    .scrim {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.35);
      animation: fade 0.18s ease-out;
      z-index: 1;
    }
    .sheet {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 2;
      box-sizing: border-box;
      max-height: 85%;
      overflow-y: auto;
      padding: 8px 20px calc(20px + env(safe-area-inset-bottom, 0px));
      background: var(--k-surface);
      border-radius: 20px 20px 0 0;
      box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.2);
      animation: rise 0.22s cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    :host([wide]) .sheet {
      left: 50%;
      right: auto;
      bottom: auto;
      top: 50%;
      width: min(440px, 90%);
      transform: translate(-50%, -50%);
      border-radius: 20px;
      animation: pop 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    .sheet-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin: 0 -10px 4px 0;
    }
    .sheet-title {
      font-size: 18px;
      font-weight: 500;
    }
    .setting {
      display: block;
      padding: 14px 0;
      border-top: 1px solid var(--k-line);
    }
    .setting.toggle {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      cursor: pointer;
    }
    .label {
      font-weight: 500;
      margin-bottom: 8px;
    }
    .toggle .label {
      margin-bottom: 2px;
    }
    .note {
      margin-top: 8px;
      font-size: 14px;
      line-height: 1.4;
      color: var(--k-muted);
    }
    .toggle .note {
      margin-top: 0;
    }
    .choices {
      display: flex;
      padding: 3px;
      gap: 3px;
      border-radius: 12px;
      background: var(--k-bubble);
    }
    .choice {
      flex: 1;
      min-height: 38px;
      padding: 0 8px;
      border: none;
      border-radius: 9px;
      background: none;
      color: var(--k-muted);
      font: inherit;
      font-size: 14px;
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
    }
    .choice.on {
      background: var(--k-surface);
      color: var(--k-text);
      font-weight: 500;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
    }
    input[type="checkbox"][role="switch"] {
      appearance: none;
      -webkit-appearance: none;
      flex: none;
      position: relative;
      width: 44px;
      height: 26px;
      margin: 0;
      border-radius: 13px;
      background: color-mix(in srgb, var(--k-muted) 45%, transparent);
      cursor: pointer;
      transition: background 0.18s;
    }
    input[type="checkbox"][role="switch"]::after {
      content: "";
      position: absolute;
      top: 3px;
      left: 3px;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #fff;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
      transition: transform 0.18s;
    }
    input[type="checkbox"][role="switch"]:checked {
      background: var(--k-accent);
    }
    input[type="checkbox"][role="switch"]:checked::after {
      transform: translateX(18px);
    }
    input[type="checkbox"][role="switch"]:disabled {
      opacity: 0.4;
    }
    .sheet-foot {
      padding-top: 12px;
      border-top: 1px solid var(--k-line);
      font-size: 13px;
      color: var(--k-muted);
    }
    @keyframes fade {
      from {
        opacity: 0;
      }
    }
    @keyframes rise {
      from {
        transform: translateY(100%);
      }
    }
    @keyframes pop {
      from {
        opacity: 0;
        transform: translate(-50%, -46%);
      }
    }

    .denied {
      margin: auto;
      padding: 16px;
      text-align: center;
      color: var(--k-muted);
    }
    @media (prefers-reduced-motion: reduce) {
      .msg,
      .sheet,
      .scrim {
        animation: none;
      }
    }
  `;
}

if (!customElements.get("kattio-panel")) customElements.define("kattio-panel", KattioPanel);
