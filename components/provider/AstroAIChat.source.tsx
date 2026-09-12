"use client";

import {
  Check,
  ChevronRight,
  Copy,
  FilePlus2,
  Layers3,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  Plus,
  Send,
  Sparkles,
  Target,
  Trash2,
  X,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { parseAvatarChatPayload } from "@/lib/avatar-chat";
import {
  buildGenerationPrompt,
  HANDOFF,
  storeHandoff,
  suggestedSections,
  type HandoffSection,
} from "@/lib/creation-handoff";
import { readN8nJson } from "@/lib/n8n-response";
import { auth, db } from "@/lib/firebase/config";
import { collection, doc, getDocs, query, setDoc, where } from "firebase/firestore";
import { loadStudioContext } from "@/lib/workspace-context";
import { saveWorkspaceMemory, type WorkspaceMemory } from "@/lib/workspace-memory";

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
  status: "draft" | "generating" | "completed" | "failed";
  step: number;
  answers: Record<string, unknown>;
  messages: Message[];
  draft: string;
  selected_category: string | null;
  blueprint: BuyerBlueprint | null;
  updated_at: string;
};

const WEBHOOK_URL = process.env.NEXT_PUBLIC_N8N_WEBHOOK_BASE_URL
  ? `${process.env.NEXT_PUBLIC_N8N_WEBHOOK_BASE_URL.replace(/\/+$/, "")}/avatar-iq`
  : "/api/n8n/avatar-iq";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const INITIAL_GREETING: Message = {
  id: "welcome",
  role: "assistant",
  text: "Hi — I’m **WebKit AI**, your elite Business Strategy and Brainstorming AI.\n\nTell me about your business, the core offer, or the presentation you want to create. I’ll collaborate with you to formulate high-impact strategies, synthesize your uploaded assets, and when you're ready, output a presentation-ready blueprint.",
  timestamp: new Date().toISOString(),
};

