import { requireUser } from "@/lib/session";
import { FileConverterClient } from "./client";

export default async function FileConverterPage() {
  const user = await requireUser();
  return <FileConverterClient />;
}
