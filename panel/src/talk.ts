/**
 * A spoken conversation, as with a Kattio box: the microphone stays open for the whole conversation, each request goes
 * through Home Assistant's Assist pipeline (speech to text, the agent, the answer out loud), and after each answer the
 * page listens again, until nobody says anything, a goodbye ("bye bye", "stop talking"), or a tap.
 *
 * With a turn detection service (the Kattio integration's "Turn detection server"), the microphone also goes there,
 * through the integration (see custom_components/kattio/voice.py), as the boxes' audio does: it says when the speaker
 * is done (also with a TV in the background, and through "erhm" pauses), and when someone interrupts the answer; the
 * page then stops talking and passes on what was said from where the interruption began. Without one, Home
 * Assistant's own end-of-speech detection ends each request, and the answer is not interrupted by voice.
 */
import { errorText, replyReader, runMessage, type Hass, type PipelineEvent, type ReplyHandlers } from "./assist";

export type TalkState = "starting" | "listening" | "thinking" | "speaking";
/** stopped: by the page (a tap); quiet: nobody spoke; dismissed: a goodbye; hidden: the page went out of sight */
export type TalkEnd = "stopped" | "quiet" | "dismissed" | "error" | "hidden";

export interface TalkHandlers extends ReplyHandlers {
  onState(state: TalkState): void;
  /** A new request is listened for */
  onTurn(): void;
  /** What was heard in this request (empty: nothing) */
  onHeard(text: string): void;
  /** The answer was cut off (someone spoke, or a tap) */
  onInterrupted(): void;
  /** How loud the answer is right now, 0..1 */
  onLevel(level: number): void;
  /** The conversation is over */
  onEnd(reason: TalkEnd): void;
}

export interface Talk {
  /** End the conversation */
  stop(): void;
  /** While the answer plays: stop it and listen */
  interrupt(): void;
  done: Promise<void>;
}

export interface TalkOptions {
  pipeline?: string | null;
  /** The conversation to continue (read at each request: the first answer brings it) */
  conversationId(): string | null;
  /** A turn detection service is set in the integration */
  turnDetection: boolean;
}

const RATE = 16000;
/** No speech this long after listening starts: the conversation is over */
const QUIET_MS = 8000;
/** Longest request */
const MAX_REQUEST_MS = 30000;
/** Kept for passing on an interruption: from where it began */
const HISTORY_MS = 8000;
/** Speech for the quiet check: loudness (RMS, 0..1) and how long */
const SPEECH_RMS = 0.02;
const SPEECH_MS = 250;
/** A little before the interruption's start, so the first word is whole */
const REPLAY_EXTRA_MS = 400;

const FLAG_LISTENING = 4;
const FLAG_SPEAKING = 8;

/** Ends the conversation right away, without an answer (as on the boxes) */
const GOODBYES = [
  "stop talking", "shut up", "bye bye", "go back to sleep",
  "hold mund", "hold op med at snakke", "farvel", "gå i seng",
];

export function isGoodbye(text: string): boolean {
  const t = ` ${text.toLowerCase().replace(/[-,.!?]/g, " ").replace(/\s+/g, " ").trim()} `;
  return GOODBYES.some((g) => t.includes(` ${g} `));
}

const WORKLET = `
registerProcessor("kattio-mic", class extends AudioWorkletProcessor {
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch) this.port.postMessage(ch.slice(0));
    return true;
  }
});`;

/** 0.1 s of silence: played on the tap, so the answers may play later (phones allow sound only after a tap) */
function silentWav(): string {
  const samples = 800;
  const buf = new DataView(new ArrayBuffer(44 + samples * 2));
  const str = (at: number, s: string) => [...s].forEach((c, i) => buf.setUint8(at + i, c.charCodeAt(0)));
  str(0, "RIFF");
  buf.setUint32(4, 36 + samples * 2, true);
  str(8, "WAVEfmt ");
  buf.setUint32(16, 16, true);
  buf.setUint16(20, 1, true);
  buf.setUint16(22, 1, true);
  buf.setUint32(24, 8000, true);
  buf.setUint32(28, 16000, true);
  buf.setUint16(32, 2, true);
  buf.setUint16(34, 16, true);
  str(36, "data");
  buf.setUint32(40, samples * 2, true);
  let bin = "";
  new Uint8Array(buf.buffer).forEach((b) => (bin += String.fromCharCode(b)));
  return `data:audio/wav;base64,${btoa(bin)}`;
}

