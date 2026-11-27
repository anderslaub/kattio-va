/**
 * One spoken question through Home Assistant's Assist pipeline: the microphone until the pipeline hears the end of
 * the question (or the user taps again), then the reply as text and out loud.
 *
 * The audio goes over the page's own connection to Home Assistant (binary websocket messages, as Home Assistant's own
 * voice dialog does), at the browser's sample rate; Home Assistant converts it for speech recognition.
 */
import { errorText, replyReader, runMessage, type Hass, type PipelineEvent, type ReplyHandlers } from "./assist";

export interface VoiceHandlers extends ReplyHandlers {
  /** The microphone is open */
  onListening(): void;
  /** What was heard (empty: nothing) */
  onHeard(text: string): void;
  /** The reply is playing (true) or has stopped (false) */
  onSpeaking(speaking: boolean): void;
  /** How loud the reply is right now, 0..1 */
  onLevel(level: number): void;
}

export interface VoiceTurn {
  /** Done talking: send what was said */
  stopListening(): void;
  /** Stop everything (the reply's text still arrives if it is on its way) */
  cancel(): void;
  /** Resolves when the turn is over */
  done: Promise<void>;
}

/** Most a question may last; Home Assistant usually hears the end long before */
const MAX_LISTEN_MS = 20000;

/** Records the microphone in small blocks of samples (the old way where audio worklets are missing) */
const WORKLET = `
registerProcessor("kattio-mic", class extends AudioWorkletProcessor {
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch) this.port.postMessage(ch.slice(0));
    return true;
  }
});`;

