"use client";

import { useState } from "react";

type Props = {
  src?: string | null;
  alt?: string;
  className?: string;
};

/** Proxies platform CDN thumbs and falls back gracefully when they fail. */
export function ProxiedThumb({ src, alt = "", className }: Props) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex items-center justify-center bg-[var(--ink-muted)] text-xs text-[var(--fog)] ${className ?? ""}`}
      >
        No thumb
      </div>
    );
  }

  const proxied = `/api/thumb?u=${encodeURIComponent(src)}`;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={proxied}
      alt={alt}
      referrerPolicy="no-referrer"
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
