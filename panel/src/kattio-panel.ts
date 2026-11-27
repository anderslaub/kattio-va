/**
 * The Kattio page in Home Assistant: the face on the top half; the conversation and the input below.
 *
 * It always opens in text mode (nothing is said out loud, the microphone stays off). Speaking comes in a later
 * version, only when asked for with the Speak button.
 */
import { LitElement, css, html, nothing, type PropertyValues } from "lit";
import { askText, type Hass } from "./assist";
import { placeholderFace, type Face, type FaceFactory } from "./face";
import { kattioFace } from "./kattio-face";

interface PanelConfig {
  title?: string;
  pipeline?: string | null;
  /** Home Assistant user ids who may use the page; empty: everyone */
  users?: string[];
}

interface Message {
  role: "user" | "assistant" | "error";
  text: string;
  pending?: boolean;
}

const STORE_KEY = "kattio-panel:conversation:v1";
const KEEP_MESSAGES = 100;

/** The face in use (swap this for another face); the simple one where the browser can't run Kattio's */
const makeFace: FaceFactory = kattioFace(placeholderFace);

class KattioPanel extends LitElement {
  static properties = {
    hass: { attribute: false },
    narrow: { type: Boolean },
    panel: { attribute: false },
    _messages: { state: true },
    _busy: { state: true },
    _draft: { state: true },
  };

  hass!: Hass;
  narrow = false;
  panel?: { config?: PanelConfig };

  private _messages: Message[] = [];
  private _busy = false;
  private _draft = "";
  private _conversationId: string | null = null;
  private _face?: Face;

  private get _config(): PanelConfig {
    return this.panel?.config ?? {};
  }

  connectedCallback(): void {
    super.connectedCallback();
    this._restore();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._face?.destroy();
    this._face = undefined;
  }

  protected updated(changed: PropertyValues): void {
    if (changed.has("_messages")) this._scrollToEnd();
    // the face is made once its place exists (not when the page is not for this user)
    const host = this.renderRoot.querySelector<HTMLElement>(".face");
    if (host && !this._face) {
      this._face = makeFace(host);
      this._face.setState("idle");
    } else if (!host && this._face) {
      this._face.destroy();
      this._face = undefined;
    }
  }

  private get _allowed(): boolean {
    const users = this._config.users ?? [];
    return users.length === 0 || (!!this.hass?.user?.id && users.includes(this.hass.user.id));
  }

  render() {
    const title = this._config.title || "Kattio";
    if (!this._allowed) {
      return html`
        <div class="toolbar">
          <ha-menu-button .hass=${this.hass} .narrow=${this.narrow}></ha-menu-button>
          <div class="title">${title}</div>
        </div>
        <div class="denied">${title} is not set up for you. Ask whoever runs this Home Assistant.</div>
      `;
    }
    return html`
      <div class="toolbar">
        <ha-menu-button .hass=${this.hass} .narrow=${this.narrow}></ha-menu-button>
        <div class="title">${title}</div>
        <button
          class="icon"
          title="New conversation"
          aria-label="New conversation"
          ?disabled=${this._busy || this._messages.length === 0}
          @click=${this._newConversation}
        >
          <ha-icon icon="mdi:message-plus-outline"></ha-icon>
        </button>
      </div>
      <div class="face" aria-hidden="true"></div>
      <div class="talk">
        <div class="messages" role="log" aria-live="polite">
          ${this._messages.length === 0
            ? html`<div class="hint">Write to ${title} below.</div>`
            : this._messages.map(
                // no whitespace around the text: the bubble keeps the text's own line breaks (pre-wrap)
                (m) =>
                  html`<div class="msg ${m.role} ${m.pending ? "pending" : ""}">${m.text ||
                    (m.pending ? html`<span class="dots"><i></i><i></i><i></i></span>` : nothing)}</div>`,
              )}
        </div>
        <div class="input">
          <button class="icon" title="Attach (coming later)" aria-label="Attach" disabled>
            <ha-icon icon="mdi:plus"></ha-icon>
          </button>
          <textarea
            rows="1"
            placeholder="Message ${title}"
            .value=${this._draft}
            @input=${(e: Event) => (this._draft = (e.target as HTMLTextAreaElement).value)}
            @keydown=${this._onKey}
          ></textarea>
          <button
            class="icon send"
            title="Send"
            aria-label="Send"
            ?disabled=${this._busy || !this._draft.trim()}
            @click=${this._send}
          >
            <ha-icon icon="mdi:send"></ha-icon>
          </button>
          <button class="icon" title="Speak (coming later)" aria-label="Speak" disabled>
            <ha-icon icon="mdi:microphone"></ha-icon>
          </button>
        </div>
      </div>
    `;
  }

