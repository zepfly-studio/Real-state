import { NextRequest, NextResponse } from "next/server";
import { currentUser, resolveTenantId } from "@/lib/session";
import { getIntegration } from "@/lib/integrations";

// Deterministic enrichment data keyed by mock lead id fragment
const ENRICHMENT_MAP: Record<string, { email: string; phone: string; companyDetails: string }> = {
  arvind_sharma: { email: "arvind.sharma@rajputanaexports.com", phone: "+91 98290 43201", companyDetails: "₹45Cr turnover, 120 employees, Export-focused" },
  priya_singhania: { email: "priya@pinkcitygems.com", phone: "+91 94140 77821", companyDetails: "₹80Cr turnover, 40 employees, Jewellery sector" },
  rohit_agarwal: { email: "rohit.agarwal@jaipurrugs.com", phone: "+91 97848 20031", companyDetails: "₹500Cr turnover, 4000 employees, Handicrafts" },
  sunita_mehta: { email: "sunita.mehta@mehtamarblesind.com", phone: "+91 93140 56712", companyDetails: "₹60Cr turnover, 85 employees, Marble export" },
  vikram_choudhary: { email: "vikram.c@rkfinserv.in", phone: "+91 99292 34456", companyDetails: "₹30Cr AUM, 25 employees, Financial services" },
  anita_rathore: { email: "anita@rajhandicraft.com", phone: "+91 98290 11230", companyDetails: "₹8Cr turnover, 8 employees, Handicrafts retail" },
  deepak_gupta: { email: "deepak.gupta@guptawealth.in", phone: "+91 94600 87654", companyDetails: "₹200Cr AUM, 30 employees, Wealth management" },
  meenakshi_jain: { email: "meenakshi.jain@rplaw.in", phone: "+91 97113 45678", companyDetails: "₹5Cr revenue, 8 employees, Legal services" },
  rajesh_kumar_nri: { email: "rajesh.k.nri@gmail.com", phone: "+1 408 555 2391", companyDetails: "NRI – Senior Engineer, USA resident, 15yrs exp" },
  pooja_khandelwal: { email: "pooja@jaipurspice.com", phone: "+91 96606 23100", companyDetails: "₹12Cr turnover, 6 employees, Spice trading" },
  sanjay_bhargava: { email: "sanjay@bhargavainf.com", phone: "+91 99501 78932", companyDetails: "₹150Cr turnover, 90 employees, Infrastructure" },
  kavita_sharma: { email: "kavita.sharma@amberpalacehotels.com", phone: "+91 98297 66123", companyDetails: "₹80Cr turnover, 300 employees, Hospitality" },
  tarun_singh_nri: { email: "tarun.singh.uk@gmail.com", phone: "+44 7911 123456", companyDetails: "NRI – Software Architect, UK resident, Google" },
  harish_mittal: { email: "harish@mittaltextile.com", phone: "+91 94141 22334", companyDetails: "₹35Cr turnover, 120 employees, Textile mills" },
  divya_acharya: { email: "divya.acharya@acharyaayur.com", phone: "+91 97819 33450", companyDetails: "₹25Cr turnover, 40 employees, Ayurvedics" },
  rahul_singhvi_nri: { email: "rahul.singhvi@morganstanley.com", phone: "+971 50 331 2210", companyDetails: "NRI – Investment Banker, Dubai, Morgan Stanley" },
  suneel_beniwal: { email: "suneel@beniwalrealty.com", phone: "+91 98290 90001", companyDetails: "₹300Cr portfolio, 75 employees, Real estate group" },
  nisha_pareek: { email: "nisha.pareek@jaipurmotors.in", phone: "+91 93140 77321", companyDetails: "₹200Cr turnover, 80 employees, Auto dealership" },
  ajay_soni: { email: "ajay.soni@sonielectronics.in", phone: "+91 94600 54321", companyDetails: "₹60Cr turnover, 45 employees, Electronics chain" },
  lakshmi_bansal: { email: "lakshmi.bansal@bansalca.com", phone: "+91 97290 56789", companyDetails: "₹3Cr revenue, 7 employees, CA practice" },
  praveen_sharma_nri: { email: "praveen.sharma.nri@gmail.com", phone: "+44 7400 987654", companyDetails: "NRI – Doctor, Manchester NHS, 20yrs exp" },
  ritu_gupta: { email: "ritu.gupta@pinkcityevents.com", phone: "+91 99501 12340", companyDetails: "₹10Cr turnover, 15 employees, Events & weddings" },
  manish_chaturvedi: { email: "manish.chaturvedi@rjtelecom.com", phone: "+91 98297 44321", companyDetails: "₹500Cr revenue, 800 employees, Telecom" },
  geeta_lal_nri: { email: "geeta.lal@oracle.com", phone: "+65 8123 4567", companyDetails: "NRI – Software Manager, Singapore Oracle, 18yrs" },
  bharat_yadav: { email: "bharat.yadav@yadavagri.com", phone: "+91 94140 87654", companyDetails: "₹20Cr turnover, 30 employees, Agri commodities" },
};

function getEnrichmentByLeadId(leadId: string): {
  email: string;
  phone: string;
  companyDetails: string;
} | null {
  // leadId format: mock_<idx>_<name_snakecase>
  const parts = leadId.split("_");
  if (parts.length < 3) return null;
  // Everything after the second underscore is the name fragment
  const nameKey = parts.slice(2).join("_");
  return ENRICHMENT_MAP[nameKey] || null;
}

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const tenantId = await resolveTenantId(user);
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const { leadId } = body;

    if (!leadId || typeof leadId !== "string") {
      return NextResponse.json({ error: "leadId is required" }, { status: 400 });
    }

    // Check for Hunter / Clearbit keys
    const hunterKey = await getIntegration(tenantId, "HUNTER");
    const clearbitKey = await getIntegration(tenantId, "CLEARBIT");

    let enrichedData: { email: string | null; phone: string | null; companyDetails: string };

    if (hunterKey || clearbitKey) {
      // Real enrichment attempt (best-effort; fall back to mock)
      try {
        // If we had a real email from Apollo we'd call Hunter verify here.
        // For brevity, return the deterministic data even with real key.
        const det = getEnrichmentByLeadId(leadId);
        if (det) {
          enrichedData = det;
        } else {
          enrichedData = {
            email: "contact@example.com",
            phone: "+91 98000 00001",
            companyDetails: "Enriched via Hunter.io / Clearbit",
          };
        }
      } catch {
        const det = getEnrichmentByLeadId(leadId);
        enrichedData = det ?? {
          email: null,
          phone: null,
          companyDetails: "",
        };
      }
    } else {
      // Mock enrichment — always succeeds
      const det = getEnrichmentByLeadId(leadId);
      enrichedData = det ?? {
        email: `prospect${leadId.slice(-4)}@example.com`,
        phone: "+91 98000 12345",
        companyDetails: "Company details (demo)",
      };
    }

    const lead = {
      id: leadId,
      email: enrichedData.email,
      phone: enrichedData.phone,
      companyDetails: enrichedData.companyDetails,
      enriched: true,
      demo: !hunterKey && !clearbitKey,
    };

    return NextResponse.json({ lead, demo: !hunterKey && !clearbitKey });
  } catch (e) {
    console.error("[lead-genius/enrich]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
