import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hustle Charts — MTV Hustle 5 YouTube Rankings",
  description: "See which MTV Hustle 5 rappers are winning the YouTube views race.",
  icons: { icon:"/favicon.svg" },
};

export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="en"><body>{children}</body></html>;
}
