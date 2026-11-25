import Link from "next/link";
import { Brand } from "./brand";
import { Icon } from "./icons";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Brand />
        <nav className="site-header__nav" aria-label="Main navigation">
          <Link className="text-link" href="/login">Log in</Link>
          <Link className="button button--primary button--small" href="/signup">
            Join Influence
            <Icon name="arrow-right" width="16" height="16" />
          </Link>
        </nav>
      </div>
    </header>
  );
}
