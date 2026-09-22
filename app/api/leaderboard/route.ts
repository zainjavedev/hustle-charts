import snapshot from "@/lib/snapshot.json";
import { collectYouTube } from "@/lib/youtube.mjs";

export const runtime = "edge";
const TWELVE_HOURS = 60 * 60 * 12;

export async function GET(request: Request) {
  const cache = typeof caches === "undefined" ? null : caches.default;
  const key = new Request(new URL("/api/leaderboard?period=12h", request.url));
  const cached = cache ? await cache.match(key) : null;
  if (cached) return cached;

  let data: unknown = snapshot;
  try {
    data = await collectYouTube();
  } catch {
    // The checked-in snapshot keeps the chart useful during a YouTube outage.
  }
  const response = Response.json(data, {
    headers: {
      "Cache-Control": `public, max-age=300, s-maxage=${TWELVE_HOURS}, stale-while-revalidate=86400`,
      "X-Hustle-Refresh": "12-hours",
    },
  });
  if (cache) await cache.put(key, response.clone());
  return response;
}
