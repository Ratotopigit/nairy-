"use client";

import {
  ArrowRight,
  Check,
  MessageSquare,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Send,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { readN8nJson } from "@/lib/n8n-response";
import { supabase } from "@/lib/supabase/client";
import { loadWorkspaceMemory, saveWorkspaceMemory, type WorkspaceMemory } from "@/lib/workspace-memory";

type QuestionKey = "business" | "buyer" | "problem" | "objections";
type Answer = { category: string | null; description: string };
type Message = {
  id: string;
  role: "assistant" | "user";
  text: string;
  category?: string | null;
};

type BlueprintSession = {
  session_id: string;
  status: "draft" | "generating" | "completed" | "failed";
  step: number;
  answers: Record<QuestionKey, Answer>;
  messages: Message[];
  draft: string;
  selected_category: string | null;
  blueprint: BuyerBlueprint | null;
  updated_at: string;
};

type BuyerBlueprint = {
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

const WEBHOOK_URL = "/api/n8n/avatar-iq";
const BLUEPRINT_SESSION_KEY = "astrocraft:blueprint-session-id";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const QUESTIONS: Array<{
  key: QuestionKey;
  question: string;
  support: string;
  options: string[];
  placeholder: string;
}> = [
  {
    key: "business",
    question: "Tell me about your business or business idea.",
    support: "What do you do, or what do you want to be known for?",
    options: ["Consulting", "Agency", "SaaS", "Education", "Product", "Other"],
    placeholder: "Describe your business or idea...",
  },
  {
    key: "buyer",
    question: "Who do you think your ideal buyer would be for this program or service?",
    support: "Describe them in a sentence or two, including their age, role, industry, or situation.",
    options: ["Business owners", "Executives", "Marketing teams", "Investors", "Customers", "Other"],
    placeholder: "Describe the audience...",
  },
  {
    key: "problem",
    question: "What’s the biggest problem you want to help them solve — and the result or transformation you’d love them to achieve?",
    support: "Explain what happens if they do not solve it and what success should look like.",
    options: ["Increase revenue", "Save time", "Generate leads", "Improve efficiency", "Reduce risk", "Other"],
    placeholder: "Describe the problem and desired result...",
  },
  {
    key: "objections",
    question: "What’s one hesitation or objection they might have about working with you?",
    support: "Consider price, trust, timing, complexity, past experiences, skepticism, or doing it themselves.",
    options: ["Price", "Trust", "Complexity", "Time", "ROI", "Change resistance"],
    placeholder: "Describe the main objection...",
  },
];

const EMPTY: Record<QuestionKey, Answer> = {
  business: { category: null, description: "" },
  buyer: { category: null, description: "" },
  problem: { category: null, description: "" },
  objections: { category: null, description: "" },
};

const initialMessage: Message = {
  id: "welcome",
  role: "assistant",
  text: "Hi, I’m Avatar Craft. Let’s build your Ideal Buyer Blueprint today. I’ll ask you four quick questions about your business, then use the connected research workflow to sharpen the result.",
};

export default function PresentationChat() {
  const params = useParams<{ sessionId: string }>();
  const router = useRouter();
  const routeSessionId = typeof params.sessionId === "string" ? params.sessionId : "";
  const [messages, setMessages] = useState<Message[]>([initialMessage]);
  const [answers, setAnswers] = useState<Record<QuestionKey, Answer>>(EMPTY);
  const [step, setStep] = useState(-1);
  const [draft, setDraft] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<BuyerBlueprint | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [webhookError, setWebhookError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState("");
  const [history, setHistory] = useState<BlueprintSession[]>([]);
  const [workspaceMemory, setWorkspaceMemory] = useState<WorkspaceMemory | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const current = step >= 0 && step < QUESTIONS.length ? QUESTIONS[step] : null;
  const complete = step === QUESTIONS.length;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, step, generating, result]);

  useEffect(() => {
    if (current) textareaRef.current?.focus();
  }, [step, current]);

  useEffect(() => {
    let cancelled = false;
    setHydrated(false);
    void (async () => {
      const requestedSessionId = UUID_PATTERN.test(routeSessionId)
        ? routeSessionId
        : crypto.randomUUID();
      if (requestedSessionId !== routeSessionId) {
        router.replace(`/provider/astro-ai/${requestedSessionId}`);
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
      const session = savedSessions.find((item) => item.session_id === requestedSessionId);
      if (session) restoreSession(session);
      else initializeSession(requestedSessionId, memory);
      setHydrated(true);
    })();
    return () => { cancelled = true; };
  }, [routeSessionId, router]);

  useEffect(() => {
    if (!hydrated || !sessionId) return;
    window.localStorage.setItem(BLUEPRINT_SESSION_KEY, sessionId);
    const timeout = window.setTimeout(() => {
      void supabase.auth.getUser().then(({ data: authData }) => {
        if (!authData.user) return;
        const status = result ? "completed" : generating ? "generating" : webhookError ? "failed" : "draft";
        const updatedAt = new Date().toISOString();
        const session: BlueprintSession = {
          session_id: sessionId,
          status,
          step,
          answers,
          messages,
          draft,
          selected_category: category,
          blueprint: result,
          updated_at: updatedAt,
        };
        setHistory((items) => [session, ...items.filter((item) => item.session_id !== sessionId)]);
        return supabase.from("blueprint_sessions").upsert({
          session_id: sessionId,
          owner_id: authData.user.id,
          status,
          step,
          answers,
          messages,
          draft,
          selected_category: category,
          blueprint: result,
          last_error: webhookError,
          updated_at: updatedAt,
        }, { onConflict: "session_id" });
      });
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [answers, category, draft, generating, hydrated, messages, result, sessionId, step, webhookError]);

  function initializeSession(nextSessionId: string, memory = workspaceMemory) {
    const remembered = memory?.audience_profile as BuyerBlueprint | undefined;
    const rememberedAnswers = memory?.business_profile.answers as Record<QuestionKey, Answer> | undefined;
    const hasMemory = Boolean(memory?.onboarding_complete && remembered?.persona_name);
    setMessages(hasMemory ? [{
      id: "welcome-back",
      role: "assistant",
      text: `Welcome back. I remember your business and ${remembered!.persona_name}. You can continue to Offer IQ, generate ideas, or build a presentation without answering the same questions again.`,
    }] : [initialMessage]);
    setAnswers(rememberedAnswers ?? EMPTY);
    setStep(hasMemory ? QUESTIONS.length : -1);
    setDraft("");
    setCategory(null);
    setGenerating(false);
    setResult(hasMemory ? remembered ?? null : null);
    setWebhookError(null);
    setSessionId(nextSessionId);
    window.localStorage.setItem(BLUEPRINT_SESSION_KEY, nextSessionId);
  }

  function restoreSession(session: BlueprintSession, navigate = false) {
    if (navigate && session.session_id !== routeSessionId) {
      router.push(`/provider/astro-ai/${session.session_id}`);
    }
    setSessionId(session.session_id);
    setMessages(Array.isArray(session.messages) && session.messages.length ? session.messages : [initialMessage]);
    setAnswers(session.answers ?? EMPTY);
    setStep(session.step);
    setDraft(session.draft ?? "");
    setCategory(session.selected_category ?? null);
    setResult(session.blueprint ?? null);
    setGenerating(false);
    setWebhookError(null);
    window.localStorage.setItem(BLUEPRINT_SESSION_KEY, session.session_id);
  }

  function startBrief() {
    const nextSessionId = sessionId || crypto.randomUUID();
    setSessionId(nextSessionId);
    setStep(0);
    setMessages([
      initialMessage,
      {
        id: "question-business",
        role: "assistant",
        text: QUESTIONS[0].question,
      },
    ]);
  }

  function resetChat() {
    const nextSessionId = crypto.randomUUID();
    initializeSession(nextSessionId, workspaceMemory);
    router.push(`/provider/astro-ai/${nextSessionId}`);
  }

  function sendAnswer() {
    if (!current || (!draft.trim() && !category)) return;

    const answer = { category, description: draft.trim() };
    const nextAnswers = { ...answers, [current.key]: answer };
    setAnswers(nextAnswers);
    setMessages((value) => [
      ...value,
      {
        id: `answer-${current.key}`,
        role: "user",
        text: draft.trim() || category || "",
        category,
      },
    ]);
    setDraft("");
    setCategory(null);

    const nextStep = step + 1;
    setStep(nextStep);
    if (nextStep < QUESTIONS.length) {
      window.setTimeout(() => {
        setMessages((value) => [
          ...value,
          {
            id: `question-${QUESTIONS[nextStep].key}`,
            role: "assistant",
            text: QUESTIONS[nextStep].question,
          },
        ]);
      }, 180);
    } else {
      window.setTimeout(() => {
        setMessages((value) => [
          ...value,
          {
            id: "ready",
            role: "assistant",
            text: "Perfect — thanks for sharing! I’m now creating your Ideal Buyer Blueprint, blending your answers with the connected research workflow. This will only take a moment…",
          },
        ]);
        void generate(nextAnswers);
      }, 180);
    }
  }

  async function generate(inputAnswers: Record<QuestionKey, Answer> = answers) {
    const endpoint = WEBHOOK_URL.trim();
    if (!endpoint) {
      setWebhookError("The blueprint webhook is not configured in the environment.");
      setSidebarOpen(true);
      return;
    }

    setGenerating(true);
    setWebhookError(null);
    const text = (answer: Answer) =>
      [answer.category, answer.description].filter(Boolean).join(": ");

    try {
      const [{ data: authData, error: authError }, { data: sessionData, error: sessionError }] =
        await Promise.all([supabase.auth.getUser(), supabase.auth.getSession()]);
      if (authError || sessionError || !authData.user || !sessionData.session?.access_token) {
        throw new Error("Your sign-in session expired. Please sign in again.");
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({
          session_id: sessionId || crypto.randomUUID(),
          user_id: authData.user.id,
          business: text(inputAnswers.business),
          buyer: text(inputAnswers.buyer),
          problem: text(inputAnswers.problem),
          objections: text(inputAnswers.objections),
        }),
      });
      const parsed = await readN8nJson<unknown>(response, "Avatar IQ workflow");
      const candidate = Array.isArray(parsed) ? parsed[0] : parsed;
      const generated = ((candidate as { data?: unknown })?.data ?? candidate) as BuyerBlueprint;
      if (!generated.persona_name) throw new Error("Webhook response is missing persona_name");

      sessionStorage.setItem("astrocraft:latest-blueprint", JSON.stringify(generated));
      const memory = {
        owner_id: authData.user.id,
        onboarding_complete: true,
        business_profile: {
          answers: inputAnswers,
          business: text(inputAnswers.business),
          problem: text(inputAnswers.problem),
          objections: text(inputAnswers.objections),
        },
        audience_profile: generated as Record<string, unknown>,
        offer_profile: workspaceMemory?.offer_profile ?? {},
        brand_profile: workspaceMemory?.brand_profile ?? {},
        creation_preferences: workspaceMemory?.creation_preferences ?? {},
        memory_summary: `${text(inputAnswers.business)} Ideal buyer: ${generated.persona_name}. ${generated.demographics ?? ""}`.trim(),
        source_session_id: sessionId,
      } satisfies WorkspaceMemory;
      const { error: memoryError } = await saveWorkspaceMemory(authData.user.id, memory);
      if (!memoryError) setWorkspaceMemory(memory);
      setResult(generated);
      const { error: sessionSaveError } = await supabase.from("blueprint_sessions").upsert({
        session_id: sessionId,
        owner_id: authData.user.id,
        status: "completed",
        step: QUESTIONS.length,
        answers: inputAnswers,
        blueprint: generated,
        last_error: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "session_id" });
      if (sessionSaveError) {
        throw new Error(`Could not save blueprint session: ${sessionSaveError.message}`);
      }
      setMessages((value) => [
        ...value,
        {
          id: "generated",
          role: "assistant",
          text: `Your Ideal Buyer Blueprint is ready: ${generated.persona_name}.`,
        },
      ]);
    } catch (error) {
      setWebhookError(
        error instanceof Error ? error.message : "Could not reach the test webhook.",
      );
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="brief-builder flex h-[calc(100dvh-4rem-1px)] min-h-0 overflow-hidden bg-background text-foreground">
      <aside
        className={`hidden shrink-0 overflow-hidden border-r border-border bg-surface/80 transition-[width] duration-300 lg:flex lg:flex-col ${
          sidebarOpen ? "w-[248px]" : "w-0 border-r-0"
        }`}
      >
        <div className="w-[248px] p-4">
          <button
            type="button"
            onClick={resetChat}
            className="flex w-full items-center justify-between rounded-xl bg-foreground px-3.5 py-3 text-sm font-medium text-background transition hover:opacity-90"
          >
            <span className="flex items-center gap-2">
              <Plus className="size-4" />
              New brief
            </span>
            <span className="text-[10px] opacity-60">⌘ N</span>
          </button>
        </div>

        <div className="min-h-0 w-[248px] flex-1 overflow-y-auto px-3 pb-4">
          <p className="px-2 pb-2 font-mono text-[9px] uppercase tracking-[0.17em] text-muted-foreground">
            Conversations
          </p>
          {history.length === 0 ? (
            <p className="px-2 py-3 text-xs leading-5 text-muted-foreground">
              Your saved conversations will appear here.
            </p>
          ) : history.map((session) => {
            const business = session.answers?.business;
            const title = session.blueprint?.persona_name
              || business?.description
              || business?.category
              || "New buyer blueprint";
            return (
              <button
                key={session.session_id}
                type="button"
                onClick={() => restoreSession(session, true)}
                className={`mt-1 flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-left transition hover:bg-secondary ${
                  session.session_id === sessionId ? "bg-secondary text-foreground" : "text-muted-foreground"
                }`}
              >
                <MessageSquare className="mt-0.5 size-4 shrink-0" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{title}</span>
                  <span className="mt-0.5 block text-[10px] capitalize opacity-70">{session.status}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="w-[248px] border-t border-border p-4">
          <div className="flex items-center gap-3">
            <div className="grid size-8 place-items-center rounded-full bg-foreground text-[10px] font-bold text-background">
              YO
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">Your workspace</p>
              <p className="text-[10px] text-muted-foreground">Provider account</p>
            </div>
            <MoreHorizontal className="ml-auto size-4 text-muted-foreground" />
          </div>
        </div>
      </aside>

      <section className="relative flex min-w-0 flex-1 flex-col">
        <button
          type="button"
          aria-label={sidebarOpen ? "Hide conversation sidebar" : "Show conversation sidebar"}
          onClick={() => setSidebarOpen((open) => !open)}
          className="absolute left-3 top-3 z-20 hidden size-9 place-items-center rounded-xl border border-border bg-card text-muted-foreground shadow-sm transition hover:border-foreground/30 hover:text-foreground lg:grid"
        >
          {sidebarOpen ? (
            <PanelLeftClose className="size-4" />
          ) : (
            <PanelLeftOpen className="size-4" />
          )}
        </button>
        <main className="brief-chat-canvas min-h-0 flex-1 overflow-y-auto">
          {step < 0 ? (
            <div className="mx-auto flex min-h-full w-full max-w-[880px] items-center px-5 py-10 sm:px-8">
              <section className="w-full">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Avatar IQ
                </p>
                <h1 className="mt-4 max-w-2xl text-4xl font-semibold leading-[1.02] tracking-[-0.055em] sm:text-5xl">
                  Who is your strongest buyer?
                </h1>
                <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground">
                  Answer four focused questions. Avatar Craft will turn your context
                  into an actionable Ideal Buyer Blueprint.
                </p>

                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  {[
                    ["Established business", "Clarify the strongest buyer for an existing offer."],
                    ["New business idea", "Shape a practical first customer profile."],
                    ["New program", "Align a service or program with the right buyer."],
                  ].map(([title, description]) => (
                    <button
                      key={title}
                      type="button"
                      onClick={startBrief}
                      className="group rounded-2xl border border-border bg-card/80 p-4 text-left transition duration-300 hover:-translate-y-0.5 hover:border-foreground/35 hover:bg-card"
                    >
                      <span className="text-sm font-semibold">{title}</span>
                      <span className="mt-2 block text-xs leading-5 text-muted-foreground">
                        {description}
                      </span>
                      <ArrowRight className="mt-5 size-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground" />
                    </button>
                  ))}
                </div>

                <div className="mt-5 flex items-center gap-4">
                  <button
                    type="button"
                    onClick={startBrief}
                    className="inline-flex items-center gap-2 rounded-xl bg-foreground px-5 py-3 text-sm font-medium text-background"
                  >
                    Build my buyer blueprint
                    <ArrowRight className="size-4" />
                  </button>
                  <span className="hidden text-xs text-muted-foreground sm:inline">
                    Four short questions · about 2 minutes
                  </span>
                </div>
              </section>
            </div>
          ) : (
          <div className="mx-auto w-full max-w-[760px] px-4 py-7 sm:px-6 sm:py-10">
            <div className="space-y-6">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}

              {current && (
                <div className="pl-11">
                  <p className="mb-3 text-xs leading-5 text-muted-foreground">
                    {current.support}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {current.options.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setCategory(category === option ? null : option)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                          category === option
                            ? "border-foreground bg-foreground text-background"
                            : "border-border bg-card text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {complete && !result && (
                <div className="ml-11 rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Check className="size-4" />
                    {generating ? "Creating your Ideal Buyer Blueprint" : "Your answers are ready"}
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {QUESTIONS.map((question) => (
                      <div key={question.key}>
                        <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                          {question.key}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs leading-5">
                          {answers[question.key].description ||
                            answers[question.key].category}
                        </p>
                      </div>
                    ))}
                  </div>
                  {generating && (
                    <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full w-1/2 animate-pulse rounded-full bg-foreground" />
                    </div>
                  )}
                  {webhookError && (
                    <div className="mt-4">
                      <p className="text-xs leading-5 text-red-600">{webhookError}</p>
                      <button
                        type="button"
                        onClick={() => void generate()}
                        className="mt-3 rounded-lg border border-border px-3 py-2 text-xs font-medium hover:border-foreground/35"
                      >
                        Try again
                      </button>
                    </div>
                  )}
                </div>
              )}

              {result && (
                <div className="ml-11 rounded-2xl border border-border bg-card p-5">
                  <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
                    Ideal Buyer Blueprint
                  </p>
                  <p className="mt-2 text-lg font-semibold">{result.persona_name}</p>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    {result.demographics}
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-secondary p-3">
                      <p className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                        Core fear
                      </p>
                      <p className="mt-1 text-xs leading-5">{result.core_fear}</p>
                    </div>
                    <div className="rounded-xl bg-secondary p-3">
                      <p className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                        Buying trigger
                      </p>
                      <p className="mt-1 text-xs leading-5">{result.buying_trigger}</p>
                    </div>
                  </div>
                  <BlueprintList title="Objections & doubts" items={result.objections} />
                  <BlueprintList title="Marketing headlines" items={result.headlines} />
                  <BlueprintList title="Social media hooks" items={result.social_hooks} />
                  <BlueprintList title="Email subject lines" items={result.email_subject_lines} />
                  <BlueprintList title="Primary goals" items={result.primary_goals} />
                  <BlueprintList title="Values & beliefs" items={result.values_and_beliefs} />
                  <BlueprintList title="Trusted influences" items={result.trusted_influences} />
                  <BlueprintList title="Content ideas" items={result.content_ideas} />
                  <BlueprintList title="Search topics" items={result.search_topics} />
                  <BlueprintList title="Conversation starters" items={result.conversation_starters} />
                  <BlueprintText title="Decision-making style" value={result.decision_style} />
                  <BlueprintText title="Day in the life" value={result.day_in_the_life} />
                  <BlueprintText title="Elevator pitch" value={result.elevator_pitch} />
                  <BlueprintText title="Competitive edge" value={result.competitive_edge} />
                  <BlueprintText title="Research notes" value={result.research_notes} />

                  <div className="mt-6 flex flex-wrap gap-2 border-t border-border pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setResult(null);
                        setStep(0);
                        setMessages((value) => [
                          ...value,
                          { id: `adjust-${Date.now()}`, role: "assistant", text: "Let’s adjust it. Start with what you want to change about the business or offer." },
                        ]);
                      }}
                      className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:border-foreground/35"
                    >
                      Adjust my answers
                    </button>
                    <Link
                      href="/provider/offer-iq"
                      className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background"
                    >
                      Continue to Offer IQ
                      <ArrowRight className="size-4" />
                    </Link>
                    <Link
                      href="/provider/slides"
                      onClick={() => sessionStorage.setItem("astrocraft:creation-intent", "ideas")}
                      className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:border-foreground/35"
                    >
                      Generate ideas
                    </Link>
                    <Link
                      href="/provider/slides"
                      onClick={() => sessionStorage.setItem("astrocraft:creation-intent", "presentation")}
                      className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background"
                    >
                      Build a presentation
                      <ArrowRight className="size-4" />
                    </Link>
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>
          </div>
          )}
        </main>

        {step >= 0 && (
        <footer className="shrink-0 border-t border-border bg-background px-4 py-3 sm:px-6">
          <div className="mx-auto max-w-[760px]">
              <div className="rounded-2xl border border-border bg-card p-2 shadow-[0_8px_30px_rgba(20,52,40,0.07)] focus-within:border-foreground/35">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={draft}
                  disabled={!current || generating}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      sendAnswer();
                    }
                  }}
                  placeholder={current?.placeholder ?? "Brief complete"}
                  className="max-h-32 min-h-11 w-full resize-none bg-transparent px-3 py-2.5 text-sm leading-6 outline-none placeholder:text-muted-foreground disabled:opacity-50"
                />
                <div className="flex items-center justify-between px-2 pb-1">
                  <span className="text-[10px] text-muted-foreground">
                    Enter to send
                  </span>
                  <button
                    type="button"
                    aria-label="Send answer"
                    onClick={sendAnswer}
                    disabled={!current || (!draft.trim() && !category)}
                    className="grid size-8 place-items-center rounded-lg bg-foreground text-background transition disabled:opacity-25"
                  >
                    <Send className="size-3.5" />
                  </button>
                </div>
              </div>
          </div>
        </footer>
        )}
      </section>
    </div>
  );
}

function BlueprintList({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) return null;
  return (
    <section className="mt-5 border-t border-border pt-4">
      <p className="text-[9px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">{title}</p>
      <ul className="mt-2 space-y-2">
        {items.map((item, index) => (
          <li key={`${title}-${index}`} className="flex gap-2 text-xs leading-5">
            <span className="mt-2 size-1 shrink-0 rounded-full bg-foreground/45" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function BlueprintText({ title, value }: { title: string; value?: string }) {
  if (!value) return null;
  return (
    <section className="mt-5 border-t border-border pt-4">
      <p className="text-[9px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">{title}</p>
      <p className="mt-2 text-xs leading-6">{value}</p>
    </section>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const assistant = message.role === "assistant";

  return (
    <div className={`flex ${assistant ? "" : "justify-end"}`}>
      <div
        className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6 ${
          assistant
            ? "rounded-tl-md border border-border bg-card"
            : "rounded-tr-md bg-foreground text-background"
        }`}
      >
        {message.category && (
          <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.14em] opacity-60">
            {message.category}
          </p>
        )}
        <p className="whitespace-pre-wrap">{message.text}</p>
      </div>
    </div>
  );
}
