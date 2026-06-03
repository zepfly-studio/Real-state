import { requireUser } from "@/lib/session";
import { PdfSignClient } from "./client";

export default async function PdfSignPage() {
  const user = await requireUser();
  return <PdfSignClient />;
}
