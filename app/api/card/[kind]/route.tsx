import { ImageResponse } from "next/og";
import { cardFonts } from "@/lib/card-fonts";
import { CACHE_HEADERS, getLeaderboard } from "@/lib/leaderboard";
import { byline, pick, rank, songsOf } from "@/lib/rank";
import { SITE_HOST } from "@/lib/site";

// 1080×1920, the size of a phone story, so the PNG drops straight into WhatsApp or Instagram.
const WIDTH = 1080;
const HEIGHT = 1920;

type Entry = { place:number; title:string; sub:string; views:number };
type Kind = "hustlers" | "songs" | "hustlers-bottom" | "songs-bottom";
type Theme = { plane:string; ink:string; soft:string; accent:string; accentInk:string; bar:string; track:string };

const THEMES: Record<Kind, Theme> = {
  hustlers: { plane:"#d8ff38", ink:"#11110f", soft:"rgba(17,17,15,.62)", accent:"#11110f", accentInk:"#d8ff38", bar:"#11110f", track:"rgba(17,17,15,.12)" },
  songs: { plane:"#11110f", ink:"#f7f5ea", soft:"rgba(247,245,234,.6)", accent:"#d8ff38", accentInk:"#11110f", bar:"#ff4c24", track:"rgba(247,245,234,.12)" },
  "hustlers-bottom": { plane:"#f2efdf", ink:"#11110f", soft:"rgba(17,17,15,.6)", accent:"#ee3c17", accentInk:"#f2efdf", bar:"#ee3c17", track:"rgba(17,17,15,.1)" },
  "songs-bottom": { plane:"#ee3c17", ink:"#11110f", soft:"rgba(17,17,15,.66)", accent:"#11110f", accentInk:"#f2efdf", bar:"#11110f", track:"rgba(17,17,15,.16)" },
};

