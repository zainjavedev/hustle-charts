import snapshot from "@/lib/snapshot.json";
import { collectYouTube } from "@/lib/youtube.mjs";
import { unstable_cache } from "next/cache";
import type { Dataset } from "@/lib/rank";

export const TWELVE_HOURS = 60 * 60 * 12;
export const CACHE_HEADERS = {
  "Cache-Control": `public, max-age=300, s-maxage=${TWELVE_HOURS}, stale-while-revalidate=86400`,
  "X-Hustle-Refresh": "12-hours",
};

const getFreshLeaderboard = unstable_cache(
  async () => collectYouTube(),
  // Bump the suffix whenever lib/youtube.mjs changes how artists are matched,
  // so a running deployment stops serving rows built by the old rules.
  ["hustle-youtube-leaderboard", "artists-5"],
  { revalidate: TWELVE_HOURS },
);

export async function getLeaderboard(): Promise<Dataset> {
  try {
    return await getFreshLeaderboard() as Dataset;
  } catch {
    // The checked-in snapshot keeps the chart useful during a YouTube outage.
    return snapshot;
  }
}
