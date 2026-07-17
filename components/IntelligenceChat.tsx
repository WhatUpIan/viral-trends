"use client";

import { useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

type Props = {
  /** API endpoint that accepts { question, history } */
  endpoint: string;
  /** Extra body fields (e.g. type + slug for entity chat) */
  bodyExtras?: Record<string, string>;
  placeholder?: string;
  suggestions?: string[];
  title?: string;
};

export function IntelligenceChat({
  endpoint,
  bodyExtras = {},
  placeholder = "Ask a question…",
  suggestions = [],
  title = "Ask AI",
}: Props) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(question: string) {
    const q = question.trim();
    if (!q || busy) return;

    setBusy(true);
    setError(null);
    const nextHistory = [...messages, { role: "user" as const, content: q }];
    setMessages(nextHistory);
    setInput("");

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, history: nextHistory, ...bodyExtras }),
      });
      const data = (await res.json()) as { answer?: string; error?: string };
      if (!res.ok || !data.answer) {
        setError(data.error ?? "Could not get an answer");
        setBusy(false);
        return;
      }
      setMessages([...nextHistory, { role: "assistant", content: data.answer }]);
    } catch {
      setError("Network error — try again.");
    }
    setBusy(false);
  }

  return (
    <div className="border border-[var(--line)] bg-white">
      <div className="border-b border-[var(--line)] px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--fog)]">
          {title}
        </p>
      </div>

      {suggestions.length > 0 && messages.length === 0 && (
        <div className="flex flex-wrap gap-2 border-b border-[var(--line)] px-4 py-3">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => send(s)}
              className="border border-[var(--line)] px-2.5 py-1 text-xs text-[var(--ink-soft)] transition hover:border-[var(--ink)] hover:text-[var(--ink)]"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="max-h-80 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <p className="text-sm text-[var(--fog)]">Ask anything — answers use your live intel context.</p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`text-sm leading-relaxed ${
              m.role === "user"
                ? "ml-8 border-l-2 border-[var(--ink)] pl-3 text-[var(--ink)]"
                : "mr-4 text-[var(--ink-soft)] whitespace-pre-wrap"
            }`}
          >
            {m.content}
          </div>
        ))}
        {busy && <p className="text-xs text-[var(--fog)]">Thinking…</p>}
        {error && <p className="text-xs text-[var(--heat)]">{error}</p>}
      </div>

      <form
        className="flex gap-2 border-t border-[var(--line)] p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="auth-input flex-1"
          placeholder={placeholder}
          disabled={busy}
        />
        <button type="submit" disabled={busy || !input.trim()} className="btn-primary shrink-0">
          Ask
        </button>
      </form>
    </div>
  );
}
