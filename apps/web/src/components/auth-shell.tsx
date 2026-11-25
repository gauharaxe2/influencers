import type { ReactNode } from "react";
import Link from "next/link";
import { Brand } from "./brand";
import { Icon } from "./icons";

export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="auth-page" id="main-content">
      <div className="auth-page__glow" aria-hidden="true" />
      <header className="auth-nav container">
        <Brand />
        <Link className="text-link auth-nav__back" href="/">
          Back to home
          <Icon name="arrow-right" width="16" height="16" />
        </Link>
      </header>

      <div className="container auth-grid">
        <section className="auth-intro" aria-labelledby="auth-title">
          <span className="eyebrow"><span className="status-dot" /> Your next chapter starts here</span>
          <h1 id="auth-title">{title}</h1>
          <p>{description}</p>
          <div className="auth-benefits">
            <div><Icon name="video" /><span><strong>Your work, your space</strong>Upload and manage your videos in one focused studio.</span></div>
            <div><Icon name="eye" /><span><strong>Choose your audience</strong>Set each video to public, unlisted, or private.</span></div>
            <div><Icon name="shield" /><span><strong>Start with confidence</strong>Your session stays securely in an HttpOnly cookie.</span></div>
          </div>
        </section>

        <section className="auth-card" aria-label="Account form">
          {children}
        </section>
      </div>

      <footer className="auth-footer container">
        <span>© {new Date().getFullYear()} Influence</span>
        <span>Independent video, thoughtfully shared.</span>
      </footer>
    </main>
  );
}