export function microphoneSupported(): boolean {
  return !!navigator.mediaDevices?.getUserMedia && typeof AudioContext !== "undefined" && window.isSecureContext;
}

/** The microphone's samples at 16 kHz (averaging the samples each output sample covers) */
class Resampler {
  private readonly ratio: number;
  private rest = new Float32Array(0);
  private pos = 0;

  constructor(inRate: number) {
    this.ratio = inRate / RATE;
  }

  push(input: Float32Array): Int16Array {
    let data = input;
    if (this.rest.length) {
      data = new Float32Array(this.rest.length + input.length);
      data.set(this.rest);
      data.set(input, this.rest.length);
    }
    const r = this.ratio;
    const out = new Int16Array(Math.max(0, Math.floor((data.length - this.pos) / r)));
    let n = 0;
    let pos = this.pos;
    while (pos + r <= data.length && n < out.length) {
      const a = Math.floor(pos);
      const b = Math.max(a + 1, Math.floor(pos + r));
      let sum = 0;
      for (let i = a; i < b; i++) sum += data[i];
      out[n++] = toS16(sum / (b - a));
      pos += r;
    }
    const keep = Math.floor(pos);
    this.rest = data.slice(keep);
    this.pos = pos - keep;
    return out.subarray(0, n);
  }
}

function toS16(v: number): number {
  const c = Math.max(-1, Math.min(1, v));
  return c < 0 ? c * 0x8000 : c * 0x7fff;
}

/** The last few seconds of the microphone */
class History {
  private chunks: Int16Array[] = [];
  private samples = 0;

  add(pcm: Int16Array): void {
    this.chunks.push(pcm);
    this.samples += pcm.length;
    const max = (HISTORY_MS / 1000) * RATE;
    while (this.chunks.length > 1 && this.samples - this.chunks[0].length >= max) {
      this.samples -= this.chunks.shift()!.length;
    }
  }

  /** The last ms of audio */
  last(ms: number): Int16Array {
    const want = Math.min(this.samples, Math.round((ms / 1000) * RATE));
    const out = new Int16Array(want);
    let at = want;
    for (let i = this.chunks.length - 1; i >= 0 && at > 0; i--) {
      const c = this.chunks[i];
      const take = Math.min(at, c.length);
      out.set(c.subarray(c.length - take), at - take);
      at -= take;
    }
    return out;
  }
}

/** One request: a pipeline run */
interface Run {
  handlerId?: number;
  /** Audio goes to it (until the end of the request) */
  open: boolean;
  pending: Int16Array[];
  unsubscribe?: () => Promise<void>;
  heard: boolean;
  ttsUrl?: string;
  streamable: boolean;
  ended: boolean;
  /** Its answer is being played */
  playing: boolean;
  failed: boolean;
  read: (ev: PipelineEvent) => boolean;
  timers: number[];
}

/**
 * Start a conversation. Call it from the tap itself (not after an await): sound may only start from a tap.
 */
