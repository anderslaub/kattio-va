/**
 * The Kattio page in Home Assistant: the face, the conversation and the input.
 *
 * Phone (tall): the face on the top third, the conversation below. Wide screens (a tablet on its side, a desktop):
 * the face on the left, the conversation on the right.
 *
 * Typed questions are answered in text only (nothing out loud: fine in a supermarket). The microphone button starts
 * a spoken conversation, as with a box (talk.ts). A wake word (Speak mode, for a tablet on the wall) comes later. Settings are per device: the gear in the top bar.
 */
import { LitElement, css, html, nothing, type PropertyValues } from "lit";
import { askText, type Hass } from "./assist";
import { placeholderFace, type Face, type FaceFactory } from "./face";
import { kattioFace } from "./kattio-face";
import {
  DEFAULT_SETTINGS,
  GREETING_MAX,
  ScreenAwake,
  loadLast,
  loadSettings,
  saveLast,
  saveSettings,
  type SavedConversation,
  type Settings,
} from "./settings";
import {
  deleteConversation,
  getConversation,
  listConversations,
  saveConversation,
  newConversationId,
  whenText,
  type ConversationSummary,
} from "./history";
import { microphoneSupported, startTalk, type Talk, type TalkState } from "./talk";

interface PanelConfig {
  title?: string;
  pipeline?: string | null;
  /** Home Assistant user ids who may use the page; empty: everyone */
  users?: string[];
  /** The integration relays a spoken conversation to a turn detection service */
  turn_detection?: boolean;
}

interface Message {
  id: number;
  /** note: something about the conversation, not part of it (nothing heard, an answer stopped) */
  role: "user" | "assistant" | "error" | "note";
  text: string;
  pending?: boolean;
}

interface HassWithTheme extends Hass {
  themes?: { darkMode?: boolean };
}

const STORE_KEY = "kattio-panel:conversation:v1";
const KEEP_MESSAGES = 100;
/** At the end of the conversation when this close to it */
const END_PX = 24;
/** The face and the conversation side by side from this width (and when wider than tall) */
const WIDE_PX = 720;

/** The face in use (swap this for another face); the simple one where the browser can't run Kattio's */
const makeFace: FaceFactory = kattioFace(placeholderFace);

let nextId = 1;