export default function PresentationChat() {
  const params = useParams<{ sessionId: string }>();
  const router = useRouter();
  const routeSessionId = typeof params.sessionId === "string" ? params.sessionId : "";

  const [messages, setMessages] = useState<Message[]>([INITIAL_GREETING]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<BuyerBlueprint | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [blueprintDrawerOpen, setBlueprintDrawerOpen] = useState(true);
  const [webhookError, setWebhookError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState("");
  const [history, setHistory] = useState<BlueprintSession[]>([]);
  const [workspaceMemory, setWorkspaceMemory] = useState<WorkspaceMemory | null>(null);
  const [assetContext, setAssetContext] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [handoffOpen, setHandoffOpen] = useState<"ppt" | "offer" | null>(null);
  const [handoffPrompt, setHandoffPrompt] = useState("");
  const [handoffSections, setHandoffSections] = useState<HandoffSection[]>([]);
  const [handoffIdea, setHandoffIdea] = useState("");

  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [sessionId]);

  // Load sessions and memory
  useEffect(() => {
    let cancelled = false;
    setHydrated(false);
    void (async () => {
      const requestedSessionId = routeSessionId && UUID_PATTERN.test(routeSessionId)
        ? routeSessionId
        : "";
      if (routeSessionId && !requestedSessionId) {
        router.replace("/provider/astro-ai");
        return;
      }
      const user = auth.currentUser;
      if (!user || cancelled) return setHydrated(true);

      const [sessions, studio] = await Promise.all([
        (async () => {
          try {
            const q = query(
              collection(db, "blueprint_sessions"),
              where("owner_id", "==", user.uid)
            );
            const snap = await getDocs(q);
            const list = snap.docs.map((d) => d.data() as BlueprintSession);
            list.sort((a, b) => {
              const tA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
              const tB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
              return tB - tA;
            });
            return list.slice(0, 30);
          } catch (e) {
            console.warn("Could not load blueprint sessions from Firestore:", e);
            return [];
          }
        })(),
        loadStudioContext(user.uid),
      ]);
      if (cancelled) return;

      setWorkspaceMemory(studio.memory);
      setAssetContext(studio.assetContext);
      const savedSessions = (sessions ?? []) as BlueprintSession[];
      setHistory(savedSessions);

      const activeSession = requestedSessionId
        ? savedSessions.find((item) => item.session_id === requestedSessionId)
        : null;

      if (activeSession) {
        restoreSession(activeSession);
      } else {
        initializeSession(requestedSessionId, studio.memory, studio.assetContext);
      }
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [routeSessionId, router]);

  // Autosave session to Firestore
  useEffect(() => {
    if (!hydrated || !sessionId) return;
    const timeout = window.setTimeout(() => {
      const user = auth.currentUser;
      if (!user) return;
      const status = result ? "completed" : busy ? "generating" : webhookError ? "failed" : "draft";
      const updatedAt = new Date().toISOString();
      const session: BlueprintSession = {
        session_id: sessionId,
        status,
        step: result ? 4 : 1,
        answers: {},
        messages,
        draft,
        selected_category: null,
        blueprint: result,
        updated_at: updatedAt,
      };
      setHistory((items) => [session, ...items.filter((item) => item.session_id !== sessionId)]);
      const docId = `${user.uid}_${sessionId}`;
      void setDoc(
        doc(db, "blueprint_sessions", docId),
        {
          session_id: sessionId,
          owner_id: user.uid,
          status,
          step: result ? 4 : 1,
          answers: {},
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
  }, [busy, draft, hydrated, messages, result, sessionId, webhookError]);

  function contextGreeting(memory: WorkspaceMemory | null, context: string): Message {
    const remembered = memory?.audience_profile as BuyerBlueprint | undefined;
    const offerTitle = typeof memory?.offer_profile?.title === "string" ? memory.offer_profile.title : "";
    const hasBrief = /brief|Business line|Uploaded assets/i.test(context);
    if (memory?.onboarding_complete && remembered?.persona_name) {
      return {
        id: "welcome-back",
        role: "assistant",
        text: `Welcome back. I already have **${remembered.persona_name}**${remembered.demographics ? ` (${remembered.demographics})` : ""}${offerTitle ? ` and the offer **${offerTitle}**` : ""}.\n\n${hasBrief ? "Your uploads, brand colors, and brief are loaded into this chat. " : ""}What should we brainstorm next — refine the buyer, shape the offer, or map the deck?`,
      };
    }
    if (hasBrief) {
      return {
        id: "welcome-brief",
        role: "assistant",
        text: "Hi — I loaded your **uploads and business brief** into this chat.\n\nAsk me anything about the business, the buyer, or the presentation. I’ll stay in this context and keep the Idea Blueprint in sync as we go.",
      };
    }
    return INITIAL_GREETING;
  }

  function initializeSession(nextSessionId: string, memory = workspaceMemory, context = assetContext) {
    const remembered = memory?.audience_profile as BuyerBlueprint | undefined;
    const hasMemory = Boolean(memory?.onboarding_complete && remembered?.persona_name);
    const sid = nextSessionId || crypto.randomUUID();

    setMessages([contextGreeting(memory, context)]);
    setDraft("");
    setBusy(false);
    setResult(hasMemory && remembered ? remembered : null);
    setWebhookError(null);
    setSessionId(sid);
  }

  function restoreSession(session: BlueprintSession, navigate = false) {
    if (navigate && session.session_id !== routeSessionId) {
      router.push(`/provider/astro-ai/${session.session_id}`);
    }
    setSessionId(session.session_id);
    setMessages(Array.isArray(session.messages) && session.messages.length ? session.messages : [INITIAL_GREETING]);
    setDraft(session.draft ?? "");
    setResult(session.blueprint ?? null);
    setBusy(false);
    setWebhookError(null);
  }

  function startNewChat() {
    const nextSessionId = crypto.randomUUID();
    setSessionId(nextSessionId);
    setMessages([contextGreeting(workspaceMemory, assetContext)]);
    setDraft("");
    setResult(null);
    setWebhookError(null);
    router.push(`/provider/astro-ai/${nextSessionId}`);
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

    const activeSessionId = sessionId || crypto.randomUUID();
    if (!sessionId) {
      setSessionId(activeSessionId);
      window.history.replaceState(null, "", `/provider/astro-ai/${activeSessionId}`);
    }

    try {
      const user = auth.currentUser;
      const userId = user?.uid || "";

      // Check if user is asking to synthesize or initiate build
      const isInitiateBuild = text.includes("[SYSTEM COMMAND: INITIATE BUILD]") || /initiate build/i.test(text);
      const isBlueprintRequest = isInitiateBuild || /\b(blueprint|persona|synthesize|generate blueprint|create blueprint|buyer profile|avatar profile)\b/i.test(text);

      let assistantReplyText = "";
      let updatedBlueprint: BuyerBlueprint | null = result;

      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (user) {
          const token = await user.getIdToken().catch(() => null);
          if (token) {
            headers.Authorization = `Bearer ${token}`;
          }
        }
        const response = await fetch(WEBHOOK_URL, {
          method: "POST",
          headers,
          body: JSON.stringify({
            session_id: activeSessionId,
            user_id: userId,
            message: text,
            messages: nextMessages,
            blueprint: result,
            asset_context: assetContext,
            workspace_context: assetContext,
            synthesize: isBlueprintRequest,
            initiate_build: isInitiateBuild,
          }),
        });
        const parsed = await readN8nJson<unknown>(response, "n8n Workflow");
        const chat = parseAvatarChatPayload(parsed, result);
        if (!chat.reply) {
          throw new Error("n8n workflow executed but returned an empty reply.");
        }
        assistantReplyText = chat.reply;
        if (chat.blueprint) updatedBlueprint = chat.blueprint;
      } catch (err) {
        console.error("n8n webhook error:", err);
        const errMsg = err instanceof Error ? err.message : "Unable to communicate with n8n webhook.";
        assistantReplyText = `⚠️ **Error connecting to n8n:**\n\n${errMsg}\n\n*Webhook URL: \`${WEBHOOK_URL}\`*`;
      }

      if (updatedBlueprint) {
        setResult(updatedBlueprint);
        sessionStorage.setItem("astrocraft:latest-blueprint", JSON.stringify(updatedBlueprint));
        if (userId) {
          void saveWorkspaceMemory(userId, {
            onboarding_complete: true,
            business_profile: {
              business: text,
              problem: updatedBlueprint.core_fear,
              objections: updatedBlueprint.objections?.join("; ") || "",
            },
            audience_profile: updatedBlueprint as unknown as Record<string, unknown>,
            memory_summary: `Ideal buyer: ${updatedBlueprint.persona_name}. ${updatedBlueprint.demographics || ""}`.trim(),
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

      setMessages([...nextMessages, assistantMsg]);
    } catch (error) {
      setWebhookError(error instanceof Error ? error.message : "Could not process message.");
    } finally {
      setBusy(false);
    }
  }

  function handleInitiateBuild() {
    void handleSend("[SYSTEM COMMAND: INITIATE BUILD]");
  }

  function handleSynthesizeBlueprint() {
    void handleSend("Please synthesize all the context, business details, customer traits, and objections we've discussed into a complete Ideal Buyer Blueprint.");
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
    router.push(handoffOpen === "ppt" ? "/provider/slides" : "/provider/offer-iq");
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

  return (
    <div className="brief-builder flex h-[calc(100dvh-4rem-1px)] min-h-0 overflow-hidden bg-background text-foreground">
      {/* History Sidebar */}
      <aside
        className={`hidden shrink-0 overflow-hidden border-r border-border bg-surface/80 transition-[width] duration-300 lg:flex lg:flex-col ${
          sidebarOpen ? "w-[260px]" : "w-0 border-r-0"
        }`}
      >
        <div className="w-[260px] p-4">
          <button
            type="button"
            onClick={startNewChat}
            className="flex w-full items-center justify-between rounded-xl bg-foreground px-3.5 py-3 text-sm font-medium text-background transition hover:opacity-90"
          >
            <span className="flex items-center gap-2">
              <Plus className="size-4" />
              New Conversation
            </span>
            <span className="font-mono text-[10px] opacity-60">⌘N</span>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
          <p className="px-2 pb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Past Conversations
          </p>
          <div className="space-y-1">
            {history.map((s) => (
              <button
                key={s.session_id}
                type="button"
                onClick={() => restoreSession(s, true)}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs transition ${
                  sessionId === s.session_id
                    ? "bg-foreground text-background font-medium"
                    : "text-muted-foreground hover:bg-surface-raised hover:text-foreground"
                }`}
              >
                <span className="truncate">
                  {s.blueprint?.persona_name || s.draft || "Brainstorming Session"}
                </span>
                <ChevronRight className="size-3 shrink-0 opacity-40" />
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Chat Interface */}
      <section className="flex flex-1 flex-col min-w-0 bg-background">
        {/* Content Body: Chat + Side Panel */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Messages Area */}
          <main className="flex flex-1 flex-col min-w-0 bg-surface/30">
            <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isCopied={copiedId === message.id}
                  onCopy={() => copyText(message.text, message.id)}
                  onLink={() => openHandoff("offer", message.text)}
                  onBuild={() => openHandoff("ppt", message.text)}
                  onSynthesize={handleInitiateBuild}
                />
              ))}

              {busy && (
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <Loader2 className="size-4 animate-spin text-primary" />
                  <span>WebKit AI is formulating strategy...</span>
                </div>
              )}
              <div ref={endRef} />
            </div>

            {/* Message Input Footer */}
            <footer className="shrink-0 border-t border-border bg-background p-4 lg:p-6">
              <div className="mx-auto max-w-3xl">
                {mergeToast && (
                  <div className="mb-2 inline-flex items-center gap-2 rounded-lg bg-primary/15 border border-primary/30 px-3 py-1 text-xs text-foreground animate-in fade-in slide-in-from-bottom-2">
                    <Check className="size-3.5 text-primary" />
                    <span>Blueprint prompt merged into box! Review and send whenever ready.</span>
                  </div>
                )}
                <div className="relative flex items-end rounded-2xl border border-border bg-card shadow-sm focus-within:border-foreground/50 transition">
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void handleSend();
                      }
                    }}
                    placeholder="Message WebKit AI... (Brainstorm ideas, ask strategy questions, or plan your presentation)"
                    className="max-h-48 min-h-[48px] flex-1 resize-none bg-transparent px-4 py-3 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none"
                  />
                  <div className="flex items-center gap-2 p-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setBlueprintDrawerOpen((prev) => !prev)}
                      title={blueprintDrawerOpen ? "Close Idea Blueprint" : "Open Idea Blueprint"}
                      className={`grid size-9 place-items-center rounded-xl border transition ${
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
                      className="grid size-9 place-items-center rounded-xl border border-border bg-secondary text-foreground hover:bg-surface-raised transition"
                    >
                      <Sparkles className="size-4 text-amber-500" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSend()}
                      disabled={!draft.trim() || busy}
                      className="grid size-9 place-items-center rounded-xl bg-foreground text-background transition hover:opacity-90 disabled:opacity-40"
                    >
                      {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </footer>
          </main>

          {/* Interactive Question & Answer Idea Blueprint Panel */}
          {blueprintDrawerOpen && (
            <aside className="w-full shrink-0 border-l border-border bg-card lg:w-[400px] xl:w-[450px] flex flex-col min-h-0">
              <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Target className="size-4 text-primary" />
                  <span>Strategy & Idea Blueprint</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleInitiateBuild}
                    title="Initiate Full Strategy Build"
                    className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-medium text-foreground hover:bg-secondary"
                  >
                    <Sparkles className="size-3 text-amber-500" />
                    Synthesize
                  </button>
                  <button
                    type="button"
                    onClick={() => setBlueprintDrawerOpen(false)}
                    className="rounded-lg p-1 text-muted-foreground hover:text-foreground"
                  >
                    <PanelRightClose className="size-4" />
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-4">
                {/* Prominent Helper: Merge Into Box Button */}
                <button
                  type="button"
                  onClick={() => mergeBlueprintIntoDraft()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500/15 via-primary/20 to-amber-500/15 border border-amber-500/40 p-3 text-xs font-bold text-foreground hover:border-amber-500 hover:scale-[1.01] active:scale-[0.99] transition shadow-sm"
                >
                  <Sparkles className="size-4 text-amber-500" />
                  <span>Merge into Box (Generate PPT Prompt)</span>
                </button>

                {/* Top Action Row */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => openHandoff("ppt")}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-foreground px-3 py-2 text-center text-xs font-semibold text-background transition hover:opacity-90 shadow-sm"
                  >
                    <FilePlus2 className="size-3.5" />
                    Build PPT from Strategy
                  </button>
                  <button
                    type="button"
                    onClick={() => openHandoff("offer")}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-center text-xs font-semibold text-foreground transition hover:border-foreground/40 shadow-sm"
                  >
                    <Layers3 className="size-3.5" />
                    Shape in Webinar Offer
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Q1: Presentation Idea & Topic */}
                  <EditableCard
                    label="Q1 · Presentation / Content Idea Topic"
                    description="The main topic or theme you are brainstorming for your slides."
                    value={activeBlueprint.persona_name}
                    placeholder="e.g. 5 Scaling Bottlenecks for 7-Figure Agency Founders"
                    onChange={(val) => updateBlueprintField("persona_name", val)}
                    onMerge={(val) => mergeFieldIntoDraft("Topic", val)}
                  />

                  {/* Q2: Target Audience */}
                  <EditableCard
                    label="Q2 · Target Audience (Who is this for?)"
                    description="The specific decision maker or customer who will watch or buy."
                    value={activeBlueprint.demographics}
                    placeholder="e.g. Digital agency founders (teams of 5-25, $50k-$200k/mo revenue)"
                    onChange={(val) => updateBlueprintField("demographics", val)}
                    onMerge={(val) => mergeFieldIntoDraft("Target Audience", val)}
                  />

                  {/* Q3: Core Pain Point / Burning Problem */}
                  <EditableCard
                    label="Q3 · Core Pain Point / Burning Problem"
                    description="The urgent bottleneck or frustration keeping them awake at night."
                    value={activeBlueprint.core_fear}
                    placeholder="e.g. Trapped in daily client fulfillment; business stalls without constant micromanaging"
                    onChange={(val) => updateBlueprintField("core_fear", val)}
                    onMerge={(val) => mergeFieldIntoDraft("Core Pain Point", val)}
                  />

                  {/* Q4: Big Transformation / Buying Trigger */}
                  <EditableCard
                    label="Q4 · Big Breakthrough / Buying Trigger"
                    description="The catalyst or transformation that makes them act now."
                    value={activeBlueprint.buying_trigger}
                    placeholder="e.g. Hitting an operational capacity ceiling where taking more clients causes burnout"
                    onChange={(val) => updateBlueprintField("buying_trigger", val)}
                    onMerge={(val) => mergeFieldIntoDraft("Buying Trigger", val)}
                  />

                  {/* Q5: Objections */}
                  <EditableListCard
                    label="Q5 · Top Objections & Hesitations"
                    description="Doubts or skepticisms to neutralize in your presentation."
                    items={activeBlueprint.objections}
                    placeholder="Add an objection (e.g. 'We lack team bandwidth to implement')..."
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
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500/20 via-primary/25 to-amber-500/20 border border-amber-500/50 p-2.5 text-xs font-bold text-foreground hover:border-amber-500 transition shadow-sm"
                  >
                    <Sparkles className="size-3.5 text-amber-500" />
                    Merge Blueprint into Box
                  </button>
                  <button
                    type="button"
                    onClick={() => openHandoff("ppt")}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-xs font-semibold text-background transition hover:opacity-90 shadow-sm"
                  >
                    <FilePlus2 className="size-3.5" />
                    Build PPT from this Idea
                  </button>
                  <button
                    type="button"
                    onClick={() => openHandoff("offer")}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-medium text-foreground transition hover:border-foreground/40"
                  >
                    <Layers3 className="size-3.5" />
                    Continue to Webinar Offer
                  </button>
                </div>
              </div>
            </aside>
          )}
        </div>
      </section>

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
    <div className="rounded-2xl border border-border bg-background p-3.5 shadow-sm space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-foreground">
          {label}
        </p>
        {onMerge && value?.trim() && (
          <button
            type="button"
            onClick={() => onMerge(value)}
            title="Merge this field into chat input"
            className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary/80 px-1.5 py-0.5 text-[10px] font-medium text-foreground hover:bg-secondary transition"
          >
            <Sparkles className="size-2.5 text-amber-500" />
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
    <div className="rounded-2xl border border-border bg-background p-3.5 shadow-sm space-y-2.5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-foreground">
          {label}
        </p>
        {onMerge && list.length > 0 && (
          <button
            type="button"
            onClick={() => onMerge(list)}
            title="Merge list into chat input"
            className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary/80 px-1.5 py-0.5 text-[10px] font-medium text-foreground hover:bg-secondary transition"
          >
            <Sparkles className="size-2.5 text-amber-500" />
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
  isCopied,
  onCopy,
  onLink,
  onBuild,
  onSynthesize,
}: {
  message: Message;
  isCopied: boolean;
  onCopy: () => void;
  onLink: () => void;
  onBuild: () => void;
  onSynthesize: () => void;
}) {
  const isAssistant = message.role === "assistant";

  return (
    <div className={`flex items-start gap-3 ${isAssistant ? "" : "justify-end"}`}>
      {isAssistant && (
        <div className="grid size-8 shrink-0 place-items-center rounded-full bg-foreground text-[10px] font-bold text-background">
          WK
        </div>
      )}
      <div
        className={`group relative max-w-[85%] rounded-2xl px-4 py-3.5 text-sm leading-relaxed shadow-sm ${
          isAssistant
            ? "rounded-tl-md border border-border bg-card text-foreground"
            : "rounded-tr-md bg-foreground text-background"
        }`}
      >
        <div className="whitespace-pre-wrap">{formatMarkdown(message.text)}</div>

        {isAssistant && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border pt-2.5 text-xs">
            <button
              type="button"
              onClick={onCopy}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              {isCopied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
              {isCopied ? "Copied" : "Copy"}
            </button>
            <button
              type="button"
              onClick={onLink}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <Layers3 className="size-3" />
              Webinar Offer
            </button>
            <button
              type="button"
              onClick={onBuild}
              className="inline-flex items-center gap-1 rounded-lg bg-foreground px-2 py-1 text-[11px] font-medium text-background hover:opacity-90"
            >
              <FilePlus2 className="size-3" />
              Build PPT
            </button>
            <button
              type="button"
              onClick={onSynthesize}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-secondary hover:text-foreground ml-auto"
            >
              <Sparkles className="size-3 text-amber-500" />
              ⚡ Initiate Build
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function formatMarkdown(text: string) {
  // Format bold and bullet lists for clean rendering
  const parts = text.split("\n");
  return parts.map((line, idx) => {
    // Bold replacement
    const formattedLine = line.replace(/\*\*(.*?)\*\*/g, "$1");
    if (line.startsWith("- ") || line.startsWith("* ")) {
      return (
        <span key={idx} className="block pl-3 py-0.5">
          • {line.slice(2)}
        </span>
      );
    }
    return (
      <span key={idx} className="block min-h-[1.25rem]">
        {formattedLine}
      </span>
    );
  });
}
