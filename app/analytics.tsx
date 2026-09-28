"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

declare global {
  interface Window { goatcounter?: { count: (vars: { path: string }) => void } }
}

// GoatCounter counts the first page load itself. Moving to a hustler page with <Link>
// doesn't reload the page, so those visits are counted here. It skips localhost on its own.
export default function Analytics() {
  const pathname = usePathname();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    window.goatcounter?.count({ path: pathname });
  }, [pathname]);
  return <Script data-goatcounter="https://hustlecharts.goatcounter.com/count" src="https://gc.zgo.at/count.js" strategy="afterInteractive" />;
}
