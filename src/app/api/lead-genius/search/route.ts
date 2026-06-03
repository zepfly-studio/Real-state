import { NextRequest, NextResponse } from "next/server";
import { currentUser, resolveTenantId } from "@/lib/session";
import { getIntegration } from "@/lib/integrations";

// ─── Mock dataset of 25 Indian real-estate prospects (Jaipur context) ─────────

const MOCK_LEADS = [
  {
    name: "Arvind Sharma",
    title: "CFO",
    company: "Rajputana Exports Pvt Ltd",
    email: "arvind.sharma@rajputanaexports.com",
    phone: "+91 98290 43201",
    location: "C-Scheme",
    industry: "real-estate-buyers",
    budget: 12500000,
    companySize: "51-200",
    score: 87,
  },
  {
    name: "Priya Singhania",
    title: "Managing Director",
    company: "Pink City Gems & Jewels",
    email: "priya@pinkcitygems.com",
    phone: "+91 94140 77821",
    location: "Mansarovar",
    industry: "hni",
    budget: 35000000,
    companySize: "11-50",
    score: 92,
  },
  {
    name: "Rohit Agarwal",
    title: "VP Operations",
    company: "Jaipur Rugs Foundation",
    email: "rohit.agarwal@jaipurrugs.com",
    phone: "+91 97848 20031",
    location: "Vaishali Nagar",
    industry: "real-estate-buyers",
    budget: 8500000,
    companySize: "201+",
    score: 74,
  },
  {
    name: "Sunita Mehta",
    title: "Director",
    company: "Mehta Marble Industries",
    email: "sunita.mehta@mehtamarblesind.com",
    phone: "+91 93140 56712",
    location: "Tonk Road",
    industry: "hni",
    budget: 27000000,
    companySize: "51-200",
    score: 88,
  },
  {
    name: "Vikram Choudhary",
    title: "CTO",
    company: "RK Finserv",
    email: "vikram.c@rkfinserv.in",
    phone: "+91 99292 34456",
    location: "Jagatpura",
    industry: "real-estate-buyers",
    budget: 15000000,
    companySize: "11-50",
    score: 65,
  },
  {
    name: "Anita Rathore",
    title: "CEO",
    company: "Rajasthan Handicrafts Hub",
    email: "anita@rajhandicraft.com",
    phone: "+91 98290 11230",
    location: "Sitapura",
    industry: "real-estate-buyers",
    budget: 7200000,
    companySize: "1-10",
    score: 58,
  },
  {
    name: "Deepak Gupta",
    title: "Head – Investments",
    company: "Gupta Wealth Management",
    email: "deepak.gupta@guptawealth.in",
    phone: "+91 94600 87654",
    location: "C-Scheme",
    industry: "hni",
    budget: 55000000,
    companySize: "11-50",
    score: 95,
  },
  {
    name: "Meenakshi Jain",
    title: "Partner",
    company: "Rajputana Law Associates",
    email: "meenakshi.jain@rplaw.in",
    phone: "+91 97113 45678",
    location: "Ajmer Road",
    industry: "real-estate-buyers",
    budget: 18000000,
    companySize: "1-10",
    score: 71,
  },
  {
    name: "Rajesh Kumar NRI",
    title: "Senior Engineer",
    company: "Infosys (Fremont, USA)",
    email: "rajesh.k.nri@gmail.com",
    phone: "+1 408 555 2391",
    location: "Vaishali Nagar",
    industry: "nri-investors",
    budget: 22000000,
    companySize: "201+",
    score: 83,
  },
  {
    name: "Pooja Khandelwal",
    title: "Business Owner",
    company: "Jaipur Spice Traders",
    email: "pooja@jaipurspice.com",
    phone: "+91 96606 23100",
    location: "Mansarovar",
    industry: "real-estate-buyers",
    budget: 6500000,
    companySize: "1-10",
    score: 62,
  },
  {
    name: "Sanjay Bhargava",
    title: "MD",
    company: "Bhargava Infrastructure",
    email: "sanjay@bhargavainf.com",
    phone: "+91 99501 78932",
    location: "Jagatpura",
    industry: "hni",
    budget: 85000000,
    companySize: "51-200",
    score: 96,
  },
  {
    name: "Kavita Sharma",
    title: "Director – Finance",
    company: "Amber Palace Hotels Pvt Ltd",
    email: "kavita.sharma@amberpalacehotels.com",
    phone: "+91 98297 66123",
    location: "C-Scheme",
    industry: "hni",
    budget: 40000000,
    companySize: "201+",
    score: 89,
  },
  {
    name: "Tarun Singh NRI",
    title: "Software Architect",
    company: "Google (London, UK)",
    email: "tarun.singh.uk@gmail.com",
    phone: "+44 7911 123456",
    location: "Tonk Road",
    industry: "nri-investors",
    budget: 30000000,
    companySize: "201+",
    score: 81,
  },
  {
    name: "Harish Mittal",
    title: "Proprietor",
    company: "Mittal Textile Mills",
    email: "harish@mittaltextile.com",
    phone: "+91 94141 22334",
    location: "Sitapura",
    industry: "real-estate-buyers",
    budget: 11000000,
    companySize: "51-200",
    score: 69,
  },
  {
    name: "Divya Acharya",
    title: "COO",
    company: "Acharya Ayurvedics",
    email: "divya.acharya@acharyaayur.com",
    phone: "+91 97819 33450",
    location: "Ajmer Road",
    industry: "real-estate-buyers",
    budget: 9800000,
    companySize: "11-50",
    score: 75,
  },
  {
    name: "Rahul Singhvi NRI",
    title: "Investment Banker",
    company: "Morgan Stanley (Dubai, UAE)",
    email: "rahul.singhvi@morganstanley.com",
    phone: "+971 50 331 2210",
    location: "C-Scheme",
    industry: "nri-investors",
    budget: 65000000,
    companySize: "201+",
    score: 94,
  },
  {
    name: "Suneel Beniwal",
    title: "Chairman",
    company: "Beniwal Real Estate Group",
    email: "suneel@beniwalrealty.com",
    phone: "+91 98290 90001",
    location: "Mansarovar",
    industry: "hni",
    budget: 120000000,
    companySize: "51-200",
    score: 97,
  },
  {
    name: "Nisha Pareek",
    title: "Director – Sales",
    company: "Jaipur Motors Showroom Pvt Ltd",
    email: "nisha.pareek@jaipurmotors.in",
    phone: "+91 93140 77321",
    location: "Vaishali Nagar",
    industry: "real-estate-buyers",
    budget: 16000000,
    companySize: "51-200",
    score: 77,
  },
  {
    name: "Ajay Soni",
    title: "Entrepreneur",
    company: "Soni Electronics Chain",
    email: "ajay.soni@sonielectronics.in",
    phone: "+91 94600 54321",
    location: "Tonk Road",
    industry: "hni",
    budget: 28000000,
    companySize: "11-50",
    score: 85,
  },
  {
    name: "Lakshmi Bansal",
    title: "Partner",
    company: "Bansal & Associates CA Firm",
    email: "lakshmi.bansal@bansalca.com",
    phone: "+91 97290 56789",
    location: "C-Scheme",
    industry: "real-estate-buyers",
    budget: 14000000,
    companySize: "1-10",
    score: 68,
  },
  {
    name: "Praveen Sharma NRI",
    title: "Doctor",
    company: "NHS Trust (Manchester, UK)",
    email: "praveen.sharma.nri@gmail.com",
    phone: "+44 7400 987654",
    location: "Jagatpura",
    industry: "nri-investors",
    budget: 42000000,
    companySize: "201+",
    score: 82,
  },
  {
    name: "Ritu Gupta",
    title: "CEO",
    company: "Pink City Events & Weddings",
    email: "ritu.gupta@pinkcityevents.com",
    phone: "+91 99501 12340",
    location: "Mansarovar",
    industry: "real-estate-buyers",
    budget: 9200000,
    companySize: "11-50",
    score: 61,
  },
  {
    name: "Manish Chaturvedi",
    title: "VP – Corporate Affairs",
    company: "Rajasthan Telecom Ltd",
    email: "manish.chaturvedi@rjtelecom.com",
    phone: "+91 98297 44321",
    location: "Sitapura",
    industry: "real-estate-buyers",
    budget: 19000000,
    companySize: "201+",
    score: 79,
  },
  {
    name: "Geeta Lal NRI",
    title: "Software Manager",
    company: "Oracle (Singapore)",
    email: "geeta.lal@oracle.com",
    phone: "+65 8123 4567",
    location: "Vaishali Nagar",
    industry: "nri-investors",
    budget: 38000000,
    companySize: "201+",
    score: 86,
  },
  {
    name: "Bharat Yadav",
    title: "Director",
    company: "Yadav Agri Commodities",
    email: "bharat.yadav@yadavagri.com",
    phone: "+91 94140 87654",
    location: "Ajmer Road",
    industry: "real-estate-buyers",
    budget: 7800000,
    companySize: "11-50",
    score: 55,
  },
];

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "a•••@••••.com";
  return local[0] + "•••@" + domain[0] + "•••." + domain.split(".").pop();
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 6) return "••••••••••";
  return phone.slice(0, 4) + "•••••" + phone.slice(-3);
}

