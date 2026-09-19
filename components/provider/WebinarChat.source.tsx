"use client";

import {
  Check,
  ChevronUp,
  Copy,
  Download,
  FilePlus2,
  Layers3,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Send,
  Share2,
  Sparkles,
  SquarePen,
  Target,
  Trash2,
  X,
} from "lucide-react";
import { type WebinarAnswers, getQuestionnaireStatus } from "@/lib/webinar-questionnaire";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { parseAvatarChatPayload } from "@/lib/avatar-chat";
import { loadChatHistory, newSessionId, resolveSessionId } from "@/lib/chat-history";
import {
  buildGenerationPrompt,
  HANDOFF,
  storeHandoff,
  suggestedSections,
  type HandoffSection,
} from "@/lib/creation-handoff";
import { readN8nJson } from "@/lib/n8n-response";
import { auth, db } from "@/lib/firebase/config";
import { onAuthStateChanged } from "firebase/auth";
import { collection, deleteDoc, doc, onSnapshot, query, setDoc, where } from "firebase/firestore";
import { loadStudioContext } from "@/lib/workspace-context";
import { saveWorkspaceMemory, type WorkspaceMemory } from "@/lib/workspace-memory";
import { resolveUserFirstName } from "@/lib/onboarding";

export type Message = {
  id: string;
  role: "assistant" | "user";
  text: string;
  timestamp?: string;
  category?: string | null;
};

export type BuyerBlueprint = {
  persona_name: string;
  demographics: string;
  core_fear: string;
  buying_trigger: string;
  objections: string[];
  headlines: string[];
  social_hooks: string[];
  email_subject_lines: string[];
  research_notes?: string;
  primary_goals?: string[];
  values_and_beliefs?: string[];
  decision_style?: string;
  trusted_influences?: string[];
  day_in_the_life?: string;
  elevator_pitch?: string;
  content_ideas?: string[];
  search_topics?: string[];
  conversation_starters?: string[];
  competitive_edge?: string;
};

type BlueprintSession = {
  session_id: string;
  _docId?: string;
  custom_title?: string;
  pinned?: boolean;
  status: "draft" | "generating" | "completed" | "failed";
  step: number;
  answers: WebinarAnswers;
  messages: Message[];
  draft: string;
  selected_category: string | null;
  blueprint: BuyerBlueprint | null;
  updated_at: string;
};

const WEBHOOK_URL = process.env.NEXT_PUBLIC_N8N_WEBHOOK_BASE_URL
  ? `${process.env.NEXT_PUBLIC_N8N_WEBHOOK_BASE_URL.replace(/\/+$/, "")}/avatar-iq`
  : "https://explosionmarketing.app.n8n.cloud/webhook/avatar-iq";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CHAT_PATH = "/provider/webinar-chat";

// A Gemini agent synthesizing a full buyer blueprint regularly needs over a minute.
const WEBHOOK_TIMEOUT_MS = 120_000;

function getGreetingText(name?: string): string {
  const displayName = name?.trim() ? name.trim() : "there";
  return `Hi ${displayName}, welcome to Webinar Chat.\n\nLet’s map your Ideal Buyer Blueprint. I’ll ask four short questions about your business, then scan the web for fresh insight to sharpen it. Ready when you are.`;
}

function getInitialGreeting(name?: string): Message {
  return {
    id: "welcome",
    role: "assistant",
    text: getGreetingText(name),
    timestamp: new Date().toISOString(),
  };
}

const INITIAL_GREETING: Message = getInitialGreeting();

