"use client";

import Link from "next/link";
import { Brand } from "@/components/brand";
import { Icon } from "@/components/icons";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="not-found" id="main-content">
      <Brand />
      <div className="not-found__frame not-found__frame--error" aria-hidden="true"><Icon name="spark" /></div>
      <span className="eyebrow">A brief interruption</span>
      <h1>We couldn’t load this frame.</h1>
      <p>The service may be unavailable, or the API returned an unexpected response. Try again in a moment.</p>
      <div className="button-row"><button className="button button--primary" type="button" onClick={reset}>Try again <Icon name="arrow-right" /></button><Link className="button button--secondary" href="/">Back to home</Link></div>
    </main>
  );
}
