"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ExternalLink, Flame, Headphones, Radio, Trophy } from "lucide-react";
import snapshot from "@/lib/snapshot.json";

type Track = { id:string; song:string; artist:string; views:number; viewLabel:string; published:string };
type Dataset = typeof snapshot;
type Metric = "total" | "average";

const palette = ["#ffcb05", "#ff5a36", "#a9ef46", "#7c5cff", "#35d5ff", "#ff70b5"];
const compact = new Intl.NumberFormat("en", { notation:"compact", maximumFractionDigits:1 });

function rank(data: Dataset, metric: Metric) {
  const groups = new Map<string, Track[]>();
  for (const track of data.tracks as Track[]) groups.set(track.artist, [...(groups.get(track.artist) || []), track]);
  return [...groups].map(([artist, tracks]) => {
    const total = tracks.reduce((sum, track) => sum + track.views, 0);
    return { artist, tracks:tracks.sort((a,b)=>b.views-a.views), total, average:Math.round(total/tracks.length) };
  }).sort((a,b)=>b[metric]-a[metric]);
}

export default function Home() {
  const [data, setData] = useState<Dataset>(snapshot);
  const [metric, setMetric] = useState<Metric>("total");
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/leaderboard").then(r=>r.ok ? r.json() : Promise.reject()).then(setData).catch(()=>{});
  }, []);

  const artists = useMemo(()=>rank(data, metric), [data, metric]);
  const max = artists[0]?.[metric] || 1;
  const totalViews = artists.reduce((sum,a)=>sum+a.total,0);
  const topSong = (data.tracks as Track[]).reduce((best,t)=>t.views>best.views?t:best, (data.tracks as Track[])[0]);

  return <main>
    <header className="masthead">
      <a className="logo" href="#top" aria-label="Hustle Charts home"><span>H</span> HUSTLE CHARTS</a>
      <div className="live"><i /> AUTO-REFRESH · 12H</div>
    </header>

    <section className="intro" id="top">
      <div>
        <p className="eyebrow"><Radio size={15}/> MTV HUSTLE 5 · APNA HOMEGROUND</p>
        <h1>WHO’S RUNNING<br/><em>THE NUMBERS?</em></h1>
      </div>
      <p className="lede">Every official solo performance ranked by YouTube views. No opinions, just the crowd pressing play.</p>
    </section>

    <section className="score-strip" aria-label="Season summary">
      <div><span>{compact.format(totalViews)}</span><small>TOTAL VIEWS</small></div>
      <div><span>{artists.length}</span><small>HUSTLERS TRACKED</small></div>
      <div><span>{data.tracks.length}</span><small>SOLO TRACKS</small></div>
      <div className="top-track"><span>{topSong?.song}</span><small>MOST VIEWED TRACK · {compact.format(topSong?.views || 0)}</small></div>
    </section>

    <section className="board">
      <div className="board-head">
        <div><p className="eyebrow"><Flame size={15}/> THE CROWD CHART</p><h2>POPULARITY LEADERBOARD</h2></div>
        <div className="toggle" aria-label="Ranking method">
          <button className={metric==="total"?"active":""} onClick={()=>setMetric("total")}>Total views</button>
          <button className={metric==="average"?"active":""} onClick={()=>setMetric("average")}>Average / song</button>
        </div>
      </div>

      <div className="chart">
        {artists.map((artist,index)=>{
          const value=artist[metric]; const expanded=open===artist.artist;
          return <article className={`rank-row ${index<3?`medal medal-${index+1}`:""}`} key={artist.artist}>
            <button className="rank-main" onClick={()=>setOpen(expanded?null:artist.artist)} aria-expanded={expanded}>
              <b className="number">{String(index+1).padStart(2,"0")}</b>
              <span className="artist"><strong>{artist.artist}</strong><small>{artist.tracks.length} track{artist.tracks.length===1?"":"s"}</small></span>
              <span className="bar-track" aria-hidden="true"><i style={{width:`${Math.max(3,value/max*100)}%`,background:palette[index%palette.length]}}/></span>
              <strong className="value">{compact.format(value)}</strong>
              <ChevronDown className={expanded?"turn":""} size={20}/>
            </button>
            {expanded && <div className="songs">
              {artist.tracks.map((track,i)=><a href={`https://youtube.com/watch?v=${track.id}`} target="_blank" rel="noreferrer" key={track.id}>
                <span>{i+1}. {track.song}</span><b>{compact.format(track.views)}</b><ExternalLink size={14}/>
              </a>)}
            </div>}
          </article>;
        })}
      </div>
    </section>

    <footer>
      <div><Headphones size={18}/><p><strong>HOW THIS WORKS</strong><br/>Views are added across each rapper’s official solo uploads. Switch to average to compare fairly when artists have different song counts.</p></div>
      <div className="source"><Trophy size={18}/><p><strong>DATA SOURCE</strong><br/>KaanPhod Music on YouTube · rounded public counts · refreshed every 12 hours<br/>Last pull: {new Date(data.updatedAt).toLocaleString("en-PK",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Karachi"})} PKT</p></div>
    </footer>
  </main>;
}
