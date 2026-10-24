/** The tools this add-on needs, in the order a person connects them. */
export const SETUP_FIELDS = [
  { name: "SMARTLEAD", tool: "smartlead", label: "Smartlead API key", secret: true, placeholder: "Paste your Smartlead API key", help: "Smartlead → Settings → API key." },
  { name: "EVOLUTION_URL", tool: "whatsapp", label: "WhatsApp server URL", secret: false, placeholder: "https://your-evolution-server", help: "The address of your Evolution / CloudStation server." },
  { name: "EVOLUTION_INSTANCE", tool: "whatsapp", label: "WhatsApp instance name", secret: false, placeholder: "whatapp", help: "Exactly as named in Evolution." },
  { name: "EVOLUTION_KEY", tool: "whatsapp", label: "WhatsApp API key", secret: true, placeholder: "AUTHENTICATION_API_KEY", help: "Your Evolution AUTHENTICATION_API_KEY." },
  { name: "GEMINI", tool: "gemini", label: "Gemini API key", secret: true, placeholder: "Paste your Gemini key (starts with AIza)", help: "Free at aistudio.google.com → Get API key." },
  { name: "N8N_WEBHOOK", tool: "n8n", label: "n8n campaign webhook URL", secret: false, placeholder: "https://your-n8n/webhook/voice-command-launch", help: "The Production URL of the “Voice Command Webhook” node in n8n." },
] as const;
