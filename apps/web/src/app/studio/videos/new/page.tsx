import { EnableCreatorButton } from "@/components/studio/enable-creator-button";
import { UploadForm } from "@/components/studio/upload-form";
import { Icon } from "@/components/icons";
import { getCurrentUser } from "@/lib/session";

export default async function NewVideoPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <div className="studio-page">
      <div className="page-heading"><div><span className="eyebrow">New video</span><h1>Upload your next frame.</h1><p>Add the details, choose your file, and let Frame handle the handoff to processing.</p></div></div>
      {user.role !== "CREATOR" ? (
        <section className="panel empty-panel">
          <span className="empty-panel__icon"><Icon name={user.role === "VIEWER" ? "upload" : "shield"} /></span>
          <h2>{user.role === "VIEWER" ? "Enable your creator profile first." : "Creator uploads require a creator account."}</h2>
          <p>{user.role === "VIEWER" ? "Video uploads are available to creator accounts. You can enable your profile without creating another account." : "Your admin role does not include access to the creator upload endpoints. Use a creator account to upload a video."}</p>
          {user.role === "VIEWER" ? <EnableCreatorButton /> : null}
        </section>
      ) : <UploadForm />}
    </div>
  );
}
