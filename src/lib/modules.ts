import { Role } from "@prisma/client";

export type ModuleGroup = "WORKSPACE" | "LEAD GENERATION" | "HEAVY TOOLS & AI" | "ADMIN";

export interface ModuleDef {
  key: string;
  label: string;
  href: string;
  icon: string; // lucide-react icon name
  group: ModuleGroup;
  /** Roles allowed by default (before tenant permission overrides). */
  roles: Role[];
}

const ALL: Role[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "MANAGER",
  "EMPLOYEE",
  "CLIENT",
  "CHANNEL_PARTNER",
];
const STAFF: Role[] = ["SUPER_ADMIN", "ADMIN", "MANAGER", "EMPLOYEE"];
const MGMT: Role[] = ["SUPER_ADMIN", "ADMIN", "MANAGER"];
const OWNER: Role[] = ["SUPER_ADMIN", "ADMIN"];

export const MODULES: ModuleDef[] = [
  // ── WORKSPACE ──
  { key: "dashboard", label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard", group: "WORKSPACE", roles: ALL },
  { key: "news", label: "Property Live News", href: "/news", icon: "Newspaper", group: "WORKSPACE", roles: ALL },
  { key: "crm", label: "Sales & Support CRM", href: "/crm", icon: "Users", group: "WORKSPACE", roles: STAFF },
  { key: "calling", label: "Sales Calling", href: "/calling", icon: "PhoneCall", group: "WORKSPACE", roles: STAFF },
  { key: "finance", label: "Finance & Booking", href: "/finance", icon: "Wallet", group: "WORKSPACE", roles: [...MGMT, "CLIENT"] },
  { key: "hr", label: "Employee / HR", href: "/hr", icon: "BriefcaseBusiness", group: "WORKSPACE", roles: STAFF },
  { key: "policies", label: "Company Policies", href: "/policies", icon: "ScrollText", group: "WORKSPACE", roles: ALL },
  { key: "ceo", label: "CEO Space", href: "/ceo", icon: "Crown", group: "WORKSPACE", roles: OWNER },
  { key: "partners", label: "Channel Partners", href: "/partners", icon: "Handshake", group: "WORKSPACE", roles: [...MGMT, "CHANNEL_PARTNER"] },

  // ── LEAD GENERATION (add-on: voice-launched campaigns, Smartlead email, WhatsApp, ChatGPT assistant) ──
  { key: "leadgen", label: "Lead Gen Overview", href: "/leadgen/overview", icon: "Rocket", group: "LEAD GENERATION", roles: STAFF },
  { key: "leadgen-leads", label: "Prospects", href: "/leadgen/leads", icon: "UserSearch", group: "LEAD GENERATION", roles: STAFF },
  { key: "leadgen-inbox", label: "Reply Inbox", href: "/leadgen/inbox", icon: "MessagesSquare", group: "LEAD GENERATION", roles: STAFF },
  { key: "leadgen-email", label: "Email Campaigns", href: "/leadgen/email", icon: "MailPlus", group: "LEAD GENERATION", roles: STAFF },
  { key: "leadgen-mailboxes", label: "Mailboxes", href: "/leadgen/mailboxes", icon: "Inbox", group: "LEAD GENERATION", roles: MGMT },
  { key: "leadgen-setup", label: "Setup & Connect", href: "/leadgen/setup", icon: "PlugZap", group: "LEAD GENERATION", roles: OWNER },

  // ── HEAVY TOOLS & AI ──
  { key: "ai", label: "AI Assistant", href: "/tools/ai", icon: "Sparkles", group: "HEAVY TOOLS & AI", roles: STAFF },
  { key: "lead-genius", label: "Lead Genius", href: "/tools/lead-genius", icon: "Target", group: "HEAVY TOOLS & AI", roles: STAFF },
  { key: "social", label: "Social Auto Post", href: "/tools/social", icon: "Share2", group: "HEAVY TOOLS & AI", roles: STAFF },
  { key: "email-digest", label: "Smart Email Digest", href: "/tools/email-digest", icon: "Mail", group: "HEAVY TOOLS & AI", roles: STAFF },
  { key: "whatsapp", label: "WhatsApp CRM", href: "/tools/whatsapp", icon: "MessageCircle", group: "HEAVY TOOLS & AI", roles: STAFF },
  { key: "seo", label: "SEO Genius", href: "/tools/seo", icon: "Search", group: "HEAVY TOOLS & AI", roles: STAFF },
  { key: "gmb", label: "GMB Extractor", href: "/tools/gmb", icon: "MapPin", group: "HEAVY TOOLS & AI", roles: STAFF },
  { key: "creatives", label: "Creatives Generator", href: "/tools/creatives", icon: "Image", group: "HEAVY TOOLS & AI", roles: STAFF },
  { key: "workflows", label: "Workflow Triggers", href: "/tools/workflows", icon: "Workflow", group: "HEAVY TOOLS & AI", roles: MGMT },
  { key: "rera", label: "RERA Compliance", href: "/tools/rera", icon: "ShieldCheck", group: "HEAVY TOOLS & AI", roles: MGMT },
  { key: "visitors", label: "Visitor Log & Security", href: "/tools/visitors", icon: "QrCode", group: "HEAVY TOOLS & AI", roles: STAFF },
  { key: "competitors", label: "Competitor Tracker", href: "/tools/competitors", icon: "Swords", group: "HEAVY TOOLS & AI", roles: MGMT },
  { key: "price-trends", label: "Property Price Trends", href: "/tools/price-trends", icon: "TrendingUp", group: "HEAVY TOOLS & AI", roles: STAFF },
  { key: "ivr", label: "IVR Integration", href: "/tools/ivr", icon: "Headphones", group: "HEAVY TOOLS & AI", roles: MGMT },
  { key: "link-builder", label: "Link Page Builder", href: "/tools/link-builder", icon: "Link", group: "HEAVY TOOLS & AI", roles: STAFF },
  { key: "file-converter", label: "File Converter", href: "/tools/file-converter", icon: "FileCog", group: "HEAVY TOOLS & AI", roles: ALL },
  { key: "pdf-sign", label: "PDF Signature", href: "/tools/pdf-sign", icon: "PenLine", group: "HEAVY TOOLS & AI", roles: ALL },

  // ── ADMIN ──
  { key: "team", label: "Team & Roles", href: "/admin/team", icon: "UsersRound", group: "ADMIN", roles: OWNER },
  { key: "white-label", label: "White-Label", href: "/admin/white-label", icon: "Palette", group: "ADMIN", roles: OWNER },
  { key: "settings", label: "Settings", href: "/settings", icon: "Settings", group: "ADMIN", roles: OWNER },
  { key: "super-admin", label: "Super Admin", href: "/super-admin", icon: "ServerCog", group: "ADMIN", roles: ["SUPER_ADMIN"] },
];

export const MODULE_GROUPS: ModuleGroup[] = ["LEAD GENERATION", "WORKSPACE", "HEAVY TOOLS & AI", "ADMIN"];

export function moduleByKey(key: string): ModuleDef | undefined {
  return MODULES.find((m) => m.key === key);
}

export function moduleByHref(pathname: string): ModuleDef | undefined {
  // longest-prefix match so nested routes still resolve
  return [...MODULES]
    .sort((a, b) => b.href.length - a.href.length)
    .find((m) => pathname === m.href || pathname.startsWith(m.href + "/"));
}
