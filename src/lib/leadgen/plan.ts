import { llmFor, LlmNotConnected } from "./llm";
import { regexBrief } from "./intent";
import { matchIndustry, splitLocation } from "./apify";

/**
 * Search plan: what the AI turns a spoken brief into before anything is scraped.
 *
 *   "Noida mein 50 dentists chahiye"  →
 *   { target: "Dentists", keywords: [dentist, dental clinic, orthodontist, …],
 *     include_titles: [owner, founder, director, chief dental surgeon, …],
 *     exclude_titles: [assistant, intern, student, trainee, receptionist, …],
 *     seniority: [owner, founder, partner, director, head], location: "Noida, Uttar Pradesh, India", lead_count: 50 }
 *
 * The person reviews/edits it, n8n receives it, and the CRM applies the title filters
 * again to every result — so quality holds whichever scraper (Apify actor) is used.
 */
export interface SearchPlan {
  target: string;
  keywords: string[];
  include_titles: string[];
  exclude_titles: string[];
  seniority: string[];
  industries: string[]; // LinkedIn industry names the scraper understands (validated against its list)
  location: string;
  lead_count: number;
  notes: string;
}

export const DEFAULT_EXCLUDE = [
  "assistant", "intern", "internship", "student", "trainee", "fresher", "junior", "receptionist",
  "volunteer", "apprentice", "aspiring", "looking for", "job seeker", "teacher assistant",
];
export const DEFAULT_SENIORITY = ["owner", "founder", "co-founder", "partner", "director", "managing director", "ceo", "head", "principal", "chief"];

/** Common professions → search keywords and the people who decide. Used when ChatGPT isn't connected. */
const PROFESSIONS: Array<{ match: RegExp; target: string; keywords: string[]; titles: string[]; industries?: string[] }> = [
  { match: /dentist|dental|orthodont/i, target: "Dentists", keywords: ["dentist", "dental clinic", "dental surgeon", "orthodontist", "endodontist", "dental hospital", "implantologist"], titles: ["owner", "founder", "chief dental surgeon", "consultant dental surgeon", "orthodontist", "clinic director", "partner"], industries: ["Medical Practice", "Hospital & Health Care"] },
  { match: /doctor|physician|clinic|hospital|medical/i, target: "Doctors & clinics", keywords: ["doctor", "physician", "clinic", "polyclinic", "hospital", "medical practitioner", "specialist clinic"], titles: ["owner", "founder", "medical director", "consultant", "chief medical officer", "director", "partner"], industries: ["Medical Practice", "Hospital & Health Care"] },
  { match: /ca\b|chartered accountant|accountant|tax/i, target: "Chartered accountants", keywords: ["chartered accountant", "CA firm", "tax consultant", "audit firm", "accounting firm"], titles: ["partner", "founder", "proprietor", "managing partner", "director"], industries: ["Accounting"] },
  { match: /lawyer|advocate|legal|law firm/i, target: "Lawyers", keywords: ["advocate", "law firm", "legal consultant", "corporate lawyer", "attorney"], titles: ["partner", "founder", "managing partner", "senior advocate", "principal"], industries: ["Law Practice", "Legal Services"] },
  { match: /builder|developer|real estate|realtor|broker|property/i, target: "Real estate businesses", keywords: ["real estate developer", "builder", "real estate agency", "property consultant", "realtor"], titles: ["owner", "founder", "director", "managing director", "ceo", "partner"], industries: ["Real Estate", "Construction"] },
  { match: /restaurant|cafe|hotel|hospitality/i, target: "Restaurants & hotels", keywords: ["restaurant", "cafe", "hotel", "banquet", "cloud kitchen"], titles: ["owner", "founder", "director", "general manager", "partner"], industries: ["Restaurants", "Hospitality"] },
  { match: /school|coaching|institute|education/i, target: "Schools & institutes", keywords: ["school", "coaching institute", "academy", "education centre", "training institute"], titles: ["founder", "director", "principal", "owner", "chairman"], industries: ["Education Management", "Primary/Secondary Education"] },
  { match: /gym|fitness|salon|spa/i, target: "Gyms & salons", keywords: ["gym", "fitness centre", "salon", "spa", "wellness studio"], titles: ["owner", "founder", "director", "partner"], industries: ["Health, Wellness & Fitness"] },
  { match: /software|it company|saas|tech/i, target: "IT companies", keywords: ["software company", "IT services", "SaaS", "app development", "web development"], titles: ["founder", "co-founder", "ceo", "cto", "director", "managing director"], industries: ["Information Technology & Services", "Computer Software"] },
  { match: /marketing|agency|advertis/i, target: "Marketing agencies", keywords: ["digital marketing agency", "advertising agency", "branding agency", "performance marketing"], titles: ["founder", "co-founder", "ceo", "director", "managing partner"], industries: ["Marketing & Advertising"] },
  { match: /seller|owner|landlord|home ?owner/i, target: "Property owners", keywords: ["property owner", "house for sale", "plot owner", "flat owner"], titles: [] },
];

