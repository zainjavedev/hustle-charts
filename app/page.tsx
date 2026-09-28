import type { Metadata } from "next";
import Board from "@/app/board";
import { getLeaderboard } from "@/lib/leaderboard";
import { pick, rank, songsOf } from "@/lib/rank";
import { SITE_NAME, SITE_URL, slugOf } from "@/lib/site";

// Re-render at most every 12 hours, in step with the data cache.
export const revalidate = 43200;

export async function generateMetadata(): Promise<Metadata> {
  const data = await getLeaderboard();
  const leaders = rank(pick(data, false), "total").slice(0, 3).map(a => a.artist);
  const top = songsOf(data, "all")[0];
  return {
    description: `Live MTV Hustle 5 (Apna Homeground) leaderboard: all ${data.tracks.length} official songs and every rapper ranked by YouTube views, updated every 12 hours. ${leaders.join(", ")} lead the hustlers; ${top.song} is the most-viewed song.`,
    alternates: { canonical: "/" },
  };
}

export default async function Home() {
  const data = await getLeaderboard();
  const songs = songsOf(data, "all");
  // Tells search engines this page is a ranked list of songs.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Hustle 5 most viewed songs",
    description: "Every official MTV Hustle 5: Apna Homeground song, ranked by YouTube views.",
    url: SITE_URL,
    numberOfItems: songs.length,
    itemListElement: songs.slice(0, 25).map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "MusicRecording",
        name: t.song,
        url: `https://www.youtube.com/watch?v=${t.id}`,
        byArtist: (t.artists ?? [t.artist]).map(name => ({ "@type": "MusicGroup", name, url: `${SITE_URL}/hustlers/${slugOf(name)}` })),
        interactionStatistic: { "@type": "InteractionCounter", interactionType: "https://schema.org/WatchAction", userInteractionCount: t.views },
      },
    })),
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  };
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    <Board initial={data} />
  </>;
}
