"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { browserApi } from "@/lib/api-client";
import { Icon } from "@/components/icons";

export function SignOutButton() {
  const router = useRouter();
  const inFlight = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function signOut() {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setError("");

    try {
      await browserApi<void>("/auth/logout", {
        method: "POST",
        body: JSON.stringify({}),
      });
      router.replace("/");
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not sign out. Please try again.");
      setPending(false);
      inFlight.current = false;
    }
  }

  return (
    <div className="sign-out">
      <button className="sign-out__button" type="button" onClick={signOut} disabled={pending}>
        <Icon name="logout" />
        <span>{pending ? "Signing out…" : "Sign out"}</span>
      </button>
      {error ? <span className="sign-out__error" role="alert">{error}</span> : null}
    </div>
  );
}