/** 0.1 s of silence: played on the tap, so the reply may play later (phones allow sound only after a tap) */
function silentWav(): string {
  const rate = 8000;
  const samples = 800;
  const buf = new DataView(new ArrayBuffer(44 + samples * 2));
  const str = (at: number, s: string) => [...s].forEach((c, i) => buf.setUint8(at + i, c.charCodeAt(0)));
  str(0, "RIFF");
  buf.setUint32(4, 36 + samples * 2, true);
  str(8, "WAVEfmt ");
  buf.setUint32(16, 16, true);
  buf.setUint16(20, 1, true);
  buf.setUint16(22, 1, true);
  buf.setUint32(24, rate, true);
  buf.setUint32(28, rate * 2, true);
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

/**
 * Start a spoken question. Call it from the tap itself (not after an await): sound may only start from a tap.
 */
export function askVoice(
  hass: Hass,
  opts: { pipeline?: string | null; conversationId?: string | null },
  handlers: VoiceHandlers,
): VoiceTurn {
  // made right away, inside the tap
  const ctx = new AudioContext();
  void ctx.resume();
  const player = new Audio();
  player.src = silentWav();
  void player.play().catch(() => {});

  let stream: MediaStream | undefined;
  let source: MediaStreamAudioSourceNode | undefined;
  let recorder: AudioWorkletNode | ScriptProcessorNode | undefined;
  let handlerId: number | undefined;
  let pending: ArrayBuffer[] = []; // recorded before Home Assistant said where to send it
  let listening = false;
  let micClosed = false;
  let over = false;
  let playing = false;
  let ttsUrl: string | undefined;
  let streamable = false;
  let runEnded = false;
  let heardSaid = false;
  let unsubscribe: (() => Promise<void>) | undefined;
  let meter = 0;
  let listenTimer = 0;
  let resolveDone!: () => void;
  const done = new Promise<void>((r) => (resolveDone = r));
  const read = replyReader(handlers);

  const send = (pcm: ArrayBuffer | null) => {
    const socket = hass.connection.socket;
    if (handlerId === undefined || !socket || socket.readyState !== WebSocket.OPEN) return;
    const bytes = pcm ? new Uint8Array(pcm) : new Uint8Array(0);
    const msg = new Uint8Array(1 + bytes.byteLength);
    msg[0] = handlerId;
    msg.set(bytes, 1);
    socket.send(msg);
  };

  const onSamples = (floats: Float32Array) => {
    if (micClosed) return;
    const pcm = new Int16Array(floats.length);
    for (let i = 0; i < floats.length; i++) {
      const v = Math.max(-1, Math.min(1, floats[i]));
      pcm[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
    }
    if (handlerId === undefined) pending.push(pcm.buffer);
    else send(pcm.buffer);
  };

  /** The microphone off; an empty message tells Home Assistant the question is complete */
  const closeMic = () => {
    if (micClosed) return;
    micClosed = true;
    listening = false;
    clearTimeout(listenTimer);
    recorder?.disconnect();
    source?.disconnect();
    stream?.getTracks().forEach((t) => t.stop());
    send(null);
  };

  const finish = () => {
    if (over) return;
    over = true;
    closeMic();
    cancelAnimationFrame(meter);
    player.pause();
    player.removeAttribute("src");
    if (playing) handlers.onSpeaking(false);
    playing = false;
    void ctx.close().catch(() => {});
    void unsubscribe?.().catch(() => {});
    resolveDone();
  };

  /** The reply out loud, with its loudness for the face */
  const play = (url: string) => {
    if (playing || over) return;
    playing = true;
    let analyser: AnalyserNode | undefined;
    try {
      const node = ctx.createMediaElementSource(player);
      analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      node.connect(analyser);
      analyser.connect(ctx.destination);
    } catch {
      // played directly, without the loudness
    }
    player.src = new URL(url, location.href).href;
    const ended = () => {
      if (!playing) return;
      playing = false;
      handlers.onSpeaking(false);
      if (runEnded) finish();
    };
    player.onended = ended;
    player.onerror = ended;
    void player.play().then(
      () => {
        if (playing) handlers.onSpeaking(true);
      },
      () => {
        console.warn("Kattio: the browser did not play the answer");
        ended();
      },
    );
    if (analyser) {
      const data = new Uint8Array(analyser.fftSize);
      const tick = () => {
        if (!playing) return;
        analyser!.getByteTimeDomainData(data);
        let sum = 0;
        for (const v of data) sum += (v - 128) * (v - 128);
        handlers.onLevel(Math.min(1, (Math.sqrt(sum / data.length) / 128) * 4));
        meter = requestAnimationFrame(tick);
      };
      meter = requestAnimationFrame(tick);
    }
  };

  const onEvent = (ev: PipelineEvent) => {
    if (over) return;
    const data = ev.data ?? {};
    switch (ev.type) {
      case "run-start":
        handlerId = data.runner_data?.stt_binary_handler_id;
        ttsUrl = data.tts_output?.url;
        streamable = !!data.tts_output?.stream_response;
        if (micClosed) send(null);
        else pending.forEach(send);
        pending = [];
        break;
      case "stt-vad-end":
        closeMic();
        break;
      case "stt-end":
        closeMic();
        heardSaid = true;
        handlers.onHeard((data.stt_output?.text ?? "").trim());
        break;
      case "intent-progress":
        // the answer is spoken while it is still being written
        if (data.tts_start_streaming && streamable && ttsUrl) play(ttsUrl);
        break;
      case "tts-end":
        if (data.tts_output?.url) play(data.tts_output.url);
        break;
      case "error":
        closeMic();
        if (data.code === "stt-no-text-recognized" && !heardSaid) handlers.onHeard("");
        break;
    }
    // the reply's text, as for a typed question (nothing heard is not an error: onHeard says so)
    if (ev.type !== "error" || data.code !== "stt-no-text-recognized") read(ev);
    if (ev.type === "run-end" || ev.type === "error") {
      runEnded = true;
      if (!playing) finish();
    }
  };

  const start = async () => {
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
      finish();
      return;
    }
    if (over) return finish();
    source = ctx.createMediaStreamSource(stream);
    try {
      const url = URL.createObjectURL(new Blob([WORKLET], { type: "application/javascript" }));
      await ctx.audioWorklet.addModule(url);
      URL.revokeObjectURL(url);
      const node = new AudioWorkletNode(ctx, "kattio-mic");
      node.port.onmessage = (e) => onSamples(e.data);
      recorder = node;
    } catch {
      const node = ctx.createScriptProcessor(2048, 1, 1);
      node.onaudioprocess = (e) => onSamples(e.inputBuffer.getChannelData(0));
      recorder = node;
    }
    if (over) return finish();
    source.connect(recorder);
    // a script processor only runs when connected onwards; it outputs nothing
    recorder.connect(ctx.destination);
    listening = true;
    listenTimer = window.setTimeout(closeMic, MAX_LISTEN_MS);
    handlers.onListening();

    const msg = runMessage(opts, {
      start_stage: "stt",
      end_stage: "tts",
      input: { sample_rate: ctx.sampleRate },
    });
    try {
      unsubscribe = await hass.connection.subscribeMessage<PipelineEvent>(onEvent, msg);
      if (over) void unsubscribe().catch(() => {});
    } catch (err: any) {
      handlers.onError(err?.message || errorText({}));
      finish();
    }
  };
  void start();

  return {
    stopListening() {
      if (listening) closeMic();
    },
    cancel() {
      finish();
    },
    done,
  };
}
