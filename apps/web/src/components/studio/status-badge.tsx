import type { CreatorProfileDto, VideoDto } from "@creator-platform/contracts";

const videoStatusLabels: Record<VideoDto["status"], string> = {
  UPLOADING: "Uploading",
  UPLOADED: "Uploaded",
  PROCESSING: "Processing",
  READY: "Ready",
  REJECTED: "Rejected",
};

const visibilityLabels: Record<VideoDto["visibility"], string> = {
  PUBLIC: "Public",
  UNLISTED: "Unlisted",
  PRIVATE: "Private",
};

const payoutLabels: Record<CreatorProfileDto["payoutStatus"], string> = {
  UNVERIFIED: "Unverified",
  PENDING: "Pending review",
  VERIFIED: "Verified",
};

export function VideoStatusBadge({ status }: { status: VideoDto["status"] }) {
  return <span className={`badge badge--${status.toLowerCase()}`}><span />{videoStatusLabels[status]}</span>;
}

export function VisibilityBadge({ visibility }: { visibility: VideoDto["visibility"] }) {
  return <span className={`badge badge--${visibility.toLowerCase()}`}><IconDot />{visibilityLabels[visibility]}</span>;
}

export function PayoutBadge({ status }: { status: CreatorProfileDto["payoutStatus"] }) {
  return <span className={`badge badge--payout-${status.toLowerCase()}`}><IconDot />{payoutLabels[status]}</span>;
}

function IconDot() {
  return <span className="badge__dot" aria-hidden="true" />;
}
