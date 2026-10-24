"use client";
import { AssistantLauncher, AssistantPanel, AssistantProvider } from "./assistant";

/**
 * The ChatGPT voice assistant, available on every CRM page (Shift + D or the floating button).
 * Mounted once in the (app) layout, outside the page area, so a conversation survives navigation.
 */
export function GlobalAssistant() {
  return (
    <AssistantProvider>
      <AssistantPanel />
      <AssistantLauncher />
    </AssistantProvider>
  );
}
