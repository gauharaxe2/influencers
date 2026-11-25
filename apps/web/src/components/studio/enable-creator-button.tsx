"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { CreatorProfileDto } from "@creator-platform/contracts";
import { browserApi } from "@/lib/api-client";
import { Icon } from "@/components/icons";

export function EnableCreatorButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const inFlight = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function enableCreator() {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setError("");

    try {
      await browserApi<CreatorProfileDto>("/creator/profile", {
        method: "POST",
        body: JSON.stringify({}),
      });
      setSuccess(true);
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not enable your creator profile. Please try again.");
      setPending(false);
      inFlight.current = false;
    }
  }

  return (
    <div className={compact ? "enable-creator enable-creator--compact" : "enable-creator"}>
      <button className="button button--primary" type="button" onClick={enableCreator} disabled={pending || success}>
        {pending ? <><span className="spinner" /> Enabling profile…</> : success ? <><Icon name="check" /> Creator profile enabled</> : <>Enable creator profile <Icon name="arrow-right" /></>}
      </button>
      {error ? <div className="form-alert form-alert--error" role="alert">{error}</div> : null}
      {success ? <p className="success-message" role="status">Your creator workspace is ready. Refreshing your account…</p> : null}
    </div>
  );
}
