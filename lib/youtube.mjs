export const CHANNEL = 'https://www.youtube.com/@KaanPhodMusic/videos';
export function visit(value, fn) {
  if (!value || typeof value !== 'object') return;
  fn(value);
  for (const child of Object.values(value)) visit(child, fn);
}
export function parseViews(text) {
  const clean = text.replace(/,/g, '').replace(/\u00a0/g, ' ').trim();
  if (/^no views$/i.test(clean)) return 0;
  const m = clean.match(/^([\d.]+)\s*(K|M|B|ہزار|لاکھ|کروڑ)?(?:\s|$)/i);
  if (!m) return null;
  const factors = {k:1e3,m:1e6,b:1e9,'ہزار':1e3,'لاکھ':1e5,'کروڑ':1e7};
  const n = Number(m[1]) * (factors[(m[2] || '').toLowerCase()] || 1);
  return Number.isFinite(n) ? Math.round(n) : null;
}
export function extractPage(data) {
  const videos = new Map(); let continuation;
  visit(data, obj => {
    const v = obj.lockupViewModel;
    if (v?.contentId && v.metadata?.lockupMetadataViewModel) {
      const meta = v.metadata.lockupMetadataViewModel;
      const parts = (meta.metadata?.contentMetadataViewModel?.metadataRows || []).flatMap(r=>r.metadataParts || []);
      const views = parts.find(p=>p.leadingIcon?.name === 'PLAY_ARROW_OUTLINED' || /views|ملاحظات/.test((p.accessibilityLabel || '')+' '+(p.text?.content || '')));
      const count = parseViews(views?.text?.content || '');
      videos.set(v.contentId, {id:v.contentId, title:meta.title?.content || '', views:count, viewLabel:views?.text?.content || '', published:parts.at(-1)?.text?.content || ''});
    }
    if (obj.videoRenderer) {
      const v = obj.videoRenderer;
      const viewLabel = v.viewCountText?.simpleText || v.viewCountText?.runs?.map(r=>r.text).join('') || '';
      videos.set(v.videoId,{id:v.videoId,title:v.title?.runs?.map(r=>r.text).join('') || '',views:parseViews(viewLabel),viewLabel,published:v.publishedTimeText?.simpleText || ''});
    }
    if (obj.continuationItemRenderer) {
      visit(obj.continuationItemRenderer, o=>{if(!continuation && o.continuationCommand?.token) continuation=o.continuationCommand.token;});
    }
  });
  return {videos:[...videos.values()], continuation};
}
const aliases = {'harmeet':'Harmeeet','harmeeet':'Harmeeet','dhadkan':'DHADKAN','parv music':'Parv','whysokai':'whysoKai','vasu kainth':'Vasu Kainth','vasu':'Vasu Kainth','og tehran':'OG Tehran','txama':'TXAMA','dflacko':'Dflacko','ansh4sure':'Ansh4sure','r mridul':'R-Mridul','r-mridul':'R-Mridul','sicklot':'SickLot','bhaktaaa':'Bhaktaaa','hruday satam':'Hruday','believe in eddy':'Eddy','xeemo':'XEEMO','anushka baduwal':'Anushka Baduwal'};
const contestants = new Set(['farak','txama','harmeeet','og tehran','dflacko','ansh4sure','parv','siroyi','raaj babu','akshat jakhar','sicklot','dhadkan','bhaktaaa','whysokai','vasu kainth','mtrill','r-mridul','akkshay gurjar','vyaas','xeemo','anushka baduwal','hruday','gargi','split','eddy']);
const mentors=/^(Badshah|EPR|EPR Iyer|Agsy|Paradox|MC Square|Dino James|King)$/i;
// Solo uploads and collab/squad songs ("Song | A, B, C | Hustle 5 Apna Homeground").
// A collab credits its full view count to every contestant on it; mentors appear in
// `credits` but are never ranked.
export function seasonTracks(videos) {
  return videos.flatMap(v=>{
    if (!/\bHustle\s*5\b/i.test(v.title) || v.views === null) return [];
    const parts=v.title.split('|').map(s=>s.trim());
    if(parts.length!==3 || !/^(?:MTV\s+)?Hustle\s*5\s+Apna Homeground$/i.test(parts[2])) return [];
    if(/&|\band\b|\bfeat\b|\bft\b|\bx\b/i.test(parts[1]) || /promo|episode|audition|best of|compilation/i.test(parts[0])) return [];
    const credits=parts[1].split(',').map(name=>aliases[name.trim().toLowerCase()] || name.trim()).filter(Boolean);
    if(credits.length===1 && mentors.test(credits[0])) return [];
    const artists=credits.filter(name=>!mentors.test(name) && contestants.has(name.toLowerCase()));
    // Every credited name must be a known contestant or mentor, so clip titles like
    // "Backstory | Rishikesh Se Hustle 5 Tak | ..." never slip in.
    if(!artists.length || artists.length+credits.filter(name=>mentors.test(name)).length!==credits.length) return [];
    return [{...v, song:parts[0], artist:artists[0], artists, credits}];
  });
}
export async function collectYouTube() {
  const headers={'Accept-Language':'en-US,en;q=0.9','User-Agent':'Mozilla/5.0'};
  const request=async(url,opts={})=>{
    const r=await fetch(url,{...opts,headers:{...headers,...opts.headers},signal:AbortSignal.timeout(15000)});
    if(!r.ok) throw new Error('YouTube is unavailable');
    return r;
  };
  const html=await (await request(CHANNEL+'?hl=en&gl=US')).text();
  const match=html.match(/var ytInitialData = (.*?);<\/script>/s);
  if(!match) throw new Error('YouTube did not return channel data');
  let data=JSON.parse(match[1]);
  const clientVersion=html.match(/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/)?.[1] || '2.20260921.01.00';
  const all=new Map(); let complete=false; let pages=0;
  for(;pages<20;pages++) {
    const page=extractPage(data);
    if(!page.videos.length) throw new Error('YouTube returned an empty catalogue page');
    for(const v of page.videos) all.set(v.id,v);
    // Two consecutive pages without this season establish the older catalogue boundary.
    const reachedPreviousSeason=page.videos.some(v=>/\bHustle\s*4\b/i.test(v.title));
    if(!page.continuation || reachedPreviousSeason) {complete=true;break;}
    data=await (await request('https://www.youtube.com/youtubei/v1/browse?prettyPrint=false',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({context:{client:{clientName:'WEB',clientVersion,hl:'en',gl:'US'}},continuation:page.continuation})})).json();
  }
  const tracks=seasonTracks([...all.values()]);
  if(tracks.length<12 || !complete) throw new Error(`Could not verify the complete season catalogue: ${tracks.length} songs, ${all.size} uploads, ${pages} pages; sample: ${[...all.values()].slice(0,4).map(v=>v.title+' ['+v.viewLabel+']').join(' // ')}`);
  return {season:5,seasonName:'Apna Homeground',channel:CHANNEL,updatedAt:new Date().toISOString(),approximate:true,coverage:'Official music uploads on KaanPhod Music, solo and collab. Includes eliminated artists and wildcards; excludes shorts, episodes and promos.',scanned:all.size,tracks};
}
