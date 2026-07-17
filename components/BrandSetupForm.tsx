"use client";

import type { BrandResearchResult } from "@/lib/brand-research";
import { SOCIAL_PLATFORMS } from "@/lib/mentions/own-account";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Step = "input" | "researching" | "review";

export function BrandSetupForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("input");
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [profile, setProfile] = useState<BrandResearchResult | null>(null);
  const [creating, setCreating] = useState(false);

  async function runResearch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Brand name is required.");
      return;
    }
    if (!website.trim()) {
      setError("Website URL is required.");
      return;
    }

    setStep("researching");
    try {
      const res = await fetch("/api/brands/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), website: website.trim() }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        result?: BrandResearchResult;
      };

      if (!res.ok || !data.ok || !data.result) {
        setError(data.error ?? "Could not research this brand. Try again.");
        setStep("input");
        return;
      }

      setProfile(data.result);
      setStep("review");
    } catch {
      setError("Network error — check your connection and try again.");
      setStep("input");
    }
  }

  async function createBrand(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!profile) return;

    setCreating(true);
    setError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("name", profile.name);
    formData.set("website", profile.website);
    formData.set("description", profile.description);
    formData.set("keywords", JSON.stringify(profile.keywords));
    formData.set("negativeKeywords", JSON.stringify(profile.negativeKeywords));
    formData.set("metadata", JSON.stringify(profile.metadata));

    for (const { id } of SOCIAL_PLATFORMS) {
      const handle = formData.get(`${id}_handle`);
      if (typeof handle === "string") {
        formData.set(`${id}_handle`, handle);
      }
    }

    try {
      const res = await fetch("/api/brands/create", {
        method: "POST",
        body: formData,
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; brandId?: string };

      if (!res.ok || !data.ok || !data.brandId) {
        setError(data.error ?? "Could not create brand.");
        setCreating(false);
        return;
      }

      router.push(`/brands/${data.brandId}`);
      router.refresh();
    } catch {
      setError("Could not create brand — try again.");
      setCreating(false);
    }
  }

  function updateSocial(platform: string, handle: string) {
    if (!profile) return;
    const rest = profile.socialAccounts.filter((a) => a.platform !== platform);
    const next = handle.trim()
      ? [...rest, { platform: platform as BrandResearchResult["socialAccounts"][0]["platform"], handle: handle.replace(/^@+/, "") }]
      : rest;
    setProfile({ ...profile, socialAccounts: next });
  }

  function socialHandle(platform: string): string {
    return profile?.socialAccounts.find((a) => a.platform === platform)?.handle ?? "";
  }

  if (step === "input" || step === "researching") {
    return (
      <form onSubmit={runResearch} className="space-y-5">
        {error && (
          <p className="border border-[var(--heat)] px-4 py-2 text-sm text-[var(--heat)]">{error}</p>
        )}

        <div>
          <label htmlFor="name" className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--fog)]">
            Brand name *
          </label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={step === "researching"}
            className="auth-input"
            placeholder="Acme Coffee"
          />
        </div>

        <div>
          <label htmlFor="website" className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--fog)]">
            Website URL *
          </label>
          <input
            id="website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            required
            disabled={step === "researching"}
            className="auth-input"
            placeholder="https://acmecoffee.com"
          />
          <p className="mt-1 text-xs text-[var(--fog)]">
            We&apos;ll scan this page and use AI to compile your brand profile, social handles, and 20 monitoring keywords.
          </p>
        </div>

        <button type="submit" disabled={step === "researching"} className="btn-primary">
          {step === "researching" ? "Researching brand…" : "Research brand"}
        </button>

        {step === "researching" && (
          <p className="text-sm text-[var(--fog)]">
            Fetching your website, searching the web, and compiling keywords. This usually takes 10–20 seconds.
          </p>
        )}
      </form>
    );
  }

  if (!profile) return null;

  return (
    <form onSubmit={createBrand} className="space-y-8">
      {error && (
        <p className="border border-[var(--heat)] px-4 py-2 text-sm text-[var(--heat)]">{error}</p>
      )}

      <div className="border border-[var(--line)] bg-white p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--fog)]">AI research complete</p>
        <p className="mt-1 text-sm text-[var(--ink-soft)]">
          Review and edit anything before saving. Sources: {profile.sources.join(", ")}
        </p>
        <button
          type="button"
          onClick={() => {
            setStep("input");
            setProfile(null);
          }}
          className="mt-3 text-xs text-[var(--fog)] underline hover:text-[var(--ink)]"
        >
          Start over with a different URL
        </button>
      </div>

      <section className="space-y-4">
        <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">Brand details</h2>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--fog)]">
            Brand name
          </label>
          <input
            value={profile.name}
            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            required
            className="auth-input"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--fog)]">
            Website
          </label>
          <input
            value={profile.website}
            onChange={(e) => setProfile({ ...profile, website: e.target.value })}
            className="auth-input"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--fog)]">
            Description
          </label>
          <textarea
            value={profile.description}
            onChange={(e) => setProfile({ ...profile, description: e.target.value })}
            rows={4}
            className="auth-input resize-y"
          />
        </div>
      </section>

      {(profile.metadata.industry ||
        profile.metadata.tagline ||
        profile.metadata.targetAudience ||
        profile.metadata.headquarters ||
        (profile.metadata.products?.length ?? 0) > 0 ||
        (profile.metadata.competitors?.length ?? 0) > 0 ||
        profile.metadata.notes) && (
        <section className="space-y-3">
          <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
            Brand intelligence
          </h2>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            {profile.metadata.industry && (
              <div>
                <dt className="text-xs uppercase tracking-wide text-[var(--fog)]">Industry</dt>
                <dd>{profile.metadata.industry}</dd>
              </div>
            )}
            {profile.metadata.tagline && (
              <div>
                <dt className="text-xs uppercase tracking-wide text-[var(--fog)]">Tagline</dt>
                <dd>{profile.metadata.tagline}</dd>
              </div>
            )}
            {profile.metadata.targetAudience && (
              <div>
                <dt className="text-xs uppercase tracking-wide text-[var(--fog)]">Audience</dt>
                <dd>{profile.metadata.targetAudience}</dd>
              </div>
            )}
            {profile.metadata.headquarters && (
              <div>
                <dt className="text-xs uppercase tracking-wide text-[var(--fog)]">Headquarters</dt>
                <dd>{profile.metadata.headquarters}</dd>
              </div>
            )}
            {(profile.metadata.products?.length ?? 0) > 0 && (
              <div className="sm:col-span-2">
                <dt className="text-xs uppercase tracking-wide text-[var(--fog)]">Products</dt>
                <dd>{profile.metadata.products?.join(" · ")}</dd>
              </div>
            )}
            {(profile.metadata.competitors?.length ?? 0) > 0 && (
              <div className="sm:col-span-2">
                <dt className="text-xs uppercase tracking-wide text-[var(--fog)]">Competitors</dt>
                <dd>{profile.metadata.competitors?.join(" · ")}</dd>
              </div>
            )}
            {profile.metadata.notes && (
              <div className="sm:col-span-2">
                <dt className="text-xs uppercase tracking-wide text-[var(--fog)]">Notes</dt>
                <dd>{profile.metadata.notes}</dd>
              </div>
            )}
          </dl>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
          Official social accounts
        </h2>
        <p className="text-sm text-[var(--fog)]">
          Detected from your website — edit if needed. We skip your own posts during monitoring.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {SOCIAL_PLATFORMS.map(({ id, label, placeholder }) => (
            <div key={id}>
              <label htmlFor={`${id}_handle`} className="mb-1 block text-xs font-medium text-[var(--fog)]">
                {label}
              </label>
              <input
                id={`${id}_handle`}
                name={`${id}_handle`}
                value={socialHandle(id)}
                onChange={(e) => updateSocial(id, e.target.value)}
                className="auth-input"
                placeholder={placeholder}
                autoComplete="off"
              />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
          Monitoring keywords ({profile.keywords.length})
        </h2>
        <p className="text-sm text-[var(--fog)]">One per line — edit freely before saving.</p>
        <textarea
          value={profile.keywords.join("\n")}
          onChange={(e) =>
            setProfile({
              ...profile,
              keywords: e.target.value
                .split("\n")
                .map((k) => k.trim())
                .filter(Boolean),
            })
          }
          rows={8}
          className="auth-input resize-y font-mono text-sm"
        />
      </section>

      {profile.negativeKeywords.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
            Negative keywords ({profile.negativeKeywords.length})
          </h2>
          <p className="text-sm text-[var(--fog)]">
            Filter out irrelevant mentions (homonyms, unrelated topics).
          </p>
          <textarea
            value={profile.negativeKeywords.join("\n")}
            onChange={(e) =>
              setProfile({
                ...profile,
                negativeKeywords: e.target.value
                  .split("\n")
                  .map((k) => k.trim())
                  .filter(Boolean),
              })
            }
            rows={4}
            className="auth-input resize-y font-mono text-sm"
          />
        </section>
      )}

      <button type="submit" disabled={creating} className="btn-primary">
        {creating ? "Creating brand…" : "Save brand & start monitoring"}
      </button>
    </form>
  );
}