const clean = (xs: unknown, max = 12): string[] =>
  Array.from(new Set((Array.isArray(xs) ? xs : []).map((x) => String(x ?? "").trim().toLowerCase()).filter((x) => x && x.length <= 60))).slice(0, max);

export function normalizePlan(p: Record<string, any>): SearchPlan {
  const n = Math.round(Number(p.lead_count));
  return {
    target: String(p.target ?? "").trim().slice(0, 80) || "Leads",
    keywords: clean(p.keywords),
    include_titles: clean(p.include_titles),
    exclude_titles: clean(p.exclude_titles?.length ? p.exclude_titles : DEFAULT_EXCLUDE, 20),
    seniority: clean(p.seniority?.length ? p.seniority : DEFAULT_SENIORITY),
    industries: Array.from(new Set((Array.isArray(p.industries) ? p.industries : []).map((x: unknown) => matchIndustry(String(x ?? ""))).filter(Boolean) as string[])).slice(0, 5),
    location: String(p.location ?? "").trim().slice(0, 120),
    lead_count: Number.isFinite(n) && n > 0 ? Math.min(n, 5000) : 0,
    notes: String(p.notes ?? "").trim().slice(0, 240),
  };
}

/** No-AI plan: profession dictionary + default decision-maker filters. */
export function heuristicPlan(brief: string): SearchPlan {
  const { location, leadCount } = regexBrief(brief);
  const prof = PROFESSIONS.find((x) => x.match.test(brief));
  const words = brief.replace(/\d+/g, " ").replace(/\b(find|get|need|chahiye|dhundo|mujhe|leads?|in|ke|ki|ka|mein|me|main|from|se|for|of|the|a|an|and|lao|do)\b/gi, " ").replace(/\s+/g, " ").trim();
  return normalizePlan({
    target: prof?.target ?? (words.slice(0, 60) || "Leads"),
    keywords: prof?.keywords ?? (words ? [words.toLowerCase()] : []),
    include_titles: prof?.titles ?? DEFAULT_SENIORITY,
    exclude_titles: DEFAULT_EXCLUDE,
    seniority: DEFAULT_SENIORITY,
    industries: prof?.industries ?? [],
    location,
    lead_count: leadCount,
    notes: prof ? "" : "Basic reader — connect ChatGPT for smarter keywords.",
  });
}

const SYSTEM =
  "You plan B2B/B2C lead searches for an Indian real-estate sales team. Turn the user's request into a search plan for a people/business scraper. " +
  "Expand the profession into 5-8 precise search keywords (synonyms, specialities, business types). " +
  "List 4-8 job titles of DECISION MAKERS for that field (owners, founders, partners, directors, senior consultants). " +
  "List titles to EXCLUDE (assistants, interns, students, trainees, juniors, receptionists and similar non-decision roles). " +
  "Give seniority levels to prioritise. Give 1-3 LinkedIn industry names for these businesses (e.g. Medical Practice, Hospital & Health Care, Real Estate, Law Practice, Accounting). Expand the location to 'City, State, Country' (assume India). " +
  'Reply with ONLY JSON: {"target":string,"keywords":[string],"include_titles":[string],"exclude_titles":[string],"seniority":[string],"industries":[string],"location":string,"lead_count":number,"notes":string}. ' +
  "lead_count = number requested (0 if none). notes = one short line of anything the user should confirm, else empty.";

