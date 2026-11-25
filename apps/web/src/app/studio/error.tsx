"use client";

import Link from "next/link";
import { Icon } from "@/components/icons";

export default function StudioError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="panel empty-panel studio-error" role="alert">
      <span className="empty-panel__icon"><Icon name="film" /></span>
      <h1>This part of your studio couldn’t load.</h1>
      <p>The API may be temporarily unavailable, or it returned an unexpected response. Your account data has not been changed.</p>
      <div className="button-row"><button className="button button--primary" type="button" onClick={reset}>Try again</button><Link className="button button--secondary" href="/studio">Back to overview</Link></div>
    </section>
  );
}
