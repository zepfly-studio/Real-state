import { PrismaClient, Role, LeadStage, LeadTemperature, LeadSource, ActivityType, PropertyStatus, PaymentStatus, AttendanceStatus, LeaveStatus, CommissionStatus, ApprovalType, ApprovalStatus, CampaignChannel, CampaignStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const AREAS = ["Mansarovar", "Jagatpura", "Vaishali Nagar", "Tonk Road", "Ajmer Road", "C-Scheme", "Sitapura"];
const TYPES = ["2BHK", "3BHK", "4BHK", "Villa", "Plot", "Commercial"];
const STAGES: LeadStage[] = ["NEW", "CONTACTED", "SITE_VISIT", "NEGOTIATION", "CLOSED_WON", "CLOSED_LOST"];
const SOURCES: LeadSource[] = ["WEBSITE", "REFERRAL", "WALK_IN", "PORTAL_99ACRES", "PORTAL_MAGICBRICKS", "META_ADS", "GOOGLE_ADS", "CHANNEL_PARTNER", "COLD_CALL", "WHATSAPP"];
const TEMPS: LeadTemperature[] = ["HOT", "WARM", "COLD"];

const FIRST = ["Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Krishna", "Ishaan", "Rudra", "Ananya", "Diya", "Saanvi", "Aadhya", "Kiara", "Myra", "Pari", "Anika", "Navya", "Riya", "Rahul", "Pooja", "Manish", "Kavita", "Suresh", "Neha", "Vikram", "Deepa", "Rajesh", "Sunita"];
const LAST = ["Sharma", "Verma", "Gupta", "Agarwal", "Jain", "Singh", "Meena", "Saini", "Choudhary", "Bansal", "Khandelwal", "Soni", "Mathur", "Kumawat", "Rathore"];

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}
function rand(seed: number) {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}

