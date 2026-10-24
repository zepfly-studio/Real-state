# Lead Generation add-on

A self-contained module inside Real Estate OS: launch a campaign by voice or text, find sellers,
email them through **Smartlead**, WhatsApp them through **Evolution / CloudStation**, let a **Gemini**
assistant answer, and move the interested ones into the CRM with one click.

It is **additive**: it adds new pages, API routes and four new tables. It does not change any
existing CRM table, page or API. (The only edits to existing files are registry entries: the sidebar
group in `src/lib/modules.ts`, integration names in `src/lib/integrations.ts`, the new models at the
end of `prisma/schema.prisma`, and one line in the Team page that lists sidebar groups.)

---

## What you get

Sidebar group **LEAD GENERATION**:

| Page | Path | Who sees it | What it does |
|---|---|---|---|
| Lead Gen Overview | `/leadgen/overview` | staff | Launch box (mic or text), KPIs, Email + WhatsApp channel cards, funnel, activity, campaigns, "Ready to talk to" with **Add to CRM** |
| Prospects | `/leadgen/leads` | staff | Filter by stage, search, CSV export, detail drawer (journey, WhatsApp chat, **Interested / Not interested**, **Add to CRM**) |
| Reply Inbox | `/leadgen/inbox` | staff | WhatsApp + email replies in one list, reply on either channel, "Needs a reply" filter |
| Email Campaigns | `/leadgen/email` | staff | Smartlead campaigns with all metrics (leads, sent, opened, clicked, replied, positive, bounced), create / start / pause / stop, add leads (paste CSV), edit the email sequence |
| Mailboxes | `/leadgen/mailboxes` | managers | Sending accounts, warm-up, reputation, daily capacity, connection errors |
| Setup & Connect | `/leadgen/setup` | admins | Paste each key once, **Save & test**, and copy the values n8n needs |

**Gemini voice assistant** on every Lead Generation page: press **Shift + D** (or the *Ask assistant*
button) and talk or type — *"How many leads do I have?"*, *"Reply to the follow-ups"*, *"Launch a
campaign for 30 sellers in Mansarovar"*, *"Add Dana to the CRM"*. It reads freely but **never sends or
changes anything without a confirmation** ("yes" or the Confirm button). Voice needs Chrome or Edge;
typing works everywhere.

Roles follow the existing permission matrix (Team & Roles → the new modules appear there and in
White-Label, and can be switched off per role or per tenant). Clients and channel partners never see it.
Every query is scoped by `tenantId`.

---

## Credentials needed

All are entered per workspace in **Lead Generation → Setup & Connect** (stored like every other
integration). Environment variables work as a fallback for single-tenant installs.

| Tool | What to paste | Where to get it | Env fallback |
|---|---|---|---|
| Smartlead | API key | Smartlead → Settings → API key | `SMARTLEAD_API_KEY` |
| WhatsApp (Evolution / CloudStation) | Server URL, instance name, API key | Your Evolution server (`AUTHENTICATION_API_KEY`) | `EVOLUTION_API_URL`, `EVOLUTION_INSTANCE`, `EVOLUTION_API_KEY` |
| Google Gemini | API key (starts with `AIza`) | aistudio.google.com → Get API key | `GEMINI_API_KEY` |
| n8n | Production URL of the workflow's *Voice Command Webhook* | Your n8n | `N8N_WEBHOOK_URL` |

Optional: `LEADGEN_GEMINI_MODEL` (default `gemini-2.5-flash`).

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
   | Apify Scrape Leads | Custom Auth / Bearer | your Apify token (and replace `YOUR_APIFY_ACTOR_ID` in the URL) |
   | Smartlead Cold Email | Custom Auth (templated) | `{"qs":{"api_key":"{{api_key}}"}}` with your Smartlead key (and replace `YOUR_CAMPAIGN_ID`) |
   | WhatsApp Intro Message, WhatsApp Send Reply | Header Auth | header `apikey` = your Evolution key |
   | Chat Model | Google Gemini (PaLM) API | your Gemini key |

4. **Publish** the workflow. Copy the Production URL of **Voice Command Webhook** into Setup & Connect → *n8n campaign webhook URL* and press **Test connection**.
5. In Evolution, point the instance webhook (event `MESSAGES_UPSERT`) at the Production URL of **WhatsApp Inbound Webhook**.

How the workflow behaves:
- **Launch** (from the CRM): n8n answers 200 instantly → Apify scrape → each lead saved to the CRM → Smartlead email (skipped when a lead has no email) → wait 2 h → WhatsApp intro → status `WHATSAPP_SENT`. A failed WhatsApp send is logged in the CRM activity feed and the lead is **not** marked as messaged.
- **Inbound WhatsApp**: only prospects the CRM already knows get a Gemini reply; strangers and groups are ignored. Both sides of the conversation are logged in the Reply Inbox.

n8n ⇄ CRM endpoints (header `X-Leadgen-Token`):

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/leadgen/sync` | events: `new_lead`, `status_change`, `whatsapp_message`, `send_failed` |
| GET | `/api/leadgen/n8n/leads?status=SCRAPED&campaign_id=…` | leads to contact next |
| GET | `/api/leadgen/n8n/leads?phone=…` | `{found, lead}` — gate for the WhatsApp bot |

---

## Data

Four new tables (migration `20261024000000_leadgen_addon`, `CREATE TABLE` / `CREATE INDEX` only):
`LgCampaign`, `LgLead`, `LgMessage`, `LgEvent`. No foreign keys into CRM tables.
**Add to CRM** only ever inserts one row into the CRM `Lead` table (source `WHATSAPP`, temperature
`HOT` for interested prospects) — or links the existing CRM lead with the same phone number.
It never edits or deletes CRM records.

## Lead stages

`SCRAPED` (New) → `EMAIL_SENT` (Emailed) → `WHATSAPP_SENT` (Messaged) → `HOT_LEAD` (Interested) | `UNQUALIFIED` (Not interested).
There is no calling stage in this module.
