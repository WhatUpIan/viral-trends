/**
 * Canonicalize mention URLs so the same post from different keyword runs
 * or providers doesn't land as multiple rows.
 */
export function normalizeMentionUrl(raw: string): string {
  try {
    const u = new URL(raw.trim());
    u.hash = "";
    u.protocol = "https:";
    u.hostname = u.hostname.replace(/^www\./, "").toLowerCase();

    // Drop tracking / share noise
    const drop = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "si",
      "feature",
      "ref",
      "fbclid",
      "igshid",
      "igsh",
      "_r",
      "u_code",
      "preview_pb",
      "sharer_language",
      "_d",
      "share_item_id",
      "source",
      "pp",
      "t",
    ];
    for (const key of drop) u.searchParams.delete(key);

    // TikTok: keep /@user/video/ID
    if (u.hostname.includes("tiktok.com")) {
      const m = u.pathname.match(/(@[^/]+\/video\/\d+)/);
      if (m) {
        u.pathname = `/${m[1]}`;
        u.search = "";
      }
    }

    // YouTube: canonicalize to watch?v=ID or shorts/ID
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.replace(/^\//, "").split("/")[0];
      if (id) return `https://youtube.com/watch?v=${id}`;
    }
    if (u.hostname.includes("youtube.com")) {
      const shorts = u.pathname.match(/\/shorts\/([^/?]+)/);
      if (shorts?.[1]) return `https://youtube.com/shorts/${shorts[1]}`;
      const v = u.searchParams.get("v");
      if (v) return `https://youtube.com/watch?v=${v}`;
    }

    // Instagram: strip trailing slash / query
    if (u.hostname.includes("instagram.com")) {
      u.pathname = u.pathname.replace(/\/+$/, "") || "/";
      u.search = "";
    }

    // Reddit: drop tracking, keep path
    if (u.hostname.includes("reddit.com")) {
      u.pathname = u.pathname.replace(/\/+$/, "");
      u.search = "";
    }

    let out = u.toString();
    if (out.endsWith("/") && u.pathname !== "/") out = out.slice(0, -1);
    return out;
  } catch {
    return raw.trim();
  }
}

/** Fingerprint for content-level dedupe when URLs still differ. */
export function mentionContentKey(m: {
  platform: string | null;
  external_id?: string | null;
  url: string;
  title?: string | null;
  author?: string | null;
}): string {
  if (m.external_id && m.platform) {
    return `${m.platform}:${m.external_id}`.toLowerCase();
  }
  const title = (m.title ?? "").toLowerCase().replace(/\s+/g, " ").trim().slice(0, 120);
  const author = (m.author ?? "").toLowerCase().replace(/^@/, "");
  if (title.length > 20) {
    return `${m.platform ?? "web"}:${author}:${title}`;
  }
  return `url:${normalizeMentionUrl(m.url)}`;
}

export function commentDedupeKey(c: {
  author: string | null;
  text: string;
  publishedAt: string | null;
  externalId?: string | null;
}): string {
  if (c.externalId) return `ext:${c.externalId}`;
  const author = (c.author ?? "").toLowerCase().replace(/^@/, "");
  const text = c.text.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 200);
  const when = c.publishedAt ?? "";
  return `${author}|${when}|${text}`;
}
