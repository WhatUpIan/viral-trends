/** Canonical industries for Opportunity Engine + adoption graph. */

export const INDUSTRIES = [
  "Construction",
  "Insurance",
  "Churches",
  "Plumbing",
  "Travel",
  "Education",
  "Fitness",
  "Food & Beverage",
  "SaaS",
  "Real Estate",
  "Beauty & Fashion",
  "Healthcare",
  "Legal",
  "Automotive",
  "Retail",
] as const;

export type Industry = (typeof INDUSTRIES)[number];

/** Aliases → canonical industry (lowercase keys). */
const ALIASES: Record<string, Industry> = {
  construction: "Construction",
  contractor: "Construction",
  contractors: "Construction",
  stormwater: "Construction",
  roofing: "Construction",
  insurance: "Insurance",
  insurer: "Insurance",
  church: "Churches",
  churches: "Churches",
  faith: "Churches",
  ministry: "Churches",
  plumbing: "Plumbing",
  plumber: "Plumbing",
  hvac: "Plumbing",
  travel: "Travel",
  tourism: "Travel",
  hotel: "Travel",
  education: "Education",
  school: "Education",
  university: "Education",
  tutoring: "Education",
  fitness: "Fitness",
  gym: "Fitness",
  workout: "Fitness",
  wellness: "Fitness",
  food: "Food & Beverage",
  restaurant: "Food & Beverage",
  beverage: "Food & Beverage",
  coffee: "Food & Beverage",
  saas: "SaaS",
  software: "SaaS",
  startup: "SaaS",
  "real estate": "Real Estate",
  realtor: "Real Estate",
  housing: "Real Estate",
  beauty: "Beauty & Fashion",
  fashion: "Beauty & Fashion",
  makeup: "Beauty & Fashion",
  skincare: "Beauty & Fashion",
  health: "Healthcare",
  healthcare: "Healthcare",
  medical: "Healthcare",
  dental: "Healthcare",
  legal: "Legal",
  lawyer: "Legal",
  attorney: "Legal",
  auto: "Automotive",
  automotive: "Automotive",
  car: "Automotive",
  retail: "Retail",
  ecommerce: "Retail",
  shop: "Retail",
};

/**
 * Detect industries mentioned in free text (title, caption, description).
 * Returns 0–3 canonical industries.
 */
export function detectIndustriesFromText(text: string, max = 2): Industry[] {
  const lower = text.toLowerCase();
  const found = new Set<Industry>();

  // Longer aliases first
  const keys = Object.keys(ALIASES).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (found.size >= max) break;
    const re = new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (re.test(lower)) found.add(ALIASES[key]!);
  }

  // Exact industry name match
  for (const ind of INDUSTRIES) {
    if (found.size >= max) break;
    if (lower.includes(ind.toLowerCase())) found.add(ind);
  }

  return [...found].slice(0, max);
}

/** Map a brand's free-text industry field onto a canonical Industry when possible. */
export function canonicalizeIndustry(raw: string | null | undefined): Industry | null {
  if (!raw?.trim()) return null;
  const detected = detectIndustriesFromText(raw, 1);
  if (detected[0]) return detected[0];
  const lower = raw.trim().toLowerCase();
  for (const ind of INDUSTRIES) {
    if (ind.toLowerCase() === lower) return ind;
  }
  return null;
}

export function industryTopicSlug(industry: Industry): string {
  return `industry-${industry.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}
