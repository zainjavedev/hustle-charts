import snapshot from "@/lib/snapshot.json";
import { collectYouTube } from "@/lib/youtube.mjs";
import { unstable_cache } from "next/cache";

const TWELVE_HOURS = 60 * 60 * 12;
const getFreshLeaderboard = unstable_cache(
  async () => collectYouTube(),
  // Bump the suffix whenever lib/youtube.mjs changes how artists are matched,
  // so a running deployment stops serving rows built by the old rules.
  ["hustle-youtube-leaderboard", "artists-3"],
  { revalidate: TWELVE_HOURS },
);

export async function GET() {
  let data: unknown = snapshot;
  try {
    data = await getFreshLeaderboard();
  } catch {
    // The checked-in snapshot keeps the chart useful during a YouTube outage.
  }
  const response = Response.json(data, {
    headers: {
      "Cache-Control": `public, max-age=300, s-maxage=${TWELVE_HOURS}, stale-while-revalidate=86400`,
      "X-Hustle-Refresh": "12-hours",
    },
  });
  return response;
}
