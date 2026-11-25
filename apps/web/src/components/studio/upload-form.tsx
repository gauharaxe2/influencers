"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import {
  VIDEO_VISIBILITIES,
  videoUploadSchema,
  type UploadSessionDto,
  type VideoDto,
  type VideoVisibility,
} from "@creator-platform/contracts";
import { ApiError, browserApi } from "@/lib/api-client";
import { getApiErrorMessage, parseJson } from "@/lib/api-response";
import { formatBytes } from "@/lib/format";
import { Icon } from "@/components/icons";
import { VideoStatusBadge } from "./status-badge";

type Phase = "idle" | "creating" | "uploading" | "completing" | "processing";
type FieldErrors = Partial<Record<"title" | "description" | "visibility" | "file", string>>;

const steps = ["Video details", "Upload file", "Finish & process"];

function getFileMimeType(file: File): string {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  if (type === "video/mp4" || type === "video/webm" || type === "video/quicktime") return type;
  if (!type && name.endsWith(".mp4")) return "video/mp4";
  if (!type && name.endsWith(".webm")) return "video/webm";
  if ((!type || type === "video/x-quicktime") && name.endsWith(".mov")) return "video/quicktime";
  return type;
}

function getPhaseIndex(phase: Phase): number {
  if (phase === "idle" || phase === "creating") return 0;
  if (phase === "uploading") return 1;
  return 2;
}

