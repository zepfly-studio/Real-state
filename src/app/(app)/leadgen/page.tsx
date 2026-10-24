import { redirect } from "next/navigation";

/** /leadgen → the Overview (kept on its own path so the sidebar highlights only one item). */
export default function LeadgenIndex() {
  redirect("/leadgen/overview");
}
