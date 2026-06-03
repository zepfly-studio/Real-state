import { requireUser, resolveTenantId } from "@/lib/session";
import { fetchNews } from "@/lib/news";
import NewsClient from "./client";

export default async function NewsPage() {
  const user = await requireUser();
  const tenantId = await resolveTenantId(user);

  const payload = await fetchNews(tenantId);

  return <NewsClient items={payload.items} isDemo={payload.isDemo} />;
}
