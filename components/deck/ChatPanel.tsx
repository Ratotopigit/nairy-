import { useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";

export type ChatMessage = { id: string; role: "user" | "assistant"; text: string };

type Props = {
  messages: ChatMessage[];
  busy: boolean;
  hasContent: boolean;
  onSend: (text: string) => void;
  onUseIdea?: (text: string, build?: boolean) => void;
};

const SUGGESTIONS = [
  "Brainstorm 10 strong presentation angles",
  "Give me hooks using my saved business and brand assets",
  "Create a webinar idea with opening, teaching, offer, and Q&A",
  "Turn my uploaded brand context into a sharp sales deck idea",
];

export function ChatPanel({ messages, busy, hasContent, onSend, onUseIdea }: Props) {
  const [value, setValue] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  const submit = (text: string) => {
    const t = text.trim();
    if (!t || busy) return;
    onSend(t);
    setValue("");
  };

  return (
    <aside className="hidden w-[320px] shrink-0 flex-col border-l border-border bg-card xl:flex">
      <div className="flex h-11 shrink-0 items-center border-b border-border px-4 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
        Creation director
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <p className="font-serif text-[15px] leading-relaxed text-muted-foreground">
            {hasContent
              ? "Ask for a specific edit. I know the selected slide, your saved business, audience, offer, and deck structure."
              : "Brainstorm here. I already know your saved business, audience, offer, quotes, logo, and brand assets. When an idea is ready, send it into Content Maker."}
          </p>
        ) : null}


        {messages.map((m) => (
          <div key={m.id} className={m.role === "user" ? "flex justify-end" : ""}>
            <div
              className={
                m.role === "user"
                  ? "max-w-[86%] rounded-[12px] rounded-br-[4px] bg-secondary px-3 py-2 text-[13px] leading-relaxed text-foreground"
                  : "max-w-[92%] text-[13px] leading-relaxed text-foreground"
              }
            >
              <p className="whitespace-pre-line">{m.text}</p>
              {!hasContent && m.role === "assistant" && onUseIdea ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => onUseIdea(m.text)}
                    className="rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                  >
                    Add to brief
                  </button>
                  <button
                    type="button"
                    onClick={() => onUseIdea(m.text, true)}
                    className="rounded-full bg-foreground px-2.5 py-1 text-[11px] font-medium text-background"
                  >
                    Build from this
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ))}

        {busy ? (
          <div className="flex items-center gap-2.5 rounded-xl border border-border bg-background px-3 py-2.5 text-[12px] text-muted-foreground" role="status">
            <span className="flex h-4 items-end gap-0.5" aria-hidden="true">
              {[0, 1, 2, 3].map((index) => (
                <span key={index} className="generation-bar w-0.5 rounded-full bg-accent" style={{ animationDelay: `${index * 110}ms` }} />
              ))}
            </span>
            {hasContent ? "Applying your instruction to the deck" : "Thinking through the idea"}
          </div>
        ) : null}
        <div ref={endRef} />
      </div>

      {messages.length === 0 ? (
        <div className="flex flex-wrap gap-1.5 px-4 pb-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => submit(s)}
              className="rounded-full border border-border px-2.5 py-1 text-[11.5px] text-muted-foreground transition-colors duration-150 hover:border-accent hover:text-foreground"
            >
              {s}
            </button>
          ))}
        </div>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(value);
        }}
        className="shrink-0 border-t border-border p-3"
      >
        <div className="flex items-end gap-2 rounded-[12px] border border-border bg-background p-2 focus-within:border-accent">
          <textarea
            value={value}
            rows={2}
            placeholder={hasContent ? "Ask for a deck edit..." : "Brainstorm an idea..."}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit(value);
              }
            }}
            className="max-h-32 min-h-0 w-full resize-none bg-transparent text-[13px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/70"
          />
          <button
            type="submit"
            disabled={busy || !value.trim()}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-foreground text-background transition-opacity duration-150 disabled:opacity-30"
            aria-label="Send message"
          >
            <ArrowUp className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>
      </form>
    </aside>
  );
}
