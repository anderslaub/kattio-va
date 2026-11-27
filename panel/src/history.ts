/**
 * The conversation history, kept by the Kattio integration in Home Assistant (each user's most recent
 * conversations; administrators can read everyone's). The page only asks; who may see what is decided there.
 */
import type { Hass } from "./assist";

export interface ConversationSummary {
  id: string;
  title: string;
  /** last active, seconds since 1970 */
  updated: number;
  count: number;
  user_id: string;
  user_name: string;
  mine: boolean;
}

export interface StoredConversation extends ConversationSummary {
  messages: { role: string; text: string }[];
}

export async function listConversations(hass: Hass, everyone = false): Promise<ConversationSummary[]> {
  const r = await hass.callWS<{ conversations: ConversationSummary[] }>({ type: "kattio/history/list", everyone });
  return r.conversations;
}

/** One conversation; without an id: this user's most recent (from any device). Null: none (or not allowed) */
export function getConversation(hass: Hass, id?: string | null): Promise<StoredConversation | null> {
  return hass.callWS<StoredConversation | null>({ type: "kattio/history/get", conversation_id: id ?? null });
}

export function saveConversation(
  hass: Hass,
  id: string,
  messages: { role: string; text: string }[],
): Promise<unknown> {
  return hass.callWS({ type: "kattio/history/save", conversation_id: id, messages });
}

export function deleteConversation(hass: Hass, id: string): Promise<unknown> {
  return hass.callWS({ type: "kattio/history/delete", conversation_id: id });
}

/** "just now", "5 min ago", "14:32", "yesterday", "Mon", "3 Nov" */
export function whenText(updated: number, now = Date.now()): string {
  const t = new Date(updated * 1000);
  const ago = (now - t.getTime()) / 1000;
  if (ago < 60) return "just now";
  if (ago < 3600) return `${Math.floor(ago / 60)} min ago`;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const day = 86400_000;
  if (t.getTime() >= today.getTime()) return t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (t.getTime() >= today.getTime() - day) return "yesterday";
  if (t.getTime() >= today.getTime() - 6 * day) return t.toLocaleDateString([], { weekday: "short" });
  return t.toLocaleDateString([], { day: "numeric", month: "short" });
}

/**
 * A new conversation's id, made by the page. Not one of Home Assistant's own (ULIDs): Home Assistant forgets a
 * conversation after a few quiet minutes and replaces a ULID it no longer knows with a new one, while an id of the
 * page's own making is kept as it is. So a conversation stays the same one (for the assistant too, which keeps its
 * memory of it by this id) when it is continued later, or when its first answer was cut off before it came.
 */
export function newConversationId(): string {
  const random = new Uint8Array(8);
  crypto.getRandomValues(random);
  const hex = [...random].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `kattio-${Date.now().toString(36)}-${hex}`;
}
