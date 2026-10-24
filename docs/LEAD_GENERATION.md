# Lead Generation add-on + CRM-wide voice assistant

A self-contained module inside Real Estate OS. Say who you need (*"Noida mein 50 dentists chahiye"*), the AI turns
it into a proper **search plan**, n8n finds the people, the CRM keeps only decision makers, emails them through
**Smartlead**, WhatsApps them through **Evolution / CloudStation**, a **ChatGPT** agent answers replies, and the
interested ones move into the CRM with one click. A **ChatGPT voice assistant** (Shift + D) runs CRM and
lead-generation work from any page.

It is **additive**: new pages, API routes and four new `Lg*` tables. No existing CRM table changes. Edits to existing
files: the sidebar group + its order (`src/lib/modules.ts`), integration names (`src/lib/integrations.ts`), new models at
the end of `prisma/schema.prisma`, the Team page's group list (one line), the login redirect (staff land on Lead
Generation), mounting the assistant in `src/app/(app)/layout.tsx`, and the test helpers that wait for the landing page.

---

## What you get

Sidebar group **LEAD GENERATION** (first in the sidebar; staff land on its Overview after login):

| Page | Path | Who sees it | What it does |
|---|---|---|---|
| Lead Gen Overview | `/leadgen/overview` | staff | Launch box (speak or type → AI search plan → edit → launch), KPIs, Email + WhatsApp cards, funnel, activity, campaigns (with *filtered out* counts), "Ready to talk to" with **Add to CRM** |
| Prospects | `/leadgen/leads` | staff | Title, company, contact, **priority** (decision makers first), stage filters, search, CSV, detail drawer (Interested / Not interested, Add to CRM, WhatsApp thread) |
| Reply Inbox | `/leadgen/inbox` | staff | WhatsApp + email replies in one list, reply on either channel |
| Email Campaigns | `/leadgen/email` | staff | Smartlead campaigns with all metrics, create / start / pause / stop, add leads, edit sequences |
| Mailboxes | `/leadgen/mailboxes` | managers | Sending accounts, warm-up, reputation, capacity |
| Setup & Connect | `/leadgen/setup` | admins | Paste each key once, **Save & test**, copy the values n8n needs |

### AI search plan (no raw pass-through)

*"Noida mein 50 dentists chahiye"* becomes:

- **Keywords:** dentist, dental clinic, orthodontist, dental surgeon, endodontist, implantologist…
- **Decision makers:** owner, founder, chief dental surgeon, clinic director, partner…
- **Prioritise seniority:** owner, founder, director, partner…
- **Exclude (never import):** assistant, intern, student, trainee, receptionist, fresher…
- **Location:** Noida, Uttar Pradesh, India · **How many:** 50

Everything is editable before launch. n8n receives the plan, and the CRM applies it again to every result: excluded
titles are dropped (counted as *filtered out*), decision makers get a high priority score. Without a ChatGPT key a
built-in reader still builds a plan (professions dictionary + default decision-maker filters, English and Hinglish).

### CRM-wide voice assistant (ChatGPT)

On every CRM page for staff: **Shift + D** (or *Ask assistant*). Speak or type in English / Hindi / Hinglish:

- CRM: *"Aaj ke follow-ups kya hain?"*, *"Rahul ko site visit pe move karo, kal 11 baje follow-up, Rohit ko assign karo"*,
  *"Add lead Priya 9811…, 3BHK Mansarovar, hot"*, *"How many units are available?"*, *"Recent bookings"*
- Lead generation: *"Noida mein 50 dentists chahiye"* (plans the campaign), *"Reply to the follow-ups"*, *"Add Dana to the CRM"*
- Navigation: *"Open prospects"*, *"CRM kholo"*

Reads happen at once; anything that creates, changes or sends something shows a confirm card first (say "yes" or
press Confirm), and is re-validated on the server. Each person only gets tools their role can access (permission
matrix). Voice needs Chrome or Edge; typing works everywhere.

**Low API cost by design:** `gpt-4o-mini`; plain navigation commands are handled without calling the model; the
system prompt and tool list are fixed per role so OpenAI's prompt caching bills repeats at the cached rate (date and
page go in the user turn); short tool descriptions; results trimmed to ~2.5k characters; replies capped at 300 tokens;
at most 4 model↔tool rounds and the last 8 turns per request; pure navigation skips the second model call; the plan
is one JSON-mode call capped at 400 tokens. Every response reports its model calls and tokens (`cost`).

---

## Credentials needed

All are entered per workspace in **Lead Generation → Setup & Connect** (stored like every other
integration). Environment variables work as a fallback for single-tenant installs.

