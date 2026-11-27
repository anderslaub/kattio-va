/**
 * Talking to the assistant through Home Assistant's Assist pipeline (the same pipeline the voice satellites use), over
 * the page's own logged-in connection to Home Assistant.
 */

/** The part of Home Assistant's frontend object the page uses */
export interface Hass {
  connection: {
    subscribeMessage<T>(callback: (msg: T) => void, msg: Record<string, unknown>): Promise<() => Promise<void>>;
    /** The open websocket (spoken questions are sent on it as binary messages) */
    socket?: WebSocket | null;
  };
  language?: string;
  user?: { id: string; name?: string; is_admin?: boolean };
  callWS<T>(msg: Record<string, unknown>): Promise<T>;
}

export interface PipelineEvent {
  type: string;
  data?: Record<string, any>;
}

export interface ReplyHandlers {
  /** More of the reply's text (streamed as the agent writes it); `newMessage` when the agent starts a new message, e.g.
   * after using a tool */
  onText(text: string, newMessage: boolean): void;
  /** The reply is complete: its full text when the agent did not stream it, and the conversation to continue */
  onDone(result: { speech: string; conversationId: string | null }): void;
  onError(message: string): void;
}

/**
 * Reads the reply out of the pipeline's events (the same for a typed and a spoken question). Returns true once the
 * reply is complete (or failed).
 */
export function replyReader(handlers: ReplyHandlers): (ev: PipelineEvent) => boolean {
  let finished = false;
  let streamed = false;
  return (ev) => {
    const data = ev.data ?? {};
    switch (ev.type) {
      case "intent-progress": {
        const delta = data.chat_log_delta;
        if (!delta) break;
        const isNew = delta.role === "assistant";
        if (typeof delta.content === "string" && delta.content) {
          handlers.onText(delta.content, isNew && streamed);
          streamed = true;
        } else if (isNew && streamed) {
          handlers.onText("", true);
        }
        break;
      }
      case "intent-end": {
        if (finished) break;
        const out = data.intent_output ?? {};
        const speech: string = out.response?.speech?.plain?.speech ?? "";
        if (out.response?.response_type === "error" && !streamed) {
          handlers.onError(speech || "The assistant could not answer.");
        } else {
          handlers.onDone({ speech, conversationId: out.conversation_id ?? null });
        }
        finished = true;
        break;
      }
      case "error":
        if (!finished) handlers.onError(errorText(data));
        finished = true;
        break;
      case "run-end":
        if (!finished) handlers.onError("The assistant did not answer.");
        finished = true;
        break;
    }
    return finished;
  };
}

/** A pipeline error in words for the conversation */
export function errorText(data: Record<string, any>): string {
  switch (data.code) {
    case "stt-no-text-recognized":
      return "I didn't catch that.";
    case "stt-stream-failed":
    case "stt-provider-unsupported-metadata":
      return "I couldn't hear you: speech recognition isn't working.";
    case "tts-failed":
      return "I couldn't say the answer out loud.";
    case "timeout":
      return "That took too long.";
  }
  return data.message || data.code || "The assistant could not answer.";
}

/** The pipeline run's message for Home Assistant */
export function runMessage(
  opts: { pipeline?: string | null; conversationId?: string | null },
  stages: Record<string, unknown>,
): Record<string, unknown> {
  const msg: Record<string, unknown> = {
    type: "assist_pipeline/run",
    ...stages,
    conversation_id: opts.conversationId ?? null,
  };
  if (opts.pipeline) msg.pipeline = opts.pipeline;
  return msg;
}

/**
 * Send a text request; text only (no speech). Resolves when the run is over (after onDone or onError).
 */
export async function askText(
  hass: Hass,
  text: string,
  opts: { pipeline?: string | null; conversationId?: string | null },
  handlers: ReplyHandlers,
): Promise<void> {
  let resolveRun!: () => void;
  const runOver = new Promise<void>((r) => (resolveRun = r));
  const read = replyReader(handlers);
  const onEvent = (ev: PipelineEvent) => {
    read(ev);
    if (ev.type === "error" || ev.type === "run-end") resolveRun();
  };
  const msg = runMessage(opts, { start_stage: "intent", end_stage: "intent", input: { text } });

  let unsubscribe: (() => Promise<void>) | undefined;
  try {
    unsubscribe = await hass.connection.subscribeMessage<PipelineEvent>(onEvent, msg);
  } catch (err: any) {
    handlers.onError(err?.message || "Home Assistant refused the request.");
    return;
  }
  await runOver;
  try {
    await unsubscribe();
  } catch {
    // the run already ended on Home Assistant's side
  }
}