async function main() {
  console.log("🌊 Seeding Real Estate OS…");

  // Clean (dev only)
  await prisma.$transaction([
    prisma.activity.deleteMany(),
    prisma.booking.deleteMany(),
    prisma.commissionLedger.deleteMany(),
    prisma.approval.deleteMany(),
    prisma.callLog.deleteMany(),
    prisma.lead.deleteMany(),
    prisma.property.deleteMany(),
    prisma.partner.deleteMany(),
    prisma.attendance.deleteMany(),
    prisma.leave.deleteMany(),
    prisma.salarySlip.deleteMany(),
    prisma.document.deleteMany(),
    prisma.offerLetter.deleteMany(),
    prisma.policy.deleteMany(),
    prisma.campaign.deleteMany(),
    prisma.newsItem.deleteMany(),
    prisma.competitor.deleteMany(),
    prisma.visitor.deleteMany(),
    prisma.reraProject.deleteMany(),
    prisma.integration.deleteMany(),
    prisma.setting.deleteMany(),
    prisma.target.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.modulePermission.deleteMany(),
    prisma.workflowTrigger.deleteMany(),
    prisma.linkPage.deleteMany(),
    prisma.ceoNote.deleteMany(),
    prisma.priceTrend.deleteMany(),
    prisma.user.deleteMany(),
    prisma.tenant.deleteMany(),
  ]);

  const pass = await bcrypt.hash("password123", 10);

  // ── Tenant ──
  const tenant = await prisma.tenant.create({
    data: {
      name: "Shubh Realtors",
      subdomain: "shubh",
      brandPrimary: "#d9a441",
      brandAccent: "#f0c14b",
      reraNo: "RAJ/P/2023/1842",
      gstNo: "08AABCS1234F1Z5",
      address: "5th Floor, Crystal Court, C-Scheme, Jaipur, Rajasthan 302001",
      plan: "ENTERPRISE",
      featureLimits: { users: 100, leads: 50000, storageGb: 50 },
    },
  });

  // ── Users (6 roles) ──
  const superAdmin = await prisma.user.create({
    data: { name: "Creative Sharks", email: "super@creativesharks.com", passwordHash: pass, role: Role.SUPER_ADMIN, tenantId: null, avatarColor: "#9b7ef0" },
  });
  const admin = await prisma.user.create({
    data: { name: "Vinit Agarwal", email: "vinit@demo.com", passwordHash: pass, role: Role.ADMIN, tenantId: tenant.id, avatarColor: "#d9a441", phone: "+91 98290 11111" },
  });
  const manager = await prisma.user.create({
    data: { name: "Rohit Kumar", email: "rohit@demo.com", passwordHash: pass, role: Role.MANAGER, tenantId: tenant.id, avatarColor: "#5b8def", phone: "+91 98290 22222" },
  });
  const employee = await prisma.user.create({
    data: { name: "Priya Aggarwal", email: "priya@demo.com", passwordHash: pass, role: Role.EMPLOYEE, tenantId: tenant.id, avatarColor: "#3ec78d", phone: "+91 98290 33333" },
  });
  const employee2 = await prisma.user.create({
    data: { name: "Amit Mehta", email: "amit.staff@demo.com", passwordHash: pass, role: Role.EMPLOYEE, tenantId: tenant.id, avatarColor: "#f0c14b", phone: "+91 98290 44444" },
  });
  const client = await prisma.user.create({
    data: { name: "Amit Mehta", email: "amit@demo.com", passwordHash: pass, role: Role.CLIENT, tenantId: tenant.id, avatarColor: "#f0c14b", phone: "+91 98290 55555" },
  });
  const partnerUser = await prisma.user.create({
    data: { name: "Sneha Kapoor", email: "sneha@demo.com", passwordHash: pass, role: Role.CHANNEL_PARTNER, tenantId: tenant.id, avatarColor: "#f0556a", phone: "+91 98290 66666" },
  });

  const staff = [admin, manager, employee, employee2];

  // ── Properties / Inventory ──
  const projects = ["Shubh Heights", "Shubh Greens", "Shubh Residency", "Shubh Plaza", "Shubh Enclave"];
  const properties = [];
  for (let i = 0; i < 24; i++) {
    const size = 600 + Math.floor(rand(i + 1) * 2400);
    const pps = 3500 + Math.floor(rand(i + 7) * 4500);
    const status = i % 5 === 0 ? PropertyStatus.SOLD : i % 4 === 0 ? PropertyStatus.HELD : PropertyStatus.AVAILABLE;
    const p = await prisma.property.create({
      data: {
        tenantId: tenant.id,
        name: `Unit ${String.fromCharCode(65 + (i % 6))}-${100 + i}`,
        projectName: pick(projects, i),
        unitType: pick(TYPES, i),
        sizeSqft: size,
        pricePerSqft: pps,
        totalPrice: size * pps,
        status,
        location: pick(AREAS, i),
        reraId: `RAJ/P/2023/${1800 + i}`,
      },
    });
    properties.push(p);
  }

  // ── Leads (~52) ──
  const leads = [];
  for (let i = 0; i < 52; i++) {
    const name = `${pick(FIRST, i)} ${pick(LAST, i * 3 + 1)}`;
    const stage = pick(STAGES, Math.floor(rand(i + 3) * STAGES.length));
    const value = 4000000 + Math.floor(rand(i + 11) * 28000000); // ₹40L–₹3.2Cr
    const assignee = pick(staff, i);
    const created = new Date(Date.now() - Math.floor(rand(i + 5) * 120) * 86400000);
    const lead = await prisma.lead.create({
      data: {
        tenantId: tenant.id,
        name,
        phone: `+91 9${Math.floor(700000000 + rand(i + 2) * 99999999)}`,
        email: `${name.split(" ")[0].toLowerCase()}${i}@gmail.com`,
        propertyType: pick(TYPES, i),
        location: pick(AREAS, i),
        source: pick(SOURCES, Math.floor(rand(i + 13) * SOURCES.length)),
        temperature: pick(TEMPS, Math.floor(rand(i + 17) * TEMPS.length)),
        stage,
        value,
        assignedToId: assignee.id,
        notes: i % 3 === 0 ? "Looking for ready-to-move, budget slightly flexible." : null,
        nextFollowUp: new Date(Date.now() + Math.floor(rand(i + 9) * 14) * 86400000),
        createdAt: created,
      },
    });
    leads.push(lead);

    // activities
    await prisma.activity.create({
      data: { tenantId: tenant.id, leadId: lead.id, type: ActivityType.NOTE, description: "Lead captured and assigned.", createdById: assignee.id, createdAt: created },
    });
    if (rand(i + 21) > 0.4) {
      await prisma.activity.create({
        data: { tenantId: tenant.id, leadId: lead.id, type: ActivityType.CALL, description: "Intro call — discussed requirement & budget.", createdById: assignee.id, createdAt: new Date(created.getTime() + 86400000) },
      });
    }
  }

  // ── Bookings (for closed-won leads) ──
  const wonLeads = leads.filter((l) => l.stage === "CLOSED_WON").slice(0, 8);
  for (let i = 0; i < wonLeads.length; i++) {
    const prop = pick(properties, i);
    await prisma.booking.create({
      data: {
        tenantId: tenant.id,
        leadId: wonLeads[i].id,
        propertyId: prop.id,
        amount: Number(prop.totalPrice),
        paymentStatus: pick([PaymentStatus.TOKEN, PaymentStatus.PAID_20, PaymentStatus.FULL_PAID], i),
        bookedById: pick(staff, i).id,
        schedule: [
          { milestone: "Booking Token", pct: 10, status: "PAID" },
          { milestone: "Agreement (20%)", pct: 20, status: i % 2 ? "PAID" : "DUE" },
          { milestone: "Slab Completion", pct: 40, status: "DUE" },
          { milestone: "Possession", pct: 30, status: "DUE" },
        ],
      },
    });
  }

  // ── HR: attendance (last 14 days for staff) ──
  for (const u of staff) {
    for (let d = 0; d < 14; d++) {
      const date = new Date();
      date.setDate(date.getDate() - d);
      if (date.getDay() === 0) continue; // skip Sundays
      const r = rand(u.id.length + d);
      const status = r > 0.92 ? AttendanceStatus.LEAVE : r > 0.85 ? AttendanceStatus.WFH : r > 0.8 ? AttendanceStatus.HALF_DAY : AttendanceStatus.PRESENT;
      await prisma.attendance.create({
        data: { tenantId: tenant.id, userId: u.id, date, status, checkIn: "09:42", checkOut: "18:55" },
      });
    }
  }

  // ── HR: leaves ──
  await prisma.leave.createMany({
    data: [
      { tenantId: tenant.id, userId: employee.id, type: "CASUAL", from: new Date(Date.now() + 3 * 86400000), to: new Date(Date.now() + 4 * 86400000), reason: "Family function", status: LeaveStatus.PENDING },
      { tenantId: tenant.id, userId: employee2.id, type: "SICK", from: new Date(Date.now() - 5 * 86400000), to: new Date(Date.now() - 4 * 86400000), reason: "Fever", status: LeaveStatus.APPROVED },
      { tenantId: tenant.id, userId: manager.id, type: "EARNED", from: new Date(Date.now() + 10 * 86400000), to: new Date(Date.now() + 14 * 86400000), reason: "Vacation", status: LeaveStatus.PENDING },
    ],
  });

  // ── HR: salary slips ──
  for (const u of staff) {
    const gross = 45000 + Math.floor(rand(u.id.length) * 90000);
    const ded = Math.floor(gross * 0.12);
    await prisma.salarySlip.create({
      data: { tenantId: tenant.id, userId: u.id, month: "2026-05", gross, deductions: ded, net: gross - ded },
    });
  }

  // ── HR: offer letters & documents ──
  await prisma.offerLetter.createMany({
    data: [
      { tenantId: tenant.id, candidate: "Karan Malhotra", role: "Sales Executive", ctc: 540000 },
      { tenantId: tenant.id, candidate: "Nisha Rao", role: "Tele-caller", ctc: 360000 },
    ],
  });

  // ── Policies ──
  await prisma.policy.createMany({
    data: [
      { tenantId: tenant.id, category: "HR", title: "Working Hours & Attendance", body: "Office hours are 9:30 AM – 6:30 PM, Monday to Saturday. Biometric check-in is mandatory. Three late marks in a month equal one half-day deduction." },
      { tenantId: tenant.id, category: "LEAVE", title: "Leave Policy", body: "Employees are entitled to 12 casual leaves, 6 sick leaves and 15 earned leaves per annum. Leaves must be applied at least 2 days in advance except for emergencies." },
      { tenantId: tenant.id, category: "SALES", title: "Discount Approval Matrix", body: "Sales executives may offer up to 2% discount. 2–5% requires Manager approval, above 5% requires Admin sign-off through the Approvals workflow." },
      { tenantId: tenant.id, category: "CONDUCT", title: "Code of Conduct", body: "All client communication must be professional. Sharing internal pricing sheets or client databases externally is strictly prohibited and grounds for termination." },
    ],
  });

  // ── Channel Partner + commissions ──
  const partner = await prisma.partner.create({
    data: { tenantId: tenant.id, userId: partnerUser.id, name: "Sneha Kapoor", firm: "Kapoor Associates", phone: "+91 98290 66666", email: "sneha@demo.com", rera: "RAJ/A/2022/0098", totalDeals: 5, totalValue: 38500000 },
  });
  const partner2 = await prisma.partner.create({
    data: { tenantId: tenant.id, name: "Mohit Realty", firm: "Mohit Realty Pvt Ltd", phone: "+91 98290 77777", rera: "RAJ/A/2021/0451", totalDeals: 3, totalValue: 21000000 },
  });
  for (let i = 0; i < 6; i++) {
    const dv = 5000000 + Math.floor(rand(i + 31) * 15000000);
    await prisma.commissionLedger.create({
      data: {
        tenantId: tenant.id,
        partnerId: i % 2 === 0 ? partner.id : partner2.id,
        leadName: `${pick(FIRST, i + 5)} ${pick(LAST, i + 2)}`,
        dealValue: dv,
        rate: 2,
        amount: dv * 0.02,
        status: pick([CommissionStatus.PAID, CommissionStatus.APPROVED, CommissionStatus.PENDING], i),
      },
    });
  }

  // ── Campaigns ──
  await prisma.campaign.createMany({
    data: [
      { tenantId: tenant.id, name: "Diwali Dhamaka Offer", channel: CampaignChannel.WHATSAPP, template: "🪔 Diwali special! Book a 3BHK at Shubh Heights & save ₹2.5L. Reply YES to know more.", audience: "Hot leads", status: CampaignStatus.SENT, analytics: { sent: 420, delivered: 408, read: 311, replied: 47 } },
      { tenantId: tenant.id, name: "New Launch — Shubh Enclave", channel: CampaignChannel.INSTAGRAM, template: "Introducing Shubh Enclave on Ajmer Road 🏡", audience: "All", status: CampaignStatus.SCHEDULED, scheduledAt: new Date(Date.now() + 2 * 86400000), analytics: {} },
      { tenantId: tenant.id, name: "Weekend Site Visit Drive", channel: CampaignChannel.SMS, template: "Free cab for site visits this weekend! Call 0141-4001234.", audience: "Warm leads", status: CampaignStatus.DRAFT, analytics: {} },
    ],
  });

  // ── News (demo fallback) ──
  await prisma.newsItem.createMany({
    data: [
      { category: "POLICY", title: "RBI holds repo rate at 6.5%; home loan EMIs stable", summary: "The central bank's status quo keeps borrowing costs steady, supporting housing demand in tier-2 cities.", source: "Economic Times", url: "https://economictimes.indiatimes.com", publishedAt: new Date(Date.now() - 2 * 86400000) },
      { category: "MARKET", title: "Jaipur residential prices up 8.4% YoY led by Jagatpura & Mansarovar", summary: "Strong end-user demand and infrastructure push lift capital values across western Jaipur.", source: "Housing.com Research", publishedAt: new Date(Date.now() - 4 * 86400000) },
      { category: "RERA", title: "RERA Rajasthan mandates quarterly project progress uploads", summary: "Developers must now publish construction updates every quarter or face penalties.", source: "RERA Rajasthan", publishedAt: new Date(Date.now() - 6 * 86400000) },
      { category: "MARKET", title: "Tonk Road emerges as Jaipur's new commercial corridor", summary: "Grade-A office absorption rising as IT and BFSI firms expand footprints.", source: "Mint", publishedAt: new Date(Date.now() - 8 * 86400000) },
      { category: "GLOBAL", title: "Global REITs rally on rate-cut expectations", summary: "Listed real estate gains as investors price in easier monetary policy through 2026.", source: "Bloomberg", publishedAt: new Date(Date.now() - 10 * 86400000) },
      { category: "POLICY", title: "Govt extends PMAY-Urban benefits for affordable housing", summary: "Interest subsidy scheme extension expected to boost sub-₹45L segment.", source: "PIB", publishedAt: new Date(Date.now() - 12 * 86400000) },
    ],
  });

  // ── Competitors ──
  await prisma.competitor.createMany({
    data: [
      { tenantId: tenant.id, name: "Mahima Group", project: "Mahima Elanza", location: "Jagatpura", pricePerSqft: 6200, amenities: ["Clubhouse", "Pool", "Gym", "Kids Play"], possession: "Dec 2026" },
      { tenantId: tenant.id, name: "Manglam Build", project: "Manglam Aananda", location: "Vaishali Nagar", pricePerSqft: 7100, amenities: ["Pool", "Gym", "Jogging Track"], possession: "Jun 2027" },
      { tenantId: tenant.id, name: "Ashiana Housing", project: "Ashiana Umang", location: "Mansarovar", pricePerSqft: 5800, amenities: ["Clubhouse", "Senior Living", "Gym"], possession: "Ready" },
    ],
  });

  // ── Visitors ──
  await prisma.visitor.createMany({
    data: [
      { tenantId: tenant.id, name: "Deepak Saini", phone: "+91 90011 22334", purpose: "Site visit — Shubh Heights", qrCode: "VIS-100231" },
      { tenantId: tenant.id, name: "Anita Verma", phone: "+91 90011 55667", purpose: "Document collection", qrCode: "VIS-100232", checkOut: new Date() },
    ],
  });

  // ── RERA projects ──
  await prisma.reraProject.createMany({
    data: [
      { tenantId: tenant.id, projectName: "Shubh Heights", reraNo: "RAJ/P/2023/1842", registeredAt: new Date("2023-04-12"), expiryAt: new Date("2027-04-12"), docs: [{ name: "Title Deed", ok: true }, { name: "Approved Plan", ok: true }, { name: "Encumbrance Cert", ok: false }], deadlines: [{ label: "Q2 Progress Upload", due: "2026-06-30" }] },
      { tenantId: tenant.id, projectName: "Shubh Enclave", reraNo: "RAJ/P/2024/2210", registeredAt: new Date("2024-01-20"), expiryAt: new Date("2026-07-20"), docs: [{ name: "Title Deed", ok: true }, { name: "Approved Plan", ok: false }], deadlines: [{ label: "RERA Renewal", due: "2026-07-20" }] },
    ],
  });

  // ── Targets (current + last month) ──
  for (const u of staff) {
    await prisma.target.createMany({
      data: [
        { tenantId: tenant.id, userId: u.id, month: "2026-06", targetValue: 25000000 + Math.floor(rand(u.id.length) * 15000000) },
        { tenantId: tenant.id, userId: u.id, month: "2026-05", targetValue: 22000000 },
      ],
    });
  }

  // ── Approvals ──
  await prisma.approval.create({
    data: { tenantId: tenant.id, type: ApprovalType.DISCOUNT, leadId: leads[0].id, requestedById: employee.id, status: ApprovalStatus.PENDING, note: "Requesting 6% discount to close ₹1.4Cr deal." },
  });
  await prisma.approval.create({
    data: { tenantId: tenant.id, type: ApprovalType.BOOKING, requestedById: employee2.id, status: ApprovalStatus.APPROVED, decidedById: manager.id, note: "Booking with token below standard." },
  });

  // ── Price trends (7 months per area: Dec 2025 → Jun 2026) ──
  const TREND_MONTHS = ["2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06"];
  for (const area of AREAS) {
    let base = 4500 + Math.floor(rand(area.length) * 2500);
    for (let m = 0; m < TREND_MONTHS.length; m++) {
      base = Math.round(base * (1 + (rand(area.length + m) - 0.35) * 0.04));
      await prisma.priceTrend.create({
        data: { tenantId: tenant.id, area, month: TREND_MONTHS[m], pricePerSqft: base },
      });
    }
  }

  // ── CEO notes ──
  await prisma.ceoNote.createMany({
    data: [
      { tenantId: tenant.id, userId: admin.id, category: "OVERVIEW", title: "Q2 Focus", body: "Push Shubh Enclave pre-launch, target 30 bookings. Hire 4 tele-callers." },
      { tenantId: tenant.id, userId: admin.id, category: "INVESTMENT", title: "Land parcel — Ajmer Road", body: "8 bigha negotiation in progress.", amount: 65000000 },
      { tenantId: tenant.id, userId: admin.id, category: "IDEA", title: "Referral super-app", body: "Channel-partner mobile app with instant commission tracking." },
      { tenantId: tenant.id, userId: admin.id, category: "HEALTH", title: "Routine", body: "Gym 5x/week, sleep 7h. Energy good." },
    ],
  });

  // ── Call logs ──
  for (let i = 0; i < 12; i++) {
    await prisma.callLog.create({
      data: {
        tenantId: tenant.id,
        userId: pick(staff, i).id,
        leadName: `${pick(FIRST, i + 2)} ${pick(LAST, i + 4)}`,
        phone: `+91 9${Math.floor(700000000 + rand(i + 40) * 99999999)}`,
        disposition: pick(["CONNECTED", "NO_ANSWER", "BUSY", "CALLBACK", "WRONG_NUMBER"], i),
        durationSec: Math.floor(rand(i + 3) * 480),
        notes: i % 3 === 0 ? "Interested, share brochure on WhatsApp." : null,
        createdAt: new Date(Date.now() - Math.floor(rand(i) * 5) * 86400000),
      },
    });
  }

  // ── Workflow triggers ──
  await prisma.workflowTrigger.createMany({
    data: [
      { tenantId: tenant.id, name: "Welcome new lead", event: { type: "LEAD_CREATED" }, actions: [{ type: "WHATSAPP", template: "Thanks for your interest! Our team will call shortly." }], runCount: 38 },
      { tenantId: tenant.id, name: "Notify manager on hot lead", event: { type: "LEAD_CREATED", filter: { temperature: "HOT" } }, actions: [{ type: "NOTIFY", to: "MANAGER" }], runCount: 11 },
      { tenantId: tenant.id, name: "Follow-up reminder after site visit", event: { type: "STAGE_CHANGED", to: "SITE_VISIT" }, actions: [{ type: "TASK", label: "Call within 24h" }], runCount: 7 },
    ],
  });

  // ── Link page ──
  await prisma.linkPage.create({
    data: {
      tenantId: tenant.id,
      slug: "shubh-realtors",
      title: "Shubh Realtors",
      bio: "Premium homes in Jaipur • RERA RAJ/P/2023/1842",
      theme: { bg: "#0b0e14", accent: "#d9a441" },
      published: true,
      views: 1284,
      blocks: [
        { type: "link", label: "📞 Book a Site Visit", url: "tel:+911414001234" },
        { type: "link", label: "🏡 View Live Inventory", url: "#" },
        { type: "link", label: "💬 WhatsApp Us", url: "https://wa.me/919829011111" },
        { type: "link", label: "📍 Locate Our Office", url: "#" },
      ],
    },
  });

  // ── Module permissions (defaults for all roles, all modules) ──
  const { MODULES } = await import("../src/lib/modules");
  const roles: Role[] = ["SUPER_ADMIN", "ADMIN", "MANAGER", "EMPLOYEE", "CLIENT", "CHANNEL_PARTNER"];
  for (const role of roles) {
    for (const m of MODULES) {
      const canView = m.roles.includes(role);
      await prisma.modulePermission.create({
        data: { tenantId: tenant.id, role, moduleKey: m.key, canView, canEdit: canView && ["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(role) },
      });
    }
  }

  // ── Integration rows (empty / not connected) ──
  const { INTEGRATIONS } = await import("../src/lib/integrations");
  for (const i of INTEGRATIONS) {
    await prisma.integration.create({
      data: { tenantId: tenant.id, name: i.name, value: null, isActive: false },
    });
  }

  // ── Settings ──
  await prisma.setting.createMany({
    data: [
      { tenantId: tenant.id, key: "notify.email", value: "true" },
      { tenantId: tenant.id, key: "notify.whatsapp", value: "true" },
      { tenantId: tenant.id, key: "company.tagline", value: "Premium homes, simplified." },
    ],
  });

  // ── A second demo tenant for Super Admin cross-tenant view ──
  await prisma.tenant.create({
    data: {
      name: "Skyline Estates",
      subdomain: "skyline",
      brandPrimary: "#5b8def",
      brandAccent: "#9b7ef0",
      plan: "GROWTH",
      address: "Tonk Road, Jaipur",
      reraNo: "RAJ/P/2022/0912",
    },
  });

  console.log("✅ Seed complete.");
  console.log("\n──── DEMO LOGINS (password: password123) ────");
  console.log("Super Admin     super@creativesharks.com");
  console.log("Admin (Vinit)   vinit@demo.com");
  console.log("Manager         rohit@demo.com");
  console.log("Employee        priya@demo.com");
  console.log("Client          amit@demo.com");
  console.log("Channel Partner sneha@demo.com");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