| Tool | What to paste | Where to get it | Env fallback |
|---|---|---|---|
| Smartlead | API key | Smartlead → Settings → API key | `SMARTLEAD_API_KEY` |
| WhatsApp (Evolution / CloudStation) | Server URL, instance name, API key | Your Evolution server (`AUTHENTICATION_API_KEY`) | `EVOLUTION_API_URL`, `EVOLUTION_INSTANCE`, `EVOLUTION_API_KEY` |
| ChatGPT (OpenAI) | API key (starts with `sk-`) | platform.openai.com → API keys | `OPENAI_API_KEY` |
| n8n | Production URL of the workflow's *Voice Command Webhook* | Your n8n | `N8N_WEBHOOK_URL` |

Optional: `LEADGEN_OPENAI_MODEL` (default `gpt-4o-mini`).

Then press **Create token** on the Setup page. That workspace token is what n8n sends back to the CRM.

---

## Connecting n8n (one time)

1. In n8n: **Workflows → Import from file** → `n8n/lead-generation-workflow.json`.
2. Open the **CRM Settings** node and fill in the four values (all shown on the Setup page):
   - `crm_url` — the CRM address, e.g. `https://your-app.up.railway.app`
   - `token` — the workspace token from Setup & Connect
   - `evolution_url`, `evolution_instance` — your WhatsApp server and instance
3. Create these n8n credentials and select them on the nodes:

   | Node(s) | Credential type | Value |
   |---|---|---|
   | Apify Scrape Leads | Custom Auth / Bearer | your Apify token; replace `YOUR_APIFY_ACTOR_ID` in the URL. The body sends the plan as `searchQueries`, `jobTitles`, `excludeJobTitles`, `seniority`, `location`, `maxItems` — rename the keys if your actor uses other input names |
   | Smartlead Cold Email | Custom Auth (templated) | `{"qs":{"api_key":"{{api_key}}"}}` with your Smartlead key (and replace `YOUR_CAMPAIGN_ID`) |
   | WhatsApp Intro Message, WhatsApp Send Reply | Header Auth | header `apikey` = your Evolution key |
   | Chat Model | OpenAI | your OpenAI key (model `gpt-4o-mini`) |

4. **Publish** the workflow. Copy the Production URL of **Voice Command Webhook** into Setup & Connect → *n8n campaign webhook URL* and press **Test connection**.
5. In Evolution, point the instance webhook (event `MESSAGES_UPSERT`) at the Production URL of **WhatsApp Inbound Webhook**.

How the workflow behaves:
- **Launch** (from the CRM): n8n answers 200 instantly → Apify scrape → the CRM is told how many sellers were found (or **why the search failed** — the campaign then shows *Failed* with the reason) → each lead saved to the CRM → Smartlead email (skipped when a lead has no email) → wait 2 h → WhatsApp intro → status `WHATSAPP_SENT`.
- A failed email or WhatsApp send is logged in the CRM activity feed, and the lead is **not** marked as emailed / messaged. A failed email still lets the WhatsApp intro go out.
- **Inbound WhatsApp**: only prospects the CRM already knows get a ChatGPT reply (with memory, qualifying asking price and timeline); strangers and groups are ignored. Both sides of the conversation are logged in the Reply Inbox.

n8n ⇄ CRM endpoints (header `X-Leadgen-Token`):

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/leadgen/sync` | events: `new_lead`, `status_change`, `whatsapp_message`, `send_failed`, `campaign_scraped`, `campaign_failed` |
| GET | `/api/leadgen/n8n/leads?status=SCRAPED&campaign_id=…` | leads to contact next |
| GET | `/api/leadgen/n8n/leads?phone=…` | `{found, lead}` — gate for the WhatsApp bot |

---

## Data

Four new tables (migrations `20261024000000_leadgen_addon` and `20261025000000_leadgen_plan` — they only create or alter the `Lg*` tables):
`LgCampaign` (incl. the approved plan and filtered count), `LgLead` (incl. title, company, website, LinkedIn, city, priority score; phone optional), `LgMessage`, `LgEvent`. No foreign keys into CRM tables.
**Add to CRM** only ever inserts one row into the CRM `Lead` table (source `WHATSAPP`, temperature
`HOT` for interested prospects) — or links the existing CRM lead with the same phone number.
It never edits or deletes CRM records.

## Lead stages

`SCRAPED` (New) → `EMAIL_SENT` (Emailed) → `WHATSAPP_SENT` (Messaged) → `HOT_LEAD` (Interested) | `UNQUALIFIED` (Not interested).
There is no calling stage in this module.
