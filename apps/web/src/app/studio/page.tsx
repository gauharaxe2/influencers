import Link from "next/link";
import type { VideoDto } from "@creator-platform/contracts";
import { EnableCreatorButton } from "@/components/studio/enable-creator-button";
import { Icon } from "@/components/icons";
import { getCreatorProfile, getCreatorVideos } from "@/lib/creator";
import { formatBytes, formatDate, getInitials } from "@/lib/format";
import { getCurrentUser } from "@/lib/session";

export default async function OverviewPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const isViewer = user.role === "VIEWER";
  const isAdmin = user.role === "ADMIN";
  const isCreator = user.role === "CREATOR";
  const [profile, videos] = await Promise.all([
    isCreator ? getCreatorProfile() : Promise.resolve(null),
    isCreator ? getCreatorVideos() : Promise.resolve([] as VideoDto[]),
  ]);

  const readyCount = videos.filter((video) => video.status === "READY").length;
  const publishedCount = videos.filter((video) => video.status === "READY" && video.visibility === "PUBLIC").length;
  const inProgressCount = videos.filter((video) => ["UPLOADING", "UPLOADED", "PROCESSING"].includes(video.status)).length;
  const storageUsed = videos.reduce((total, video) => total + video.sizeBytes, 0);
  const firstName = user.displayName.trim().split(/\s+/)[0] || user.displayName;

  return (
    <div className="studio-page">
      <div className="page-heading">
        <div><span className="eyebrow">Overview</span><h1>Welcome back, {firstName}.</h1><p>{isViewer ? "Your viewer account is ready. Explore your options or enable a creator profile when you’re ready to publish." : isAdmin ? "Your admin account is active. Creator video tools require a separate creator role." : "Here’s the current state of your videos and creator profile."}</p></div>
        {isCreator ? <Link className="button button--primary" href="/studio/videos/new"><Icon name="upload" /> Upload a video</Link> : null}
      </div>

      {user.status === "SUSPENDED" ? <div className="form-alert form-alert--error" role="alert">Your account is currently suspended. Contact platform support for details before publishing.</div> : null}

      <section className="stats-grid" aria-label="Video statistics">
        <article className="stat-card"><span className="stat-card__icon"><Icon name="video" /></span><span className="stat-card__label">Videos in library</span><strong>{videos.length}</strong><small>{isViewer ? "Enable a creator profile to add your first" : isAdmin ? "Creator tools require a creator role" : videos.length ? "Across all visibility settings" : "Your library is ready for its first video"}</small></article>
        <article className="stat-card"><span className="stat-card__icon stat-card__icon--cyan"><Icon name="eye" /></span><span className="stat-card__label">Published</span><strong>{publishedCount}</strong><small>Public videos marked ready</small></article>
        <article className="stat-card"><span className="stat-card__icon stat-card__icon--amber"><Icon name="clock" /></span><span className="stat-card__label">In progress</span><strong>{inProgressCount}</strong><small>{readyCount} {readyCount === 1 ? "video" : "videos"} ready overall</small></article>
        <article className="stat-card"><span className="stat-card__icon stat-card__icon--pink"><Icon name="film" /></span><span className="stat-card__label">Storage represented</span><strong className="stat-card__value">{formatBytes(storageUsed)}</strong><small>Total source size of your videos</small></article>
      </section>

      <div className="overview-grid">
        <section className="panel account-summary">
          <div className="panel-heading"><div><h2>{isCreator ? "Creator profile" : "Your account"}</h2><p>{isCreator ? "Your public identity and current profile status." : "The details attached to your Influence account."}</p></div><span className="badge badge--active"><span className="badge__dot" />{user.status === "ACTIVE" ? "Active" : "Suspended"}</span></div>
          <div className="identity-row"><span className="avatar avatar--large">{getInitials(profile?.displayName ?? user.displayName)}</span><div><h3>{profile?.displayName ?? user.displayName}</h3><p>{profile ? `@${profile.handle}` : user.email}</p></div></div>
          <dl className="detail-list"><div><dt>Account type</dt><dd>{isViewer ? "Viewer" : user.role === "ADMIN" ? "Admin" : "Creator"}</dd></div><div><dt>Country</dt><dd>{user.countryCode}</dd></div><div><dt>Member since</dt><dd>{formatDate(user.createdAt)}</dd></div>{profile ? <div><dt>Profile status</dt><dd>Creator profile enabled</dd></div> : null}</dl>
          <Link className="text-link" href="/studio/profile">{isCreator ? "Edit your profile" : "View profile and account access"}<Icon name="arrow-right" width="16" height="16" /></Link>
        </section>

        {isViewer ? (
          <section className="panel creator-invite">
            <span className="creator-invite__icon"><Icon name="spark" /></span>
            <span className="eyebrow">Ready when you are</span>
            <h2>Turn your viewer account into a creator space.</h2>
            <p>You don’t need a new account. Enable your creator profile to choose a handle, upload videos, and manage your work.</p>
            <ul className="check-list"><li><Icon name="check" /> Keep your existing account</li><li><Icon name="check" /> Upload MP4, WebM, or MOV</li><li><Icon name="check" /> Control visibility for every video</li></ul>
            <EnableCreatorButton />
          </section>
        ) : isAdmin ? (
          <section className="panel empty-panel">
            <span className="empty-panel__icon"><Icon name="shield" /></span>
            <span className="eyebrow">Admin access</span>
            <h2>Your account is ready for administrative work.</h2>
            <p>The API reserves creator profiles, uploads, and video libraries for accounts with the creator role. This admin account is not presented as a creator.</p>
          </section>
        ) : (
          <section className="panel quick-actions">
            <div className="panel-heading"><div><h2>Quick actions</h2><p>Keep your creator workflow moving.</p></div></div>
            <Link href="/studio/videos/new"><span className="quick-action__icon"><Icon name="upload" /></span><span><strong>Upload a new video</strong><small>Start a secure upload session</small></span><Icon name="chevron-right" /></Link>
            <Link href="/studio/videos"><span className="quick-action__icon"><Icon name="video" /></span><span><strong>Review your library</strong><small>Check visibility and processing status</small></span><Icon name="chevron-right" /></Link>
            <Link href="/studio/profile"><span className="quick-action__icon"><Icon name="profile" /></span><span><strong>Update your profile</strong><small>{profile ? `@${profile.handle}` : "Profile details unavailable"}</small></span><Icon name="chevron-right" /></Link>
          </section>
        )}
      </div>
    </div>
  );
}