export function startTalk(hass: Hass, opts: TalkOptions, handlers: TalkHandlers): Talk {
  // made right away, inside the tap
  const playCtx = new AudioContext();
  void playCtx.resume();
  const player = new Audio();
  player.src = silentWav();
  void player.play().catch(() => {});
  let analyser: AnalyserNode | undefined;
  try {
    const node = playCtx.createMediaElementSource(player);
    analyser = playCtx.createAnalyser();
    analyser.fftSize = 512;
    node.connect(analyser);
    analyser.connect(playCtx.destination);
  } catch {
    // played directly, without the loudness
  }
  let micCtx: AudioContext | undefined;
  try {
    micCtx = new AudioContext({ sampleRate: RATE });
    void micCtx.resume();
  } catch {
    micCtx = undefined;
  }

  let stream: MediaStream | undefined;
  let recorder: AudioWorkletNode | ScriptProcessorNode | undefined;
  let source: MediaStreamAudioSourceNode | undefined;
  const history = new History();
  let over = false;
  let run: Run | undefined;
  let turn = 0;
  let flags = 0;
  let speechMs = 0;
  let meter = 0;
  let resolveDone!: () => void;
  const done = new Promise<void>((r) => (resolveDone = r));

  // ------------------------------------------------------------------ the turn detection service (optional)
  let turnsHandler: number | undefined;
  let turnsUnsubscribe: (() => Promise<void>) | undefined;
  let turnsOn = false;

  const sendBinary = (handler: number, head: number[], pcm?: Int16Array) => {
    const socket = hass.connection.socket;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    const bytes = pcm ? new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength) : new Uint8Array(0);
    const msg = new Uint8Array(1 + head.length + bytes.byteLength);
    msg[0] = handler;
    msg.set(head, 1);
    msg.set(bytes, 1 + head.length);
    socket.send(msg);
  };
  const toTurns = (pcm?: Int16Array) => {
    if (turnsHandler !== undefined) sendBinary(turnsHandler, [flags, turn & 0xff], pcm);
  };
  const setFlags = (f: number) => {
    if (f === flags) return;
    flags = f;
    toTurns();
  };

  const onTurnsEvent = (ev: { type: string; turn?: number; reason?: number; ago_ms?: number }) => {
    if (over) return;
    if (ev.type === "ready") {
      turnsHandler = (ev as any).handler_id;
      toTurns();
    } else if (ev.type === "end_of_turn") {
      if (ev.turn === (turn & 0xff) && run?.open && flags & FLAG_LISTENING) endRequest();
    } else if (ev.type === "interrupt") {
      if (run?.playing) interrupt((ev.ago_ms ?? 0) + REPLAY_EXTRA_MS);
    }
  };

  // ------------------------------------------------------------------ the pipeline: one run per request
  const toRun = (r: Run, pcm: Int16Array | null) => {
    if (r.handlerId === undefined) return;
    sendBinary(r.handlerId, [], pcm ?? undefined);
  };

  /** The request is complete: no more audio to the pipeline */
  const endRequest = () => {
    const r = run;
    if (!r || !r.open) return;
    r.open = false;
    r.timers.forEach(clearTimeout);
    setFlags(flags & ~FLAG_LISTENING);
    if (r.handlerId !== undefined) toRun(r, null);
    if (!r.heard) handlers.onState("thinking");
  };

  const dropRun = (r: Run) => {
    r.open = false;
    r.ended = true;
    r.timers.forEach(clearTimeout);
    void r.unsubscribe?.().catch(() => {});
  };

  const stopPlaying = () => {
    cancelAnimationFrame(meter);
    player.onended = null;
    player.onerror = null;
    player.pause();
    if (run?.playing) {
      run.playing = false;
      setFlags(flags & ~FLAG_SPEAKING);
    }
  };

  const finish = (reason: TalkEnd) => {
    if (over) return;
    over = true;
    if (run) dropRun(run);
    stopPlaying();
    player.removeAttribute("src");
    recorder?.disconnect();
    source?.disconnect();
    stream?.getTracks().forEach((t) => t.stop());
    flags = 0;
    void turnsUnsubscribe?.().catch(() => {});
    void micCtx?.close().catch(() => {});
    void playCtx.close().catch(() => {});
    document.removeEventListener("visibilitychange", onVisibility);
    handlers.onEnd(reason);
    resolveDone();
  };

  /** The run and its answer are over: listen again */
  const maybeNext = (r: Run) => {
    if (over || r !== run || !r.ended || r.playing) return;
    if (r.failed) return finish("error");
    listen(0);
  };

  const play = (r: Run, url: string) => {
    if (r.playing || over || r !== run) return;
    r.playing = true;
    setFlags(flags | FLAG_SPEAKING);
    player.src = new URL(url, location.href).href;
    const ended = () => {
      if (!r.playing) return;
      r.playing = false;
      cancelAnimationFrame(meter);
      setFlags(flags & ~FLAG_SPEAKING);
      handlers.onLevel(0);
      maybeNext(r);
    };
    player.onended = ended;
    player.onerror = ended;
    void player.play().then(
      () => {
        if (r.playing) handlers.onState("speaking");
      },
      () => {
        console.warn("Kattio: the browser did not play the answer");
        ended();
      },
    );
    if (analyser) {
      const data = new Uint8Array(analyser.fftSize);
      const tick = () => {
        if (!r.playing) return;
        analyser!.getByteTimeDomainData(data);
        let sum = 0;
        for (const v of data) sum += (v - 128) * (v - 128);
        handlers.onLevel(Math.min(1, (Math.sqrt(sum / data.length) / 128) * 4));
        meter = requestAnimationFrame(tick);
      };
      meter = requestAnimationFrame(tick);
    }
  };

  const onRunEvent = (r: Run, ev: PipelineEvent) => {
    if (over || r !== run || r.ended) return;
    const data = ev.data ?? {};
    switch (ev.type) {
      case "run-start":
        r.handlerId = data.runner_data?.stt_binary_handler_id;
        r.ttsUrl = data.tts_output?.url;
        r.streamable = !!data.tts_output?.stream_response;
        r.pending.forEach((pcm) => toRun(r, pcm));
        r.pending = [];
        if (!r.open) toRun(r, null);
        break;
      case "stt-vad-end":
        endRequest();
        break;
      case "stt-end": {
        endRequest();
        r.heard = true;
        const text = (data.stt_output?.text ?? "").trim();
        handlers.onHeard(text);
        if (text && isGoodbye(text)) return finish("dismissed");
        handlers.onState("thinking");
        break;
      }
      case "intent-progress":
        // the answer is spoken while it is still being written
        if (data.tts_start_streaming && r.streamable && r.ttsUrl) play(r, r.ttsUrl);
        break;
      case "tts-end":
        if (data.tts_output?.url) play(r, data.tts_output.url);
        break;
      case "error":
        endRequest();
        if (data.code === "stt-no-text-recognized") {
          if (!r.heard) handlers.onHeard("");
          dropRun(r);
          return finish("quiet");
        }
        r.failed = true;
        break;
    }
    if (ev.type !== "error" || data.code !== "stt-no-text-recognized") r.read(ev);
    if (ev.type === "run-end" || ev.type === "error") {
      r.ended = true;
      void r.unsubscribe?.().catch(() => {});
      maybeNext(r);
    }
  };

  /** Listen for the next request; replayMs: start with the last ms of audio (an interruption's words) */
  const listen = (replayMs: number) => {
    if (over) return;
    turn++;
    const r: Run = {
      open: true,
      pending: replayMs > 0 ? [history.last(replayMs)] : [],
      heard: false,
      streamable: false,
      ended: false,
      playing: false,
      failed: false,
      read: replyReader(handlers),
      timers: [],
    };
    run = r;
    speechMs = replayMs > 0 ? SPEECH_MS : 0;
    setFlags((flags & FLAG_SPEAKING) | FLAG_LISTENING);
    handlers.onTurn();
    handlers.onState("listening");
    r.timers.push(
      window.setTimeout(() => {
        if (r === run && r.open && speechMs < SPEECH_MS) {
          dropRun(r);
          handlers.onHeard("");
          finish("quiet");
        }
      }, QUIET_MS),
      window.setTimeout(endRequest, MAX_REQUEST_MS),
    );
    const input: Record<string, unknown> = { sample_rate: RATE };
    // the turn detection service decides when the request is complete (Home Assistant's own detection would end
    // it at the first short pause)
    if (turnsOn) input.no_vad = true;
    const msg = runMessage(
      { pipeline: opts.pipeline, conversationId: opts.conversationId() },
      { start_stage: "stt", end_stage: "tts", input },
    );
    hass.connection
      .subscribeMessage<PipelineEvent>((ev) => onRunEvent(r, ev), msg)
      .then(
        (unsub) => {
          r.unsubscribe = unsub;
          if (over || r !== run || r.ended) void unsub().catch(() => {});
        },
        (err: any) => {
          if (r !== run || over) return;
          handlers.onError(err?.message || errorText({}));
          finish("error");
        },
      );
  };

  /** Stop the answer and listen; replayMs: what was said since the interruption began */
  const interrupt = (replayMs: number) => {
    const r = run;
    if (over || !r?.playing) return;
    stopPlaying();
    handlers.onLevel(0);
    dropRun(r);
    handlers.onInterrupted();
    listen(replayMs);
  };

  // ------------------------------------------------------------------ the microphone
  const onSamples = (pcm: Int16Array) => {
    if (over || !pcm.length) return;
    history.add(pcm);
    // loud enough for long enough: someone spoke (only for "nobody said anything")
    let sum = 0;
    for (let i = 0; i < pcm.length; i++) sum += pcm[i] * pcm[i];
    const rms = Math.sqrt(sum / pcm.length) / 32768;
    if (run?.open) speechMs = rms >= SPEECH_RMS ? speechMs + (pcm.length / RATE) * 1000 : Math.max(0, speechMs - 5);
    toTurns(pcm);
    const r = run;
    if (r?.open) {
      if (r.handlerId === undefined) r.pending.push(pcm);
      else toRun(r, pcm);
    }
  };

  const onVisibility = () => {
    // a phone stops the microphone of a page out of sight
    if (document.visibilityState === "hidden") finish("hidden");
  };

  const openMic = async (ctx: AudioContext) => {
    source = ctx.createMediaStreamSource(stream!);
    const resample = ctx.sampleRate === RATE ? null : new Resampler(ctx.sampleRate);
    const take = (floats: Float32Array) => {
      if (resample) return onSamples(resample.push(floats));
      const pcm = new Int16Array(floats.length);
      for (let i = 0; i < floats.length; i++) pcm[i] = toS16(floats[i]);
      onSamples(pcm);
    };
    try {
      const url = URL.createObjectURL(new Blob([WORKLET], { type: "application/javascript" }));
      await ctx.audioWorklet.addModule(url);
      URL.revokeObjectURL(url);
      const node = new AudioWorkletNode(ctx, "kattio-mic");
      node.port.onmessage = (e) => take(e.data);
      recorder = node;
    } catch {
      const node = ctx.createScriptProcessor(2048, 1, 1);
      node.onaudioprocess = (e) => take(e.inputBuffer.getChannelData(0));
      recorder = node;
    }
    source.connect(recorder);
    // a script processor only runs when connected onwards; it outputs nothing
    recorder.connect(ctx.destination);
  };

  const start = async () => {
    handlers.onState("starting");
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
      });
    } catch (err: any) {
      const denied = err?.name === "NotAllowedError" || err?.name === "SecurityError";
      handlers.onError(
        denied
          ? "The microphone isn't allowed here. Allow it for Home Assistant (in the browser or the app's settings)."
          : "No microphone was found.",
      );
      return finish("error");
    }
    if (over) return finish("stopped");
    try {
      // at 16 kHz where the browser can; else at its own rate, resampled here
      if (!micCtx) throw new Error("no 16 kHz");
      await openMic(micCtx);
    } catch {
      void micCtx?.close().catch(() => {});
      micCtx = undefined;
      recorder = undefined;
      try {
        await openMic(playCtx);
      } catch (err: any) {
        handlers.onError(`The microphone could not be opened: ${err?.message || err}`);
        return finish("error");
      }
    }
    if (over) return;
    document.addEventListener("visibilitychange", onVisibility);
    if (opts.turnDetection) {
      try {
        turnsUnsubscribe = await hass.connection.subscribeMessage<any>(onTurnsEvent, { type: "kattio/voice/stream" });
        turnsOn = true;
      } catch (err: any) {
        // the pipeline's own end-of-speech detection
        console.warn("Kattio: no turn detection:", err?.message || err?.code || err);
      }
      if (over) {
        void turnsUnsubscribe?.().catch(() => {});
        return;
      }
    }
    listen(0);
  };
  void start();

  return {
    stop() {
      finish("stopped");
    },
    interrupt() {
      interrupt(0);
    },
    done,
  };
}
