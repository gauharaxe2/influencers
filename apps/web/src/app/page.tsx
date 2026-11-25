import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { PoweredBy } from "@/components/powered-by";
import { Icon, type IconName } from "@/components/icons";

const creatorFeatures: { icon: IconName; title: string; description: string; detail: string }[] = [
  { icon: "upload", title: "Publish with intention", description: "Bring your MP4, WebM, or MOV files into a studio built around a simple, clear upload flow.", detail: "From first upload to processing" },
  { icon: "eye", title: "Choose who sees it", description: "Make a video public, share it as unlisted, or keep it private. Every upload starts with your choice.", detail: "Public · Unlisted · Private" },
  { icon: "clock", title: "Know what happens next", description: "Follow real upload and processing states in your library, without invented progress or noisy dashboards.", detail: "Clear status at every step" },
];

export default function LandingPage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <section className="hero">
          <div className="hero__grid-bg" aria-hidden="true" />
          <div className="container hero__grid">
            <div className="hero__copy">
              <span className="eyebrow hero__eyebrow"><span className="status-dot" /> Built for Pakistan’s independent video</span>
              <h1>Influence<br /><span>Your work, amplified.</span></h1>
              <p className="hero__lead">A focused home for Pakistani creators to publish with purpose—and viewers at home and abroad to find work worth pressing play on.</p>
              <div className="hero__actions">
                <Link className="button button--primary button--large" href="/signup">Start creating <Icon name="arrow-right" /></Link>
                <Link className="button button--ghost button--large" href="/login">I already have an account</Link>
              </div>
              <p className="hero__note"><Icon name="shield" width="17" height="17" /> Start as a viewer. Become a creator when you’re ready.</p>
            </div>

            <div className="hero__visual" aria-label="An illustrative preview of an Influence creator workspace">
              <div className="hero__orbit hero__orbit--one" aria-hidden="true" />
              <div className="hero__orbit hero__orbit--two" aria-hidden="true" />
              <div className="creator-preview">
                <div className="creator-preview__bar">
                  <span className="preview-wordmark">
                    <Image
                      src="/brand/influence-logo.png"
                      alt="Influence"
                      width={220}
                      height={72}
                      className="preview-wordmark__logo"
                    />
                  </span>
                  <span className="preview-label">Creator space</span>
                  <span className="preview-avatar">Y</span>
                </div>
                <div className="creator-preview__body">
                  <div className="preview-screen">
                    <div className="preview-screen__glow" aria-hidden="true" />
                    <span className="preview-screen__play"><Icon name="play" width="25" height="25" /></span>
                    <div className="preview-screen__copy"><small>YOUR NEXT UPLOAD</small><strong>Make something<br />worth coming back to.</strong></div>
                    <span className="preview-screen__tag">Your story starts here</span>
                  </div>
                  <div className="preview-details"><div><small>NOW IN YOUR STUDIO</small><strong>A space for your work</strong></div><span><Icon name="spark" /></span></div>
                  <div className="preview-wave" aria-hidden="true">{Array.from({ length: 26 }, (_, index) => <span key={index} style={{ height: `${12 + ((index * 17) % 35)}px` }} />)}</div>
                </div>
              </div>
              <div className="floating-note floating-note--top"><span><Icon name="eye" /></span><div><strong>Your audience, your choice</strong><small>Set visibility per video</small></div></div>
              <div className="floating-note floating-note--bottom"><span><Icon name="play" /></span><div><strong>Built for the work</strong><small>Not the noise</small></div></div>
            </div>
          </div>
          <div className="container hero__formats"><span>Made for the formats you use</span><div><strong>MP4</strong><i /><strong>WebM</strong><i /><strong>MOV</strong></div><span>One focused creator studio</span></div>
        </section>

        <section className="section creator-section" id="creators">
          <div className="container">
            <div className="section-heading section-heading--split"><div><span className="eyebrow">For creators</span><h2>Less managing.<br /><span>More making.</span></h2></div><p>Influence keeps the essentials close, so your energy can stay with the story you’re telling.</p></div>
            <div className="feature-grid">
              {creatorFeatures.map((feature, index) => (
                <article className={`feature-card feature-card--${index + 1}`} key={feature.title}>
                  <div className="feature-card__top"><span className="feature-card__icon"><Icon name={feature.icon} /></span><span className="feature-card__number">0{index + 1}</span></div>
                  <h3>{feature.title}</h3><p>{feature.description}</p><span className="feature-card__detail"><Icon name="check" width="15" height="15" />{feature.detail}</span>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section viewer-section">
          <div className="container viewer-panel">
            <div className="viewer-panel__copy"><span className="eyebrow">For viewers</span><h2>A better place<br /><span>to press play.</span></h2><p>Independent Pakistani video deserves a thoughtful home. Influence puts the creator first and keeps the viewing experience clear.</p><Link className="text-link text-link--light" href="/signup">Join as a viewer <Icon name="arrow-right" /></Link></div>
            <div className="viewer-panel__features">
              <article><span><Icon name="play" /></span><div><h3>Work with a point of view</h3><p>Make room for original videos and the people behind them.</p></div></article>
              <article><span><Icon name="eye" /></span><div><h3>Respect the creator’s choice</h3><p>Public, unlisted, and private settings keep sharing intentional.</p></div></article>
              <article><span><Icon name="user" /></span><div><h3>One account, two possibilities</h3><p>Join to watch today and enable your own creator profile later.</p></div></article>
            </div>
          </div>
        </section>

        <section className="section revenue-section" id="revenue">
          <div className="container revenue-panel">
            <div className="revenue-panel__copy"><span className="eyebrow">Planned revenue model</span><h2>More of the value<br /><span>stays with the creator.</span></h2><p>Influence’s planned model is simple: a 30% platform share and a 70% creator share for eligible platform-supported revenue.</p><div className="revenue-panel__caveat"><Icon name="shield" /><p>This is a planned model, not a current payout guarantee. Eligible revenue, fees, markets, and payout timing will be confirmed before launch.</p></div></div>
            <div className="revenue-visual">
              <div className="revenue-visual__ring" aria-hidden="true"><div><strong>70<span>%</span></strong><small>creator share</small></div></div>
              <div className="revenue-split" role="img" aria-label="Planned revenue split: 30 percent platform and 70 percent creator"><span className="revenue-split__platform">30%</span><span className="revenue-split__creator">70%</span></div>
              <div className="revenue-legend"><span><i className="legend-dot legend-dot--violet" /><strong>Influence platform</strong>30%</span><span><i className="legend-dot legend-dot--cyan" /><strong>Creator</strong>70%</span></div>
            </div>
          </div>
        </section>

        <section className="section final-cta-section">
          <div className="container final-cta"><div className="final-cta__mark" aria-hidden="true"><span /></div><span className="eyebrow">Your next chapter</span><h2>Give your work<br /><span>a home of its own.</span></h2><p>Create an account in minutes. Start as a viewer or step into your creator studio from day one.</p><div className="hero__actions"><Link className="button button--primary button--large" href="/signup">Create your Influence account <Icon name="arrow-right" /></Link><Link className="button button--ghost button--large" href="/login">Log in</Link></div></div>
        </section>
      </main>
      <footer className="site-footer">
        <div className="container site-footer__inner">
          <span>© {new Date().getFullYear()} Influence</span>
          <p>Independent video, thoughtfully shared.</p>
          <PoweredBy />
          <nav aria-label="Footer navigation">
            <Link href="/login">Log in</Link>
            <Link href="/signup">Join Influence</Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
