import Link from "next/link";
import { Brand } from "@/components/brand";
import { Icon } from "@/components/icons";

export default function NotFound() {
  return (
    <main className="not-found" id="main-content">
      <Brand />
      <div className="not-found__frame" aria-hidden="true"><span>404</span><Icon name="film" /></div>
      <span className="eyebrow">Outside the frame</span>
      <h1>This page isn’t here.</h1>
      <p>The link may have moved, or the page may never have existed. Let’s get you back to something worth watching.</p>
      <div className="button-row"><Link className="button button--primary" href="/">Back to Frame <Icon name="arrow-right" /></Link><Link className="button button--secondary" href="/studio">Open studio</Link></div>
    </main>
  );
}
