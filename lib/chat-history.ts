import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "./firebase/config";

export const CHAT_HISTORY_COLLECTION = "chat_histories";

export type ChatWorkflow = "avatar-iq" | "offer-iq" | "content-maker";

export type ChatHistoryMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  created_at: string;
};

export type ChatHistory = {
  session_id: string;
  owner_id: string;
  workflow: ChatWorkflow;
  messages: ChatHistoryMessage[];
  updated_at: string;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isSessionUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

/** Every conversation is addressed by a v4 UUID. */
export function newSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Older Safari and non-secure origins do not expose randomUUID.
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Returns the id when it is already a UUID, otherwise mints a fresh one. */
export function resolveSessionId(candidate: unknown): string {
  return isSessionUuid(candidate) ? candidate : newSessionId();
}

function normalizeMessage(raw: unknown, index: number, sessionId: string): ChatHistoryMessage | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const text = typeof item.text === "string" ? item.text : "";
  if (!text.trim()) return null;
  return {
    id: typeof item.id === "string" && item.id ? item.id : `${sessionId}-${index}`,
    role: item.role === "assistant" ? "assistant" : "user",
    text,
    created_at: typeof item.created_at === "string" ? item.created_at : "",
  };
}

/**
 * Reads the transcript the n8n workflow persisted for this session UUID.
 * Returns null when the session has no history yet.
 */
export async function loadChatHistory(
  sessionId: string,
  ownerId: string,
): Promise<ChatHistory | null> {
  if (!isSessionUuid(sessionId) || !ownerId) return null;

  const snap = await getDoc(doc(db, CHAT_HISTORY_COLLECTION, sessionId));
  if (!snap.exists()) return null;

  const data = snap.data() as Record<string, unknown>;
  if (data.owner_id !== ownerId) return null;

  const rawMessages = Array.isArray(data.messages) ? data.messages : [];
  return {
    session_id: sessionId,
    owner_id: ownerId,
    workflow: (data.workflow as ChatWorkflow) ?? "avatar-iq",
    messages: rawMessages
      .map((item, index) => normalizeMessage(item, index, sessionId))
      .filter((item): item is ChatHistoryMessage => item !== null),
    updated_at: typeof data.updated_at === "string" ? data.updated_at : "",
  };
}

/** Lists a user's recent sessions, newest first, for a history sidebar. */
export async function listChatSessions(
  ownerId: string,
  workflow?: ChatWorkflow,
  max = 30,
): Promise<ChatHistory[]> {
  if (!ownerId) return [];

  const constraints = [
    where("owner_id", "==", ownerId),
    ...(workflow ? [where("workflow", "==", workflow)] : []),
    orderBy("updated_at", "desc"),
    limit(max),
  ];

  const snap = await getDocs(query(collection(db, CHAT_HISTORY_COLLECTION), ...constraints));

  return snap.docs.map((entry) => {
    const data = entry.data() as Record<string, unknown>;
    const rawMessages = Array.isArray(data.messages) ? data.messages : [];
    return {
      session_id: entry.id,
      owner_id: ownerId,
      workflow: (data.workflow as ChatWorkflow) ?? "avatar-iq",
      messages: rawMessages
        .map((item, index) => normalizeMessage(item, index, entry.id))
        .filter((item): item is ChatHistoryMessage => item !== null),
      updated_at: typeof data.updated_at === "string" ? data.updated_at : "",
    };
  });
}
