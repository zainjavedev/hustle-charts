"use client";

import { useMemo, useState, useEffect, useSyncExternalStore } from "react";
import { ChevronDown, ExternalLink, Radio } from "lucide-react";
import snapshot from "@/lib/snapshot.json";

// `artists` lists every ranked contestant on a collab; older snapshots only have `artist`.
type Track = { id:string; song:string; artist:string; artists?:string[]; credits?:string[]; views:number; viewLabel:string; published:string };
type Dataset = typeof snapshot;
type Metric = "total" | "average";
type View = "chart" | "table";
type Artist = { artist:string; tracks:Track[]; total:number; average:number };
type Tip = { artist:Artist; place:number; x:number; y:number };
// Positions gained since the baseline; null means the artist was not on the baseline board.
type Move = number | null;

const compact = new Intl.NumberFormat("en", { notation:"compact", maximumFractionDigits:1 });
const exact = new Intl.NumberFormat("en");
const METRIC_LABEL: Record<Metric, string> = { total:"total views", average:"average views per song" };
const relative = new Intl.RelativeTimeFormat("en", { numeric:"auto" });
const stamp = new Intl.DateTimeFormat("en-PK", { dateStyle:"medium", timeStyle:"short", timeZone:"Asia/Karachi" });
const day = new Intl.DateTimeFormat("en-PK", { day:"numeric", month:"short", timeZone:"Asia/Karachi" });

// A 30-second clock: the snapshot only changes on the tick, so it is stable to read
// during render. On the server there is no clock, so the exact timestamp is shown instead.
const clock = {
  subscribe(onTick: () => void) {
    const timer = setInterval(onTick, 30_000);
    return () => clearInterval(timer);
  },
  bucket: () => Math.floor(Date.now() / 30_000),
  none: () => null,
};

function ago(iso: string, now: number) {
  const seconds = Math.round((Date.parse(iso) - now) / 1000);
  if (seconds > -60) return "just now";
  if (seconds > -3600) return relative.format(Math.round(seconds / 60), "minute");
  if (seconds > -86400) return relative.format(Math.round(seconds / 3600), "hour");
  return relative.format(Math.round(seconds / 86400), "day");
}

function rank(data: Dataset, metric: Metric): Artist[] {
  const groups = new Map<string, Track[]>();
  // A collab counts in full for every contestant on it.
  for (const track of data.tracks as Track[]) {
    for (const artist of track.artists ?? [track.artist]) groups.set(artist, [...(groups.get(artist) || []), track]);
  }
  return [...groups].map(([artist, tracks]) => {
    const total = tracks.reduce((sum, track) => sum + track.views, 0);
    return { artist, tracks:[...tracks].sort((a,b)=>b.views-a.views), total, average:Math.round(total/tracks.length) };
  }).sort((a,b)=>b[metric]-a[metric] || a.artist.localeCompare(b.artist));
}

// The checked-in snapshot is refreshed every Friday night, before the weekend episode
// drops, so it doubles as "last week's" board for the movement arrows.
function moves(current: Artist[], metric: Metric): Map<string, Move> {
  const before = new Map(rank(snapshot, metric).map((a, i) => [a.artist, i + 1]));
  return new Map(current.map((a, i) => {
    const was = before.get(a.artist);
    return [a.artist, was === undefined ? null : was - (i + 1)];
  }));
}

function MoveBadge({ move }: { move: Move }) {
  if (move === null) return <span className="move new">NEW</span>;
  if (move === 0) return <span className="move same" aria-label="No change">–</span>;
  const up = move > 0;
  return <span className={`move ${up ? "up" : "down"}`} aria-label={`${up ? "Up" : "Down"} ${Math.abs(move)} since last week`}>
    {up ? "▲" : "▼"}{Math.abs(move)}
  </span>;
}

function moveText(move: Move) {
  if (move === null) return "New this week";
  if (move === 0) return "No change";
  return `${move > 0 ? "Up" : "Down"} ${Math.abs(move)}`;
}

// Round the domain up to a clean tick step, so bars and gridlines share one scale.
function scaleOf(max: number) {
  const power = 10 ** Math.floor(Math.log10(Math.max(max, 1) / 4));
  const step = [1, 2, 2.5, 5, 10].map(m => m * power).find(s => s >= max / 4) ?? 10 * power;
  const domain = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let value = 0; value <= domain + 1; value += step) ticks.push(value);
  return { domain, ticks };
}

