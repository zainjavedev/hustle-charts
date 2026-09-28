import { ImageResponse } from "next/og";
import { cardFonts } from "@/lib/card-fonts";
import { CACHE_HEADERS, getLeaderboard } from "@/lib/leaderboard";
import { pick, rank, songsOf } from "@/lib/rank";
import { SITE_HOST } from "@/lib/site";

// The 1200×630 link preview for WhatsApp, X and search results: this week's top 5 of each.
const compact = new Intl.NumberFormat("en", { notation:"compact", maximumFractionDigits:1 });
const line = { overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" } as const;

function Column({ heading, rows, dark }: { heading:string; rows:{ name:string; views:number }[]; dark?:boolean }) {
  const ink = dark ? "#f7f5ea" : "#11110f";
  return <div style={{ display:"flex", flexDirection:"column", width:520, padding:"30px 34px", background:dark ? "#11110f" : "#d8ff38", color:ink, border:dark ? "2px solid rgba(247,245,234,.2)" : "2px solid #d8ff38" }}>
    <div style={{ display:"flex", fontFamily:"Anton", fontSize:46, lineHeight:1, marginBottom:18 }}>{heading}</div>
    {rows.map((row, i) => <div key={row.name} style={{ display:"flex", alignItems:"center", gap:18, height:58 }}>
      <div style={{ display:"flex", width:34, fontFamily:"Anton", fontSize:40 }}>{i + 1}</div>
      <div style={{ ...line, width:300, fontFamily:"Anton", fontSize:36 }}>{row.name}</div>
      <div style={{ display:"flex", flex:1, justifyContent:"flex-end", fontSize:28 }}>{compact.format(row.views)}</div>
    </div>)}
  </div>;
}

export async function GET() {
  const [data, fonts] = await Promise.all([getLeaderboard(), cardFonts()]);
  const hustlers = rank(pick(data, false), "total").slice(0, 5).map(a => ({ name:a.artist, views:a.total }));
  const songs = songsOf(data, "all").slice(0, 5).map(t => ({ name:t.song, views:t.views }));
  return new ImageResponse(
    <div style={{ width:1200, height:630, display:"flex", flexDirection:"column", padding:"44px 60px", background:"#0c0c0a", color:"#f7f5ea", fontFamily:"Geist" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", fontFamily:"Anton", fontSize:64, lineHeight:1 }}>HUSTLE 5 LEADERBOARD</div>
        <div style={{ display:"flex", fontSize:26, color:"#d8ff38" }}>{SITE_HOST}</div>
      </div>
      <div style={{ display:"flex", fontSize:26, color:"rgba(247,245,234,.6)", marginTop:10, marginBottom:28 }}>Ranked by YouTube views · updated every 12 hours</div>
      <div style={{ display:"flex", gap:40 }}>
        <Column heading="TOP HUSTLERS" rows={hustlers} />
        <Column heading="TOP SONGS" rows={songs} dark />
      </div>
    </div>,
    { width:1200, height:630, fonts, headers:CACHE_HEADERS },
  );
}
