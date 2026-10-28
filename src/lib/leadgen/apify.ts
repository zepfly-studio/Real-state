import type { SearchPlan } from "./plan";

/**
 * Turns an approved search plan into the input of the Apify actor the agency uses:
 * olympus/b2b-leads-finder (Apollo-style B2B people search, ~$1 per 1,000 leads).
 * To switch actors, change ACTOR and this one function — n8n just forwards `apify_input`.
 */
export const ACTOR = "olympus~b2b-leads-finder";

/** Measured on the agency's account: ~$0.21 per 100 results. The actor's minimum is 100 per run. */
export const USD_PER_RESULT = 0.0021;

/**
 * How many profiles to ask the actor for. It filters by state, not city, and by title, not business type, so the CRM
 * discards most results (measured: ~18% of dental-title results in Uttar Pradesh were in Noida). A named city needs
 * more head-room than a whole state. Min 100 (actor limit), max 2000.
 */
export function fetchCount(leadCount: number, hasCity = true): number {
  return Math.min(2000, Math.max(100, Math.round(leadCount * (hasCity ? 7 : 3))));
}

/** The actor's industry list (LinkedIn industries). Plans may only use these names. */
export const INDUSTRIES = [
  "Accounting",
  "Agriculture",
  "Airlines/Aviation",
  "Alternative Dispute Resolution",
  "Alternative Medicine",
  "Animation",
  "Apparel & Fashion",
  "Architecture & Planning",
  "Arts & Crafts",
  "Automotive",
  "Aviation & Aerospace",
  "Banking",
  "Biotechnology",
  "Broadcast Media",
  "Building Materials",
  "Business Supplies & Equipment",
  "Capital Markets",
  "Chemicals",
  "Civic & Social Organization",
  "Civil Engineering",
  "Commercial Real Estate",
  "Computer & Network Security",
  "Computer Games",
  "Computer Hardware",
  "Computer Networking",
  "Computer Software",
  "Construction",
  "Consumer Electronics",
  "Consumer Goods",
  "Consumer Services",
  "Cosmetics",
  "Dairy",
  "Defense & Space",
  "Design",
  "E-Learning",
  "Education Management",
  "Electrical/Electronic Manufacturing",
  "Entertainment",
  "Environmental Services",
  "Events Services",
  "Executive Office",
  "Facilities Services",
  "Farming",
  "Financial Services",
  "Fine Art",
  "Fishery",
  "Food & Beverages",
  "Food Production",
  "Fund-Raising",
  "Furniture",
  "Gambling & Casinos",
  "Glass",
  "Government Administration",
  "Government Relations",
  "Graphic Design",
  "Health",
  "Higher Education",
  "Hospital & Health Care",
  "Hospitality",
  "Human Resources",
  "Import & Export",
  "Individual & Family Services",
  "Industrial Automation",
  "Information Services",
  "Information Technology & Services",
  "Insurance",
  "International Affairs",
  "International Trade & Development",
  "Internet",
  "Investment Banking",
  "Investment Management",
  "Judiciary",
  "Law Enforcement",
  "Law Practice",
  "Legal Services",
  "Legislative Office",
  "Leisure",
  "Libraries",
  "Logistics & Supply Chain",
  "Luxury Goods & Jewelry",
  "Machinery",
  "Management Consulting",
  "Maritime",
  "Market Research",
  "Marketing & Advertising",
  "Mechanical or Industrial Engineering",
  "Media Production",
  "Medical Devices",
  "Medical Practice",
  "Mental Health Care",
  "Military",
  "Mining & Metals",
  "Motion Pictures & Film",
  "Museums & Institutions",
  "Music",
  "Nanotechnology",
  "Newspapers",
  "Nonprofit Organization Management",
  "Oil & Energy",
  "Online Media",
  "Outsourcing/Offshoring",
  "Package/Freight Delivery",
  "Packaging & Containers",
  "Paper & Forest Products",
  "Performing Arts",
  "Pharmaceuticals",
  "Philanthropy",
  "Photography",
  "Plastics",
  "Political Organization",
  "Primary/Secondary Education",
  "Printing",
  "Professional Training & Coaching",
  "Program Development",
  "Public Policy",
  "Public Relations & Communications",
  "Public Safety",
  "Publishing",
  "Railroad Manufacture",
  "Ranching",
  "Real Estate",
  "Recreational Facilities & Services",
  "Religious Institutions",
  "Renewables & Environment",
  "Research",
  "Restaurants",
  "Retail",
  "Security & Investigations",
  "Semiconductors",
  "Shipbuilding",
  "Sporting Goods",
  "Sports",
  "Staffing & Recruiting",
  "Supermarkets",
  "Telecommunications",
  "Textiles",
  "Think Tanks",
  "Tobacco",
  "Translation & Localization",
  "Transportation/Trucking/Railroad",
  "Utilities",
  "Venture Capital & Private Equity",
  "Veterinary",
  "Warehousing",
  "Wholesale",
  "Wine & Spirits",
  "Wireless",
  "Writing & Editing",
  "Other",
  "Specialty",
  "Services",
  "Rentals/Leasing",
  "Other Vehicles",
  "Professional Services software",
  "eBusiness Software",
] as const;

