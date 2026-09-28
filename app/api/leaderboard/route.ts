import { CACHE_HEADERS, getLeaderboard } from "@/lib/leaderboard";

export async function GET() {
  return Response.json(await getLeaderboard(), { headers: CACHE_HEADERS });
}
