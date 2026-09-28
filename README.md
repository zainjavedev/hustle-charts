# Hustle Charts

A local Next.js leaderboard for MTV Hustle 5: Apna Homeground. It has two tabs, both built from view counts on the KaanPhod Music YouTube channel's official uploads. **Hustlers** ranks contestants by their solo songs, with two-artist collabs available as a toggle. Brand anthems and squad songs don't count there. **Songs** ranks every official song, including collabs, squad songs and anthems.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Data refresh

`/api/leaderboard` reads public YouTube metadata and caches the result for 12 hours. On Vercel, the first request after that window refreshes the data. If YouTube is unavailable, the app uses `lib/snapshot.json`.

Refresh the checked-in fallback manually with:

```bash
node scripts/refresh-data.mjs
```

## Deploy

Import this folder as a Vercel project. The default Next.js settings are enough; no environment variables are required.
