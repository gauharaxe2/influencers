import Link from "next/link";
import type { VideoDto } from "@creator-platform/contracts";
import { EnableCreatorButton } from "@/components/studio/enable-creator-button";
import { VideoStatusBadge, VisibilityBadge } from "@/components/studio/status-badge";
import { Icon } from "@/components/icons";
import { getCreatorVideos } from "@/lib/creator";
import { formatBytes, formatDate } from "@/lib/format";
import { getCurrentUser } from "@/lib/session";

export default async function VideosPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  if (user.role !== "CREATOR") {
    return (
      <div className="studio-page">
        <div className="page-heading"><div><span className="eyebrow">Videos</span><h1>Your video library</h1><p>Creator tools are available after you enable a creator profile.</p></div></div>
        <section className="panel empty-panel">
          <span className="empty-panel__icon"><Icon name="video" /></span>
          <span className="eyebrow">{user.role === "VIEWER" ? "Viewer account" : "Admin account"}</span>
          <h2>{user.role === "VIEWER" ? "Create a creator profile to start your library." : "Creator tools require a creator account."}</h2>
          <p>{user.role === "VIEWER" ? "You’ll keep this same account and gain access to video uploads, visibility controls, and processing status." : "Your admin role does not include access to the creator video endpoints. Use a creator account to manage a video library."}</p>
          {user.role === "VIEWER" ? <EnableCreatorButton /> : null}
        </section>
      </div>
    );
  }

  const videos = await getCreatorVideos();

  return (
    <div className="studio-page">
      <div className="page-heading"><div><span className="eyebrow">Library</span><h1>Your videos</h1><p>{videos.length ? `${videos.length} ${videos.length === 1 ? "video" : "videos"} in your creator library.` : "Upload your first video to start building your library."}</p></div><Link className="button button--primary" href="/studio/videos/new"><Icon name="upload" /> Upload video</Link></div>

      {videos.length === 0 ? (
        <section className="panel empty-panel">
          <span className="empty-panel__icon"><Icon name="film" /></span>
          <span className="eyebrow">A fresh frame</span>
          <h2>Your library is empty.</h2>
          <p>Choose an MP4, WebM, or MOV file and share your first piece of work. You’ll be able to follow its processing status here.</p>
          <Link className="button button--primary" href="/studio/videos/new">Upload your first video <Icon name="arrow-right" /></Link>
        </section>
      ) : (
        <>
          <div className="video-table-wrap panel">
            <table className="video-table">
              <caption className="sr-only">Your uploaded videos, including visibility, status, file size, and upload date</caption>
              <thead><tr><th scope="col">Title</th><th scope="col">Visibility</th><th scope="col">Status</th><th scope="col">Size</th><th scope="col">Uploaded</th></tr></thead>
              <tbody>{videos.map((video) => <VideoRow key={video.id} video={video} />)}</tbody>
            </table>
          </div>
          <div className="video-card-list">
            {videos.map((video) => (
              <article className="panel video-card" key={video.id}>
                <div className="video-card__title"><span className="video-card__icon"><Icon name="video" /></span><h2>{video.title}</h2></div>
                <div className="video-card__badges"><VisibilityBadge visibility={video.visibility} /><VideoStatusBadge status={video.status} /></div>
                <dl><div><dt>File size</dt><dd>{formatBytes(video.sizeBytes)}</dd></div><div><dt>Uploaded</dt><dd><time dateTime={video.createdAt}>{formatDate(video.createdAt)}</time></dd></div></dl>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function VideoRow({ video }: { video: VideoDto }) {
  return (
    <tr>
      <td><div className="video-title-cell"><span className="video-title-cell__icon"><Icon name="video" /></span><div><strong>{video.title}</strong><small>{video.fileName}</small></div></div></td>
      <td><VisibilityBadge visibility={video.visibility} /></td>
      <td><VideoStatusBadge status={video.status} /></td>
      <td className="video-table__number">{formatBytes(video.sizeBytes)}</td>
      <td><time dateTime={video.createdAt}>{formatDate(video.createdAt)}</time></td>
    </tr>
  );
}