function getSessionTitle(s: BlueprintSession): string {
  if (s.custom_title && s.custom_title.trim()) {
    return s.custom_title.trim();
  }
  if (s.blueprint?.persona_name && s.blueprint.persona_name.trim()) {
    return s.blueprint.persona_name.trim();
  }
  const firstUserMsg = s.messages?.find((m) => m.role === "user");
  if (firstUserMsg?.text?.trim()) {
    let clean = firstUserMsg.text.replace(/\[SYSTEM COMMAND:.*?\]/gi, "").trim();
    if (/^synthesize our strategy into a complete presentation outline/i.test(clean)) {
      clean = "Strategy Synthesis";
    }
    if (clean) {
      return clean.length > 36 ? clean.slice(0, 36) + "..." : clean;
    }
  }
  if (s.draft && s.draft.trim()) {
    return s.draft.trim().slice(0, 36) + "...";
  }
  const nonWelcome = s.messages?.find((m) => m.id !== "welcome");
  if (nonWelcome?.text?.trim()) {
    return nonWelcome.text.trim().slice(0, 32) + "...";
  }
  if (s.updated_at) {
    try {
      const d = new Date(s.updated_at);
      return `Chat · ${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
    } catch {}
  }
  return "New chat";
}

function formatSessionDate(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export default function PresentationChat() {
  const params = useParams<{ chatId?: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  // `?c=` is the current, user-facing param. `?session=` and `?id=` are kept
  // for back-compat with links that were already shared.
  const rawRouteChatId =
    searchParams?.get("c") ||
    searchParams?.get("session") ||
    searchParams?.get("id") ||
    (typeof params?.chatId === "string" && params.chatId !== "default" ? params.chatId : "");
  const routeChatId =
    rawRouteChatId && (UUID_PATTERN.test(rawRouteChatId) || rawRouteChatId.length > 5)
      ? rawRouteChatId
      : "";

  const [messages, setMessages] = useState<Message[]>([INITIAL_GREETING]);
  const [answers, setAnswers] = useState<WebinarAnswers>({});
  const [step, setStep] = useState<number>(1);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<BuyerBlueprint | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [blueprintDrawerOpen, setBlueprintDrawerOpen] = useState(true);
  const [mobileBlueprintOpen, setMobileBlueprintOpen] = useState(false);
  const [webhookError, setWebhookError] = useState<string | null>(null);
  // A chat id exists from the very first render, so the composer is usable
  // immediately and we never post an empty `session_id` to n8n.
  const [sessionId, setSessionId] = useState<string>(() => resolveSessionId(rawRouteChatId));
  const [history, setHistory] = useState<BlueprintSession[]>([]);
  const [workspaceMemory, setWorkspaceMemory] = useState<WorkspaceMemory | null>(null);
  const [assetContext, setAssetContext] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [handoffOpen, setHandoffOpen] = useState<"ppt" | "offer" | null>(null);
  const [handoffPrompt, setHandoffPrompt] = useState("");
  const [handoffSections, setHandoffSections] = useState<HandoffSection[]>([]);
  const [handoffIdea, setHandoffIdea] = useState("");

  // Session action states (rename, delete confirmation, share dialog)
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [deleteConfirmSession, setDeleteConfirmSession] = useState<BlueprintSession | null>(null);
  const [shareSession, setShareSession] = useState<BlueprintSession | null>(null);
  const [shareToast, setShareToast] = useState<string | null>(null);

  const [userName, setUserName] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return resolveUserFirstName(auth.currentUser, null) || "";
    }
    return "";
  });

  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // The chat id whose content is currently loaded into state. When a deep link
  // asks for a chat we have not loaded yet this stays empty, which is what the
  // sync effect below keys off — no `hydrated` race, no empty-id window.
  const loadedChatIdRef = useRef<string | null>(null);
  if (loadedChatIdRef.current === null) {
    loadedChatIdRef.current = routeChatId ? "" : sessionId;
  }

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [sessionId]);

  // Sync user first name whenever memory changes
  useEffect(() => {
    const resolved = resolveUserFirstName(auth.currentUser, workspaceMemory);
    if (resolved) {
      setUserName(resolved);
    }
  }, [workspaceMemory]);

  // Load studio context and subscribe to real-time blueprint sessions
  useEffect(() => {
    let cancelled = false;
    let unsubscribeSnapshot: (() => void) | null = null;
    setHydrated(false);

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (cancelled) return;
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }

      if (!user) {
        setHydrated(true);
        return;
      }

      const initialName = resolveUserFirstName(user, null);
      if (initialName) setUserName(initialName);

      try {
        const studio = await loadStudioContext(user.uid);
        if (cancelled) return;
        setWorkspaceMemory(studio.memory);
        setAssetContext(studio.assetContext);
        const memName = resolveUserFirstName(user, studio.memory);
        if (memName) setUserName(memName);
      } catch (e) {
        console.warn("Error loading studio context:", e);
      }

      // Real-time Firestore subscription for blueprint_sessions
      const q = query(
        collection(db, "blueprint_sessions"),
        where("owner_id", "==", user.uid)
      );

      unsubscribeSnapshot = onSnapshot(
        q,
        (snap) => {
          if (cancelled) return;
          const sessionMap = new Map<string, BlueprintSession>();
          snap.docs.forEach((d) => {
            const data = d.data() as BlueprintSession;
            const sid = data.session_id || d.id.replace(`${user.uid}_`, "");
            const docId = d.id;
            const existing = sessionMap.get(sid);
            const updatedAt = data.updated_at ? new Date(data.updated_at).getTime() : 0;
            const existingUpdatedAt = existing?.updated_at ? new Date(existing.updated_at).getTime() : 0;
            if (!existing || updatedAt >= existingUpdatedAt) {
              sessionMap.set(sid, {
                ...data,
                session_id: sid,
                _docId: docId,
              });
            }
          });

          const list = Array.from(sessionMap.values());
          // Filter out empty phantom sessions (no user messages, no blueprint, no draft, and no title)
          const realSessions = list.filter((s) => {
            const hasUserMsg = Array.isArray(s.messages) && s.messages.some((m) => m.role === "user");
            const hasBlueprint = Boolean(
              s.blueprint?.persona_name?.trim() ||
              s.blueprint?.demographics?.trim() ||
              s.blueprint?.core_fear?.trim()
            );
            const hasDraft = Boolean(s.draft && s.draft.trim());
            const hasTitle = Boolean(s.custom_title && s.custom_title.trim());
            return hasUserMsg || hasBlueprint || hasDraft || hasTitle;
          });

          // Sort: pinned first, then by updated_at descending
          realSessions.sort((a, b) => {
            if (Boolean(a.pinned) !== Boolean(b.pinned)) {
              return a.pinned ? -1 : 1;
            }
            const tA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
            const tB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
            return tB - tA;
          });

          setHistory(realSessions);
          setHydrated(true);
        },
        (err) => {
          console.warn("Real-time blueprint_sessions listener error:", err);
          setHydrated(true);
        }
      );
    });

    return () => {
      cancelled = true;
      if (unsubscribeSnapshot) unsubscribeSnapshot();
      unsubscribeAuth();
    };
  }, []);

  // Restore a deep-linked chat as soon as we can identify it. With no `?c=` in
  // the URL there is nothing to restore — the chat minted on mount stays active.
  useEffect(() => {
    if (!routeChatId) return;
    if (loadedChatIdRef.current === routeChatId) return;

    // Never clobber work the user already started while the deep link resolved.
    if (sessionId === routeChatId && (draft.trim() || busy || messages.some((m) => m.role === "user"))) {
      loadedChatIdRef.current = routeChatId;
      return;
    }

    const found = history.find((s) => s.session_id === routeChatId);
    if (found) {
      restoreSession(found, false);
      return;
    }

    // Not in the autosaved list. Wait for the list to finish loading before
    // deciding the chat is new, then fall back to the durable n8n transcript.
    if (!hydrated) return;
    restoreSession(
      {
        session_id: routeChatId,
        status: "draft",
        step: 1,
        answers: {},
        messages: [],
        draft: "",
        selected_category: null,
        blueprint: null,
        updated_at: "",
      },
      false,
    );
  }, [hydrated, routeChatId, history, sessionId, draft, busy, messages]);

  // Autosave session to Firestore (only if conversation has real content)
  useEffect(() => {
    if (!hydrated || !sessionId) return;
    const timeout = window.setTimeout(() => {
      const user = auth.currentUser;
      if (!user) return;
      const hasUserMsg = messages.some((m) => m.role === "user");
      const hasDraft = Boolean(draft.trim());
      const hasBlueprint = Boolean(
        result?.persona_name?.trim() ||
        result?.demographics?.trim() ||
        result?.core_fear?.trim()
      );
      const existingSession = history.find((h) => h.session_id === sessionId);
      const custom_title = existingSession?.custom_title || "";
      const pinned = existingSession?.pinned || false;

      if (!hasUserMsg && !hasDraft && !hasBlueprint && !custom_title) return;

      const status = result ? "completed" : busy ? "generating" : webhookError ? "failed" : "draft";
      const updatedAt = new Date().toISOString();

      const docId = existingSession?._docId || sessionId;
      void setDoc(
        doc(db, "blueprint_sessions", docId),
        {
          session_id: sessionId,
          owner_id: user.uid,
          custom_title,
          pinned,
          status,
          step,
          answers,
          messages,
          draft,
          selected_category: null,
          blueprint: result,
          last_error: webhookError,
          updated_at: updatedAt,
        },
        { merge: true }
      ).catch((err) => console.warn("Failed to autosave blueprint session:", err));
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [busy, draft, hydrated, messages, result, sessionId, webhookError, step, answers]);

  function initializeSession(nextSessionId: string) {
    const sid = resolveSessionId(nextSessionId);
    loadedChatIdRef.current = sid;
    setMessages([INITIAL_GREETING]);
    setAnswers({});
    setStep(1);
    setDraft("");
    setBusy(false);
    setResult(null);
    setWebhookError(null);
    setSessionId(sid);
  }

  function restoreSession(session: BlueprintSession, navigate = false) {
    if (navigate && session.session_id !== routeChatId) {
      router.push(`${CHAT_PATH}?c=${session.session_id}`);
    }
    loadedChatIdRef.current = session.session_id;
    setSessionId(session.session_id);
    const raw = Array.isArray(session.messages) && session.messages.length ? session.messages : [INITIAL_GREETING];
    const seen = new Set<string>();
    const deduped = raw.filter((m) => {
      const key = m.id || `${m.role}_${m.text}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    setMessages(deduped);
    const loadedAnswers = (session.answers as WebinarAnswers) || {};
    setAnswers(loadedAnswers);
    const qStatus = getQuestionnaireStatus(loadedAnswers);
    setStep(session.step || qStatus.currentStep);
    setDraft(session.draft ?? "");
    setResult(session.blueprint ?? null);
    setBusy(false);
    setWebhookError(null);
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }

    // chat_histories is the transcript the workflow itself persisted, so it is
    // authoritative when it holds more turns than the autosaved session copy.
    const ownerId = auth.currentUser?.uid;
    if (ownerId) {
      void loadChatHistory(session.session_id, ownerId)
        .then((durable) => {
          if (!durable || durable.messages.length <= deduped.length) return;
          setSessionId((current) => {
            if (current === session.session_id) {
              setMessages([
                INITIAL_GREETING,
                ...durable.messages.map((item) => ({
                  id: item.id,
                  role: item.role,
                  text: item.text,
                  timestamp: item.created_at,
                })),
              ]);
            }
            return current;
          });
        })
        .catch(() => {});
    }
  }

  function startNewChat() {
    const nextSessionId = newSessionId();
    initializeSession(nextSessionId);
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
    // A brand-new chat keeps a clean URL. The id is written into `?c=` only
    // once the chat has something worth linking to (see handleSend).
    if (routeChatId) router.replace(CHAT_PATH);
  }

  async function togglePinSession(session: BlueprintSession, e: React.MouseEvent) {
    e.stopPropagation();
    const nextPinned = !session.pinned;
    const user = auth.currentUser;
    if (user) {
      const docId = session._docId || session.session_id;
      try {
        await setDoc(doc(db, "blueprint_sessions", docId), { pinned: nextPinned }, { merge: true });
      } catch (err) {
        console.warn("Failed to toggle pin in Firestore:", err);
      }
    }
  }

  function startRename(session: BlueprintSession, e: React.MouseEvent) {
    e.stopPropagation();
    setRenamingSessionId(session.session_id);
    setRenameDraft(session.custom_title || getSessionTitle(session));
  }

  async function saveRename(sessionIdToRename: string, newTitle: string) {
    const trimmed = newTitle.trim();
    setRenamingSessionId(null);
    if (!trimmed) return;
    const user = auth.currentUser;
    if (user) {
      const target = history.find((h) => h.session_id === sessionIdToRename);
      const docId = target?._docId || sessionIdToRename;
      try {
        await setDoc(doc(db, "blueprint_sessions", docId), { custom_title: trimmed }, { merge: true });
      } catch (err) {
        console.warn("Failed to rename session in Firestore:", err);
      }
    }
  }

  function promptDeleteSession(session: BlueprintSession, e: React.MouseEvent) {
    e.stopPropagation();
    setDeleteConfirmSession(session);
  }

  async function executeDeleteSession(idToDelete: string) {
    const target = history.find((h) => h.session_id === idToDelete);
    setDeleteConfirmSession(null);
    if (sessionId === idToDelete) {
      startNewChat();
    }
    const user = auth.currentUser;
    if (user) {
      const docId = target?._docId || idToDelete;
      try {
        await deleteDoc(doc(db, "blueprint_sessions", docId));
        if (docId !== `${user.uid}_${idToDelete}`) {
          await deleteDoc(doc(db, "blueprint_sessions", `${user.uid}_${idToDelete}`)).catch(() => {});
        }
      } catch (err) {
        console.warn("Failed to delete session from Firestore:", err);
      }
    }
  }

  function openShareModal(targetSession?: BlueprintSession, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    if (targetSession) {
      setShareSession(targetSession);
    } else {
      const currentTitle =
        history.find((h) => h.session_id === sessionId)?.custom_title ||
        result?.persona_name ||
        "Webinar Chat";
      setShareSession({
        session_id: sessionId || "new",
        status: "draft",
        step,
        answers,
        messages,
        draft,
        selected_category: null,
        blueprint: result,
        updated_at: new Date().toISOString(),
        custom_title: currentTitle,
      });
    }
  }

  function getShareUrl(sid: string) {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}${CHAT_PATH}?c=${sid}`;
  }

  async function handleCopyShareLink(sid: string) {
    const url = getShareUrl(sid);
    try {
      await navigator.clipboard.writeText(url);
      setShareToast("Link copied to clipboard.");
      setTimeout(() => setShareToast(null), 2500);
    } catch {
      window.prompt("Copy link:", url);
    }
  }

  function formatTranscriptMarkdown(session: BlueprintSession) {
    const title = getSessionTitle(session);
    const date = session.updated_at ? new Date(session.updated_at).toLocaleString() : new Date().toLocaleString();
    let md = `# Webinar Chat: ${title}\nDate: ${date}\n\n`;

    if (session.blueprint?.persona_name) {
      md += `## Strategy Blueprint\n`;
      md += `- **Topic / Persona**: ${session.blueprint.persona_name}\n`;
      if (session.blueprint.demographics) md += `- **Target Audience**: ${session.blueprint.demographics}\n`;
      if (session.blueprint.core_fear) md += `- **Core Pain Point**: ${session.blueprint.core_fear}\n`;
      if (session.blueprint.buying_trigger) md += `- **Buying Trigger**: ${session.blueprint.buying_trigger}\n`;
      if (session.blueprint.elevator_pitch) md += `- **Elevator Pitch**: ${session.blueprint.elevator_pitch}\n`;
      md += `\n`;
    }

    md += `## Messages\n\n`;
    session.messages.forEach((m) => {
      const sender = m.role === "assistant" ? "Webinar Chat" : "You";
      md += `### ${sender}\n${m.text}\n\n`;
    });

    return md;
  }

  async function handleCopyTranscript(session: BlueprintSession) {
    const md = formatTranscriptMarkdown(session);
    try {
      await navigator.clipboard.writeText(md);
      setShareToast("Transcript copied to clipboard.");
      setTimeout(() => setShareToast(null), 2500);
    } catch {
      window.prompt("Copy transcript:", md);
    }
  }

  function handleDownloadMarkdown(session: BlueprintSession) {
    const md = formatTranscriptMarkdown(session);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeTitle = (session.custom_title || "webinar-chat").toLowerCase().replace(/[^a-z0-9]/g, "-");
    link.href = url;
    link.download = `${safeTitle}-${session.session_id.slice(0, 8)}.md`;
    link.click();
    URL.revokeObjectURL(url);
    setShareToast("Transcript downloaded.");
    setTimeout(() => setShareToast(null), 2500);
  }

  async function handleSend(customText?: string) {
    const text = (customText ?? draft).trim();
    if (!text || busy) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      text,
      timestamp: new Date().toISOString(),
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setDraft("");
    setBusy(true);
    setWebhookError(null);

    const activeSessionId = resolveSessionId(sessionId);
    if (activeSessionId !== sessionId) {
      loadedChatIdRef.current = activeSessionId;
      setSessionId(activeSessionId);
    }
    // The chat now has content, so make it linkable.
    if (routeChatId !== activeSessionId) {
      window.history.replaceState(null, "", `${CHAT_PATH}?c=${activeSessionId}`);
    }

    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error("You need to be signed in to use Webinar Chat.");
      }
      const userId = user.uid;

      // Check if user is asking to synthesize or initiate build
      const isInitiateBuild =
        text.includes("[SYSTEM COMMAND: INITIATE BUILD]") ||
        /initiate build/i.test(text) ||
        /synthesize/i.test(text);
      const isBlueprintRequest =
        isInitiateBuild ||
        /\b(blueprint|persona|synthesize|generate blueprint|create blueprint|buyer profile|avatar profile|slide outline|presentation outline)\b/i.test(text);

      let assistantReplyText = "";
      let updatedBlueprint: BuyerBlueprint | null = result;

      const updatedAnswers: WebinarAnswers = answers;
      const nextStep: number = step;

      const token = await user.getIdToken().catch(() => null);
      if (!token) {
        throw new Error("Your sign-in session expired. Please sign in again.");
      }

      // The webhook is the only source of replies. A Gemini agent synthesizing
      // a full blueprint regularly needs well over a minute.
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

      try {
        const response = await fetch(WEBHOOK_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
          body: JSON.stringify({
            session_id: activeSessionId,
            user_id: userId,
            message: text,
            messages: nextMessages,
            blueprint: result,
            answers,
            step,
            asset_context: assetContext,
            workspace_context: assetContext,
            synthesize: isBlueprintRequest,
            initiate_build: isInitiateBuild,
          }),
        });

        const parsed = await readN8nJson<unknown>(response, "Webinar Chat");
        const chat = parseAvatarChatPayload(parsed, result, answers);
        if (!chat.reply?.trim()) {
          throw new Error("Webinar Chat returned an empty reply.");
        }
        assistantReplyText = chat.reply;
        if (chat.blueprint) updatedBlueprint = chat.blueprint;
      } catch (webhookErr) {
        if (webhookErr instanceof DOMException && webhookErr.name === "AbortError") {
          throw new Error("Webinar Chat timed out. Please try again.");
        }
        throw webhookErr;
      } finally {
        window.clearTimeout(timeoutId);
      }

      setAnswers(updatedAnswers);
      setStep(nextStep);

      if (updatedBlueprint) {
        setResult(updatedBlueprint);
        sessionStorage.setItem("astrocraft:latest-blueprint", JSON.stringify(updatedBlueprint));
        if (userId) {
          void saveWorkspaceMemory(userId, {
            onboarding_complete: true,
            business_profile: {
              business: updatedAnswers.q1_business || text,
              problem: updatedAnswers.q3_problem_transformation || updatedBlueprint.core_fear,
              objections: updatedAnswers.q4_objection || updatedBlueprint.objections?.join("; ") || "",
            },
            audience_profile: updatedBlueprint as unknown as Record<string, unknown>,
            memory_summary: `Ideal buyer: ${updatedAnswers.q2_buyer || updatedBlueprint.demographics || updatedBlueprint.persona_name}`.trim(),
            source_session_id: activeSessionId,
          });
        }
      }

      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        role: "assistant",
        text: assistantReplyText,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => {
        const hasUser = prev.some((m) => m.id === userMsg.id);
        const base = hasUser ? prev : [...prev, userMsg];
        if (base.some((m) => m.id === assistantMsg.id)) return base;
        return [...base, assistantMsg];
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Could not process message.";
      setWebhookError(reason);
      setMessages((prev) => {
        const hasUser = prev.some((m) => m.id === userMsg.id);
        const base = hasUser ? prev : [...prev, userMsg];
        return [...base, {
          id: `e-${Date.now()}`,
          role: "assistant" as const,
          text: `${reason}\n\nYour message was not answered. Please try sending it again.`,
          timestamp: new Date().toISOString(),
        }];
      });
    } finally {
      setBusy(false);
    }
  }

  function handleInitiateBuild() {
    void handleSend("Synthesize our strategy into a complete presentation outline.");
  }

  function openHandoff(destination: "ppt" | "offer", ideaText?: string) {
    const idea = (ideaText ?? messages.filter((item) => item.role === "assistant").at(-1)?.text ?? "").trim();
    const sections = suggestedSections(result, idea);
    const prompt = buildGenerationPrompt({
      blueprint: result,
      ideaText: idea,
      sections,
      assetContext,
    });
    setHandoffIdea(idea);
    setHandoffSections(sections);
    setHandoffPrompt(prompt);
    setHandoffOpen(destination);
  }

  function confirmHandoff() {
    if (!handoffOpen) return;
    const selected = handoffSections.filter((section) => section.selected);
    const prompt = handoffPrompt.trim() || buildGenerationPrompt({
      blueprint: result,
      ideaText: handoffIdea,
      sections: selected.length ? selected : handoffSections,
      assetContext,
    });
    if (result) sessionStorage.setItem(HANDOFF.blueprint, JSON.stringify(result));
    storeHandoff({
      session: sessionId,
      idea: handoffIdea,
      prompt,
      sections: JSON.stringify(selected.map((section) => section.label)),
      intent: handoffOpen === "ppt" ? "presentation" : "offer",
      autoBuild: handoffOpen === "ppt" ? "true" : "",
      offerFocus: handoffOpen === "offer" ? (prompt || result?.elevator_pitch || "") : "",
    });
    setHandoffOpen(null);
    router.push(handoffOpen === "ppt" ? "/provider/webinar-content" : "/provider/webinar-offer");
  }

  function handleDirectLaunch(destination: "ppt" | "offer", ideaText?: string) {
    const idea = (ideaText ?? messages.filter((item) => item.role === "assistant").at(-1)?.text ?? "").trim();
    const sections = suggestedSections(result, idea);
    const prompt = buildGenerationPrompt({
      blueprint: result,
      ideaText: idea,
      sections,
      assetContext,
    });
    if (result) sessionStorage.setItem(HANDOFF.blueprint, JSON.stringify(result));
    storeHandoff({
      session: sessionId,
      idea,
      prompt,
      sections: JSON.stringify(sections.map((section) => section.label)),
      intent: destination === "ppt" ? "presentation" : "offer",
      autoBuild: destination === "ppt" ? "true" : "",
      offerFocus: destination === "offer" ? (prompt || result?.elevator_pitch || "") : "",
    });
    router.push(destination === "ppt" ? "/provider/webinar-content" : "/provider/webinar-offer");
  }


  async function copyText(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      window.prompt("Copy content:", text);
    }
  }

  const activeBlueprint: BuyerBlueprint = result ?? {
    persona_name: "",
    demographics: "",
    core_fear: "",
    buying_trigger: "",
    objections: [],
    headlines: [],
    social_hooks: [],
    email_subject_lines: [],
    content_ideas: [],
    primary_goals: [],
    values_and_beliefs: [],
    decision_style: "",
    trusted_influences: [],
    day_in_the_life: "",
    elevator_pitch: "",
    search_topics: [],
    conversation_starters: [],
    competitive_edge: "",
  };

  function updateBlueprintField<K extends keyof BuyerBlueprint>(key: K, value: BuyerBlueprint[K]) {
    setResult((prev) => {
      const base: BuyerBlueprint = prev ?? {
        persona_name: "",
        demographics: "",
        core_fear: "",
        buying_trigger: "",
        objections: [],
        headlines: [],
        social_hooks: [],
        email_subject_lines: [],
        content_ideas: [],
        primary_goals: [],
        values_and_beliefs: [],
        decision_style: "",
        trusted_influences: [],
        day_in_the_life: "",
        elevator_pitch: "",
        search_topics: [],
        conversation_starters: [],
        competitive_edge: "",
      };
      const next = { ...base, [key]: value };
      sessionStorage.setItem("astrocraft:latest-blueprint", JSON.stringify(next));
      return next;
    });
  }

  function updateArrayField(
    key: "objections" | "headlines" | "social_hooks" | "email_subject_lines" | "content_ideas" | "primary_goals",
    index: number,
    value: string,
  ) {
    setResult((prev) => {
      const base = prev ?? {
        persona_name: "",
        demographics: "",
        core_fear: "",
        buying_trigger: "",
        objections: [],
        headlines: [],
        social_hooks: [],
        email_subject_lines: [],
        content_ideas: [],
        primary_goals: [],
      };
      const list = [...(base[key] ?? [])];
      list[index] = value;
      const next = { ...base, [key]: list };
      sessionStorage.setItem("astrocraft:latest-blueprint", JSON.stringify(next));
      return next as BuyerBlueprint;
    });
  }

  function addArrayField(
    key: "objections" | "headlines" | "social_hooks" | "email_subject_lines" | "content_ideas" | "primary_goals",
    newItem: string,
  ) {
    if (!newItem.trim()) return;
    setResult((prev) => {
      const base = prev ?? {
        persona_name: "",
        demographics: "",
        core_fear: "",
        buying_trigger: "",
        objections: [],
        headlines: [],
        social_hooks: [],
        email_subject_lines: [],
        content_ideas: [],
        primary_goals: [],
      };
      const list = [...(base[key] ?? []), newItem.trim()];
      const next = { ...base, [key]: list };
      sessionStorage.setItem("astrocraft:latest-blueprint", JSON.stringify(next));
      return next as BuyerBlueprint;
    });
  }

  function removeArrayField(
    key: "objections" | "headlines" | "social_hooks" | "email_subject_lines" | "content_ideas" | "primary_goals",
    index: number,
  ) {
    setResult((prev) => {
      if (!prev) return null;
      const list = [...(prev[key] ?? [])];
      list.splice(index, 1);
      const next = { ...prev, [key]: list };
      sessionStorage.setItem("astrocraft:latest-blueprint", JSON.stringify(next));
      return next as BuyerBlueprint;
    });
  }

  const [mergeToast, setMergeToast] = useState(false);

  function mergeBlueprintIntoDraft(customTopic?: string) {
    const bp = result || activeBlueprint;
    const topic = customTopic || bp.persona_name?.trim() || "High-Converting Business Presentation";
    const audience = bp.demographics?.trim() || "Target Decision Makers";
    const pain = bp.core_fear?.trim() || "Bottlenecks, operational friction, and scaling ceilings";
    const trigger = bp.buying_trigger?.trim() || "Urgent need for predictable leverage";
    const pitch = bp.elevator_pitch?.trim() || "";
    const objections = (bp.objections || []).filter(Boolean);
    const hooks = (bp.headlines || []).filter(Boolean);
    const outline = (bp.content_ideas || []).filter(Boolean);

    let prompt = `Create a high-converting, 8-10 slide presentation on "${topic}".\n\n`;
    prompt += `🎯 Target Audience: ${audience}\n`;
    prompt += `🔥 Core Problem / Pain Point: ${pain}\n`;
    prompt += `⚡ Breakthrough / Buying Trigger: ${trigger}\n`;
    if (pitch) prompt += `💡 Core Value Pitch: ${pitch}\n`;
    if (objections.length > 0) {
      prompt += `🛡️ Key Objections to Neutralize:\n${objections.map((o) => `  - ${o}`).join("\n")}\n`;
    }
    if (hooks.length > 0) {
      prompt += `🎣 Winning Angles & Hooks:\n${hooks.map((h) => `  - ${h}`).join("\n")}\n`;
    }
    if (outline.length > 0) {
      prompt += `📋 Slide Points & Outline Flow:\n${outline.map((pt, i) => `  ${i + 1}. ${pt}`).join("\n")}\n`;
    }
    prompt += `\nPlease structure this into presentation slides with punchy titles, clear subheadings, and actionable speaker-ready bullet points.`;

    setDraft(prompt);
    setMergeToast(true);
    setTimeout(() => setMergeToast(false), 2500);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }

  function mergeFieldIntoDraft(label: string, value: string) {
    if (!value.trim()) return;
    setDraft((prev) => {
      const addition = `${label}: ${value.trim()}`;
      return prev.trim() ? `${prev.trim()}\n\n${addition}` : addition;
    });
    setMergeToast(true);
    setTimeout(() => setMergeToast(false), 2500);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }

  const activeHistoryEntry = history.find((h) => h.session_id === sessionId);
  const currentChatTitle = activeHistoryEntry
    ? getSessionTitle(activeHistoryEntry)
    : messages.some((m) => m.role === "user")
      ? "Webinar Chat"
      : "New chat";

  const historyListContent = (
    <>
      {history.length === 0 ? (
        <div className="px-3 py-8 text-center text-xs text-muted-foreground">
          <p className="font-medium">No chats yet</p>
          <p className="mt-1 text-[11px] opacity-70">Start a chat and it will show up here.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {history.map((s) => {
            const title = getSessionTitle(s);
            const isActive = sessionId === s.session_id;
            const isPinned = Boolean(s.pinned);
            const isRenaming = renamingSessionId === s.session_id;

            if (isRenaming) {
              return (
                <div
                  key={s.session_id}
                  onClick={(e) => e.stopPropagation()}
                  className="rounded-xl border border-foreground/30 bg-card p-2 shadow-xs"
                >
                  <input
                    autoFocus
                    type="text"
                    value={renameDraft}
                    onChange={(e) => setRenameDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void saveRename(s.session_id, renameDraft);
                      if (e.key === "Escape") setRenamingSessionId(null);
                    }}
                    className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:border-foreground"
                    placeholder="Chat title"
                  />
                  <div className="mt-1.5 flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => setRenamingSessionId(null)}
                      className="rounded px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-secondary cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => void saveRename(s.session_id, renameDraft)}
                      className="rounded bg-foreground px-2 py-0.5 text-[10px] font-medium text-background hover:opacity-90 cursor-pointer"
                    >
                      Save
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={s.session_id}
                onClick={() => restoreSession(s, true)}
                className={`group relative flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition cursor-pointer ${
                  isActive
                    ? "bg-foreground text-background font-medium shadow-xs"
                    : "text-muted-foreground hover:bg-surface-raised hover:text-foreground"
                }`}
              >
                <div className="min-w-0 flex-1 pr-1.5">
                  <div className="flex items-center gap-1.5">
                    {isPinned && (
                      <Pin className={`size-3 shrink-0 ${isActive ? "text-ochre fill-ochre" : "text-ochre/55 fill-ochre/55"}`} />
                    )}
                    <p className="truncate text-xs leading-snug">{title}</p>
                  </div>
                </div>

                {/* Actions: Pin, Rename, Share, Delete */}
                <div
                  className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={(e) => void togglePinSession(s, e)}
                    className={`rounded-md p-1 transition cursor-pointer ${
                      isActive
                        ? "hover:bg-background/20 hover:text-white"
                        : "hover:bg-secondary hover:text-foreground"
                    }`}
                    title={isPinned ? "Unpin chat" : "Pin chat to top"}
                  >
                    {isPinned ? <PinOff className="size-3" /> : <Pin className="size-3" />}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => startRename(s, e)}
                    className={`rounded-md p-1 transition cursor-pointer ${
                      isActive
                        ? "hover:bg-background/20 hover:text-white"
                        : "hover:bg-secondary hover:text-foreground"
                    }`}
                    title="Rename chat"
                  >
                    <Pencil className="size-3" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => openShareModal(s, e)}
                    className={`rounded-md p-1 transition cursor-pointer ${
                      isActive
                        ? "hover:bg-background/20 hover:text-white"
                        : "hover:bg-secondary hover:text-foreground"
                    }`}
                    title="Share chat"
                  >
                    <Share2 className="size-3" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => promptDeleteSession(s, e)}
                    className={`rounded-md p-1 transition hover:text-red-500 cursor-pointer ${
                      isActive ? "hover:text-red-300" : ""
                    }`}
                    title="Delete chat"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );

  const blueprintInnerContent = (
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
      <div className="space-y-4">
        {/* Q1: Business Idea */}
        <EditableCard
          label="Q1 · Business or Business Idea"
          description="What you do or want to be known for."
          value={activeBlueprint.persona_name}
          placeholder="e.g. Done-for-you outbound lead generation for B2B tech startups"
          onChange={(val) => updateBlueprintField("persona_name", val)}
          onMerge={(val) => mergeFieldIntoDraft("Business Idea", val)}
        />

        {/* Q2: Ideal Buyer */}
        <EditableCard
          label="Q2 · Ideal Buyer Profile"
          description="Who this program or service is for (age, role, situation)."
          value={activeBlueprint.demographics}
          placeholder="e.g. Founders and sales leaders at 10–50 person companies"
          onChange={(val) => updateBlueprintField("demographics", val)}
          onMerge={(val) => mergeFieldIntoDraft("Ideal Buyer", val)}
        />

        {/* Q3: Problem & Transformation */}
        <EditableCard
          label="Q3 · Problem & Transformation"
          description="The biggest problem you solve and the result they achieve."
          value={activeBlueprint.core_fear}
          placeholder="e.g. Unpredictable pipeline — scaling to 15+ enterprise meetings/mo"
          onChange={(val) => updateBlueprintField("core_fear", val)}
          onMerge={(val) => mergeFieldIntoDraft("Problem & Transformation", val)}
        />

        {/* Buying Trigger */}
        <EditableCard
          label="Buying Trigger / Transformation Catalyst"
          description="The catalyst or transformation that makes them act now."
          value={activeBlueprint.buying_trigger}
          placeholder="e.g. Hitting an operational capacity ceiling where taking more clients causes burnout"
          onChange={(val) => updateBlueprintField("buying_trigger", val)}
          onMerge={(val) => mergeFieldIntoDraft("Buying Trigger", val)}
        />

        {/* Q4: Objections */}
        <EditableListCard
          label="Q4 · Key Hesitations & Objections"
          description="Doubts or skepticisms to neutralize in your offer and presentation."
          items={activeBlueprint.objections}
          placeholder="Add an objection…"
          onAdd={(val) => addArrayField("objections", val)}
          onRemove={(idx) => removeArrayField("objections", idx)}
          onUpdate={(idx, val) => updateArrayField("objections", idx, val)}
          onMerge={(items) => mergeFieldIntoDraft("Top Objections", items.join("; "))}
        />

        {/* Q6: Winning Hooks & Headlines */}
        <EditableListCard
          label="Q6 · Winning Angles & Hooks"
          description="High-converting marketing angles and slide headlines."
          items={activeBlueprint.headlines}
          placeholder="Add a headline / hook (e.g. 'The 3 Bottlenecks Capping Your Growth')..."
          onAdd={(val) => addArrayField("headlines", val)}
          onRemove={(idx) => removeArrayField("headlines", idx)}
          onUpdate={(idx, val) => updateArrayField("headlines", idx, val)}
          onMerge={(items) => mergeFieldIntoDraft("Winning Hooks", items.join("; "))}
        />

        {/* Q7: Slide Points & Content Flow */}
        <EditableListCard
          label="Q7 · Slide Points & Presentation Outline"
          description="Core points and sections to include in the presentation."
          items={activeBlueprint.content_ideas}
          placeholder="Add slide point (e.g. 'Case study: Going from operator to owner')..."
          onAdd={(val) => addArrayField("content_ideas", val)}
          onRemove={(idx) => removeArrayField("content_ideas", idx)}
          onUpdate={(idx, val) => updateArrayField("content_ideas", idx, val)}
          onMerge={(items) => mergeFieldIntoDraft("Slide Outline", items.join(" -> "))}
        />

        {/* Elevator Pitch */}
        <EditableCard
          label="Elevator Pitch / Hook Summary"
          description="Concise 1-sentence value pitch for this presentation and offer."
          value={activeBlueprint.elevator_pitch ?? ""}
          placeholder="e.g. We help agency founders build self-managing operations in 90 days."
          onChange={(val) => updateBlueprintField("elevator_pitch", val)}
          onMerge={(val) => mergeFieldIntoDraft("Elevator Pitch", val)}
        />
      </div>

      {/* Bottom Action Row */}
      <div className="pt-2 space-y-2 border-t border-border">
        <button
          type="button"
          onClick={() => mergeBlueprintIntoDraft()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-ochre/20 via-primary/25 to-ochre/20 border border-ochre/50 p-2.5 text-xs font-bold text-foreground hover:border-ochre transition shadow-sm cursor-pointer"
        >
          <Sparkles className="size-3.5 text-ochre" />
          Merge Blueprint into Box
        </button>
        <button
          type="button"
          onClick={() => openHandoff("ppt")}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-xs font-semibold text-background transition hover:opacity-90 shadow-sm cursor-pointer"
        >
          <FilePlus2 className="size-3.5" />
          Build PPT from this Idea
        </button>
        <button
          type="button"
          onClick={() => openHandoff("offer")}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-medium text-foreground transition hover:border-foreground/40 cursor-pointer"
        >
          <Layers3 className="size-3.5" />
          Continue to Webinar Offer
        </button>
      </div>
    </div>
  );

  return (
    <div className="brief-builder flex h-[calc(100dvh-4rem-1px)] min-h-0 overflow-hidden bg-background text-foreground relative">
      {/* Mobile History Drawer Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative z-10 flex h-full w-[280px] max-w-[85vw] flex-col border-r border-border bg-card shadow-2xl animate-in slide-in-from-left duration-200">
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Chat history
              </span>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="p-3 border-b border-border">
              <button
                type="button"
                onClick={startNewChat}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-3.5 py-2.5 text-xs font-medium text-background transition hover:opacity-90 cursor-pointer"
              >
                <Plus className="size-4" />
                <span>New chat</span>
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {historyListContent}
            </div>
          </aside>
        </div>
      )}

      {/* Desktop History Sidebar */}
      <aside
        className={`hidden shrink-0 overflow-hidden border-r border-border bg-surface/80 transition-[width] duration-300 lg:flex lg:flex-col ${
          sidebarOpen ? "w-[270px]" : "w-0 border-r-0"
        }`}
      >
        <div className="w-[270px] flex flex-col h-full min-h-0">
          <div className="flex items-center justify-between p-4 pb-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Chat history
            </span>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="rounded-lg p-1 text-muted-foreground hover:bg-surface-raised hover:text-foreground transition cursor-pointer"
              title="Hide chat history"
            >
              <PanelLeftClose className="size-4" />
            </button>
          </div>
          <div className="px-4 py-2">
            <button
              type="button"
              onClick={startNewChat}
              className="flex w-full items-center justify-between rounded-xl bg-foreground px-3.5 py-2.5 text-sm font-medium text-background transition hover:opacity-90 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Plus className="size-4" />
                New chat
              </span>
              <span className="font-mono text-[10px] opacity-60">⌘N</span>
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
            {historyListContent}
          </div>
        </div>
      </aside>

      {/* Main Chat Interface */}
      <section className="flex flex-1 flex-col min-w-0 bg-card relative">
        {/* Chat toolbar. Product branding lives in the global ProviderNavbar,
            so this bar carries chat-specific controls only. */}
        <header className="sticky top-0 z-20 flex h-12 shrink-0 items-center gap-3 border-b border-border/60 bg-background/85 px-3 backdrop-blur-md sm:px-5">
          <button
            type="button"
            onClick={() => setSidebarOpen((prev) => !prev)}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-secondary hover:text-foreground cursor-pointer"
            title={sidebarOpen ? "Hide chat history" : "Show chat history"}
            aria-label={sidebarOpen ? "Hide chat history" : "Show chat history"}
          >
            {sidebarOpen ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
          </button>

          <div className="min-w-0 flex-1">
            <p className="truncate font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              {currentChatTitle}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={startNewChat}
              className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-secondary hover:text-foreground cursor-pointer"
              title="New chat"
              aria-label="New chat"
            >
              <SquarePen className="size-4" />
            </button>

            <button
              type="button"
              onClick={() => openShareModal()}
              className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-secondary hover:text-foreground cursor-pointer"
              title="Share this chat"
              aria-label="Share this chat"
            >
              <Share2 className="size-4" />
            </button>

            {!blueprintDrawerOpen && (
              <button
                type="button"
                onClick={() => setBlueprintDrawerOpen(true)}
                className="ml-1 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-foreground transition hover:bg-secondary cursor-pointer"
                title="Open Idea Blueprint"
              >
                <Target className="size-3.5 text-primary" />
                <span className="hidden sm:inline">Blueprint</span>
              </button>
            )}
          </div>
        </header>

        {/* Messages Area */}
        <div className="mx-auto w-full min-h-0 max-w-3xl flex-1 space-y-7 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {messages.map((message) => {
            const isSynthesized =
              message.role === "assistant" &&
              (message.text.includes("Webinar Strategy, Offer & Presentation Generated!") ||
               message.text.includes("Slide-by-Slide Webinar Presentation Architecture") ||
               message.text.includes("Slide-by-Slide Presentation Outline:"));

            return (
              <MessageBubble
                key={message.id}
                message={message}
                userName={userName}
                isCopied={copiedId === message.id}
                onCopy={() => copyText(message.text, message.id)}
                onLink={() => openHandoff("offer", message.text)}
                onBuild={() => openHandoff("ppt", message.text)}
                onSynthesize={handleInitiateBuild}
                isSynthesized={isSynthesized}
                onDirectBuildPPT={() => handleDirectLaunch("ppt", message.text)}
                onDirectWebinarOffer={() => handleDirectLaunch("offer", message.text)}
              />
            );
          })}

          {busy && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground pl-11">
              <Loader2 className="size-4 animate-spin text-primary" />
              <span>Webinar Chat is thinking…</span>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Message Input Footer */}
        <footer className="shrink-0 border-t border-border bg-background px-4 py-3 sm:px-6 sm:py-4">
          <div className="mx-auto max-w-3xl">
            {mergeToast && (
              <div className="mb-2 inline-flex items-center gap-2 rounded-lg bg-primary/15 border border-primary/30 px-3 py-1 text-xs text-foreground animate-in fade-in slide-in-from-bottom-2">
                <Check className="size-3.5 text-primary" />
                <span>Blueprint merged into the composer — review, then send.</span>
              </div>
            )}
            <div className="relative flex items-end rounded-2xl border border-border bg-card shadow-xs focus-within:border-foreground/50 transition">
              <textarea
                ref={textareaRef}
                rows={1}
                value={draft}
                placeholder={
                  step === 1
                    ? "Q1: Tell me about your business or business idea..."
                    : step === 2
                    ? "Q2: Who do you think your ideal buyer would be?..."
                    : step === 3
                    ? "Q3: What’s the biggest problem you solve & the result they achieve?..."
                    : step === 4
                    ? "Q4: What’s one hesitation or objection prospects might have?..."
                    : "Ask anything about your strategy, offer, or presentation..."
                }
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleSend();
                  }
                }}
                className="max-h-48 min-h-[48px] flex-1 resize-none bg-transparent px-4 py-3 text-sm leading-relaxed text-foreground focus:outline-none"
              />
              <div className="flex items-center gap-1.5 sm:gap-2 p-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setBlueprintDrawerOpen((prev) => !prev);
                    setMobileBlueprintOpen((prev) => !prev);
                  }}
                  title={blueprintDrawerOpen ? "Close Idea Blueprint" : "Open Idea Blueprint"}
                  className={`grid size-9 place-items-center rounded-xl border transition cursor-pointer ${
                    blueprintDrawerOpen
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-secondary text-foreground hover:bg-surface-raised"
                  }`}
                >
                  <Target className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => mergeBlueprintIntoDraft()}
                  title="Merge sidebar blueprint into box"
                  className="grid size-9 place-items-center rounded-xl border border-border bg-secondary text-foreground hover:bg-surface-raised transition cursor-pointer"
                >
                  <Sparkles className="size-4 text-ochre" />
                </button>
                <button
                  type="button"
                  onClick={() => handleSend()}
                  disabled={!draft.trim() || busy}
                  className="grid size-9 place-items-center rounded-xl bg-foreground text-background transition hover:opacity-90 disabled:opacity-40 cursor-pointer"
                >
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                </button>
              </div>
            </div>
            {busy && (
              <div className="mt-1.5 flex items-center justify-end px-1 text-[11px]">
                <span className="text-primary font-medium animate-pulse">Webinar Chat is thinking…</span>
              </div>
            )}
          </div>
        </footer>
      </section>

      {/* Desktop Blueprint Panel */}
      {blueprintDrawerOpen && (
        <aside className="hidden lg:flex w-[380px] xl:w-[420px] shrink-0 border-l border-border bg-card flex-col min-h-0 h-full">
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <div className="flex items-center gap-2">
              <Target className="size-4 text-primary" />
              <span>Strategy & Idea Blueprint</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleInitiateBuild}
                title="Synthesize strategy into presentation outline"
                className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-medium text-foreground hover:bg-secondary cursor-pointer"
              >
                <Sparkles className="size-3 text-ochre" />
                Synthesize
              </button>
              <button
                type="button"
                onClick={() => setBlueprintDrawerOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                title="Close sidebar"
              >
                <PanelRightClose className="size-4" />
              </button>
            </div>
          </div>
          {blueprintInnerContent}
        </aside>
      )}

      {/* Mobile Blueprint Drawer Overlay */}
      {mobileBlueprintOpen && (
        <div className="fixed inset-0 z-50 flex justify-end lg:hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setMobileBlueprintOpen(false)}
          />
          <aside className="relative z-10 flex h-full w-full sm:w-[420px] max-w-full flex-col border-l border-border bg-card shadow-2xl animate-in slide-in-from-right duration-200 min-h-0">
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <div className="flex items-center gap-2">
                <Target className="size-4 text-primary" />
                <span>Strategy Blueprint</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleInitiateBuild}
                  title="Synthesize strategy into presentation outline"
                  className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-medium text-foreground hover:bg-secondary cursor-pointer"
                >
                  <Sparkles className="size-3 text-ochre" />
                  Synthesize
                </button>
                <button
                  type="button"
                  onClick={() => setMobileBlueprintOpen(false)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>
            {blueprintInnerContent}
          </aside>
        </div>
      )}

      {handoffOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-border bg-card p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  {handoffOpen === "ppt" ? "Send to Webinar Content" : "Send to Webinar Offer"}
                </p>
                <h2 className="mt-1 text-lg font-semibold tracking-[-0.03em]">
                  Check the prompt and sections before we continue.
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Uncheck anything that is wrong, then edit the prompt. n8n will use this with your uploads and blueprint.
                </p>
              </div>
              <button type="button" onClick={() => setHandoffOpen(null)} className="rounded-lg p-1 text-muted-foreground hover:text-foreground">
                <X className="size-4" />
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {handoffSections.map((section) => (
                <label key={section.id} className="flex items-start gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={section.selected}
                    onChange={() => {
                      setHandoffSections((items) => items.map((item) => item.id === section.id ? { ...item, selected: !item.selected } : item));
                    }}
                    className="mt-1"
                  />
                  <span>{section.label}</span>
                </label>
              ))}
            </div>
            <textarea
              rows={8}
              value={handoffPrompt}
              onChange={(event) => setHandoffPrompt(event.target.value)}
              className="mt-4 w-full resize-y rounded-2xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-foreground/40"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setHandoffOpen(null)} className="rounded-xl border border-border px-4 py-2 text-sm">
                Keep chatting
              </button>
              <button
                type="button"
                onClick={confirmHandoff}
                className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background"
              >
                {handoffOpen === "ppt" ? <FilePlus2 className="size-4" /> : <Layers3 className="size-4" />}
                {handoffOpen === "ppt" ? "Build PPT" : "Open Webinar Offer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmSession && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-red-500/10 text-red-600">
                <Trash2 className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-semibold text-foreground">Delete chat?</h3>
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                  Delete &ldquo;{getSessionTitle(deleteConfirmSession)}&rdquo;? This permanently removes its messages.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setDeleteConfirmSession(null)}
                className="rounded-xl border border-border px-4 py-2 text-xs font-medium text-foreground hover:bg-secondary transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void executeDeleteSession(deleteConfirmSession.session_id)}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-700 transition cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Conversation Modal */}
      {shareSession && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Share chat
                </p>
                <h3 className="mt-1 text-base font-semibold text-foreground">
                  {getSessionTitle(shareSession)}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShareSession(null)}
                className="rounded-lg p-1 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            {shareToast && (
              <div className="inline-flex w-full items-center gap-2 rounded-xl bg-primary/10 border border-primary/25 px-3.5 py-2 text-xs font-medium text-primary animate-in fade-in">
                <Check className="size-4 text-primary shrink-0" />
                <span>{shareToast}</span>
              </div>
            )}

            {/* Direct URL Share Link */}
            <div className="space-y-1.5">
              <label className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Direct link</label>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  type="text"
                  value={getShareUrl(shareSession.session_id)}
                  className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none select-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => void handleCopyShareLink(shareSession.session_id)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-foreground px-3.5 py-2 text-xs font-medium text-background hover:opacity-90 transition shrink-0 cursor-pointer"
                >
                  <Copy className="size-3.5" />
                  <span>Copy</span>
                </button>
              </div>
            </div>

            {/* Export & Transcript Actions */}
            <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => void handleCopyTranscript(shareSession)}
                className="flex items-center justify-center gap-2 rounded-xl border border-border bg-background p-3 text-xs font-medium text-foreground hover:bg-secondary transition cursor-pointer"
              >
                <Copy className="size-3.5 text-primary" />
                <span>Copy transcript</span>
              </button>
              <button
                type="button"
                onClick={() => handleDownloadMarkdown(shareSession)}
                className="flex items-center justify-center gap-2 rounded-xl border border-border bg-background p-3 text-xs font-medium text-foreground hover:bg-secondary transition cursor-pointer"
              >
                <Download className="size-3.5 text-ochre" />
                <span>Export markdown</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function EditableCard({
  label,
  description,
  value,
  placeholder,
  onChange,
  onMerge,
}: {
  label: string;
  description?: string;
  value: string;
  placeholder?: string;
  onChange: (val: string) => void;
  onMerge?: (val: string) => void;
}) {
  return (
    <div className="space-y-2 rounded-2xl border border-border bg-background p-4">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground">
          {label}
        </p>
        {onMerge && value?.trim() && (
          <button
            type="button"
            onClick={() => onMerge(value)}
            title="Merge this field into chat input"
            className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary/80 px-1.5 py-0.5 text-[10px] font-medium text-foreground hover:bg-secondary transition"
          >
            <Sparkles className="size-2.5 text-ochre" />
            <span>Insert</span>
          </button>
        )}
      </div>
      {description && (
        <p className="text-[11px] leading-4 text-muted-foreground">{description}</p>
      )}
      <textarea
        rows={2}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full resize-y rounded-xl border border-border bg-secondary/50 px-3 py-2 text-xs leading-relaxed text-foreground placeholder:text-muted-foreground focus:border-foreground focus:bg-background focus:outline-none transition"
      />
    </div>
  );
}