  private _onKey(e: KeyboardEvent): void {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      this._send();
    }
  }

  private async _send(): Promise<void> {
    const text = this._draft.trim();
    if (!text || this._busy || !this.hass) return;
    this._draft = "";
    this._busy = true;
    const reply: Message = { role: "assistant", text: "", pending: true };
    this._messages = [...this._messages, { role: "user", text }, reply];
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
          this._messages = [...this._messages, { role: "error", text: message }];
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

  private _scrollToEnd(): void {
    const box = this.renderRoot.querySelector<HTMLElement>(".messages");
    if (box) box.scrollTop = box.scrollHeight;
  }

  /** The conversation survives a reload of the page (this browser tab only) */
  private _save(): void {
    try {
      const messages = this._messages.filter((m) => !m.pending).slice(-KEEP_MESSAGES);
      sessionStorage.setItem(STORE_KEY, JSON.stringify({ conversationId: this._conversationId, messages }));
    } catch {
      // storage unavailable: the conversation just isn't kept
    }
  }

  private _restore(): void {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORE_KEY) || "null");
      if (saved && Array.isArray(saved.messages)) {
        this._messages = saved.messages;
        this._conversationId = saved.conversationId ?? null;
      }
    } catch {
      // nothing kept
    }
  }

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100vh;
      height: 100dvh;
      background: var(--primary-background-color);
      color: var(--primary-text-color);
      font-family: var(--paper-font-body1_-_font-family, inherit);
    }
    .toolbar {
      display: flex;
      align-items: center;
      gap: 4px;
      height: var(--header-height, 56px);
      padding: 0 8px 0 4px;
      flex: none;
      background: var(--app-header-background-color, var(--primary-color));
      color: var(--app-header-text-color, var(--text-primary-color, #fff));
      border-bottom: var(--app-header-border-bottom, none);
    }
    .title {
      flex: 1;
      font-size: 20px;
      margin-left: 8px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .denied {
      margin: auto;
      padding: 16px;
      text-align: center;
      color: var(--secondary-text-color);
    }
    .face {
      flex: 1 1 50%;
      min-height: 96px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      overflow: hidden;
    }
    .face-canvas {
      display: block;
      width: 100%;
      height: 100%;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }
    .face .face-icon {
      --mdc-icon-size: min(40vw, 30vh, 220px);
      color: var(--primary-color);
      transition: transform 0.3s, opacity 0.3s;
    }
    .face[data-state="thinking"] .face-icon {
      animation: think 1.6s ease-in-out infinite;
    }
    .face[data-state="error"] .face-icon {
      color: var(--error-color, #db4437);
    }
    .face .face-status {
      min-height: 1.4em;
      color: var(--secondary-text-color);
    }
    @keyframes think {
      50% {
        transform: rotate(-6deg) scale(0.97);
        opacity: 0.75;
      }
    }
    .talk {
      flex: 1 1 50%;
      min-height: 0;
      display: flex;
      flex-direction: column;
      border-top: 1px solid var(--divider-color);
      background: var(--card-background-color, var(--primary-background-color));
    }
    .messages {
      flex: 3 1 0;
      min-height: 0;
      overflow-y: auto;
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .hint {
      margin: auto;
      color: var(--secondary-text-color);
    }
    .msg {
      max-width: 85%;
      padding: 8px 12px;
      border-radius: 16px;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      line-height: 1.4;
    }
    .msg.user {
      align-self: flex-end;
      background: var(--primary-color);
      color: var(--text-primary-color, #fff);
      border-bottom-right-radius: 4px;
    }
    .msg.assistant {
      align-self: flex-start;
      background: var(--secondary-background-color, rgba(127, 127, 127, 0.12));
      border-bottom-left-radius: 4px;
    }
    .msg.error {
      align-self: center;
      color: var(--error-color, #db4437);
      font-size: 0.9em;
    }
    .dots i {
      display: inline-block;
      width: 6px;
      height: 6px;
      margin: 0 2px;
      border-radius: 50%;
      background: currentColor;
      opacity: 0.4;
      animation: dot 1.2s infinite;
    }
    .dots i:nth-child(2) {
      animation-delay: 0.2s;
    }
    .dots i:nth-child(3) {
      animation-delay: 0.4s;
    }
    @keyframes dot {
      30% {
        opacity: 1;
      }
    }
    .input {
      flex: 1 1 0;
      min-height: 64px;
      max-height: 160px;
      display: flex;
      align-items: flex-end;
      gap: 4px;
      padding: 8px;
      border-top: 1px solid var(--divider-color);
    }
    textarea {
      flex: 1;
      align-self: stretch;
      min-width: 0;
      resize: none;
      border: 1px solid var(--divider-color);
      border-radius: 12px;
      padding: 8px 12px;
      font: inherit;
      font-size: 16px; /* 16px or more: phones don't zoom in on focus */
      color: inherit;
      background: var(--primary-background-color);
    }
    textarea:focus {
      outline: none;
      border-color: var(--primary-color);
    }
    button.icon {
      flex: none;
      width: 44px;
      height: 44px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: none;
      border-radius: 50%;
      background: none;
      color: inherit;
      cursor: pointer;
    }
    button.icon:hover:not([disabled]) {
      background: rgba(127, 127, 127, 0.15);
    }
    button.icon[disabled] {
      opacity: 0.35;
      cursor: default;
    }
    .input button.send:not([disabled]) {
      color: var(--primary-color);
    }
  `;
}

if (!customElements.get("kattio-panel")) customElements.define("kattio-panel", KattioPanel);
