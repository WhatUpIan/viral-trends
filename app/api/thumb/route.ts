import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_HOST_HINTS = [
  "tiktokcdn",
  "tiktok.com",
  "instagram.com",
  "cdninstagram",
  "fbcdn",
  "ytimg.com",
  "ggpht.com",
  "googleusercontent.com",
  "twimg.com",
  "redd.it",
  "redditmedia",
  "supabase",
];

/**
 * Proxies platform CDN thumbnails so the browser doesn't hit hotlink/Referer blocks.
 * Signed TikTok URLs may still expire — callers should prefer stable YouTube ytimg URLs.
 */
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("u");
  if (!raw) {
    return NextResponse.json({ error: "Missing u" }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  if (target.protocol !== "https:") {
    return NextResponse.json({ error: "HTTPS only" }, { status: 400 });
  }

  const host = target.hostname.toLowerCase();
  if (!ALLOWED_HOST_HINTS.some((h) => host.includes(h))) {
    return NextResponse.json({ error: "Host not allowed" }, { status: 403 });
  }

  try {
    const upstream = await fetch(target.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        Referer: target.origin + "/",
      },
      signal: AbortSignal.timeout(8_000),
      redirect: "follow",
    });

    if (!upstream.ok) {
      return new NextResponse(null, { status: upstream.status === 404 ? 404 : 502 });
    }

    const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ error: "Not an image" }, { status: 415 });
    }

    const buffer = await upstream.arrayBuffer();
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}
