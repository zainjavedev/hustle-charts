import {writeFile} from 'node:fs/promises';
import {collectYouTube} from '../lib/youtube.mjs';
const data=await collectYouTube();
await writeFile(new URL('../lib/snapshot.json',import.meta.url),JSON.stringify(data,null,2)+'\n');
console.log(JSON.stringify({updatedAt:data.updatedAt,tracks:data.tracks.length,artists:[...new Set(data.tracks.map(t=>t.artist))],scanned:data.scanned}));
