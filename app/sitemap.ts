import type { MetadataRoute } from "next";
import { getLeaderboard } from "@/lib/leaderboard";
import { SITE_URL, contestantsOf, slugOf } from "@/lib/site";

export const revalidate = 43200;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const data = await getLeaderboard();
  const updated = new Date(data.updatedAt);
  return [
    { url: SITE_URL, lastModified: updated, changeFrequency: "daily", priority: 1 },
    ...contestantsOf(data).map(name => ({ url: `${SITE_URL}/hustlers/${slugOf(name)}`, lastModified: updated, changeFrequency: "daily" as const, priority: 0.7 })),
  ];
}
