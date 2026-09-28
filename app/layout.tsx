import type { Metadata } from "next";
import "./globals.css";
import { SITE_NAME, SITE_URL } from "@/lib/site";

const TITLE = "Hustle 5 Leaderboard: Most Viewed Songs & Rappers | Hustle Charts";
const DESCRIPTION = "Live MTV Hustle 5 (Apna Homeground) rankings: every official song and rapper ranked by YouTube views, updated every 12 hours.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: "%s | Hustle Charts" },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: ["Hustle 5", "MTV Hustle 5", "Hustle 5 leaderboard", "Hustle 5 ranking", "Hustle 5 songs", "Hustle 5 most viewed songs", "Hustle 5 Apna Homeground", "Hustle 5 winner", "KaanPhod Music"],
  icons: { icon:"/favicon.svg", apple:"/apple-icon.png" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: TITLE,
    description: DESCRIPTION,
    url: "/",
    locale: "en_IN",
    images: [{ url:"/api/og", width:1200, height:630, alt:"Hustle 5 leaderboard: top 5 hustlers and top 5 songs by YouTube views" }],
  },
  twitter: { card:"summary_large_image", title:TITLE, description:DESCRIPTION, images:["/api/og"] },
};

export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="en"><body>{children}</body></html>;
}
