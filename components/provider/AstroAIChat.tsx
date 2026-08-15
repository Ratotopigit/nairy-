"use client";

import { useState } from "react";
import { Mic, Paperclip, Send } from "lucide-react";

type ChatMessage = {
  id: number;
  sender: "assistant" | "user";
  text: string;
  timestamp?: string;
};

const initialMessages: ChatMessage[] = [
  {
    id: 1,
    sender: "assistant",
    text: "Hi, I’m AvatarCraft 👏 Let’s build your Ideal Buyer Blueprint today. I’ll ask you 4 quick questions about your business, then I’ll scan the internet for fresh insights to make it really pop. Ready?",
    timestamp: "Just now",
  },
];

export default function AstroAIChat() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [prompt, setPrompt] = useState("");

  const handleSend = () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now(),
      sender: "user",
      text: trimmedPrompt,
      timestamp: "Just now",
    };

    const assistantMessage: ChatMessage = {
      id: Date.now() + 1,
      sender: "assistant",
      text: `Absolutely — I've noted that and will use it to sharpen your Ideal Buyer Blueprint. Let's build on this with the next detail so the strategy feels precise, relevant, and conversion-ready.`,
      timestamp: "Just now",
    };

    setMessages((currentMessages) => [
      ...currentMessages,
      userMessage,
      assistantMessage,
    ]);
    setPrompt("");
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-white via-emerald-50/30 to-white overflow-hidden">
      {/* Decorative wavy background SVG */}
      <svg
        className="absolute bottom-0 left-0 right-0 w-full opacity-20 pointer-events-none"
        viewBox="0 0 1440 200"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="waveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#059669" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        <path
          fill="url(#waveGradient)"
          d="M0,100 Q360,50 720,100 T1440,100 L1440,200 L0,200 Z"
        />
        <path
          fill="url(#waveGradient)"
          d="M0,120 Q360,80 720,120 T1440,120 L1440,200 L0,200 Z"
          opacity="0.6"
        />
      </svg>

      <div className="relative z-10 mx-auto max-w-4xl px-4 py-8">
        <header className="mb-8 flex flex-col items-center justify-center text-center">
          <h1 className="text-4xl font-bold text-slate-900">AvatarCraft</h1>
          <p className="mt-2 text-sm text-slate-600">
            AvatarCraft builds your Ideal Buyer Blueprint in minutes!
          </p>

          {/* Status badge */}
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 border border-emerald-200/60">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-emerald-700">Online</span>
          </div>
        </header>

        <main className="mx-auto max-w-2xl pb-40">
          <div className="space-y-6">
            {messages.map((message, index) => (
              <div
                key={message.id || `${message.sender}-${index}`}
                className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.sender === "assistant" ? (
                  <div className="flex max-w-2xl flex-col">
                    <div className="rounded-3xl border border-emerald-200/80 bg-white/90 px-6 py-4 text-sm leading-6 text-slate-700 shadow-sm backdrop-blur-sm">
                      {message.text}
                    </div>
                    {message.timestamp && (
                      <p className="mt-2 ml-1 text-xs text-slate-400">
                        {message.timestamp}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="max-w-[70%] rounded-3xl bg-emerald-500 px-6 py-4 text-sm leading-6 text-white shadow-md">
                    {message.text}
                  </div>
                )}
              </div>
            ))}
          </div>
        </main>

        <div className="fixed inset-x-0 bottom-0 z-20 px-4 pb-8">
          <div className="mx-auto max-w-2xl">
            {/* Tips footer */}
            <div className="mb-4 text-center">
              <p className="text-xs text-slate-500">
                ✨ Tips: Be specific for better results
              </p>
            </div>

            {/* Input bar */}
            <form
              onSubmit={(event) => {
                event.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-3 rounded-full border border-emerald-300 bg-white px-5 py-3 shadow-[0_12px_30px_rgba(16,185,129,0.12)] backdrop-blur-sm"
            >
              <div className="flex items-center gap-2 text-emerald-600">
                <button
                  type="button"
                  aria-label="Voice input"
                  className="rounded-full p-2 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
                >
                  <Mic className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Attach file"
                  className="rounded-full p-2 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
                >
                  <Paperclip className="h-4 w-4" />
                </button>
              </div>

              <input
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Ask anything..."
                className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
              />

              <button
                type="submit"
                disabled={!prompt.trim()}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