export default function Home() {
  const [data, setData] = useState<Dataset>(snapshot);
  const [metric, setMetric] = useState<Metric>("total");
  const [view, setView] = useState<View>("chart");
  const [open, setOpen] = useState<string | null>(null);
  const [tip, setTip] = useState<Tip | null>(null);
  const bucket = useSyncExternalStore(clock.subscribe, clock.bucket, clock.none);
  const now = bucket === null ? null : bucket * 30_000;

  useEffect(() => {
    fetch("/api/leaderboard").then(r => r.ok ? r.json() : Promise.reject()).then(setData).catch(()=>{});
  }, []);

  const artists = useMemo(()=>rank(data, metric), [data, metric]);
  const movement = useMemo(()=>moves(artists, metric), [artists, metric]);
  const { domain, ticks } = useMemo(()=>scaleOf(artists[0]?.[metric] || 1), [artists, metric]);
  const tracks = data.tracks as Track[];
  // Summed per upload, not per artist, so a collab's views are only counted once here.
  const totalViews = tracks.reduce((sum,t)=>sum+t.views,0);
  const collabs = tracks.filter(t=>(t.credits?.length ?? 1) > 1).length;
  const topTrack = tracks.reduce((best,t)=>t.views>best.views?t:best, tracks[0]);
  const pulled = <time dateTime={data.updatedAt} title={stamp.format(new Date(data.updatedAt))}>
    {now === null ? stamp.format(new Date(data.updatedAt)) : ago(data.updatedAt, now)}
  </time>;

  return <>
    <header className="masthead">
      <a className="logo" href="#top"><span>H</span> Hustle Charts</a>
      <p className="live"><i aria-hidden="true" /> Refreshes every 12 hours</p>
    </header>

    <main id="top">
      <section className="intro">
        <div>
          <p className="eyebrow"><Radio size={14} aria-hidden="true" /> MTV Hustle 5 · Apna Homeground</p>
          <h1>WHO&rsquo;S RUNNING<br /><em>THE NUMBERS?</em></h1>
        </div>
        <p className="lede">Every official performance, solo and collab, ranked by YouTube views. No opinions — just the crowd pressing play.</p>
      </section>

      <section className="stats" aria-label="Season summary">
        <div className="stat hero">
          <small>Total views this season</small>
          <b>{compact.format(totalViews)}</b>
          <p>{exact.format(totalViews)} plays across every official upload</p>
        </div>
        <div className="stat">
          <small>Hustlers</small>
          <b>{artists.length}</b>
          <p>ranked below</p>
        </div>
        <div className="stat">
          <small>Tracks</small>
          <b>{tracks.length}</b>
          <p>{collabs} of them collabs</p>
        </div>
        <div className="stat mark">
          <small>Most-viewed track</small>
          <b>{topTrack?.song}</b>
          <p>{topTrack?.artist} · {compact.format(topTrack?.views || 0)} views</p>
        </div>
      </section>

      <section className="board">
        <figure className="card">
          <figcaption className="card-head">
            <div>
              <h2>POPULARITY LEADERBOARD</h2>
              <p className="sub">Artists ranked by {METRIC_LABEL[metric]} on the official KaanPhod Music uploads. Pick any row to see the songs behind the number.</p>
            </div>
          </figcaption>

          <div className="controls">
            <div className="seg" role="group" aria-label="Ranking method">
              <button aria-pressed={metric==="total"} onClick={()=>setMetric("total")}>Total views</button>
              <button aria-pressed={metric==="average"} onClick={()=>setMetric("average")}>Average per song</button>
            </div>
            <div className="seg" role="group" aria-label="View">
              <button aria-pressed={view==="chart"} onClick={()=>setView("chart")}>Chart</button>
              <button aria-pressed={view==="table"} onClick={()=>setView("table")}>Table</button>
            </div>
            <p className="updated">Last pull {pulled} · arrows vs {day.format(new Date(snapshot.updatedAt))}</p>
          </div>

          {view === "chart" ? <>
            <div className="axis" aria-hidden="true">
              <span /><span />
              <div className="plot">
                {ticks.map((tick,i)=><span key={tick} style={{
                  left:`${tick/domain*100}%`,
                  transform:i===0 ? "none" : i===ticks.length-1 ? "translateX(-100%)" : "translateX(-50%)",
                }}>{compact.format(tick)}</span>)}
              </div>
              <span /><span />
            </div>

            <div className="chart" style={{ ["--tick-gap" as string]: `${100/(ticks.length-1)}%` }}>
              {artists.map((artist, index) => {
                const value = artist[metric];
                const expanded = open === artist.artist;
                return <article className={`row${index===0?" lead":""}`} key={artist.artist}>
                  <button
                    className="row-main"
                    aria-expanded={expanded}
                    aria-controls={`songs-${index}`}
                    onClick={()=>setOpen(expanded ? null : artist.artist)}
                    onPointerMove={e=>setTip({ artist, place:index+1, x:e.clientX, y:e.clientY })}
                    onPointerLeave={()=>setTip(null)}
                    onFocus={e=>{
                      const box = e.currentTarget.getBoundingClientRect();
                      setTip({ artist, place:index+1, x:box.left+box.width/2, y:box.top+box.height });
                    }}
                    onBlur={()=>setTip(null)}
                  >
                    <span className="rank">{String(index+1).padStart(2,"0")}<MoveBadge move={movement.get(artist.artist) ?? 0} /></span>
                    <span className="name">
                      <strong>{artist.artist}{index===0 && <span className="tag">Leader</span>}</strong>
                      <small>{artist.tracks.length} track{artist.tracks.length===1?"":"s"}</small>
                    </span>
                    <span className="track" aria-hidden="true"><i style={{ width:`${Math.max(value/domain*100, 0.4)}%` }} /></span>
                    <span className="val">{compact.format(value)}</span>
                    <ChevronDown className={`chev${expanded?" turn":""}`} size={18} aria-hidden="true" />
                  </button>
                  {expanded && <div className="songs" id={`songs-${index}`}>
                    {artist.tracks.map(track => <a className="song" key={track.id} href={`https://youtube.com/watch?v=${track.id}`} target="_blank" rel="noreferrer">
                      <span aria-hidden="true" />
                      <span className="song-name">{track.song}{(track.credits?.length ?? 1) > 1 && <small> with {track.credits!.filter(name=>name!==artist.artist).join(", ")}</small>}</span>
                      <span className="mini" aria-hidden="true"><i style={{ width:`${Math.max(track.views/domain*100, 0.4)}%` }} /></span>
                      <b>{compact.format(track.views)}</b>
                      <ExternalLink size={14} aria-hidden="true" />
                    </a>)}
                  </div>}
                </article>;
              })}
            </div>
          </> : <div className="table-wrap">
            <table>
              <caption>Every value in the chart, as numbers. YouTube publishes rounded counts.</caption>
              <thead>
                <tr><th scope="col">#</th><th scope="col">Move</th><th scope="col">Artist</th><th className="num" scope="col">Tracks</th><th className="num" scope="col">Total views</th><th className="num" scope="col">Avg per song</th></tr>
              </thead>
              <tbody>
                {artists.map((artist,index)=><tr key={artist.artist}>
                  <td>{index+1}</td>
                  <td><MoveBadge move={movement.get(artist.artist) ?? 0} /></td>
                  <th scope="row">{artist.artist}</th>
                  <td className="num">{artist.tracks.length}</td>
                  <td className="num">{exact.format(artist.total)}</td>
                  <td className="num">{exact.format(artist.average)}</td>
                </tr>)}
              </tbody>
            </table>
          </div>}

          <p className="note">
            Source: official music uploads on the KaanPhod Music YouTube channel, solo and collab — eliminated artists and wildcards included; shorts, full episodes and promos excluded.
            A collab or squad song counts in full for every contestant on it; mentors aren&rsquo;t ranked.
            YouTube reports rounded view counts, so treat every figure as approximate. Data refreshes at most every 12 hours.
            Arrows compare each artist&rsquo;s place with the board from before this weekend&rsquo;s episode, and reset every Friday night.
          </p>
        </figure>
      </section>
    </main>

    <footer>
      <div>
        <div>
          <h3>How this works</h3>
          <p>Views are added up across each rapper&rsquo;s official uploads, and a collab counts in full for everyone on it. Switch to <em>average per song</em> to compare fairly when artists have different song counts — one bar, one scale, either way.</p>
        </div>
      </div>
      <div>
        <div>
          <h3>Data source</h3>
          <p>KaanPhod Music on YouTube · {tracks.length} tracks across {artists.length} artists · last pull {pulled}.</p>
        </div>
      </div>
    </footer>

    {tip && <div className="tip" role="presentation" style={{
      left: Math.min(tip.x + 14, (typeof window === "undefined" ? 1200 : window.innerWidth) - 250),
      top: tip.y + 16,
    }}>
      <b>{compact.format(tip.artist[metric])}</b>
      <span className="key"><i aria-hidden="true" />{METRIC_LABEL[metric]}</span>
      <dl>
        <dt>{tip.artist.artist}</dt><dd>#{tip.place}</dd>
        <dt>Since {day.format(new Date(snapshot.updatedAt))}</dt><dd>{moveText(movement.get(tip.artist.artist) ?? 0)}</dd>
        <dt>Tracks</dt><dd>{tip.artist.tracks.length}</dd>
        <dt>{metric === "total" ? "Avg per song" : "Total views"}</dt>
        <dd>{compact.format(metric === "total" ? tip.artist.average : tip.artist.total)}</dd>
      </dl>
    </div>}
  </>;
}
