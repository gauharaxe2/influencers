"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loginSchema, type AuthDto, type LoginInput } from "@creator-platform/contracts";
import { browserApi } from "@/lib/api-client";
import { Icon } from "@/components/icons";

type FieldErrors = Partial<Record<keyof LoginInput, string>>;

export function LoginForm() {
  const router = useRouter();
  const inFlight = useRef(false);
  const [values, setValues] = useState<LoginInput>({ email: "", password: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function updateField(key: keyof LoginInput, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setFormError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;

    const result = loginSchema.safeParse(values);
    if (!result.success) {
      const fields = result.error.flatten().fieldErrors;
      setErrors({ email: fields.email?.[0], password: fields.password?.[0] });
      setFormError("Check the highlighted fields and try again.");
      return;
    }

    inFlight.current = true;
    setSubmitting(true);
    setErrors({});
    setFormError("");

    try {
      await browserApi<AuthDto>("/auth/login", {
        method: "POST",
        body: JSON.stringify(result.data),
      });
      router.replace("/studio");
      router.refresh();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not log you in. Please try again.");
      setSubmitting(false);
      inFlight.current = false;
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <div className="form-heading">
        <span className="form-heading__icon"><Icon name="play" /></span>
        <div>
          <h2>Welcome back</h2>
          <p>Log in to pick up where you left off.</p>
        </div>
      </div>

      {formError ? <div className="form-alert form-alert--error" role="alert">{formError}</div> : null}

      <div className="field">
        <label htmlFor="email">Email address</label>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          maxLength={254}
          value={values.email}
          onChange={(event) => updateField("email", event.target.value)}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "email-error" : undefined}
          disabled={submitting}
          required
        />
        {errors.email ? <span className="field-error" id="email-error">{errors.email}</span> : null}
      </div>

      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          maxLength={128}
          value={values.password}
          onChange={(event) => updateField("password", event.target.value)}
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? "password-error" : undefined}
          disabled={submitting}
          required
        />
        {errors.password ? <span className="field-error" id="password-error">{errors.password}</span> : null}
      </div>

      <button className="button button--primary button--full" type="submit" disabled={submitting}>
        {submitting ? <><span className="spinner" /> Logging in…</> : <>Log in to Influence <Icon name="arrow-right" /></>}
      </button>

      <p className="form-switch">New to Influence? <Link href="/signup">Create an account</Link></p>
    </form>
  );
}
