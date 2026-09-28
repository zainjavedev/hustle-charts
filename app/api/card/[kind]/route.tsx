import { ImageResponse } from "next/og";
import { cardFonts } from "@/lib/card-fonts";
import { CACHE_HEADERS, getLeaderboard } from "@/lib/leaderboard";
import { byline, pick, rank, songsOf } from "@/lib/rank";
import { SITE_HOST } from "@/lib/site";

// 1080×1920, the size of a phone story, so the PNG drops straight into WhatsApp or Instagram.
const WIDTH = 1080;
const HEIGHT = 1920;

type Entry = { title:string; sub:string; views:number };
type Theme = { plane:string; ink:string; soft:string; accent:string; accentInk:string; bar:string; track:string };

const THEMES: Record<"hustlers" | "songs", Theme> = {
  hustlers: { plane:"#d8ff38", ink:"#11110f", soft:"rgba(17,17,15,.62)", accent:"#11110f", accentInk:"#d8ff38", bar:"#11110f", track:"rgba(17,17,15,.12)" },
  songs: { plane:"#11110f", ink:"#f7f5ea", soft:"rgba(247,245,234,.6)", accent:"#d8ff38", accentInk:"#11110f", bar:"#ff4c24", track:"rgba(247,245,234,.12)" },
};

const compact = new Intl.NumberFormat("en", { notation:"compact", maximumFractionDigits:1 });
const day = new Intl.DateTimeFormat("en-GB", { day:"numeric", month:"long", year:"numeric", timeZone:"Asia/Karachi" });
const line = { overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" } as const;

function Card({ theme, heading, entries, footnote }: { theme:Theme; heading:string; entries:Entry[]; footnote:string }) {
  const [first, ...rest] = entries;
  const max = first?.views || 1;
  return <div style={{ width:WIDTH, height:HEIGHT, display:"flex", flexDirection:"column", padding:"88px 80px 80px", background:theme.plane, color:theme.ink, fontFamily:"Geist" }}>
    <div style={{ display:"flex", alignItems:"center", gap:22, fontSize:30, color:theme.soft }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", width:58, height:58, background:theme.accent, color:theme.accentInk, fontFamily:"Anton", fontSize:40, transform:"rotate(-4deg)" }}>H</div>
      <div style={{ display:"flex" }}>HUSTLE CHARTS · MTV HUSTLE 5</div>
    </div>

    <div style={{ display:"flex", flexDirection:"column", marginTop:70, fontFamily:"Anton", fontSize:170, lineHeight:0.95 }}>
      <div style={{ display:"flex" }}>TOP 5</div>
      <div style={{ display:"flex", alignSelf:"flex-start", background:theme.accent, color:theme.accentInk, padding:"6px 20px 0" }}>{heading}</div>
    </div>

    {first && <div style={{ display:"flex", alignItems:"flex-end", gap:36, marginTop:90 }}>
      <div style={{ display:"flex", fontFamily:"Anton", fontSize:300, lineHeight:0.8 }}>1</div>
      <div style={{ display:"flex", flexDirection:"column", width:720 }}>
        <div style={{ ...line, fontFamily:"Anton", fontSize:104, lineHeight:1.05 }}>{first.title}</div>
        <div style={{ ...line, fontSize:36, color:theme.soft, marginTop:10 }}>{first.sub}</div>
        <div style={{ display:"flex", fontSize:44, marginTop:8 }}>{compact.format(first.views)} views</div>
      </div>
    </div>}

    <div style={{ display:"flex", flexDirection:"column", gap:40, marginTop:80 }}>
      {rest.map((entry, i) => <div key={entry.title} style={{ display:"flex", alignItems:"center", gap:34 }}>
        <div style={{ display:"flex", width:70, fontFamily:"Anton", fontSize:84, lineHeight:1 }}>{i + 2}</div>
        <div style={{ display:"flex", flexDirection:"column", width:600 }}>
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

export async function GET(_request: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (kind !== "hustlers" && kind !== "songs") return new Response("Not found", { status: 404 });

  const [data, fonts] = await Promise.all([getLeaderboard(), cardFonts()]);
  const asOf = day.format(new Date(data.updatedAt));

  // Matches the page's default board: solo songs, ranked by total views.
  const card = kind === "hustlers"
    ? <Card theme={THEMES.hustlers} heading="HUSTLERS" footnote={`Total YouTube views on each hustler’s official solo songs · as of ${asOf}`}
      entries={rank(pick(data, false), "total").slice(0, 5).map(a => ({ title:a.artist, sub:`${a.tracks.length} song${a.tracks.length === 1 ? "" : "s"} · top: ${a.tracks[0].song}`, views:a.total }))} />
    : <Card theme={THEMES.songs} heading="SONGS" footnote={`Every official Hustle 5 song, anthems and collabs included · YouTube views as of ${asOf}`}
      entries={songsOf(data, "all").slice(0, 5).map(t => ({ title:t.song, sub:byline(t), views:t.views }))} />;

  return new ImageResponse(card, {
    width: WIDTH,
    height: HEIGHT,
    fonts,
    headers: CACHE_HEADERS,
  });
}