function addId(lead: (typeof MOCK_LEADS)[number], idx: number) {
  return {
    id: `mock_${idx}_${lead.name.replace(/\s+/g, "_").toLowerCase()}`,
    ...lead,
    emailMasked: maskEmail(lead.email),
    phoneMasked: maskPhone(lead.phone),
    email: null as string | null,
    phone: null as string | null,
    demo: true,
    enriched: false,
  };
}

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const tenantId = await resolveTenantId(user);
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const { industry = "", location = "", budgetMin = "", budgetMax = "", companySize = "" } = body;

    // Check for real API keys
    const apolloKey = await getIntegration(tenantId, "APOLLO");

    let leads: ReturnType<typeof addId>[];

    if (apolloKey) {
      // Real Apollo call (best-effort — fall back to mock if it fails)
      try {
        const apolloRes = await fetch("https://api.apollo.io/v1/mixed_people/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Api-Key": apolloKey,
          },
          body: JSON.stringify({
            q_keywords: "real estate investor Jaipur India",
            page: 1,
            per_page: 25,
          }),
        });
        if (!apolloRes.ok) throw new Error("Apollo error");
        const apolloData = await apolloRes.json();
        // Map Apollo people to our shape (simplified)
        leads = (apolloData.people || []).map((p: Record<string, unknown>, i: number) => {
          const name = String(p.name || "Unknown");
          const emailVal = String((p.email as string) || "");
          const phoneVal = String(((p.phone_numbers as { sanitized_number?: string }[])?.[0]?.sanitized_number) || "");
          return {
            id: `apollo_${i}_${name.replace(/\s+/g, "_").toLowerCase()}`,
            name,
            title: String(p.title || ""),
            company: String((p.organization as { name?: string })?.name || ""),
            email: emailVal || null,
            emailMasked: emailVal ? maskEmail(emailVal) : "••••@••••.com",
            phone: phoneVal || null,
            phoneMasked: phoneVal ? maskPhone(phoneVal) : "••••••••••",
            location: String(p.city || "Jaipur"),
            industry: "real-estate-buyers",
            budget: 10000000,
            companySize: "11-50",
            score: Math.floor(Math.random() * 40) + 55,
            demo: false,
            enriched: !!emailVal,
          };
        });
      } catch {
        leads = MOCK_LEADS.map(addId);
      }
    } else {
      leads = MOCK_LEADS.map(addId);
    }

    // Apply filters
    if (industry) {
      leads = leads.filter((l) => l.industry === industry);
    }
    if (location) {
      leads = leads.filter((l) =>
        l.location.toLowerCase().includes(location.toLowerCase())
      );
    }
    if (budgetMin) {
      const min = Number(budgetMin);
      if (!isNaN(min)) leads = leads.filter((l) => l.budget >= min);
    }
    if (budgetMax) {
      const max = Number(budgetMax);
      if (!isNaN(max) && max > 0) leads = leads.filter((l) => l.budget <= max);
    }
    if (companySize) {
      leads = leads.filter((l) => l.companySize === companySize);
    }

    // Sort by score desc
    leads.sort((a, b) => b.score - a.score);

    return NextResponse.json({ leads, demo: !apolloKey, total: leads.length });
  } catch (e) {
    console.error("[lead-genius/search]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
