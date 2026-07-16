import type { TrendItem } from "./types";

/** Indic scripts commonly seen in India-market short-form captions */
const INDIC_SCRIPT =
  /[\u0900-\u097F\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF\u0B00-\u0B7F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F]/;

/** Non-US currency symbols in captions are a strong non-US signal */
const NON_US_CURRENCY = /[₹₨₦₱₩₫₴₺]/;

const INDIA_MARKERS =
  /#india\b|#indian\b|#bharat\b|#bollywood\b|#mumbai\b|#delhi\b|#chennai\b|#hyderabad\b|#kolkata\b|#bangalore\b|#bengaluru\b|#desi\b|#tollywood\b|#mollywood\b|#punjabi\b|#tamil\b|#telugu\b|#hindi\b|#indiatiktok\b|#exploreindia\b|#pakistan\b|#lahore\b|#karachi\b|#dubai\b|#philippines\b|#pinoy\b|#indonesia\b|#brazil\b|#mexico\b/i;

/** Common romanized Hindi / Urdu / Hinglish that appears in "US" feeds */
const ROMANIZED_SOUTH_ASIAN =
  /\b(hai|hain|nahi|kya|kyu|kyun|acha|accha|bahut|mera|meri|tumhara|aap|bhai|didi|yaar|dil|pyar|pyaar|shadi|shaadi|rehman|namaste|ly lo|le lo|dekh|dekho|batao|sunao|sweety|sweetpari|jaan|jaaneman|wala|wali)\b/i;

const NON_US_REGIONS = new Set([
  "in",
  "india",
  "pk",
  "pakistan",
  "bd",
  "bangladesh",
  "np",
  "nepal",
  "lk",
  "sri lanka",
  "id",
  "indonesia",
  "ph",
  "philippines",
  "vn",
  "vietnam",
  "th",
  "thailand",
  "br",
  "brazil",
  "mx",
  "mexico",
  "ng",
  "nigeria",
  "eg",
  "egypt",
  "sa",
  "saudi",
  "ae",
  "uae",
  "tr",
  "turkey",
]);

const NON_EN_LANGS = new Set([
  "hi",
  "hin",
  "hindi",
  "ta",
  "tamil",
  "te",
  "telugu",
  "bn",
  "bengali",
  "mr",
  "marathi",
  "gu",
  "gujarati",
  "kn",
  "kannada",
  "ml",
  "malayalam",
  "pa",
  "punjabi",
  "ur",
  "urdu",
  "id",
  "ms",
  "tl",
  "fil",
  "pt",
  "es",
  "ar",
  "tr",
]);

function readRawField(raw: unknown, key: string): string | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const obj = raw as Record<string, unknown>;
  const direct = obj[key];
  if (typeof direct === "string" && direct.trim()) return direct.trim();

  const author = obj.author;
  if (author && typeof author === "object") {
    const a = author as Record<string, unknown>;
    const nested = a[key];
    if (typeof nested === "string" && nested.trim()) return nested.trim();
  }
  return undefined;
}

function isLikelyNonUs(item: TrendItem): boolean {
  const text = `${item.title} ${item.soundOrFormat ?? ""} ${item.creatorHandle ?? ""}`;

  if (INDIC_SCRIPT.test(text)) return true;
  if (NON_US_CURRENCY.test(text)) return true;
  if (INDIA_MARKERS.test(text)) return true;
  if (ROMANIZED_SOUTH_ASIAN.test(text)) return true;

  const region = (
    readRawField(item.raw, "region") ??
    readRawField(item.raw, "country") ??
    readRawField(item.raw, "country_code")
  )?.toLowerCase();

  if (region) {
    if (region === "us" || region === "usa" || region === "united states") return false;
    if (NON_US_REGIONS.has(region)) return true;
  }

  const language = (
    readRawField(item.raw, "language") ?? readRawField(item.raw, "lang")
  )?.toLowerCase();

  if (language) {
    if (language === "en" || language.startsWith("en-")) return false;
    if (NON_EN_LANGS.has(language) || NON_EN_LANGS.has(language.split("-")[0] ?? "")) {
      return true;
    }
  }

  return false;
}

/** Best-effort US lean: drop Indic script, romanized Hinglish, and clear non-US locales. */
export function filterUsTrends(items: TrendItem[]): TrendItem[] {
  return items.filter((item) => !isLikelyNonUs(item));
}
