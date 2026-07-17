import { AppShell } from "@/components/AppShell";
import { IntelligenceChat } from "@/components/IntelligenceChat";
import { getGreetingName } from "@/lib/greeting";
import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Assistant — Signalbrief" };

export default async function AssistantPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/assistant");
  const name = await getGreetingName();

  return (
    <AppShell pathname="/assistant" greetingName={name}>
      <div className="mx-auto max-w-2xl px-5 py-8 sm:px-8">
        <header className="mb-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--fog)]">
            AI Assistant
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl tracking-tight text-[var(--ink)]">
            Ask Signalbrief
          </h1>
          <p className="mt-1 text-sm text-[var(--fog)]">
            Brand health, complaints, competitors, and which trend to join — answered from your live
            intel.
          </p>
        </header>

        <IntelligenceChat
          endpoint="/api/assistant"
          title="Conversation"
          placeholder="How is my brand doing?"
          suggestions={[
            "How is my brand doing?",
            "Summarize yesterday's risks",
            "Show complaints",
            "What trend should I join?",
            "Why is my competitor growing?",
          ]}
        />
      </div>
    </AppShell>
  );
}
