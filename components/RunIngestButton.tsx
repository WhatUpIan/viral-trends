"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  variant?: "primary" | "outline";
  label?: string;
};

export function RunIngestButton({
  variant = "outline",
  label = "Run daily ingest",
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/ingest", { method: "POST" });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        reportDate?: string;
        trendCount?: number;
        reportId?: string;
      };

      if (!res.ok || !data.ok) {
        setMessage(data.error ?? "Ingest failed");
        setBusy(false);
        return;
      }

      setMessage(
        `Report ${data.reportDate}: ${data.trendCount ?? 0} trends saved.` +
          " Trends, Database, and Opportunities will refresh.",
      );
      router.refresh();
    } catch {
      setMessage("Ingest failed — try again (may time out at 60s on Hobby).");
    }
    setBusy(false);
  }

  const className =
    variant === "primary"
      ? "bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-[var(--paper)] transition hover:opacity-90 disabled:opacity-50"
      : "border border-[var(--line)] px-3 py-1.5 text-xs text-[var(--ink)] transition hover:border-[var(--ink)] disabled:opacity-50";

  return (
    <div className="flex flex-col items-end gap-1">
      <button type="button" onClick={run} disabled={busy} className={className}>
        {busy ? "Ingesting… (up to 60s)" : label}
      </button>
      {message && (
        <span className="max-w-xs text-right text-[11px] text-[var(--fog)]">{message}</span>
      )}
    </div>
  );
}