/** Where a spoken conversation is */
type VoicePhase = "off" | TalkState;

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
    _behind: { state: true },
    _historyOpen: { state: true },
    _history: { state: true },
    _historyEveryone: { state: true },
    _historyError: { state: true },
    _confirmDelete: { state: true },
    _readOnly: { state: true },
    _voicePhase: { state: true },
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
  /** Scrolling along with the conversation; off once the reader scrolls back, on again at its end */
  private _follow = true;
  /** A scroll the page started is under way (so it isn't taken for the reader's) */
  private _autoScroll = false;
  /** New text below while the reader is further up: the jump-to-the-end button shows */
  private _behind = false;
  private _smooth = false;
  /** A finger is on the conversation: the page doesn't scroll it meanwhile */
  private _touching = false;
  private _talk?: Talk;
  private _voicePhase: VoicePhase = "off";
  /** The page has decided what to show first (needs hass: who the user is) */
  private _started = false;
  private _historyOpen = false;
  /** The list in the history sheet; null while it loads */
  private _history: ConversationSummary[] | null = null;
  /** An administrator looking at everyone's conversations */
  private _historyEveryone = false;
  private _historyError = "";
  /** Asked once before deleting: the conversation whose delete button was tapped */
  private _confirmDelete: string | null = null;
  /** Reading someone else's conversation (an administrator): whose; the user's own is kept aside meanwhile */
  private _readOnly: { name: string } | null = null;
  private _ownAside?: { messages: Message[]; conversationId: string | null };
  private _observedLog?: Element;
  /** The conversation's box changes size (the keyboard opens, the window turns): stay at the end if following */
  private readonly _logResize = new ResizeObserver(() => {
    if (this._follow) this._scrollToEnd(false);
  });
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
    this._logResize.disconnect();
    this._observedLog = undefined;
    this._talk?.stop();
    window.removeEventListener("keydown", this._onWindowKey);
    window.removeEventListener("resize", this._fitHeight);
    window.visualViewport?.removeEventListener("resize", this._fitHeight);
    this._awake.set(false);
    this._face?.destroy();
    this._face = undefined;
  }

  protected willUpdate(changed: PropertyValues): void {
    if (!this._started && this.hass?.user?.id) {
      this._started = true;
      void this._start();
    }
    if (changed.has("hass") || changed.has("_settings")) {
      const theme = this._settings.theme;
      this._dark = theme === "dark" || (theme === "auto" && !!this.hass?.themes?.darkMode);
    }
    // the screen stays on while talking (a phone stops the microphone of a dark screen)
    if (changed.has("_settings") || changed.has("_voicePhase")) {
      this._awake.set(this._settings.keepAwake || this._voicePhase !== "off");
    }
  }

  protected updated(changed: PropertyValues): void {
    const log = this._log;
    if (log !== this._observedLog) {
      this._logResize.disconnect();
      if (log) this._logResize.observe(log);
      this._observedLog = log ?? undefined;
    }
    if (changed.has("_messages")) {
      if (this._follow && !this._touching) this._scrollToEnd(this._smooth);
      else if (this._messages.length) this._behind = true;
    }
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
        <div class="face" aria-hidden="true" @click=${this._onFaceTap}></div>
        <div class="talk">
          <div class="log">
            <div
              class="messages"
              role="log"
              aria-live="polite"
              @scroll=${this._onScroll}
              @wheel=${this._onWheel}
              @touchstart=${this._onTouch}
              @touchend=${this._onTouchEnd}
              @touchcancel=${this._onTouchEnd}
              @pointerdown=${this._onReaderScroll}
              @keydown=${this._onLogKey}
            >
              <div class="column">
                ${this._messages.length === 0 ? this._empty() : this._messages.map((m) => this._message(m))}
              </div>
            </div>
            ${this._behind
              ? html`<button class="jump" title="Go to the newest" aria-label="Go to the newest" @click=${this._jump}>
                  <ha-icon icon="mdi:arrow-down"></ha-icon>
                </button>`
              : nothing}
          </div>
          ${this._readOnly ? this._readOnlyBar() : this._composer()}
        </div>
      </div>
      ${this._settingsOpen ? this._settingsSheet() : nothing} ${this._historyOpen ? this._historySheet() : nothing}
    `;
  }

  private _toolbar(actions: boolean) {
    return html`<div class="toolbar">
      <ha-menu-button .hass=${this.hass} .narrow=${this.narrow}></ha-menu-button>
      <div class="title">${this._title}</div>
      ${actions && this._settings.history
        ? html`<button class="icon" title="Conversations" aria-label="Conversations" @click=${this._openHistory}>
            <ha-icon icon="mdi:history"></ha-icon>
          </button>`
        : nothing}
      ${actions
        ? html`<button
              class="icon"
              title="New conversation"
              aria-label="New conversation"
              ?disabled=${this._busy || (this._messages.length === 0 && !this._readOnly)}
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

  private get _defaultGreeting(): string {
    return `Hi, I'm ${this._title}.\nWrite or talk to me below. You can pet me too.`;
  }

  /** The greeting before a conversation: this device's own, or the page's */
  private _empty() {
    const text = this._settings.greeting.trim() || this._defaultGreeting;
    const [first, ...rest] = text.split("\n");
    return html`<div class="empty">
      <div class="empty-title">${first}</div>
      ${rest.length ? html`<div class="empty-text">${rest.join("\n").trim()}</div>` : nothing}
    </div>`;
  }

  private _message(m: Message) {
    const busy = m.role === "user" ? "Listening" : "Thinking";
    // no whitespace around the text: the bubble keeps the text's own line breaks (pre-wrap)
    return html`<div class="msg ${m.role}">${m.text ||
      (m.pending ? html`<span class="dots" aria-label=${busy}><i></i><i></i><i></i></span>` : nothing)}</div>`;
  }

  private _composer() {
    const canSend = !this._busy && !!this._draft.trim();
    const phase = this._voicePhase;
    const mic = microphoneSupported();
    const [speakIcon, speakLabel] =
      phase === "off"
        ? ["mdi:microphone", mic ? `Talk with ${this._title}` : "Talking needs the microphone, which this browser doesn't allow here"]
        : phase === "listening"
          ? ["mdi:microphone", "End the conversation"]
          : ["mdi:stop", "End the conversation"];
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
      <button
        class="icon speak ${phase}"
        title=${speakLabel}
        aria-label=${speakLabel}
        ?disabled=${phase === "off" && (this._busy || !mic)}
        @click=${this._onSpeak}
      >
        <ha-icon icon=${speakIcon}></ha-icon>
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
              ? html`A wake word comes in a later version. Until then the page opens in text mode: tap the
                  microphone to start talking (it listens again after every answer, until you're quiet or say
                  "bye bye").`
              : html`Opens quietly: nothing is said out loud, and the microphone stays off until you tap it.`}
          </div>
        </div>
        <div class="setting">
          <label class="label" for="greeting">Greeting</label>
          <textarea
            id="greeting"
            rows="3"
            maxlength=${GREETING_MAX}
            placeholder=${this._defaultGreeting}
            .value=${s.greeting}
            @input=${(e: Event) => this._set("greeting", (e.target as HTMLTextAreaElement).value)}
          ></textarea>
          <div class="note">Shown before a conversation starts; the first line large. Empty: the one above.</div>
        </div>
        <label class="setting toggle">
          <div>
            <div class="label">Conversation history</div>
            <div class="note">Your recent conversations, kept in Home Assistant, to pick up again.</div>
          </div>
          ${this._switch("history")}
        </label>
        <label class="setting toggle">
          <div>
            <div class="label">Continue the last conversation</div>
            <div class="note">When the page opens. Off: a new conversation each time.</div>
          </div>
          ${this._switch("resume")}
        </label>
        <label class="setting toggle sub ${s.resume ? "" : "off"}">
          <div>
            <div class="label">From any device</div>
            <div class="note">
              ${s.history
                ? "Your most recent conversation, wherever it was. Off: the last one on this device."
                : "Needs the conversation history."}
            </div>
          </div>
          ${this._switch("resumeAnyDevice", !s.resume || !s.history)}
        </label>
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

  private _switch(key: "history" | "resume" | "resumeAnyDevice", disabled = false) {
    return html`<input
      type="checkbox"
      role="switch"
      .checked=${this._settings[key] && !disabled}
      ?disabled=${disabled}
      @change=${(e: Event) => this._set(key, (e.target as HTMLInputElement).checked)}
    />`;
  }

  /** Someone else's conversation, read only (an administrator); back to one's own */
  private _readOnlyBar() {
    return html`<div class="readonly">
      <ha-icon icon="mdi:eye-outline"></ha-icon>
      <div class="readonly-text">${this._readOnly!.name || "Someone else"}'s conversation, read only</div>
      <button class="pill" @click=${this._leaveReadOnly}>Back to mine</button>
    </div>`;
  }

  private _historySheet() {
    const admin = !!this.hass?.user?.is_admin;
    const list = this._history;
    return html`<div class="scrim" @click=${() => (this._historyOpen = false)}></div>
      <div class="sheet history" role="dialog" aria-modal="true" aria-labelledby="history-title">
        <div class="sheet-head">
          <div id="history-title" class="sheet-title">Conversations</div>
          <button class="icon" aria-label="Close" title="Close" @click=${() => (this._historyOpen = false)}>
            <ha-icon icon="mdi:close"></ha-icon>
          </button>
        </div>
        ${admin
          ? html`<div class="choices" role="radiogroup" aria-label="Whose">
              <button
                class="choice ${this._historyEveryone ? "" : "on"}"
                role="radio"
                aria-checked=${this._historyEveryone ? "false" : "true"}
                @click=${() => this._loadHistory(false)}
              >
                Mine
              </button>
              <button
                class="choice ${this._historyEveryone ? "on" : ""}"
                role="radio"
                aria-checked=${this._historyEveryone ? "true" : "false"}
                @click=${() => this._loadHistory(true)}
              >
                Everyone
              </button>
            </div>`
          : nothing}
        <div class="convs">
          ${this._historyError
            ? html`<div class="conv-empty">${this._historyError}</div>`
            : list === null
              ? html`<div class="conv-empty">Loading…</div>`
              : list.length === 0
                ? html`<div class="conv-empty">No conversations yet.</div>`
                : list.map((c) => this._conversationRow(c))}
        </div>
        <div class="sheet-foot">The 20 most recent are kept for each person.</div>
      </div>`;
  }

  private _conversationRow(c: ConversationSummary) {
    const current = c.id === this._conversationId && !this._readOnly;
    const confirming = this._confirmDelete === c.id;
    return html`<div class="conv ${current ? "current" : ""}">
      <button class="conv-open" @click=${() => this._openConversation(c)}>
        <div class="conv-title">${c.title || "Untitled"}</div>
        <div class="conv-meta">
          ${c.mine ? nothing : html`<span class="conv-who">${c.user_name || "Someone"}</span> · `}${whenText(
            c.updated,
          )}
          · ${Math.ceil(c.count / 2)} ${c.count > 2 ? "questions" : "question"}${current ? " · open now" : ""}
        </div>
      </button>
      ${confirming
        ? html`<button class="pill danger" @click=${() => this._delete(c)}>Delete</button>`
        : html`<button
            class="icon small"
            title="Delete"
            aria-label="Delete ${c.title}"
            @click=${() => (this._confirmDelete = c.id)}
          >
            <ha-icon icon="mdi:delete-outline"></ha-icon>
          </button>`}
    </div>`;
  }

  private readonly _openHistory = () => {
    this._historyOpen = true;
    this._confirmDelete = null;
    void this._loadHistory(this._historyEveryone);
  };

  private async _loadHistory(everyone: boolean): Promise<void> {
    this._historyEveryone = everyone;
    this._history = null;
    this._historyError = "";
    this._confirmDelete = null;
    try {
      this._history = await listConversations(this.hass, everyone);
    } catch (err: any) {
      this._historyError =
        err?.code === "unknown_command"
          ? "The history needs a newer version of the Kattio integration."
          : err?.message || "The conversations could not be loaded.";
    }
  }

  private async _openConversation(c: ConversationSummary): Promise<void> {
    if (this._busy) return;
    this._confirmDelete = null;
    let stored;
    try {
      stored = await getConversation(this.hass, c.id);
    } catch (err: any) {
      this._historyError = err?.message || "The conversation could not be opened.";
      return;
    }
    if (!stored) {
      this._historyError = "That conversation is gone.";
      return;
    }
    this._historyOpen = false;
    if (!stored.mine) {
      // someone else's: read it; one's own waits aside
      if (!this._readOnly) this._ownAside = { messages: this._messages, conversationId: this._conversationId };
      this._readOnly = { name: stored.user_name };
      this._show({ conversationId: null, messages: stored.messages });
      return;
    }
    this._readOnly = null;
    this._ownAside = undefined;
    this._show({ conversationId: stored.id, messages: stored.messages });
    this._save(false);
  }

  private readonly _leaveReadOnly = () => {
    const own = this._ownAside;
    this._readOnly = null;
    this._ownAside = undefined;
    this._messages = own?.messages ?? [];
    this._conversationId = own?.conversationId ?? null;
    this._follow = true;
    this._behind = false;
  };

  private async _delete(c: ConversationSummary): Promise<void> {
    this._confirmDelete = null;
    try {
      await deleteConversation(this.hass, c.id);
    } catch (err: any) {
      this._historyError = err?.message || "The conversation could not be deleted.";
      return;
    }
    this._history = (this._history ?? []).filter((x) => x.id !== c.id);
    // the open one: it stays on the screen, but is no longer kept or continued
    if (c.id === this._conversationId && !this._readOnly) this._newConversation();
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
    if (e.key !== "Escape") return;
    if (this._settingsOpen) this._settingsOpen = false;
    else if (this._historyOpen) this._historyOpen = false;
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
    this._follow = true;
    this._behind = false;
    this._messages = [...this._messages, { id: nextId++, role: "user", text }, reply];
    this._face?.setState("thinking");

    const refresh = () => (this._messages = [...this._messages]);
    await askText(
      this.hass,
      text,
      { pipeline: this._config.pipeline, conversationId: this._ensureConversationId() },
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

  private readonly _onSpeak = () => {
    if (this._voicePhase === "off") this._startTalk();
    else this._talk?.stop();
  };

  /** A tap on the face while Kattio talks: stop and listen (as tapping a box) */
  private readonly _onFaceTap = () => {
    if (this._voicePhase === "speaking") this._talk?.interrupt();
  };

  /**
   * A spoken conversation, as with a box: listen, answer out loud, listen again, until nobody speaks, a goodbye or a
   * tap. Each request shows as what was heard and the answer.
   */
  private _startTalk(): void {
    if (this._busy || !this.hass || this._talk) return;
    this._busy = true;
    this._voicePhase = "starting";
    this._smooth = true;
    this._follow = true;
    this._behind = false;
    let heard: Message | undefined;
    let reply: Message | undefined;
    let failed = false;

    const refresh = () => (this._messages = [...this._messages]);
    /** The request's answer, shown once there is something of it */
    const showReply = () => {
      if (!reply) {
        reply = { id: nextId++, role: "assistant", text: "", pending: true };
        this._messages = [...this._messages, reply];
      }
      return reply;
    };
    /** What is still on its way stays out (or stays as far as it got) */
    const settle = () => {
      this._messages = this._messages
        .filter((m) => !m.pending || m.text)
        .map((m) => (m.pending ? { ...m, pending: false } : m));
    };

    this._talk = startTalk(
      this.hass,
      {
        pipeline: this._config.pipeline,
        conversationId: () => this._ensureConversationId(),
        turnDetection: !!this._config.turn_detection,
      },
      {
        onState: (state) => {
          this._voicePhase = state;
          if (state !== "starting") this._face?.setState(state);
          else this._face?.setState("listening");
        },
        onTurn: () => {
          settle();
          heard = { id: nextId++, role: "user", text: "", pending: true };
          reply = undefined;
          this._messages = [...this._messages, heard];
        },
        onHeard: (text) => {
          if (!heard) return;
          if (!text) {
            this._messages = this._messages.filter((m) => m !== heard);
          } else {
            heard.text = text;
            heard.pending = false;
            showReply();
            refresh();
          }
        },
        onText: (more, newMessage) => {
          const r = showReply();
          r.text += (newMessage && r.text ? "\n\n" : "") + more;
          refresh();
        },
        onDone: ({ speech, conversationId }) => {
          const r = showReply();
          if (!r.text.trim()) r.text = speech;
          r.pending = false;
          if (!r.text.trim()) this._messages = this._messages.filter((m) => m !== r);
          this._conversationId = conversationId ?? this._conversationId;
          refresh();
          this._save();
        },
        onError: (message) => {
          failed = true;
          settle();
          this._messages = [...this._messages, { id: nextId++, role: "error", text: message }];
          this._face?.setState("error");
        },
        onInterrupted: () => {
          if (reply) {
            reply.text = reply.text.trimEnd() + " …";
            reply.pending = false;
            refresh();
          }
        },
        onLevel: (level) => this._face?.setLevel(level),
        onEnd: (reason) => {
          const stoppedMidway = !!heard?.text && !!reply?.pending;
          settle();
          if (reason === "stopped" && stoppedMidway) {
            this._messages = [...this._messages, { id: nextId++, role: "note", text: "Stopped." }];
          }
          if (!failed) this._face?.setState("idle");
          this._talk = undefined;
          this._voicePhase = "off";
          this._busy = false;
          this._save();
        },
      },
    );
  }

  /** The conversation's id, made on its first request */
  private _ensureConversationId(): string {
    this._conversationId ??= newConversationId();
    return this._conversationId;
  }

  private _newConversation(): void {
    this._readOnly = null;
    this._ownAside = undefined;
    this._messages = [];
    this._follow = true;
    this._behind = false;
    this._conversationId = null;
    this._face?.setState("idle");
    this._save();
  }

  private get _log(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>(".messages") ?? null;
  }

  private _scrollToEnd(smooth: boolean): void {
    const box = this._log;
    if (!box) return;
    if (box.scrollHeight - box.scrollTop - box.clientHeight < 1) return;
    this._autoScroll = true;
    box.scrollTo({ top: box.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }

  /** Back at the end: follow again. Away from it by the reader's own hand: stop following */
  private readonly _onScroll = () => {
    const box = this._log;
    if (!box) return;
    if (box.scrollHeight - box.scrollTop - box.clientHeight < END_PX) {
      this._follow = true;
      this._autoScroll = false;
      this._behind = false;
    } else if (!this._autoScroll) {
      this._follow = false;
    }
  };

  /** The reader takes over (a scroll the page started stops counting as the page's) */
  private readonly _onReaderScroll = () => {
    this._autoScroll = false;
  };

  /** Reading back: stop following right away (before new text can pull the view down again) */
  private _readBack(): void {
    this._autoScroll = false;
    this._follow = false;
  }

  private readonly _onWheel = (e: WheelEvent) => {
    if (e.deltaY < 0) this._readBack();
    else this._autoScroll = false;
  };

  private readonly _onTouch = () => {
    this._touching = true;
    this._autoScroll = false;
  };

  private readonly _onTouchEnd = () => {
    this._touching = false;
    this._onScroll();
    if (this._follow) this._scrollToEnd(false);
  };

  private readonly _onLogKey = (e: KeyboardEvent) => {
    if (["ArrowUp", "PageUp", "Home"].includes(e.key)) this._readBack();
    else this._autoScroll = false;
  };

  private readonly _jump = () => {
    this._follow = true;
    this._behind = false;
    this._scrollToEnd(true);
  };

  /**
   * Keep the conversation: for a reload of this tab, as this device's last one, and (with the history on) in Home
   * Assistant. `remote` false: only on this device (it came from Home Assistant just now).
   */
  private _save(remote = true): void {
    if (this._readOnly) return;
    const userId = this.hass?.user?.id ?? "";
    const messages = this._messages
      .filter((m) => !m.pending)
      .slice(-KEEP_MESSAGES)
      .map(({ role, text }) => ({ role, text }));
    const conversation: SavedConversation = { conversationId: this._conversationId, messages };
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify({ userId, ...conversation }));
    } catch {
      // storage unavailable: the conversation just isn't kept
    }
    if (!userId) return;
    saveLast(userId, conversation);
    if (remote && this._settings.history && this._conversationId && messages.length) {
      saveConversation(this.hass, this._conversationId, messages).catch((err) =>
        console.warn("Kattio: the conversation was not kept in Home Assistant", err),
      );
    }
  }

  /**
   * What the page shows when it opens: this tab's conversation (a reload, or back from another page); else, if
   * set, the most recent conversation (this user's from any device, or this device's last); else a new one.
   */
  private async _start(): Promise<void> {
    const userId = this.hass.user!.id;
    try {
      const tab = JSON.parse(sessionStorage.getItem(STORE_KEY) || "null");
      if (tab && tab.userId === userId && Array.isArray(tab.messages)) {
        this._show(tab);
        return;
      }
    } catch {
      // nothing kept
    }
    const s = this._settings;
    if (!s.resume) return;
    if (s.resumeAnyDevice && s.history) {
      try {
        const latest = await getConversation(this.hass);
        if (latest?.mine && !this._messages.length) {
          this._show({ conversationId: latest.id, messages: latest.messages });
          this._save(false);
        }
        return;
      } catch (err) {
        console.warn("Kattio: the most recent conversation could not be loaded; this device's last instead", err);
      }
    }
    const last = loadLast(userId);
    if (last && !this._messages.length) this._show(last);
  }

  private _show(conversation: SavedConversation): void {
    this._messages = conversation.messages
      .filter((m) => m && typeof m.text === "string" && ["user", "assistant", "note", "error"].includes(m.role))
      .map((m) => ({ id: nextId++, role: m.role as Message["role"], text: m.text }));
    this._conversationId = conversation.conversationId ?? null;
    this._follow = true;
    this._behind = false;
    this._face?.setState("idle");
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
    .log {
      position: relative;
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
    }
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
    .empty-text {
      white-space: pre-line;
    }
    .jump {
      position: absolute;
      left: 50%;
      bottom: 8px;
      z-index: 1;
      width: 40px;
      height: 40px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      border: 1px solid var(--k-line);
      border-radius: 50%;
      background: var(--k-surface);
      color: var(--k-accent);
      box-shadow: var(--k-shadow);
      cursor: pointer;
      --mdc-icon-size: 22px;
      transform: translateX(-50%);
      animation: jump-in 0.2s ease-out;
      -webkit-tap-highlight-color: transparent;
    }
    .jump:active {
      transform: translateX(-50%) scale(0.94);
    }
    @keyframes jump-in {
      from {
        opacity: 0;
        transform: translate(-50%, 8px);
      }
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
    .msg.note {
      align-self: center;
      padding: 2px 12px;
      font-size: 14px;
      color: var(--k-muted);
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
      position: relative;
      width: 48px;
      height: 48px;
      background: var(--k-surface);
      box-shadow: var(--k-shadow);
      border: 1px solid var(--k-line);
    }
    button.icon.speak:not(.off) {
      background: var(--k-accent);
      color: var(--k-on-accent);
      border-color: transparent;
    }
    button.icon.speak:not(.off):hover {
      background: color-mix(in srgb, var(--k-accent) 88%, #000);
    }
    /* listening: a ring breathes out from the button */
    button.icon.speak.listening::after {
      content: "";
      position: absolute;
      inset: -1px;
      border-radius: 50%;
      border: 2px solid var(--k-accent);
      animation: ring 1.4s ease-out infinite;
      pointer-events: none;
    }
    @keyframes ring {
      from {
        transform: scale(1);
        opacity: 0.7;
      }
      to {
        transform: scale(1.5);
        opacity: 0;
      }
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
    label.label {
      display: block;
    }
    textarea {
      box-sizing: border-box;
      display: block;
      width: 100%;
      min-height: 64px;
      resize: vertical;
      padding: 10px 12px;
      border: 1px solid var(--k-line);
      border-radius: 12px;
      background: var(--k-bg);
      color: inherit;
      font: inherit;
      font-size: 16px;
      line-height: 1.4;
      outline: none;
    }
    textarea:focus {
      border-color: color-mix(in srgb, var(--k-accent) 60%, transparent);
    }
    textarea::placeholder {
      color: var(--k-muted);
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
    .setting.sub {
      padding-left: 16px;
    }
    .setting.sub.off .label,
    .setting.sub.off .note {
      opacity: 0.5;
    }
    .setting.sub {
      border-top: none;
      padding-top: 0;
    }

    /* ---- conversations ---- */
    .sheet.history {
      display: flex;
      flex-direction: column;
    }
    :host([wide]) .sheet.history {
      width: min(520px, 90%);
      max-height: 80%;
    }
    .sheet.history .choices {
      flex: none;
      margin-bottom: 8px;
    }
    .convs {
      flex: 1;
      min-height: 120px;
      overflow-y: auto;
      margin: 0 -8px;
    }
    .conv {
      display: flex;
      align-items: center;
      gap: 4px;
      border-radius: 12px;
      padding-right: 4px;
    }
    .conv.current {
      background: color-mix(in srgb, var(--k-accent) 12%, transparent);
    }
    .conv-open {
      flex: 1;
      min-width: 0;
      padding: 10px 8px;
      border: none;
      background: none;
      color: inherit;
      font: inherit;
      text-align: left;
      cursor: pointer;
      border-radius: 12px;
      -webkit-tap-highlight-color: transparent;
    }
    .conv-open:hover {
      background: color-mix(in srgb, currentColor 6%, transparent);
    }
    .conv-title {
      font-size: 15px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .conv-meta {
      margin-top: 2px;
      font-size: 13px;
      color: var(--k-muted);
    }
    .conv-who {
      color: var(--k-text);
      font-weight: 500;
    }
    .conv-empty {
      padding: 24px 8px;
      text-align: center;
      color: var(--k-muted);
    }
    .pill {
      flex: none;
      height: 34px;
      padding: 0 14px;
      border: 1px solid var(--k-line);
      border-radius: 17px;
      background: var(--k-surface);
      color: var(--k-accent);
      font: inherit;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
    }
    .pill.danger {
      border-color: transparent;
      background: var(--k-error);
      color: #fff;
    }
    .readonly {
      flex: none;
      box-sizing: border-box;
      width: 100%;
      max-width: 792px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 16px calc(14px + env(safe-area-inset-bottom, 0px));
      color: var(--k-muted);
      font-size: 14px;
      --mdc-icon-size: 20px;
    }
    .readonly-text {
      flex: 1;
      min-width: 0;
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
      .scrim,
      .jump,
      button.icon.speak.listening::after {
        animation: none;
      }
    }
  `;
}

if (!customElements.get("kattio-panel")) customElements.define("kattio-panel", KattioPanel);