const SENIORITY: Array<[RegExp, string]> = [
  [/\bowner\b|proprietor/i, "owner"],
  [/founder/i, "founder"],
  [/\bceo\b|chief|c[- ]?suite|c[- ]?level|managing director|\bmd\b|president|chairman/i, "c_suite"],
  [/partner/i, "partner"],
  [/\bvp\b|vice president/i, "vp"],
  [/\bhead\b|principal/i, "head"],
  [/director/i, "director"],
  [/manager/i, "manager"],
];

export function matchIndustry(name: string): string | null {
  const n = name.trim().toLowerCase();
  return (INDUSTRIES as readonly string[]).find((x) => x.toLowerCase() === n) ?? null;
}

/** "Noida, Uttar Pradesh, India" → parts the actor understands. */
export function splitLocation(location: string) {
  const parts = location.split(",").map((x) => x.trim()).filter(Boolean);
  const country = /united states|\busa\b/i.test(location)
    ? "United States"
    : /united kingdom|\buk\b|england/i.test(location)
      ? "United Kingdom"
      : /dubai|\buae\b|emirates/i.test(location)
        ? "United Arab Emirates"
        : "India";
  const city = parts[0] && !/^(india|usa|united states|united kingdom|uae)$/i.test(parts[0]) ? parts[0] : "";
  const given = parts.length >= 3 ? parts[1] : parts.length === 2 && !/^(india|usa|united states|united kingdom|uae)$/i.test(parts[1]) ? parts[1] : "";
  const state = given || (country === "India" ? CITY_STATE[city.toLowerCase()] ?? "" : "");
  return { city, state, country };
}

/** Common Indian cities → state, for briefs that only name the city ("Noida mein…"). */
const CITY_STATE: Record<string, string> = {
  noida: "Uttar Pradesh", "greater noida": "Uttar Pradesh", ghaziabad: "Uttar Pradesh", lucknow: "Uttar Pradesh", kanpur: "Uttar Pradesh", agra: "Uttar Pradesh", varanasi: "Uttar Pradesh",
  delhi: "Delhi", "new delhi": "Delhi", gurugram: "Haryana", gurgaon: "Haryana", faridabad: "Haryana",
  mumbai: "Maharashtra", "navi mumbai": "Maharashtra", thane: "Maharashtra", pune: "Maharashtra", nagpur: "Maharashtra", nashik: "Maharashtra",
  bengaluru: "Karnataka", bangalore: "Karnataka", mysuru: "Karnataka", hyderabad: "Telangana", chennai: "Tamil Nadu", coimbatore: "Tamil Nadu",
  kolkata: "West Bengal", jaipur: "Rajasthan", udaipur: "Rajasthan", jodhpur: "Rajasthan", ahmedabad: "Gujarat", surat: "Gujarat", vadodara: "Gujarat",
  chandigarh: "Chandigarh", mohali: "Punjab", ludhiana: "Punjab", indore: "Madhya Pradesh", bhopal: "Madhya Pradesh", kochi: "Kerala", thiruvananthapuram: "Kerala",
  bhubaneswar: "Odisha", patna: "Bihar", dehradun: "Uttarakhand", goa: "Goa", panaji: "Goa",
};

export function toActorInput(plan: SearchPlan) {
  const { city, state, country } = splitLocation(plan.location);
  const seniority = Array.from(new Set(plan.seniority.flatMap((s) => SENIORITY.filter(([re]) => re.test(s)).map(([, v]) => v))));
  const industry = plan.industries.map(matchIndustry).filter(Boolean) as string[];
  const title = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    // Profession titles drive the search; if the plan has none, fall back to the decision-maker titles.
    personTitle: (plan.role_titles.length ? plan.role_titles : plan.include_titles).map(title),
    // Only the core exclusions go to the actor (long lists shrink its results); the CRM applies the full list again.
    excludeTitle: plan.exclude_titles.filter((t) => /assistant|intern|student|trainee|receptionist|fresher/.test(t)).slice(0, 6).map(title),
    // Seniority is NOT sent when searching by profession titles: combined with them the actor returns almost nothing
    // (measured 7 of 140). The CRM ranks by seniority instead.
    ...(!plan.role_titles.length && seniority.length ? { seniority } : {}),
    personCountry: [country],
    // The actor filters by state (it has no city filter); the CRM keeps only the requested city afterwards.
    ...(state ? { personState: [state] } : {}),
    // Profession titles already pin the field (many clinics are filed under 'Other'), so the industry filter is only
    // used for generic searches. The actor's keyword filter is deliberately never used: with it, results collapse to ~0.
    ...(!plan.role_titles.length && industry.length ? { industry } : {}),
    maxResults: fetchCount(plan.lead_count, Boolean(city)),
  };
}
