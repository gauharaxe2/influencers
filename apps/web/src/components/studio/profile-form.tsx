"use client";

import { useRef, useState, type FormEvent } from "react";
import type { CreatorProfileDto, UserDto, UpdateCreatorProfileInput } from "@creator-platform/contracts";
import { updateCreatorProfileSchema } from "@creator-platform/contracts";
import { browserApi } from "@/lib/api-client";
import { Icon } from "@/components/icons";
import { formatDate } from "@/lib/format";
import { EnableCreatorButton } from "./enable-creator-button";
import { PayoutBadge } from "./status-badge";

type FieldErrors = Partial<Record<keyof UpdateCreatorProfileInput, string>>;

const payoutCopy: Record<CreatorProfileDto["payoutStatus"], { title: string; description: string }> = {
  UNVERIFIED: {
    title: "Payout details are not verified",
    description: "No verified payout account is currently associated with this creator profile.",
  },
  PENDING: {
    title: "Payout verification is in progress",
    description: "Your payout details are pending review. This does not yet confirm that payouts are available.",
  },
  VERIFIED: {
    title: "Payout details are verified",
    description: "Your payout account is marked verified by the API. Actual payout availability still depends on the platform’s launch terms and eligible revenue.",
  },
};

export function ProfileForm({ user, initialProfile }: { user: UserDto; initialProfile: CreatorProfileDto | null }) {
  const inFlight = useRef(false);
  const [profile, setProfile] = useState(initialProfile);
  const [values, setValues] = useState<UpdateCreatorProfileInput>({
    displayName: initialProfile?.displayName ?? user.displayName,
    handle: initialProfile?.handle ?? "",
    bio: initialProfile?.bio ?? "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, setPending] = useState(false);

  function updateField<Key extends keyof UpdateCreatorProfileInput>(key: Key, value: UpdateCreatorProfileInput[Key]) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setFormError("");
    setSuccess("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;

    const result = updateCreatorProfileSchema.safeParse(values);
    if (!result.success) {
      const fields = result.error.flatten().fieldErrors;
      setErrors({ displayName: fields.displayName?.[0], handle: fields.handle?.[0], bio: fields.bio?.[0] });
      setFormError("Check the highlighted fields and try again.");
      return;
    }

    inFlight.current = true;
    setPending(true);
    setErrors({});
    setFormError("");
    setSuccess("");

    try {
      const updated = await browserApi<CreatorProfileDto>("/creator/profile", {
        method: "PATCH",
        body: JSON.stringify(result.data),
      });
      setProfile(updated);
      setValues({ displayName: updated.displayName, handle: updated.handle, bio: updated.bio });
      setSuccess("Your creator profile has been updated.");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not update your profile. Please try again.");
    } finally {
      setPending(false);
      inFlight.current = false;
    }
  }

  if (user.role === "ADMIN") {
    return (
      <section className="panel empty-panel">
        <span className="empty-panel__icon"><Icon name="shield" /></span>
        <span className="eyebrow">Admin account</span>
        <h2>Creator profile tools require a creator role.</h2>
        <p>Your administrator account can access this protected studio, but the API does not grant admin roles access to creator profiles or payout status.</p>
      </section>
    );
  }

  if (user.role === "VIEWER" && !profile) {
    return (
      <section className="panel empty-panel">
        <span className="empty-panel__icon"><Icon name="profile" /></span>
        <span className="eyebrow">Viewer account</span>
        <h2>Make room for your creator side.</h2>
        <p>Enable a creator profile to choose a handle, add a bio, upload videos, and see your payout verification status.</p>
        <EnableCreatorButton />
      </section>
    );
  }

  if (!profile) {
    return (
      <section className="panel empty-panel">
        <span className="empty-panel__icon"><Icon name="profile" /></span>
        <h2>Your creator profile could not be found.</h2>
        <p>The account is marked as a creator, but the profile API did not return a profile. Try refreshing this page.</p>
        <a className="button button--secondary" href="/studio/profile">Refresh profile</a>
      </section>
    );
  }

  const payout = payoutCopy[profile.payoutStatus];

  return (
    <div className="profile-grid">
      <form className="panel profile-form" onSubmit={handleSubmit} noValidate>
        <div className="panel-heading">
          <div><h2>Public profile</h2><p>These details identify your creator space on Frame.</p></div>
        </div>

        {formError ? <div className="form-alert form-alert--error" role="alert">{formError}</div> : null}
        {success ? <div className="form-alert form-alert--success" role="status"><Icon name="check" />{success}</div> : null}

        <div className="field">
          <label htmlFor="profile-displayName">Display name</label>
          <input id="profile-displayName" type="text" autoComplete="name" minLength={2} maxLength={60} value={values.displayName} onChange={(event) => updateField("displayName", event.target.value)} aria-invalid={Boolean(errors.displayName)} aria-describedby={errors.displayName ? "profile-name-error" : undefined} disabled={pending} required />
          {errors.displayName ? <span className="field-error" id="profile-name-error">{errors.displayName}</span> : null}
        </div>

        <div className="field">
          <label htmlFor="profile-handle">Handle</label>
          <div className="input-prefix"><span>@</span><input id="profile-handle" type="text" autoComplete="off" minLength={3} maxLength={30} placeholder="your_handle" value={values.handle} onChange={(event) => updateField("handle", event.target.value)} aria-invalid={Boolean(errors.handle)} aria-describedby={errors.handle ? "profile-handle-error" : "profile-handle-hint"} disabled={pending} required /></div>
          {errors.handle ? <span className="field-error" id="profile-handle-error">{errors.handle}</span> : <span className="field-hint" id="profile-handle-hint">3–30 lowercase letters, numbers, or underscores.</span>}
        </div>

        <div className="field">
          <div className="field__label-row"><label htmlFor="profile-bio">Bio</label><span>{values.bio.length}/500</span></div>
          <textarea id="profile-bio" rows={5} maxLength={500} placeholder="Tell viewers what you create and why." value={values.bio} onChange={(event) => updateField("bio", event.target.value)} aria-invalid={Boolean(errors.bio)} aria-describedby={errors.bio ? "profile-bio-error" : undefined} disabled={pending} />
          {errors.bio ? <span className="field-error" id="profile-bio-error">{errors.bio}</span> : null}
        </div>

        <button className="button button--primary" type="submit" disabled={pending}>
          {pending ? <><span className="spinner" /> Saving changes…</> : <>Save profile <Icon name="check" /></>}
        </button>
      </form>

      <aside className="profile-aside">
        <section className="panel payout-panel">
          <div className="panel-heading"><div><span className="eyebrow">Payout status</span><h2>{payout.title}</h2></div></div>
          <PayoutBadge status={profile.payoutStatus} />
          <p>{payout.description}</p>
          <div className="planned-note"><Icon name="wallet" /><p><strong>Planned revenue model</strong>Frame plans to allocate 30% to the platform and 70% to the creator. This is not a current payout guarantee.</p></div>
        </section>

        <section className="panel profile-details">
          <h2>Account details</h2>
          <dl><div><dt>Account email</dt><dd>{user.email}</dd></div><div><dt>Account type</dt><dd>Creator</dd></div><div><dt>Profile created</dt><dd>{formatDate(profile.createdAt)}</dd></div></dl>
        </section>
      </aside>
    </div>
  );
}
