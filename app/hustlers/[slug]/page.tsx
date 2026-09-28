import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import snapshot from "@/lib/snapshot.json";
import { getLeaderboard } from "@/lib/leaderboard";
import { type Dataset, type Track, KIND_LABEL, kindOf, pick, rank } from "@/lib/rank";
import { SITE_NAME, SITE_URL, contestantsOf, findContestant, slugOf } from "@/lib/site";

export const revalidate = 43200;

const compact = new Intl.NumberFormat("en", { notation:"compact", maximumFractionDigits:1 });
const exact = new Intl.NumberFormat("en");

export function generateStaticParams() {
  return contestantsOf(snapshot).map(name => ({ slug: slugOf(name) }));
}

// Everything one hustler is on — solo, collab, squad and anthem — plus their leaderboard place.
function profileOf(data: Dataset, name: string) {
  const songs = (data.tracks as Track[]).filter(t => (t.artists ?? [t.artist]).includes(name)).sort((a,b)=>b.views-a.views);
  const board = rank(pick(data, false), "total");
  const place = board.findIndex(a => a.artist === name) + 1;
  const solo = board[place - 1];
  const views = songs.reduce((sum, t) => sum + t.views, 0);
  return { songs, place, of: board.length, solo, views };
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getLeaderboard();
  const name = findContestant(data, slug);
  if (!name) return {};
  const { songs, place, of, solo } = profileOf(data, name);
  const standing = place ? `#${place} of ${of} on the Hustle 5 leaderboard with ${compact.format(solo.total)} solo views` : "on Hustle 5";
  return {
    title: `${name} Hustle 5 Songs, Views & Ranking`,
    description: `${name} is ${standing}. All ${songs.length} of ${name}'s MTV Hustle 5 songs ranked by YouTube views, led by ${songs[0].song} (${compact.format(songs[0].views)}).`,
    alternates: { canonical: `/hustlers/${slug}` },
    // A page-level openGraph replaces the layout's whole object, so the preview image is repeated here.
    openGraph: { type: "profile", siteName: SITE_NAME, title: `${name} on Hustle 5 — songs & YouTube views`, url: `/hustlers/${slug}`, images: [{ url: "/api/og", width: 1200, height: 630 }] },
  };
}

export default async function Hustler({ params }: Props) {
  const { slug } = await params;
  const data = await getLeaderboard();
  const name = findContestant(data, slug);
  if (!name) notFound();
  const { songs, place, of, solo, views } = profileOf(data, name);
  const max = songs[0]?.views || 1;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MusicGroup",
    name,
    url: `${SITE_URL}/hustlers/${slug}`,
    genre: "Hip hop",
    track: songs.map(t => ({
      "@type": "MusicRecording",
      name: t.song,
      url: `https://www.youtube.com/watch?v=${t.id}`,
      interactionStatistic: { "@type": "InteractionCounter", interactionType: "https://schema.org/WatchAction", userInteractionCount: t.views },
    })),
  };
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
      { "@type": "ListItem", position: 2, name, item: `${SITE_URL}/hustlers/${slug}` },
    ],
  };

  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([jsonLd, breadcrumbs]).replace(/</g, "\\u003c") }} />
    <header className="masthead">
      <Link className="logo" href="/"><span>H</span> Hustle Charts</Link>
      <Link className="back" href="/"><ArrowLeft size={15} aria-hidden="true" /> Full leaderboard</Link>
    </header>

    <main>
      <section className="intro">
        <div>
          <h1><span className="eyebrow">Hustle 5 · Apna Homeground</span>{name.toUpperCase()}</h1>
        </div>
        <p className="lede">
          {place ? <>{name} is <b>#{place} of {of}</b> on the Hustle 5 leaderboard, with {exact.format(solo.total)} views on solo songs.</> : <>{name} has no solo songs on the leaderboard yet.</>}
          {" "}Here are all {songs.length} of {name}&rsquo;s official Hustle 5 songs, ranked by YouTube views.
        </p>
      </section>

      <section className="stats" aria-label={`${name} summary`}>
        <div className="stat hero">
          <small>Views across every song</small>
          <b>{compact.format(views)}</b>
          <p>{exact.format(views)} plays, collabs and anthems included</p>
        </div>
        <div className="stat">
          <small>Leaderboard</small>
          <b>{place ? `#${place}` : "—"}</b>
          <p>{place ? `of ${of}, by solo views` : "no solo songs yet"}</p>
        </div>
        <div className="stat">
          <small>Songs</small>
          <b>{songs.length}</b>
          <p>{songs.filter(t=>kindOf(t)==="solo").length} solo</p>
        </div>
        <div className="stat mark">
          <small>Biggest song</small>
          <b>{songs[0].song}</b>
          <p>{compact.format(songs[0].views)} views</p>
        </div>
      </section>

      <section className="board">
        <div className="card">
          <h2>{name.toUpperCase()}&rsquo;S SONGS</h2>
          <p className="sub">Every official upload {name} is on, from the KaanPhod Music YouTube channel. Pick any row to watch it.</p>
          <div className="chart" style={{ marginTop:22 }}>
            {songs.map((t, i) => <article className="row" key={t.id}>
              <a className="row-main" href={`https://youtube.com/watch?v=${t.id}`} target="_blank" rel="noreferrer">
                <span className="rank">{String(i+1).padStart(2,"0")}</span>
                <span className="name">
                  <strong>{t.song}</strong>
                  <small><span className={`kind ${kindOf(t)}`}>{KIND_LABEL[kindOf(t)]}</span>{(t.credits?.length ?? 1) > 1 && `with ${t.credits!.filter(n=>n!==name).join(", ")}`}</small>
                </span>
                <span className="track" aria-hidden="true"><i style={{ width:`${Math.max(t.views/max*100, 0.4)}%` }} /></span>
                <span className="val">{compact.format(t.views)}</span>
                <ExternalLink className="chev" size={16} aria-label="Opens on YouTube" />
              </a>
            </article>)}
          </div>
          <p className="note">YouTube reports rounded view counts, so treat every figure as approximate. Data refreshes at most every 12 hours.</p>
        </div>
      </section>
    </main>

    <footer>
      <nav className="roster" aria-label="Every Hustle 5 hustler">
        <h3>More Hustle 5 hustlers</h3>
        <ul>{contestantsOf(data).filter(n=>n!==name).map(n=><li key={n}><Link href={`/hustlers/${slugOf(n)}`}>{n}</Link></li>)}</ul>
      </nav>
    </footer>
  </>;
}
