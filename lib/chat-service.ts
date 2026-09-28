import { auth, db } from "@/lib/firebase/config";
import { doc, setDoc } from "firebase/firestore";
import { n8nWebhookUrl } from "@/lib/n8n-url";
import { readN8nJson } from "@/lib/n8n-response";
import { parseAvatarChatPayload, type AvatarBlueprint } from "@/lib/avatar-chat";
import { saveWorkspaceMemory } from "@/lib/workspace-memory";
import type { WebinarAnswers } from "@/lib/webinar-questionnaire";
import { useEffect, useState } from "react";

export type Message = {
  id: string;
  role: "assistant" | "user";
  text: string;
  timestamp?: string;
  category?: string | null;
};

export type BuyerBlueprint = AvatarBlueprint;

export type BlueprintSession = {
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
  last_error?: string | null;
  updated_at: string;
};

export const ACTIVE_SESSION_STORAGE_KEY = "webinarkit:active-session-id";
export const EXPLICIT_NEW_CHAT_KEY = "webinarkit:explicit-new-chat";

export function getSessionCacheKey(sessionId: string): string {
  return `webinarkit:session:${sessionId}`;
}

export function getCachedSession(sessionId: string): Partial<BlueprintSession> | null {
  if (typeof window === "undefined" || !sessionId) return null;
  try {
    const raw =
      sessionStorage.getItem(getSessionCacheKey(sessionId)) ||
      localStorage.getItem(getSessionCacheKey(sessionId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSessionLocally(sessionId: string, data: Partial<BlueprintSession>) {
  if (typeof window === "undefined" || !sessionId) return;
  try {
    const key = getSessionCacheKey(sessionId);
    const existing = getCachedSession(sessionId) || {};

    let messages = data.messages ?? existing.messages;
    if (
      Array.isArray(existing.messages) &&
      Array.isArray(data.messages) &&
      existing.messages.length > data.messages.length
    ) {
      const existingHasUser = existing.messages.some((m) => m.role === "user");
      const incomingHasUser = data.messages.some((m) => m.role === "user");
      // If user explicitly started a brand new chat, allow resetting
      if (existingHasUser && !incomingHasUser && data.messages.length <= 1) {
        messages = data.messages;
      } else if (existingHasUser && incomingHasUser) {
        // Prevent stale state from overwriting a longer message history
        const seen = new Set(existing.messages.map((m) => m.id));
        const missing = data.messages.filter((m) => !seen.has(m.id));
        messages = [...existing.messages, ...missing];
      }
    }

    const merged = {
      ...existing,
      ...data,
      messages,
      session_id: sessionId,
      updated_at: data.updated_at || new Date().toISOString(),
    };
    const str = JSON.stringify(merged);
    sessionStorage.setItem(key, str);
    localStorage.setItem(key, str);
    localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, sessionId);
    sessionStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, sessionId);
  } catch (err) {
    console.warn("Failed to save session locally:", err);
  }
}

export type GenerationSuccessResult = {
  assistantMsg: Message;
  updatedBlueprint: BuyerBlueprint | null;
  requestedHandoff: "deck" | "offer" | null;
  updatedAnswers: WebinarAnswers;
  nextStep: number;
};

export type GenerationErrorResult = {
  errorMsg: Message;
  reason: string;
};

export type ChatEventListener = {
  onStart?: () => void;
  onSuccess?: (result: GenerationSuccessResult) => void;
  onError?: (err: GenerationErrorResult) => void;
  onComplete?: () => void;
};

interface ActiveGeneration {
  sessionId: string;
  controller: AbortController;
  userMsg: Message;
  startedAt: number;
}

const GENERATION_CHANGE_EVENT = "webinarkit:generation-change";

class ChatService {
  private activeGenerations = new Map<string, ActiveGeneration>();
  private listeners = new Map<string, Set<ChatEventListener>>();
  private recentCompletions = new Map<string, { timestamp: number; result: GenerationSuccessResult }>();

  isGenerating(sessionId: string): boolean {
    return this.activeGenerations.has(sessionId);
  }

  isAnyGenerating(): boolean {
    return this.activeGenerations.size > 0;
  }

  private dispatchGlobalChange() {
    if (typeof window !== "undefined") {
      try {
        window.dispatchEvent(
          new CustomEvent(GENERATION_CHANGE_EVENT, {
            detail: { isGenerating: this.isAnyGenerating() },
          })
        );
      } catch {}
    }
  }

  subscribe(sessionId: string, listener: ChatEventListener): () => void {
    if (!this.listeners.has(sessionId)) {
      this.listeners.set(sessionId, new Set());
    }
    this.listeners.get(sessionId)!.add(listener);

    // If currently generating, notify start immediately
    if (this.activeGenerations.has(sessionId)) {
      listener.onStart?.();
    } else {
      // If completed within the last 5 seconds, catch up the subscriber
      const recent = this.recentCompletions.get(sessionId);
      if (recent && Date.now() - recent.timestamp < 5000) {
        listener.onSuccess?.(recent.result);
      }
    }

    return () => {
      const set = this.listeners.get(sessionId);
      if (set) {
        set.delete(listener);
        if (set.size === 0) {
          this.listeners.delete(sessionId);
        }
      }
    };
  }

  private notify(sessionId: string, action: (l: ChatEventListener) => void) {
    const set = this.listeners.get(sessionId);
    if (set) {
      set.forEach((listener) => {
        try {
          action(listener);
        } catch (e) {
          console.error("Error in chat listener callback:", e);
        }
      });
    }
  }

  async sendMessage(params: {
    sessionId: string;
    text: string;
    userMsg: Message;
    currentMessages: Message[];
    answers: WebinarAnswers;
    step: number;
    result: BuyerBlueprint | null;
    assetContext: string;
    userId: string;
    userToken: string;
    docId?: string;
  }): Promise<void> {
    const {
      sessionId,
      text,
      userMsg,
      currentMessages,
      answers,
      step,
      result,
      assetContext,
      userId,
      userToken,
      docId,
    } = params;

    // If already generating for this session, ignore duplicate send
    if (this.activeGenerations.has(sessionId)) {
      return;
    }

    const nextMessages = [...currentMessages, userMsg];
    const controller = new AbortController();
    this.activeGenerations.set(sessionId, {
      sessionId,
      controller,
      userMsg,
      startedAt: Date.now(),
    });

    this.dispatchGlobalChange();
    this.notify(sessionId, (l) => l.onStart?.());

    // Save initial user message & generating status locally
    saveSessionLocally(sessionId, {
      session_id: sessionId,
      messages: nextMessages,
      answers,
      step,
      draft: "",
      blueprint: result,
      status: "generating",
    });

    const isInitiateBuild =
      text.includes("[SYSTEM COMMAND: INITIATE BUILD]") ||
      /initiate build/i.test(text) ||
      /synthesize/i.test(text);
    const isBlueprintRequest =
      isInitiateBuild ||
      /\b(blueprint|persona|synthesize|generate blueprint|create blueprint|buyer profile|avatar profile|slide outline|presentation outline)\b/i.test(text);

    const timeoutId = window.setTimeout(() => controller.abort(), 120_000);

    try {
      const response = await fetch(n8nWebhookUrl("avatar-iq"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          session_id: sessionId,
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

      const assistantReplyText = chat.reply;
      const updatedBlueprint: BuyerBlueprint | null = chat.blueprint || result;
      const requestedHandoff = chat.handoff;
      const updatedAnswers: WebinarAnswers = chat.answers || answers;
      const nextStep: number = chat.step || step;

      if (updatedBlueprint) {
        if (typeof window !== "undefined") {
          sessionStorage.setItem("astrocraft:latest-blueprint", JSON.stringify(updatedBlueprint));
        }
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
            source_session_id: sessionId,
          });
        }
      }

      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        role: "assistant",
        text: assistantReplyText,
        timestamp: new Date().toISOString(),
      };

      const finalMessages = [...nextMessages, assistantMsg];

      // Save locally
      saveSessionLocally(sessionId, {
        session_id: sessionId,
        messages: finalMessages,
        answers: updatedAnswers,
        step: nextStep,
        draft: "",
        blueprint: updatedBlueprint,
        status: updatedBlueprint ? "completed" : "draft",
      });

      // Directly persist to Firestore so navigating away never drops state
      if (userId) {
        const firestoreDocId = docId || sessionId;
        void setDoc(
          doc(db, "blueprint_sessions", firestoreDocId),
          {
            session_id: sessionId,
            owner_id: userId,
            status: updatedBlueprint ? "completed" : "draft",
            step: nextStep,
            answers: updatedAnswers,
            messages: finalMessages,
            draft: "",
            blueprint: updatedBlueprint,
            last_error: null,
            updated_at: new Date().toISOString(),
          },
          { merge: true }
        ).catch((err) => console.warn("Failed to persist blueprint session to Firestore from ChatService:", err));
      }

      const successResult: GenerationSuccessResult = {
        assistantMsg,
        updatedBlueprint,
        requestedHandoff,
        updatedAnswers,
        nextStep,
      };

      this.recentCompletions.set(sessionId, {
        timestamp: Date.now(),
        result: successResult,
      });

      this.notify(sessionId, (l) => l.onSuccess?.(successResult));
    } catch (error) {
      let reason = error instanceof Error ? error.message : "Could not process message.";
      if (error instanceof DOMException && error.name === "AbortError") {
        reason = "Webinar Chat timed out. Please try again.";
      }

      const errorMsg: Message = {
        id: `e-${Date.now()}`,
        role: "assistant",
        text: `${reason}\n\nYour message was not answered. Please try sending it again.`,
        timestamp: new Date().toISOString(),
      };

      const finalMessages = [...nextMessages, errorMsg];

      saveSessionLocally(sessionId, {
        session_id: sessionId,
        messages: finalMessages,
        answers,
        step,
        draft: "",
        blueprint: result,
        status: "failed",
      });

      if (userId) {
        const firestoreDocId = docId || sessionId;
        void setDoc(
          doc(db, "blueprint_sessions", firestoreDocId),
          {
            session_id: sessionId,
            owner_id: userId,
            status: "failed",
            step,
            answers,
            messages: finalMessages,
            draft: "",
            blueprint: result,
            last_error: reason,
            updated_at: new Date().toISOString(),
          },
          { merge: true }
        ).catch((err) => console.warn("Failed to persist error session to Firestore from ChatService:", err));
      }

      const errorResult: GenerationErrorResult = {
        errorMsg,
        reason,
      };
      this.notify(sessionId, (l) => l.onError?.(errorResult));
    } finally {
      window.clearTimeout(timeoutId);
      this.activeGenerations.delete(sessionId);
      this.dispatchGlobalChange();
      this.notify(sessionId, (l) => l.onComplete?.());
    }
  }
}

export const chatService = new ChatService();

export function useChatGenerating(): boolean {
  const [generating, setGenerating] = useState(() => (typeof window !== "undefined" ? chatService.isAnyGenerating() : false));

  useEffect(() => {
    const handleGenChange = () => {
      setGenerating(chatService.isAnyGenerating());
    };

    window.addEventListener(GENERATION_CHANGE_EVENT, handleGenChange);
    return () => {
      window.removeEventListener(GENERATION_CHANGE_EVENT, handleGenChange);
    };
  }, []);

  return generating;
}
