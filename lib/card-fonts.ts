import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Committed under assets/ so Vercel bundles them with the image routes.
export async function cardFonts() {
  const [anton, geist] = await Promise.all([
    readFile(join(process.cwd(), "assets/Anton-Regular.ttf")),
    readFile(join(process.cwd(), "assets/Geist-Regular.ttf")),
  ]);
  return [
    { name:"Anton", data:anton, weight:400 as const, style:"normal" as const },
    { name:"Geist", data:geist, weight:400 as const, style:"normal" as const },
  ];
}
