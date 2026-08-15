"use client";

import { useState } from "react";
import { Bot, Mic, Paperclip, Send } from "lucide-react";

type ChatMessage = {
  id: number;
  sender: "assistant" | "user";
  text: string;
};

const initialMessages: ChatMessage[] = [
  {
    id: 1,
    sender: "assistant",
    text: "Hi, I’m AvatarCraft 👏 Let’s build your Ideal Buyer Blueprint today. I’ll ask you 4 quick questions about your business, then I’ll scan the internet for fresh insights to make it really pop. Ready?",
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
    };

    const assistantMessage: ChatMessage = {
      id: Date.now() + 1,
      sender: "assistant",
      text: `Absolutely — I’ve noted that and will use it to sharpen your Ideal Buyer Blueprint. Let’s build on this with the next detail so the strategy feels precise, relevant, and conversion-ready.`,
    };

    setMessages((currentMessages) => [
      ...currentMessages,
      userMessage,
      assistantMessage,
    ]);
    setPrompt("");
  };

  return (
    <div className="min-h-screen bg-slate-100/60 px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex flex-col items-center justify-center text-center">
          <div className="relative">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/20">
              <Bot className="h-8 w-8 text-white" />
            </div>
            <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white bg-emerald-500" />
          </div>

          <h1 className="mt-4 text-2xl font-bold text-slate-900">
            AvatarCraft
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            AvatarCraft builds your Ideal Buyer Blueprint in minutes!
          </p>
        </header>

        <main className="mx-auto max-w-2xl pb-28">
          <div className="space-y-6">
            {messages.map((message, index) => (
              <div
                key={message.id || `${message.sender}-${index}`}
                className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.sender === "assistant" ? (
                  <div className="flex max-w-xl items-end gap-3">
                    <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-sm">
                      <Bot className="h-4 w-4 text-white" />
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700 shadow-sm">
                      {message.text}
                    </div>
                  </div>
                ) : (
                  <div className="max-w-[75%] rounded-2xl bg-emerald-500 px-4 py-3 text-sm leading-6 text-white shadow-sm">
                    {message.text}
                  </div>
                )}
              </div>
            ))}
          </div>
        </main>

        <div className="fixed inset-x-0 bottom-0 z-20 px-4 pb-6">
          <div className="mx-auto max-w-2xl">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-3 rounded-[28px] border-2 border-emerald-500 bg-white px-4 py-3 shadow-[0_18px_45px_rgba(16,185,129,0.18)]"
            >
              <div className="flex items-center gap-2 text-emerald-600">
                <button
                  type="button"
                  aria-label="Voice input"
                  className="rounded-full p-1.5 transition-colors hover:text-emerald-700"
                >
                  <Mic className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Attach file"
                  className="rounded-full p-1.5 transition-colors hover:text-emerald-700"
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
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500 text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-emerald-300"
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
