"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  brandId?: string;
  /** Accent style for the list page header */
  variant?: "accent" | "outline";
  label?: string;
};

export function RunMonitoringButton({
  brandId,
  variant = "outline",
  label = "Run monitoring",
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/brands/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(brandId ? { brandId } : {}),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        mentionsUpserted?: number;
        commentsUpserted?: number;
        brandsProcessed?: number;
        skippedOwn?: number;
        byPlatform?: Record<string, number>;
      };

      if (!res.ok || !data.ok) {
        setMessage(data.error ?? "Scan failed");
        setBusy(false);
        return;
      }

      const platformBits = data.byPlatform
        ? Object.entries(data.byPlatform)
            .map(([p, n]) => `${p}: ${n}`)
            .join(", ")
        : "";

      setMessage(
        `Found ${data.mentionsUpserted ?? 0} mentions` +
          (data.commentsUpserted ? `, ${data.commentsUpserted} comments` : "") +
          (data.skippedOwn ? ` (${data.skippedOwn} own posts skipped)` : "") +
          (platformBits ? `. ${platformBits}` : "") +
          ".",
      );
      router.refresh();
    } catch {
      setMessage("Scan failed — try again.");
    }
    setBusy(false);
  }

  const className =
    variant === "accent"
      ? "bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-ink)] transition hover:opacity-90 disabled:opacity-50"
      : "border border-[var(--paper-muted)] px-3 py-1.5 text-xs text-[var(--paper)] transition hover:border-[var(--paper)] disabled:opacity-50";

  return (
    <div className="flex flex-col items-end gap-1">
      <button type="button" onClick={run} disabled={busy} className={className}>
        {busy ? "Scanning…" : label}
      </button>
      {message && (
        <span className="max-w-[16rem] text-right text-[11px] text-[var(--paper-muted)]">
          {message}
        </span>
      )}
    </div>
  );
}
