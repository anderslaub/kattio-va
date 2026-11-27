/**
 * Talking to the assistant through Home Assistant's Assist pipeline (the same pipeline the voice satellites use), over
 * the page's own logged-in connection to Home Assistant.
 */

/** The part of Home Assistant's frontend object the page uses */
export interface Hass {
  connection: {
    subscribeMessage<T>(callback: (msg: T) => void, msg: Record<string, unknown>): Promise<() => Promise<void>>;
  };
  language?: string;
  user?: { id: string; name?: string; is_admin?: boolean };
}

interface PipelineEvent {
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
 * Send a text request; text only (no speech). Resolves when the run is over (after onDone or onError).
 */
export async function askText(
  hass: Hass,
  text: string,
  opts: { pipeline?: string | null; conversationId?: string | null },
  handlers: ReplyHandlers,
): Promise<void> {
  let finished = false;
  let resolveRun!: () => void;
  const runOver = new Promise<void>((r) => (resolveRun = r));
  let streamed = false;

  const onEvent = (ev: PipelineEvent) => {
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
        if (!finished) handlers.onError(data.message || data.code || "The assistant could not answer.");
        finished = true;
        resolveRun();
        break;
      case "run-end":
        if (!finished) handlers.onError("The assistant did not answer.");
        finished = true;
        resolveRun();
        break;
    }
  };

  const msg: Record<string, unknown> = {
    type: "assist_pipeline/run",
    start_stage: "intent",
    end_stage: "intent",
    input: { text },
    conversation_id: opts.conversationId ?? null,
  };
  if (opts.pipeline) msg.pipeline = opts.pipeline;

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
