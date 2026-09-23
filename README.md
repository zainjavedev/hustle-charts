# Hustle Charts

A local Next.js leaderboard for MTV Hustle 5: Apna Homeground. It ranks contestants using view counts from official solo uploads on the KaanPhod Music YouTube channel.

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
