import type { Dataset, Track } from "@/lib/rank";

export const SITE_URL = "https://hustle-charts.vercel.app";
export const SITE_HOST = "hustle-charts.vercel.app";
export const SITE_NAME = "Hustle Charts";

// "OG Tehran" → "og-tehran", "whysoKai" → "whysokai".
export const slugOf = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Every ranked contestant on any song, alphabetically — mentors are never in `artists`.
export function contestantsOf(data: Dataset): string[] {
  const names = new Set((data.tracks as Track[]).flatMap(t => t.artists ?? [t.artist]));
  return [...names].sort((a, b) => a.localeCompare(b));
}

export const findContestant = (data: Dataset, slug: string) => contestantsOf(data).find(name => slugOf(name) === slug);
