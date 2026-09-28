import type snapshot from "@/lib/snapshot.json";

// Shared by the page and the share-card images, so both always rank the same way.

// `artists` lists every ranked contestant on a collab; older snapshots only have `artist`.
export type Track = { id:string; song:string; artist:string; artists?:string[]; credits?:string[]; views:number; viewLabel:string; published:string };
export type Dataset = typeof snapshot;
export type Metric = "total" | "average";
export type Kind = "solo" | "collab" | "squad" | "anthem";
export type SongFilter = "all" | "solo" | "group" | "anthem";
export type Artist = { artist:string; tracks:Track[]; total:number; average:number };

export const METRIC_LABEL: Record<Metric, string> = { total:"total views", average:"average views per song" };

// Brand anthems and squad songs (3+ artists) stay off the leaderboard; the Songs tab ranks them.
export function kindOf(track: Track): Kind {
  if (/anthem/i.test(track.song)) return "anthem";
  const names = track.credits?.length ?? 1;
  return names === 1 ? "solo" : names === 2 ? "collab" : "squad";
}
export const KIND_LABEL: Record<Kind, string> = { solo:"Solo", collab:"Collab", squad:"Squad", anthem:"Anthem" };
export const pick = (data: Dataset, collabs: boolean) => (data.tracks as Track[]).filter(t => {
  const kind = kindOf(t);
  return kind === "solo" || (collabs && kind === "collab");
});

export const SONG_FILTER_LABEL: Record<SongFilter, string> = { all:"All songs", solo:"Solo", group:"Collabs & squads", anthem:"Anthems" };
export function songsOf(data: Dataset, filter: SongFilter): Track[] {
  return (data.tracks as Track[]).filter(t => {
    const kind = kindOf(t);
    return filter === "all" || filter === kind || (filter === "group" && (kind === "collab" || kind === "squad"));
  }).sort((a,b)=>b.views-a.views || a.song.localeCompare(b.song));
}

// "A & B" for two names, "A, B +2" for a squad, so long credit lists fit a stat tile.
export function byline(track: Track) {
  const names = track.credits ?? [track.artist];
  return names.length <= 2 ? names.join(" & ") : `${names.slice(0,2).join(", ")} +${names.length-2}`;
}

export function rank(tracks: Track[], metric: Metric): Artist[] {
  const groups = new Map<string, Track[]>();
  // A collab counts in full for every contestant on it.
  for (const track of tracks) {
    for (const artist of track.artists ?? [track.artist]) groups.set(artist, [...(groups.get(artist) || []), track]);
  }
  return [...groups].map(([artist, tracks]) => {
    const total = tracks.reduce((sum, track) => sum + track.views, 0);
    return { artist, tracks:[...tracks].sort((a,b)=>b.views-a.views), total, average:Math.round(total/tracks.length) };
  }).sort((a,b)=>b[metric]-a[metric] || a.artist.localeCompare(b.artist));
}