/** ChatGPT plan (one small JSON call), else the heuristic plan. Never throws. */
export async function buildPlan(tenantId: string, brief: string): Promise<{ plan: SearchPlan; readBy: "ChatGPT" | "basic reader" }> {
  try {
    const llm = await llmFor(tenantId, SYSTEM, [], { json: true, maxTokens: 400 });
    llm.addUser(brief.slice(0, 500));
    const { text } = await llm.step();
    const data = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? "{}");
    const plan = normalizePlan(data);
    // Keep the decision-maker defaults if the model returned nothing for them.
    if (!plan.keywords.length) return { plan: heuristicPlan(brief), readBy: "basic reader" };
    return { plan, readBy: "ChatGPT" };
  } catch (e) {
    if (!(e instanceof LlmNotConnected)) console.warn("[leadgen] plan via ChatGPT failed, using basic reader");
    return { plan: heuristicPlan(brief), readBy: "basic reader" };
  }
}

/** Score one scraped person against the plan. null = filtered out. */
export function scoreLead(plan: SearchPlan | null, title?: string | null): number | null {
  const t = String(title ?? "").toLowerCase();
  if (!t) return 0; // businesses / people without a title pass with neutral priority
  if (!plan) return 0;
  const has = (w: string) => new RegExp(`(^|[^a-z])${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`, "i").test(t);
  if (plan.exclude_titles.some(has)) return null;
  let score = 10;
  if (plan.include_titles.some(has)) score += 30;
  if (plan.seniority.some(has)) score += 40;
  if (/\b(owner|founder|ceo|managing director|chairman|proprietor)\b/i.test(t)) score += 20;
  return Math.min(score, 100);
}

/** Keep only the requested city when the result says where it is (the scraper filters by state). */
export function cityMatches(plan: SearchPlan | null, ...places: Array<string | null | undefined>): boolean {
  const city = plan ? splitLocation(plan.location).city.toLowerCase() : "";
  if (!city) return true;
  const known = places.map((x) => String(x ?? "").toLowerCase().trim()).filter(Boolean);
  if (!known.length) return true; // unknown location: keep, can't judge
  const alias: Record<string, string[]> = { gurugram: ["gurgaon"], gurgaon: ["gurugram"], bengaluru: ["bangalore"], bangalore: ["bengaluru"], delhi: ["new delhi"], "new delhi": ["delhi"], mumbai: ["bombay", "navi mumbai", "thane"], noida: ["greater noida", "gautam buddha nagar"] };
  const names = [city, ...(alias[city] ?? [])];
  return known.some((k) => names.some((n) => k.includes(n) || n.includes(k)));
}

/** Words too generic to prove relevance on their own ("dental clinic" → only "dental" counts). */
const GENERIC = new Set(["clinic", "clinics", "hospital", "hospitals", "company", "companies", "services", "service", "agency", "agencies", "firm", "firms", "centre", "center", "studio", "consultant", "consultants", "surgeon", "specialist", "practitioner", "business", "businesses", "owner", "owners", "office", "store", "shop", "solutions", "group", "india"]);

/** Stems from the plan's keywords: "orthodontist" → "orthodon", "dental clinic" → "dent". */
export function relevanceStems(plan: SearchPlan): string[] {
  const words = plan.keywords.flatMap((k) => k.toLowerCase().split(/[^a-z]+/)).filter((w) => w.length >= 4 && !GENERIC.has(w));
  return Array.from(new Set(words.map((w) => w.slice(0, Math.max(4, w.length - 4)))));
}

/** Does this result's company/industry/description text match what was asked for? Unknown text → keep. */
export function isRelevant(plan: SearchPlan | null, text?: string | null): boolean {
  const t = String(text ?? "").toLowerCase();
  if (!plan || !t.trim()) return true;
  const stems = relevanceStems(plan);
  if (!stems.length) return true;
  // Stems must start a word: "dent" matches "dental"/"dentist" but not "president"/"independent".
  return stems.some((s) => new RegExp(`(^|[^a-z])${s}`).test(t));
}