function EditableListCard({
  label,
  description,
  items,
  placeholder,
  onAdd,
  onRemove,
  onUpdate,
  onMerge,
}: {
  label: string;
  description?: string;
  items?: string[];
  placeholder?: string;
  onAdd: (val: string) => void;
  onRemove: (idx: number) => void;
  onUpdate: (idx: number, val: string) => void;
  onMerge?: (items: string[]) => void;
}) {
  const [draftItem, setDraftItem] = useState("");

  const handleAdd = () => {
    if (!draftItem.trim()) return;
    onAdd(draftItem.trim());
    setDraftItem("");
  };

  const list = items ?? [];

  return (
    <div className="space-y-2.5 rounded-2xl border border-border bg-background p-4">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground">
          {label}
        </p>
        {onMerge && list.length > 0 && (
          <button
            type="button"
            onClick={() => onMerge(list)}
            title="Merge list into chat input"
            className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary/80 px-1.5 py-0.5 text-[10px] font-medium text-foreground hover:bg-secondary transition"
          >
            <Sparkles className="size-2.5 text-ochre" />
            <span>Insert</span>
          </button>
        )}
      </div>
      {description && (
        <p className="text-[11px] leading-4 text-muted-foreground">{description}</p>
      )}

      <div className="space-y-1.5">
        {list.map((item, idx) => (
          <div key={idx} className="flex items-start gap-1.5 group">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/70" />
            <input
              type="text"
              value={item}
              onChange={(e) => onUpdate(idx, e.target.value)}
              className="flex-1 rounded-lg border border-transparent bg-secondary/40 px-2 py-1 text-xs text-foreground hover:border-border focus:border-foreground focus:bg-background focus:outline-none transition"
            />
            <button
              type="button"
              onClick={() => onRemove(idx)}
              className="mt-1 rounded p-0.5 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-red-500 transition"
              title="Remove item"
            >
              <Trash2 className="size-3" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-1.5 pt-1">
        <input
          type="text"
          value={draftItem}
          onChange={(e) => setDraftItem(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder={placeholder || "Add item..."}
          className="flex-1 rounded-xl border border-border bg-secondary/40 px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-foreground focus:bg-background focus:outline-none transition"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!draftItem.trim()}
          className="inline-flex items-center gap-1 rounded-xl bg-foreground px-2.5 py-1.5 text-xs font-medium text-background disabled:opacity-40 hover:opacity-90 transition"
        >
          <Plus className="size-3" />
          Add
        </button>
      </div>
    </div>
  );
}


function MessageBubble({
  message,
  userName,
  isCopied,
  onCopy,
  onLink,
  onBuild,
  onSynthesize,
  isSynthesized,
  onDirectBuildPPT,
  onDirectWebinarOffer,
}: {
  message: Message;
  userName?: string;
  isCopied: boolean;
  onCopy: () => void;
  onLink: () => void;
  onBuild: () => void;
  onSynthesize: () => void;
  isSynthesized?: boolean;
  onDirectBuildPPT?: () => void;
  onDirectWebinarOffer?: () => void;
}) {
  const isAssistant = message.role === "assistant";
  const isWelcome = message.id === "welcome";

  // User message: Soft mint-green bubble on the right matching screenshot
  if (!isAssistant) {
    return (
      <div className="flex justify-end my-1">
        <div className="bg-primary/10 text-primary rounded-2xl sm:rounded-[22px] px-4 py-2.5 sm:px-5 sm:py-3 max-w-[85%] sm:max-w-[75%] leading-relaxed text-sm sm:text-[15px] font-normal shadow-2xs">
          {message.text}
        </div>
      </div>
    );
  }

  // Assistant message:
  // Left: Circular avatar mark
  // Right:
  // - If not welcome: "Reasoned for a few seconds ⌃"
  // - Clean unboxed text directly on background (matching screenshot)
  // - Copy icon at bottom left
  // - If synthesized: 1-click action buttons to Slide Studio & Offer IQ
  const displayName = userName?.trim() ? userName.trim() : "there";
  const displayText = isWelcome ? getGreetingText(displayName) : message.text;

  return (
    <div className="flex items-start gap-3 sm:gap-4 my-2">
      {/* Circular Avatar Logo */}
      <div className="size-8 sm:size-9 shrink-0 rounded-full overflow-hidden border border-border bg-card p-0.5 shadow-xs flex items-center justify-center">
        <img
          src="/assets/webinarkit-logo.png"
          alt="WebinarKit"
          className="size-full object-contain"
        />
      </div>

      <div className="flex-1 min-w-0 pt-0.5">
        {/* Reasoning indicator above assistant responses (shown on subsequent turns, matching screenshot) */}
        {!isWelcome && (
          <div className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground mb-2 font-normal select-none">
            <span>Reasoned for a few seconds</span>
            <ChevronUp className="size-3.5 text-muted-foreground" />
          </div>
        )}

        {/* Clean Message Body (no card container or border!) */}
        <div className="text-sm sm:text-base leading-relaxed text-foreground space-y-2">
          {formatMarkdown(displayText)}
        </div>

        {/* Copy icon at bottom left (matching screenshot) */}
        {!isWelcome && (
          <div className="mt-2.5 flex items-center gap-2">
            <button
              type="button"
              onClick={onCopy}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
              title={isCopied ? "Copied" : "Copy response"}
            >
              {isCopied ? <Check className="size-4 text-primary" /> : <Copy className="size-4" />}
            </button>
          </div>
        )}

        {/* Direct Action Card when presentation/offer are synthesized */}
        {isSynthesized && (
          <div className="mt-4 rounded-2xl border border-ochre/40 bg-gradient-to-br from-ochre/10 via-primary/10 to-transparent p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-ochre shrink-0" />
                <span className="text-xs font-semibold text-foreground">
                  Your Custom Offer & 10-Slide Presentation are Ready!
                </span>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-ochre font-bold bg-ochre/20 px-2 py-0.5 rounded-full">
                Ready to Deploy
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              You can now launch Slide Studio to auto-generate your presentation slides or open Offer IQ to review and customize your high-ticket pricing tiers.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={onDirectBuildPPT}
                className="flex items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-xs font-semibold text-background hover:opacity-90 transition shadow-sm cursor-pointer"
              >
                <FilePlus2 className="size-4" />
                <span>Build Presentation (Slide Studio)</span>
              </button>
              <button
                type="button"
                onClick={onDirectWebinarOffer}
                className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-secondary transition shadow-sm cursor-pointer"
              >
                <Layers3 className="size-4" />
                <span>Build Webinar Offer (Offer IQ)</span>
              </button>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={onLink}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition cursor-pointer"
              >
                <Layers3 className="size-3.5" />
                Webinar Offer
              </button>
              <button
                type="button"
                onClick={onBuild}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition cursor-pointer"
              >
                <FilePlus2 className="size-3.5" />
                Build PPT
              </button>
              <button
                type="button"
                onClick={onSynthesize}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground ml-auto transition cursor-pointer"
              >
                <Sparkles className="size-3.5 text-ochre" />
                Re-synthesize
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function renderInlineMarkdown(str: string): React.ReactNode {
  const tokens = str.split(/(\*\*.*?\*\*|\*.*?\*)/g);
  return tokens.map((token, i) => {
    if (token.startsWith("**") && token.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {token.slice(2, -2)}
        </strong>
      );
    }
    if (token.startsWith("*") && token.endsWith("*")) {
      return (
        <em key={i} className="italic">
          {token.slice(1, -1)}
        </em>
      );
    }
    return token;
  });
}

function formatMarkdown(text: string) {
  const parts = text.split("\n");
  return parts.map((line, idx) => {
    const trimmed = line.trim();
    if (trimmed === "---") {
      return <hr key={idx} className="my-3 border-border/60" />;
    }
    if (trimmed.startsWith("### ")) {
      return (
        <h3 key={idx} className="font-semibold text-sm sm:text-base text-foreground mt-3.5 mb-1.5">
          {renderInlineMarkdown(trimmed.slice(4))}
        </h3>
      );
    }
    if (trimmed.startsWith("## ")) {
      return (
        <h2 key={idx} className="font-bold text-base sm:text-lg text-foreground mt-4 mb-2">
          {renderInlineMarkdown(trimmed.slice(3))}
        </h2>
      );
    }
    if (line.startsWith("- ") || line.startsWith("* ")) {
      return (
        <span key={idx} className="block pl-3 py-0.5">
          • {renderInlineMarkdown(line.slice(2))}
        </span>
      );
    }
    if (/^\d+\.\s/.test(line)) {
      return (
        <span key={idx} className="block pl-3 py-0.5">
          {renderInlineMarkdown(line)}
        </span>
      );
    }
    return (
      <span key={idx} className="block min-h-[1.25rem]">
        {renderInlineMarkdown(line)}
      </span>
    );
  });
}
