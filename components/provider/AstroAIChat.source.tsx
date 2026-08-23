"use client";

import {
  ArrowRight,
  Check,
  ChevronRight,
  Copy,
  FilePlus2,
  Layers,
  Lightbulb,
  Link2,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  Target,
  Trash2,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { readN8nJson } from "@/lib/n8n-response";
import { supabase } from "@/lib/supabase/client";
import { loadWorkspaceMemory, saveWorkspaceMemory, type WorkspaceMemory } from "@/lib/workspace-memory";

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

const WEBHOOK_URL = "/api/n8n/avatar-iq";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PROMPT_SUGGESTIONS = [
  { label: "B2B SaaS Buyer", prompt: "Help me define the ideal buyer persona for a B2B SaaS product targeting engineering leads." },
  { label: "High-Ticket Coaching", prompt: "I run a high-ticket business coaching program. Who is my most profitable and decisive customer?" },
  { label: "Agency Positioning", prompt: "We are a digital marketing agency wanting to specialize in e-commerce brand scaling. Shape our primary buyer persona." },
  { label: "Fears & Objections", prompt: "Analyze the top hesitations, skepticism, and hidden fears preventing prospects from buying high-value advisory services." },
  { label: "Synthesize Blueprint", prompt: "Synthesize everything we discussed so far into a comprehensive Ideal Buyer Blueprint." },
];

const INITIAL_GREETING: Message = {
  id: "welcome",
  role: "assistant",
  text: "Hello! I’m **Avatar IQ**, your customer research strategist & positioning coach.\n\nLet’s build your high-converting buyer persona step by step.\n\nTo get started: **Tell me a bit about your business, product, or the offer you want to sell!**",
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
  const [hydrated, setHydrated] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user || cancelled) return setHydrated(true);

      const [{ data: sessions }, memory] = await Promise.all([
        supabase
          .from("blueprint_sessions")
          .select("session_id,status,messages,answers,step,draft,selected_category,blueprint,updated_at")
          .eq("owner_id", authData.user.id)
          .order("updated_at", { ascending: false })
          .limit(30),
        loadWorkspaceMemory(authData.user.id),
      ]);
      if (cancelled) return;

      setWorkspaceMemory(memory);
      const savedSessions = (sessions ?? []) as BlueprintSession[];
      setHistory(savedSessions);

      const activeSession = requestedSessionId
        ? savedSessions.find((item) => item.session_id === requestedSessionId)
        : null;

      if (activeSession) {
        restoreSession(activeSession);
      } else {
        initializeSession(requestedSessionId, memory);
      }
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [routeSessionId, router]);

  // Autosave session to Supabase
  useEffect(() => {
    if (!hydrated || !sessionId) return;
    const timeout = window.setTimeout(() => {
      void supabase.auth.getUser().then(({ data: authData }) => {
        if (!authData.user) return;
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
        return supabase.from("blueprint_sessions").upsert({
          session_id: sessionId,
          owner_id: authData.user.id,
          status,
          step: result ? 4 : 1,
          answers: {},
          messages,
          draft,
          selected_category: null,
          blueprint: result,
          last_error: webhookError,
          updated_at: updatedAt,
        }, { onConflict: "owner_id,session_id" });
      });
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [busy, draft, hydrated, messages, result, sessionId, webhookError]);

  function initializeSession(nextSessionId: string, memory = workspaceMemory) {
    const remembered = memory?.audience_profile as BuyerBlueprint | undefined;
    const hasMemory = Boolean(memory?.onboarding_complete && remembered?.persona_name);
    const sid = nextSessionId || crypto.randomUUID();

    setMessages(hasMemory && remembered ? [
      {
        id: "welcome-back",
        role: "assistant",
        text: `Welcome back! I remember your saved Ideal Buyer: **${remembered.persona_name}** (${remembered.demographics || "Target Audience"}).\n\nWhat would you like to explore today? We can refine this buyer persona, test new marketing angles, or build a presentation for them.`,
      }
    ] : [INITIAL_GREETING]);

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
    setMessages([INITIAL_GREETING]);
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
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id || "";

      // Check if user is asking to synthesize or generate blueprint
      const isBlueprintRequest = /\b(blueprint|persona|synthesize|generate blueprint|create blueprint|buyer profile|avatar profile)\b/i.test(text);

      let assistantReplyText = "";
      let updatedBlueprint: BuyerBlueprint | null = result;

      // Try calling n8n webhook if available
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session?.access_token && WEBHOOK_URL.trim()) {
          const response = await fetch(WEBHOOK_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${sessionData.session.access_token}`,
            },
            body: JSON.stringify({
              session_id: activeSessionId,
              user_id: userId,
              message: text,
              messages: nextMessages,
              business: text,
              buyer: result?.persona_name || text,
              problem: result?.core_fear || text,
              objections: result?.objections?.join("; ") || text,
            }),
          });

          if (response.ok) {
            const parsed = await readN8nJson<unknown>(response, "Avatar IQ workflow");
            const candidate = Array.isArray(parsed) ? parsed[0] : parsed;
            const generated = ((candidate as { data?: unknown })?.data ?? candidate) as Partial<BuyerBlueprint>;
            if (generated?.persona_name) {
              updatedBlueprint = {
                persona_name: generated.persona_name,
                demographics: generated.demographics || "Target Industry & Decision Makers",
                core_fear: generated.core_fear || "Risk of wasted investment and falling behind competitors",
                buying_trigger: generated.buying_trigger || "Urgent mandate to scale without added headcount",
                objections: Array.isArray(generated.objections) ? generated.objections : ["Is this proven in our specific niche?", "Will this take too much of our internal bandwidth?"],
                headlines: Array.isArray(generated.headlines) ? generated.headlines : ["How to achieve predictable results without the traditional overhead."],
                social_hooks: Array.isArray(generated.social_hooks) ? generated.social_hooks : ["Stop doing it the hard way. Here is what top performers do instead."],
                email_subject_lines: Array.isArray(generated.email_subject_lines) ? generated.email_subject_lines : ["Quick question about your current workflow"],
                primary_goals: Array.isArray(generated.primary_goals) ? generated.primary_goals : ["Predictable revenue", "Time freedom", "Market authority"],
                values_and_beliefs: Array.isArray(generated.values_and_beliefs) ? generated.values_and_beliefs : ["Quality over quantity", "Data-driven decisions"],
                decision_style: generated.decision_style || "Analytical, looks for proof and clear ROI before committing",
                trusted_influences: Array.isArray(generated.trusted_influences) ? generated.trusted_influences : ["Industry peers", "Direct case studies", "Respected newsletters"],
                day_in_the_life: generated.day_in_the_life || "Constantly putting out fires, juggling high expectations with limited time.",
                elevator_pitch: generated.elevator_pitch || `Tailored solution designed specifically for ${generated.persona_name}.`,
                content_ideas: Array.isArray(generated.content_ideas) ? generated.content_ideas : ["The 3 costly mistakes most teams make when scaling", "A step-by-step breakdown of our core framework"],
                search_topics: Array.isArray(generated.search_topics) ? generated.search_topics : ["How to scale efficiently", "Best practices for modern workflows"],
                conversation_starters: Array.isArray(generated.conversation_starters) ? generated.conversation_starters : ["What is currently taking up most of your team's weekly bandwidth?"],
                competitive_edge: generated.competitive_edge || "High-touch execution with guaranteed turnaround.",
                research_notes: generated.research_notes,
              };
            }
          }
        }
      } catch (err) {
        console.warn("Avatar IQ webhook note:", err);
      }

      // If local AI or webhook synthesis is needed
      if (!assistantReplyText) {
        const localResponse = generateConversationalResponse(text, nextMessages, updatedBlueprint);
        assistantReplyText = localResponse.reply;
        if (localResponse.blueprint) {
          updatedBlueprint = localResponse.blueprint;
        }
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

  function handleSynthesizeBlueprint() {
    void handleSend("Please synthesize all the context, business details, customer traits, and objections we've discussed into a complete Ideal Buyer Blueprint.");
  }

  function linkIdeaToContent(ideaText: string, build = false) {
    if (result) {
      sessionStorage.setItem("astrocraft:latest-blueprint", JSON.stringify(result));
    }
    sessionStorage.setItem("astrocraft:avatar-idea", ideaText);
    sessionStorage.setItem("astrocraft:creation-intent", build ? "presentation" : "ideas");
    if (build) sessionStorage.setItem("astrocraft:auto-build-content", "true");
    router.push("/provider/slides");
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
        {/* Top Header */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden lg:grid size-8 place-items-center rounded-lg border border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
              title="Toggle sidebar"
            >
              {sidebarOpen ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
            </button>
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <h1 className="text-sm font-semibold tracking-tight text-foreground truncate max-w-[200px] sm:max-w-md">
                {activeBlueprint.persona_name || "Avatar IQ · Idea Brainstorming"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSynthesizeBlueprint}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
            >
              <Sparkles className="size-3.5 text-amber-500" />
              Autofill Idea
            </button>
            <button
              type="button"
              onClick={() => setBlueprintDrawerOpen(!blueprintDrawerOpen)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
                blueprintDrawerOpen
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background text-foreground hover:bg-secondary"
              }`}
            >
              <Target className="size-3.5" />
              Idea Blueprint
            </button>
          </div>
        </header>

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
                  onLink={() => linkIdeaToContent(message.text, false)}
                  onBuild={() => linkIdeaToContent(message.text, true)}
                  onSynthesize={handleSynthesizeBlueprint}
                />
              ))}

              {busy && (
                <div className="flex items-center gap-3">
                  <div className="grid size-8 place-items-center rounded-full bg-foreground text-[10px] font-bold text-background">
                    IQ
                  </div>
                  <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-md border border-border bg-card px-4 py-3 text-xs text-muted-foreground shadow-sm">
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Avatar IQ is thinking...</span>
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            {/* Prompt Suggestions */}
            {messages.length <= 3 && (
              <div className="px-4 lg:px-6 py-2">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
                  <span className="text-[11px] font-medium text-muted-foreground shrink-0">Try asking:</span>
                  {PROMPT_SUGGESTIONS.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSend(item.prompt)}
                      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-[11px] font-medium text-foreground hover:bg-secondary hover:border-foreground/30 transition"
                    >
                      <Lightbulb className="size-3 text-amber-500" />
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Message Input Footer */}
            <footer className="shrink-0 border-t border-border bg-background p-4 lg:p-6">
              <div className="mx-auto max-w-3xl">
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
                    placeholder="Talk about your presentation idea, ask marketing questions, or brainstorm your buyer..."
                    className="max-h-36 min-h-[48px] flex-1 resize-none bg-transparent px-4 py-3 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none"
                  />
                  <div className="flex items-center gap-2 p-2 shrink-0">
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
                  <span>Idea Blueprint & Q&A Cards</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSynthesizeBlueprint}
                    title="Autofill from Chat"
                    className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-medium text-foreground hover:bg-secondary"
                  >
                    <Sparkles className="size-3 text-amber-500" />
                    Autofill
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
                {/* Top Action Row */}
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/provider/slides"
                    onClick={() => {
                      if (activeBlueprint) sessionStorage.setItem("astrocraft:latest-blueprint", JSON.stringify(activeBlueprint));
                      sessionStorage.setItem("astrocraft:creation-intent", "presentation");
                    }}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-foreground px-3 py-2 text-center text-xs font-semibold text-background transition hover:opacity-90 shadow-sm"
                  >
                    <FilePlus2 className="size-3.5" />
                    Build PPT from Idea
                  </Link>
                  <Link
                    href="/provider/offer-iq"
                    onClick={() => {
                      if (activeBlueprint) sessionStorage.setItem("astrocraft:latest-blueprint", JSON.stringify(activeBlueprint));
                    }}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-center text-xs font-semibold text-foreground transition hover:border-foreground/40 shadow-sm"
                  >
                    <ArrowRight className="size-3.5" />
                    Make Offer in Offer IQ
                  </Link>
                </div>

                <div className="space-y-4">
                  {/* Q1: Presentation Idea & Topic */}
                  <EditableCard
                    label="Q1 · Presentation / Content Idea Topic"
                    description="The main topic or theme you are brainstorming for your slides."
                    value={activeBlueprint.persona_name}
                    placeholder="e.g. 5 Scaling Bottlenecks for 7-Figure Agency Founders"
                    onChange={(val) => updateBlueprintField("persona_name", val)}
                  />

                  {/* Q2: Target Audience */}
                  <EditableCard
                    label="Q2 · Target Audience (Who is this for?)"
                    description="The specific decision maker or customer who will watch or buy."
                    value={activeBlueprint.demographics}
                    placeholder="e.g. Digital agency founders (teams of 5-25, $50k-$200k/mo revenue)"
                    onChange={(val) => updateBlueprintField("demographics", val)}
                  />

                  {/* Q3: Core Pain Point / Burning Problem */}
                  <EditableCard
                    label="Q3 · Core Pain Point / Burning Problem"
                    description="The urgent bottleneck or frustration keeping them awake at night."
                    value={activeBlueprint.core_fear}
                    placeholder="e.g. Trapped in daily client fulfillment; business stalls without constant micromanaging"
                    onChange={(val) => updateBlueprintField("core_fear", val)}
                  />

                  {/* Q4: Big Transformation / Buying Trigger */}
                  <EditableCard
                    label="Q4 · Big Breakthrough / Buying Trigger"
                    description="The catalyst or transformation that makes them act now."
                    value={activeBlueprint.buying_trigger}
                    placeholder="e.g. Hitting an operational capacity ceiling where taking more clients causes burnout"
                    onChange={(val) => updateBlueprintField("buying_trigger", val)}
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
                  />

                  {/* Elevator Pitch */}
                  <EditableCard
                    label="Elevator Pitch / Hook Summary"
                    description="Concise 1-sentence value pitch for this presentation and offer."
                    value={activeBlueprint.elevator_pitch ?? ""}
                    placeholder="e.g. We help agency founders build self-managing operations in 90 days."
                    onChange={(val) => updateBlueprintField("elevator_pitch", val)}
                  />
                </div>

                {/* Bottom Action Row */}
                <div className="pt-2 space-y-2 border-t border-border">
                  <Link
                    href="/provider/slides"
                    onClick={() => {
                      if (activeBlueprint) sessionStorage.setItem("astrocraft:latest-blueprint", JSON.stringify(activeBlueprint));
                      sessionStorage.setItem("astrocraft:creation-intent", "presentation");
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-xs font-semibold text-background transition hover:opacity-90 shadow-sm"
                  >
                    <FilePlus2 className="size-3.5" />
                    Build PPT from this Idea
                  </Link>
                  <Link
                    href="/provider/offer-iq"
                    onClick={() => {
                      if (activeBlueprint) sessionStorage.setItem("astrocraft:latest-blueprint", JSON.stringify(activeBlueprint));
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-medium text-foreground transition hover:border-foreground/40"
                  >
                    <ArrowRight className="size-3.5" />
                    Continue to Offer IQ
                  </Link>
                </div>
              </div>
            </aside>
          )}
        </div>
      </section>
    </div>
  );
}
function EditableCard({
  label,
  description,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  description?: string;
  value: string;
  placeholder?: string;
  onChange: (val: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background p-3.5 shadow-sm space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-foreground">
          {label}
        </p>
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
}: {
  label: string;
  description?: string;
  items?: string[];
  placeholder?: string;
  onAdd: (val: string) => void;
  onRemove: (idx: number) => void;
  onUpdate: (idx: number, val: string) => void;
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
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-foreground">
          {label}
        </p>
        {description && (
          <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">{description}</p>
        )}
      </div>

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
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className={`flex items-start gap-3 ${isAssistant ? "" : "justify-end"}`}>
      {isAssistant && (
        <div className="grid size-8 shrink-0 place-items-center rounded-full bg-foreground text-[10px] font-bold text-background">
          IQ
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
              <Link2 className="size-3" />
              Link to Content
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
              Update Blueprint
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

function generateConversationalResponse(
  userPrompt: string,
  history: Message[],
  existingBlueprint: BuyerBlueprint | null,
): { reply: string; blueprint?: BuyerBlueprint } {
  const lower = userPrompt.toLowerCase().trim();
  const userMessages = history.filter((m) => m.role === "user");
  const turnCount = userMessages.length;
  const allUserText = userMessages.map((m) => m.text).join(" ");

  // 1. Natural greeting detection
  const isGreeting =
    /^(hi|hii|hiii|hey|heyy|hello|helloo|sup|yo|good morning|good afternoon|good evening|howdy)\b/i.test(
      lower,
    ) && userPrompt.trim().split(/\s+/).length <= 4;

  if (isGreeting) {
    return {
      reply: `Hey there! Great to connect with you.\n\nI'm here to help you uncover your most profitable buyer persona and dial in your positioning.\n\nTo kick things off: **What kind of business, service, or product are you offering?**`,
      blueprint: existingBlueprint ?? undefined,
    };
  }

  // 2. Help / Capabilities question
  if (/^(help|what can you do|who are you|how does this work)\b/i.test(lower)) {
    return {
      reply: `I'm **Avatar IQ**, your customer research strategist. We work together just like a 1-on-1 strategy session:\n\n1. **Define Your Persona**: Identify your exact high-value target audience and decision-maker.\n2. **Uncover Urgent Pains & Triggers**: Figure out why they buy now rather than waiting.\n3. **Neutralize Objections**: Address skepticism and hesitation before they even arise.\n4. **Generate Copy Angles & Hooks**: High-converting headlines, social hooks, and email subjects.\n5. **Synthesize a Full Blueprint**: Create an actionable buyer profile that connects to **Offer IQ** and **PPT slide generation**.\n\nTo start: **Tell me what you sell or the business you want to build!**`,
      blueprint: existingBlueprint ?? undefined,
    };
  }

  // 3. Synthesize / Generate blueprint command
  if (
    lower.includes("synthesize") ||
    lower.includes("generate blueprint") ||
    lower.includes("create blueprint") ||
    lower.includes("make blueprint") ||
    lower.includes("show blueprint")
  ) {
    const personaName = extractPersonaName(allUserText);
    const blueprint = buildFullBlueprint(allUserText, personaName, existingBlueprint);
    return {
      reply: `I have synthesized our discussion into your **Ideal Buyer Blueprint** for **${blueprint.persona_name}**!\n\n✨ **Key Pillars Generated**:\n• **Target Audience**: ${blueprint.demographics}\n• **Core Tension**: ${blueprint.core_fear}\n• **Buying Trigger**: ${blueprint.buying_trigger}\n• **Top Objection**: ${blueprint.objections[0]}\n\nCheck the **Blueprint Panel** on the right to review all headlines, hooks, email subject lines, and elevator pitch. You can now tweak anything, continue to **Offer IQ**, or click **Build PPT**!`,
      blueprint,
    };
  }

  // 4. Marketing hooks & headlines request
  if (
    lower.includes("hook") ||
    lower.includes("headline") ||
    lower.includes("angle") ||
    lower.includes("copy idea") ||
    lower.includes("email subject")
  ) {
    const persona = existingBlueprint?.persona_name || extractPersonaName(allUserText);
    return {
      reply: `Here are 3 high-converting **marketing angles & hooks** crafted for **${persona}**:\n\n- 🎯 **Angle 1 (The Cost of Waiting)**: *"How much is staying with your current workflow costing your team in lost revenue each quarter?"*\n- 🚀 **Angle 2 (The Mechanism Reframe)**: *"The 3-pillar method top performers use to achieve consistent results without burning out."*\n- 💡 **Angle 3 (Contrarian Truth)**: *"Why working harder or hiring more staff is usually the wrong first step to scaling."*\n\nWould you like to turn these into a full **PowerPoint presentation** (click Build PPT), or refine the persona further?`,
      blueprint: existingBlueprint ?? undefined,
    };
  }

  // 5. Objections & fears exploration
  if (
    lower.includes("objection") ||
    lower.includes("fear") ||
    lower.includes("hesitation") ||
    lower.includes("skeptic")
  ) {
    const persona = existingBlueprint?.persona_name || extractPersonaName(allUserText);
    return {
      reply: `Here are the top **fears & hidden objections** preventing **${persona}** from buying:\n\n1. **Complexity & Bandwidth**: *"We don't have the time or team capacity to implement something new right now."*\n2. **Niche Fit & Proof**: *"Does this actually work for our specific situation, or is it a generic template?"*\n3. **ROI Timeline**: *"How soon will we see tangible results to justify the investment?"*\n\n**Copy Recommendation**: In your presentation and offer, lead with guaranteed turnaround, direct proof, and done-for-you ease to neutralize these early.`,
      blueprint: existingBlueprint ?? undefined,
    };
  }

  // 6. Progressive 1-by-1 consultative dialogue based on conversation context
  const personaName = extractPersonaName(allUserText);
  const updatedBlueprint = buildFullBlueprint(allUserText, personaName, existingBlueprint);

  // Turn 1: User just described their business
  if (turnCount <= 1 || (!hasAudienceContext(allUserText) && !hasProblemContext(allUserText))) {
    return {
      reply: `That gives us a great starting point!\n\nTo make your marketing cut through the noise, we need to pinpoint the exact person writing the check.\n\n**Who is the specific decision maker or ideal customer you want to target?**\n*(For example: SMB founders, VP of Sales, solo consultants, busy working parents, or enterprise CTOs?)*`,
      blueprint: updatedBlueprint,
    };
  }

  // Turn 2: User described their audience -> ask about core pain/fear
  if (!hasProblemContext(allUserText)) {
    return {
      reply: `Excellent — **${personaName}** is a strong, distinct audience.\n\nNow let's uncover their primary tension:\n\n**What is the single biggest frustration, operational bottleneck, or fear they are struggling with right now?** *(What's keeping them awake at night or costing them money?)*`,
      blueprint: updatedBlueprint,
    };
  }

  // Turn 3: User described the problem -> ask about buying trigger
  if (!hasTriggerContext(allUserText)) {
    return {
      reply: `That is a massive pain point, and an offer that solves that will command strong pricing.\n\nNext key pillar:\n\n**What is the specific catalyst or 'trigger event' that makes them urgently seek a solution now instead of putting it off?** *(e.g. reaching burnout, a revenue dip, board pressure, losing a client, or entering a new growth phase?)*`,
      blueprint: updatedBlueprint,
    };
  }

  // Turn 4: User described trigger -> ask about main objection
  if (!hasObjectionContext(allUserText)) {
    return {
      reply: `Spot on. When that trigger hits, they are in active buying mode.\n\nOne last piece to lock in your messaging:\n\n**What is their biggest doubt or objection when considering working with you or buying your solution?** *(e.g. Price, trust, implementation time, or skepticism based on past bad experiences?)*`,
      blueprint: updatedBlueprint,
    };
  }

  // Turn 5+: All pillars covered -> synthesize and offer next strategic moves
  return {
    reply: `Fantastic! We now have all the core pieces of your **Ideal Buyer Blueprint** for **${personaName}**.\n\nI've updated the **Blueprint Panel** on the right with your complete profile, including core fears, buying triggers, objections, and ready-to-use marketing headlines.\n\n**Where would you like to take this next?**\n• **Continue to Offer IQ**: Shape a high-converting offer and pricing structure.\n• **Build PPT**: Generate a full presentation from this buyer blueprint.\n• **Brainstorm Hooks**: Generate more social media hooks and email angles.`,
    blueprint: updatedBlueprint,
  };
}

function extractPersonaName(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("saas") || lower.includes("software") || lower.includes("tech") || lower.includes("developer")) {
    return "B2B SaaS Growth Leader / Tech Founder";
  }
  if (lower.includes("agency") || lower.includes("client") || lower.includes("marketing")) {
    return "Scaling Agency Owner & Service Provider";
  }
  if (lower.includes("coach") || lower.includes("consultant") || lower.includes("advisory")) {
    return "High-Performing Professional & Practice Owner";
  }
  if (lower.includes("ecommerce") || lower.includes("ecom") || lower.includes("brand") || lower.includes("shopify")) {
    return "D2C E-Commerce Brand Founder";
  }
  if (lower.includes("real estate") || lower.includes("realtor") || lower.includes("property")) {
    return "Top-Producing Real Estate Broker & Team Lead";
  }
  if (lower.includes("dentist") || lower.includes("clinic") || lower.includes("doctor") || lower.includes("health")) {
    return "Private Practice Medical / Healthcare Owner";
  }
  if (lower.includes("b2b") || lower.includes("enterprise") || lower.includes("executive")) {
    return "B2B Decision Maker & Operations Director";
  }
  return "The Overloaded Business Owner";
}

function hasAudienceContext(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("founder") ||
    lower.includes("owner") ||
    lower.includes("director") ||
    lower.includes("executive") ||
    lower.includes("client") ||
    lower.includes("customer") ||
    lower.includes("team") ||
    lower.includes("target") ||
    lower.includes("people") ||
    lower.includes("dentist") ||
    lower.includes("coach") ||
    lower.includes("agency") ||
    lower.includes("leader")
  );
}

function hasProblemContext(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("problem") ||
    lower.includes("struggle") ||
    lower.includes("frustrat") ||
    lower.includes("pain") ||
    lower.includes("stuck") ||
    lower.includes("waste") ||
    lower.includes("burnout") ||
    lower.includes("time") ||
    lower.includes("cost") ||
    lower.includes("hard") ||
    lower.includes("traffic") ||
    lower.includes("lead") ||
    lower.includes("revenue")
  );
}

function hasTriggerContext(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("trigger") ||
    lower.includes("catalyst") ||
    lower.includes("event") ||
    lower.includes("decide") ||
    lower.includes("ready") ||
    lower.includes("quarter") ||
    lower.includes("launch") ||
    lower.includes("happen") ||
    lower.includes("realiz") ||
    lower.includes("moment")
  );
}

function hasObjectionContext(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("price") ||
    lower.includes("cost") ||
    lower.includes("expensive") ||
    lower.includes("trust") ||
    lower.includes("time") ||
    lower.includes("bandwidth") ||
    lower.includes("doubt") ||
    lower.includes("hesitat") ||
    lower.includes("objection") ||
    lower.includes("skeptic") ||
    lower.includes("risk") ||
    lower.includes("guarantee")
  );
}

function buildFullBlueprint(
  contextText: string,
  personaName: string,
  existing: BuyerBlueprint | null,
): BuyerBlueprint {
  const lower = contextText.toLowerCase();
  const isB2b = lower.includes("b2b") || lower.includes("saas") || lower.includes("enterprise") || lower.includes("tech");
  const isAgency = lower.includes("agency") || lower.includes("client") || lower.includes("service");

  return {
    persona_name: existing?.persona_name || personaName,
    demographics:
      existing?.demographics ||
      (isB2b
        ? "B2B Tech Founders, VPs of Eng, CTOs (Age 32-52, $2M-$20M ARR)"
        : isAgency
        ? "Digital Agency Founders, 30-50 yrs, managing teams of 5-25"
        : "Small-to-Medium Business Owners & Practice Leaders (Age 32-55, $500k-$5M revenue)"),
    core_fear:
      existing?.core_fear ||
      (isB2b
        ? "Wasting engineering cycles on unproven tools while competitors outpace them in market velocity."
        : isAgency
        ? "Getting trapped in low-margin fulfillment burnout where more revenue equals more chaos."
        : "That the business will completely stall or decline without their constant personal micro-management."),
    buying_trigger:
      existing?.buying_trigger ||
      (isB2b
        ? "Quarterly board mandate to optimize efficiency and increase team output without new headcount."
        : "Hitting an operational capacity ceiling where they can no longer take on clients safely."),
    objections:
      existing?.objections?.length
        ? existing.objections
        : [
            "How quickly will we see measurable ROI without disrupting our current day-to-day operations?",
            "Is this truly customized for our specific niche, or a generic cookie-cutter framework?",
            "Do we have the internal team bandwidth to adopt and execute this properly?",
          ],
    headlines:
      existing?.headlines?.length
        ? existing.headlines
        : [
            `The Proven Operating Blueprint for ${personaName}`,
            "How to Eliminate Operational Inefficiencies Without Adding More Headcount",
            "Stop Leaking Revenue: The Scalable System Built for Today's Market",
          ],
    social_hooks:
      existing?.social_hooks?.length
        ? existing.social_hooks
        : [
            "Most founders try to scale by working longer hours. Here is why top operators do the exact opposite.",
            "If you're still relying on manual playbooks in 2026, here is the hidden cost to your bottom line.",
            "3 silent bottlenecks killing your growth (and the 14-day fix).",
          ],
    email_subject_lines:
      existing?.email_subject_lines?.length
        ? existing.email_subject_lines
        : [
            "A quick question about your current scaling bottleneck",
            "How [Peer Brand] unlocked 3x higher retention",
            "The missing piece in your growth roadmap",
          ],
    primary_goals: [
      "Predictable, recurring revenue and higher profit margins",
      "Reclaimed personal time and reduced day-to-day firefighting",
      "A scalable operational foundation that runs reliably",
    ],
    values_and_beliefs: [
      "Prioritizes high leverage and speed of execution over complexity",
      "Values proven practitioner frameworks over theoretical advice",
    ],
    decision_style: "Analytical yet decisive when presented with clear case studies and risk mitigation.",
    trusted_influences: ["Peer masterminds", "Direct practitioner case studies", "Respected industry newsletters"],
    day_in_the_life: "Constantly juggling high-level growth strategy with urgent client fires and operational bottlenecks.",
    elevator_pitch: `We help ${personaName} achieve predictable growth and operational freedom without adding headcount.`,
    content_ideas: [
      "The 5-Step Operating System for Sustainable Growth",
      "Why Traditional Scaling Methods Are Breaking in 2026",
      "Case Study: Going from Bottlenecked Operator to Scalable Asset",
    ],
    search_topics: [
      "How to scale business without burnout",
      "Best high-ticket acquisition strategies",
      "Operational leverage and automation frameworks",
    ],
    conversation_starters: [
      "What is currently the single largest bottleneck taking up your team's weekly bandwidth?",
      "If you could remove one operational headache from your plate this month, what would it be?",
    ],
    competitive_edge: "Direct practitioner methodology backed by real operational systems and guaranteed implementation.",
  };
}