const compact = new Intl.NumberFormat("en", { notation:"compact", maximumFractionDigits:1 });
const day = new Intl.DateTimeFormat("en-GB", { day:"numeric", month:"long", year:"numeric", timeZone:"Asia/Karachi" });
const line = { overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" } as const;

// Anton digits are ~0.55em wide, so size the big place number and the row numbers
// to their digit count — "139" has to fit where "1" did.
const bigSize = (place: number) => [300, 240, 180][String(place).length - 1] ?? 180;

function Card({ theme, lead, heading, entries, footnote }: { theme:Theme; lead:string; heading:string; entries:Entry[]; footnote:string }) {
  const [first, ...rest] = entries;
  const max = Math.max(...entries.map(e => e.views), 1);
  const numberWidth = Math.max(...rest.map(e => String(e.place).length), 1) * 48 + 22;
  return <div style={{ width:WIDTH, height:HEIGHT, display:"flex", flexDirection:"column", padding:"88px 80px 80px", background:theme.plane, color:theme.ink, fontFamily:"Geist" }}>
    <div style={{ display:"flex", alignItems:"center", gap:22, fontSize:30, color:theme.soft }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", width:58, height:58, background:theme.accent, color:theme.accentInk, fontFamily:"Anton", fontSize:40, transform:"rotate(-4deg)" }}>H</div>
      <div style={{ display:"flex" }}>HUSTLE CHARTS · MTV HUSTLE 5</div>
    </div>

    <div style={{ display:"flex", flexDirection:"column", marginTop:70, fontFamily:"Anton", fontSize:170, lineHeight:0.95 }}>
      <div style={{ display:"flex" }}>{lead}</div>
      <div style={{ display:"flex", alignSelf:"flex-start", background:theme.accent, color:theme.accentInk, padding:"6px 20px 0" }}>{heading}</div>
    </div>

    {first && <div style={{ display:"flex", alignItems:"flex-end", gap:36, marginTop:90 }}>
      <div style={{ display:"flex", fontFamily:"Anton", fontSize:bigSize(first.place), lineHeight:0.8 }}>{first.place}</div>
      <div style={{ display:"flex", flexDirection:"column", flex:1, minWidth:0 }}>
        <div style={{ ...line, fontFamily:"Anton", fontSize:first.title.length > 14 ? 72 : 104, lineHeight:1.05 }}>{first.title}</div>
        <div style={{ ...line, fontSize:36, color:theme.soft, marginTop:10 }}>{first.sub}</div>
        <div style={{ display:"flex", fontSize:44, marginTop:8 }}>{compact.format(first.views)} views</div>
      </div>
    </div>}

    <div style={{ display:"flex", flexDirection:"column", gap:40, marginTop:80 }}>
      {rest.map(entry => <div key={entry.title} style={{ display:"flex", alignItems:"center", gap:34 }}>
        <div style={{ display:"flex", width:numberWidth, fontFamily:"Anton", fontSize:84, lineHeight:1 }}>{entry.place}</div>
        <div style={{ display:"flex", flexDirection:"column", width:670 - numberWidth }}>
          <div style={{ ...line, fontFamily:"Anton", fontSize:62, lineHeight:1.1 }}>{entry.title}</div>
          <div style={{ ...line, fontSize:28, color:theme.soft }}>{entry.sub}</div>
          <div style={{ display:"flex", width:"100%", height:10, marginTop:12, background:theme.track }}>
            <div style={{ display:"flex", width:`${Math.max(entry.views / max * 100, 2)}%`, height:10, background:theme.bar }} />
          </div>
        </div>
        <div style={{ display:"flex", flex:1, justifyContent:"flex-end", fontSize:44 }}>{compact.format(entry.views)}</div>
      </div>)}
    </div>

    <div style={{ display:"flex", flexDirection:"column", marginTop:"auto", fontSize:26, color:theme.soft, lineHeight:1.45 }}>
      <div style={{ display:"flex" }}>{footnote}</div>
      <div style={{ display:"flex", alignSelf:"flex-start", marginTop:22, padding:"10px 18px", background:theme.accent, color:theme.accentInk, fontSize:34 }}>{SITE_HOST}</div>
    </div>
  </div>;
}

const isKind = (kind: string): kind is Kind => kind in THEMES;
const songCount = (n: number) => `${n} song${n === 1 ? "" : "s"}`;

export async function GET(_request: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (!isKind(kind)) return new Response("Not found", { status: 404 });

  const [data, fonts] = await Promise.all([getLeaderboard(), cardFonts()]);
  const asOf = day.format(new Date(data.updatedAt));
  const bottom = kind.endsWith("-bottom");

  // Hustlers match the page's default board: solo songs, ranked by total views.
  const hustlers = rank(pick(data, false), "total").map((a, i) => ({ place:i + 1, title:a.artist, sub:`${songCount(a.tracks.length)} · top: ${a.tracks[0].song}`, views:a.total }));
  const songs = songsOf(data, "all").map((t, i) => ({ place:i + 1, title:t.song, sub:byline(t), views:t.views }));
  const list = kind.startsWith("hustlers") ? hustlers : songs;
  // The bottom card leads with last place, then climbs: 25, 24, 23…
  const entries = bottom ? list.slice(-5).reverse() : list.slice(0, 5);
  const footnote = kind.startsWith("hustlers")
    ? `Total YouTube views on each hustler’s official solo songs · as of ${asOf}`
    : bottom
      ? `Least-viewed official Hustle 5 songs — newer uploads have had less time · YouTube views as of ${asOf}`
      : `Every official Hustle 5 song, anthems and collabs included · YouTube views as of ${asOf}`;

  return new ImageResponse(
    <Card theme={THEMES[kind]} lead={bottom ? "BOTTOM 5" : "TOP 5"} heading={kind.startsWith("hustlers") ? "HUSTLERS" : "SONGS"} entries={entries} footnote={footnote} />,
    { width:WIDTH, height:HEIGHT, fonts, headers:CACHE_HEADERS },
  );
}