export function UploadForm() {
  const inFlight = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<VideoVisibility>("PUBLIC");
  const [file, setFile] = useState<File | null>(null);
  const [session, setSession] = useState<UploadSessionDto | null>(null);
  const [uploaded, setUploaded] = useState(false);
  const [completedVideo, setCompletedVideo] = useState<VideoDto | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const activeStep = getPhaseIndex(phase);
  const busy = phase !== "idle";

  function selectFile(selected: File | null) {
    setFile(selected);
    setSession(null);
    setUploaded(false);
    setErrors((current) => ({ ...current, file: undefined }));
    setFormError("");
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    selectFile(event.target.files?.[0] ?? null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;

    const nextErrors: FieldErrors = {};
    if (!file) nextErrors.file = "Choose a video file to upload.";

    const payload = {
      title,
      description,
      visibility,
      fileName: file?.name ?? "",
      mimeType: file ? getFileMimeType(file) : "",
      sizeBytes: file?.size ?? 0,
    };
    const result = videoUploadSchema.safeParse(payload);
    if (!result.success) {
      const fields = result.error.flatten().fieldErrors;
      nextErrors.title = fields.title?.[0];
      nextErrors.description = fields.description?.[0];
      nextErrors.visibility = fields.visibility?.[0];
      const fileMessages = [
        ...(fields.fileName ?? []),
        ...(fields.mimeType ?? []),
        ...(fields.sizeBytes ?? []),
      ];
      if (fileMessages.length) nextErrors.file = fileMessages.join(" ");
    }

    if (Object.keys(nextErrors).length || !result.success || !file) {
      setErrors(nextErrors);
      setFormError("Check the highlighted fields and try again.");
      return;
    }

    inFlight.current = true;
    setErrors({});
    setFormError("");
    setPhase("creating");

    try {
      let activeSession = session;
      if (!activeSession) {
        activeSession = await browserApi<UploadSessionDto>("/creator/videos/upload-sessions", {
          method: "POST",
          body: JSON.stringify(result.data),
        });
        setSession(activeSession);
      }

      if (!uploaded) {
        setPhase("uploading");
        let uploadUrl: URL;
        try {
          uploadUrl = new URL(activeSession.uploadUrl);
          if (uploadUrl.protocol !== "https:" && uploadUrl.protocol !== "http:") throw new Error();
        } catch {
          throw new ApiError("The upload service returned an invalid URL. Please try again.", 502);
        }

        const uploadResponse = await fetch(uploadUrl, {
          method: "PUT",
          headers: activeSession.headers,
          body: file,
          credentials: "omit",
        });

        if (!uploadResponse.ok) {
          const responseText = await uploadResponse.text();
          const message = getApiErrorMessage(
            parseJson(responseText),
            "The file upload was rejected by storage. Please try again.",
          );
          const alreadyReceived = uploadResponse.status === 409 && /already been received/i.test(message);
          if (!alreadyReceived) throw new ApiError(message, uploadResponse.status);
        }
        setUploaded(true);
      }

      setPhase("completing");
      const video = await browserApi<VideoDto>(
        `/creator/videos/${encodeURIComponent(activeSession.video.id)}/complete`,
        { method: "POST" },
      );
      setCompletedVideo(video);
      setPhase("processing");
      inFlight.current = false;
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "The upload could not be completed. Please try again.");
      setPhase("idle");
      inFlight.current = false;
    }
  }

  function resetForm() {
    setTitle("");
    setDescription("");
    setVisibility("PUBLIC");
    setFile(null);
    setSession(null);
    setUploaded(false);
    setCompletedVideo(null);
    setErrors({});
    setFormError("");
    setPhase("idle");
    if (fileInput.current) fileInput.current.value = "";
  }

  const statusMessage = phase === "creating"
    ? "Creating a secure upload session…"
    : phase === "uploading"
      ? "Uploading your file. Keep this tab open; no progress percentage is available."
      : phase === "completing"
        ? "File uploaded. Asking Frame to complete the upload…"
        : "";

  return (
    <div className="upload-workspace">
      <ol className="step-indicator" aria-label="Upload progress">
        {steps.map((step, index) => (
          <li key={step} className={`${index < activeStep || phase === "processing" ? "is-complete" : ""}${index === activeStep && phase !== "processing" ? " is-active" : ""}`} aria-current={index === activeStep && phase !== "processing" ? "step" : undefined}>
            <span>{index < activeStep || phase === "processing" ? <Icon name="check" width="15" height="15" /> : index + 1}</span>
            <strong>{step}</strong>
          </li>
        ))}
      </ol>

      {phase === "processing" ? (
        <section className="panel upload-success" aria-labelledby="upload-success-title">
          <span className="upload-success__icon"><Icon name="check" /></span>
          <span className="eyebrow">Upload complete</span>
          <h2 id="upload-success-title">{completedVideo?.status === "READY" ? "Your video is ready." : completedVideo?.status === "REJECTED" ? "Frame rejected this video." : "Processing is next."}</h2>
          <p>{completedVideo?.status === "READY" ? "Frame has marked this video ready. You can review it in your library." : completedVideo?.status === "REJECTED" ? "The API reported this video as rejected. Check your library for the latest details before trying again." : "Your file reached Frame and completion was accepted. Processing is the next stage; check your library for the latest API status."}</p>
          <div className="upload-success__meta"><strong>{completedVideo?.title ?? session?.video.title ?? title}</strong>{completedVideo ? <VideoStatusBadge status={completedVideo.status} /> : <span className="field-hint">Check the library for the latest status</span>}</div>
          <div className="button-row"><Link className="button button--primary" href="/studio/videos">Go to video library <Icon name="arrow-right" /></Link><button className="button button--secondary" type="button" onClick={resetForm}>Upload another video</button></div>
        </section>
      ) : (
        <form className="upload-form" onSubmit={handleSubmit} noValidate>
          <section className="panel upload-details">
            <div className="panel-heading"><div><h2>Video details</h2><p>Give your video a clear title and choose who can see it.</p></div></div>
            {formError ? <div className="form-alert form-alert--error" role="alert">{formError}</div> : null}
            {session && phase === "idle" ? <div className="form-alert form-alert--info" role="status">An upload session already exists. Continuing will resume this upload instead of creating another. Details are locked to this session; choose a different file to start over.</div> : null}

            <div className="field">
              <div className="field__label-row"><label htmlFor="video-title">Title</label><span>{title.length}/100</span></div>
              <input id="video-title" type="text" maxLength={100} placeholder="Give your video a title" value={title} onChange={(event) => { setTitle(event.target.value); setErrors((current) => ({ ...current, title: undefined })); }} aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? "video-title-error" : undefined} disabled={busy || Boolean(session)} required />
              {errors.title ? <span className="field-error" id="video-title-error">{errors.title}</span> : null}
            </div>

            <div className="field">
              <div className="field__label-row"><label htmlFor="video-description">Description <span className="optional">Optional</span></label><span>{description.length}/5000</span></div>
              <textarea id="video-description" rows={5} maxLength={5000} placeholder="Add context, credits, or a note for your viewers." value={description} onChange={(event) => { setDescription(event.target.value); setErrors((current) => ({ ...current, description: undefined })); }} aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? "video-description-error" : undefined} disabled={busy || Boolean(session)} />
              {errors.description ? <span className="field-error" id="video-description-error">{errors.description}</span> : null}
            </div>

            <div className="field">
              <label htmlFor="video-visibility">Visibility</label>
              <select id="video-visibility" value={visibility} onChange={(event) => { setVisibility(event.target.value as VideoVisibility); setErrors((current) => ({ ...current, visibility: undefined })); }} disabled={busy || Boolean(session)}>
                {VIDEO_VISIBILITIES.map((option) => <option key={option} value={option}>{option === "PUBLIC" ? "Public — visible to everyone" : option === "UNLISTED" ? "Unlisted — only people with the link" : "Private — only you"}</option>)}
              </select>
              <span className="field-hint">You can review this setting before sharing your video.</span>
              {errors.visibility ? <span className="field-error">{errors.visibility}</span> : null}
            </div>
          </section>

          <aside className="upload-aside">
            <section className="panel file-panel">
              <div className="panel-heading"><div><h2>Video file</h2><p>MP4, WebM, or MOV · 5 GB schema limit</p></div></div>
              <label className={`file-drop${file ? " has-file" : ""}${errors.file ? " has-error" : ""}`}>
                <input ref={fileInput} className="file-drop__input" type="file" accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov" onChange={handleFileChange} disabled={busy} aria-describedby={errors.file ? "video-file-error" : "video-file-hint"} aria-invalid={Boolean(errors.file)} />
                <span className="file-drop__icon"><Icon name={file ? "film" : "upload"} /></span>
                <strong>{file ? file.name : "Choose a video file"}</strong>
                <small>{file ? `${formatBytes(file.size)} · Click to choose a different file` : "Select a file from your device"}</small>
              </label>
              <span className="field-hint" id="video-file-hint">The API may enforce a lower configured size limit. Your file is sent directly to the upload URL provided by Frame.</span>
              {errors.file ? <span className="field-error" id="video-file-error">{errors.file}</span> : null}
            </section>

            <section className="panel upload-checklist">
              <h2>What happens next</h2>
              <ol><li><span>1</span><div><strong>Secure session</strong><p>Frame creates a video record and a temporary upload URL.</p></div></li><li><span>2</span><div><strong>Direct upload</strong><p>Your file is sent to storage using the returned headers.</p></div></li><li><span>3</span><div><strong>Server processing</strong><p>Frame accepts the completed upload. Processing is the next stage reported by the API.</p></div></li></ol>
            </section>
          </aside>

          <div className="upload-submit">
            <div className="upload-submit__status" aria-live="polite">{statusMessage ? <><span className="spinner" />{statusMessage}</> : <span>Ready when you are. Nothing is uploaded until you submit.</span>}</div>
            <button className="button button--primary button--large" type="submit" disabled={busy}>
              {phase === "creating" ? <><span className="spinner" /> Creating session…</> : phase === "uploading" ? <><span className="spinner" /> Uploading file…</> : phase === "completing" ? <><span className="spinner" /> Completing upload…</> : session ? <>Resume upload <Icon name="upload" /></> : <>Start upload <Icon name="arrow-right" /></>}
            </button>
            <Link className="text-link" href="/studio/videos">Cancel and return to videos</Link>
          </div>
        </form>
      )}
    </div>
  );
}
