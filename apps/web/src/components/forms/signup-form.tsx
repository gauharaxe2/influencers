"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ACCOUNT_TYPES,
  SUPPORTED_COUNTRIES,
  registerSchema,
  type AuthDto,
  type RegisterInput,
} from "@creator-platform/contracts";
import { browserApi } from "@/lib/api-client";
import { Icon } from "@/components/icons";

type FieldErrors = Partial<Record<keyof RegisterInput, string>>;

export function SignupForm() {
  const router = useRouter();
  const inFlight = useRef(false);
  const [values, setValues] = useState<RegisterInput>({
    displayName: "",
    email: "",
    password: "",
    countryCode: SUPPORTED_COUNTRIES[0]?.code ?? "US",
    accountType: "VIEWER",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function updateField<Key extends keyof RegisterInput>(key: Key, value: RegisterInput[Key]) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setFormError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;

    const result = registerSchema.safeParse(values);
    if (!result.success) {
      const fields = result.error.flatten().fieldErrors;
      setErrors({
        displayName: fields.displayName?.[0],
        email: fields.email?.[0],
        password: fields.password?.[0],
        countryCode: fields.countryCode?.[0],
        accountType: fields.accountType?.[0],
      });
      setFormError("Check the highlighted fields and try again.");
      return;
    }

    inFlight.current = true;
    setSubmitting(true);
    setErrors({});
    setFormError("");

    try {
      await browserApi<AuthDto>("/auth/register", {
        method: "POST",
        body: JSON.stringify(result.data),
      });
      router.replace("/studio");
      router.refresh();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not create your account. Please try again.");
      setSubmitting(false);
      inFlight.current = false;
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <div className="form-heading">
        <span className="form-heading__icon"><Icon name="spark" /></span>
        <div>
          <h2>Create your account</h2>
          <p>One account. Watch, create, and make it yours.</p>
        </div>
      </div>

      {formError ? <div className="form-alert form-alert--error" role="alert">{formError}</div> : null}

      <div className="field">
        <label htmlFor="displayName">Display name</label>
        <input
          id="displayName"
          name="displayName"
          type="text"
          autoComplete="name"
          placeholder="How should we call you?"
          minLength={2}
          maxLength={60}
          value={values.displayName}
          onChange={(event) => updateField("displayName", event.target.value)}
          aria-invalid={Boolean(errors.displayName)}
          aria-describedby={errors.displayName ? "displayName-error" : undefined}
          disabled={submitting}
          required
        />
        {errors.displayName ? <span className="field-error" id="displayName-error">{errors.displayName}</span> : null}
      </div>

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
        <div className="field__label-row">
          <label htmlFor="password">Password</label>
          <span>10–128 characters</span>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="Create a strong password"
          minLength={10}
          maxLength={128}
          value={values.password}
          onChange={(event) => updateField("password", event.target.value)}
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? "password-error" : "password-hint"}
          disabled={submitting}
          required
        />
        {errors.password ? <span className="field-error" id="password-error">{errors.password}</span> : <span className="field-hint" id="password-hint">Use at least 10 characters.</span>}
      </div>

      <div className="field">
        <label htmlFor="countryCode">Country</label>
        <select
          id="countryCode"
          name="countryCode"
          autoComplete="country"
          value={values.countryCode}
          onChange={(event) => updateField("countryCode", event.target.value)}
          aria-invalid={Boolean(errors.countryCode)}
          aria-describedby={errors.countryCode ? "countryCode-error" : undefined}
          disabled={submitting}
          required
        >
          {SUPPORTED_COUNTRIES.map((country) => (
            <option key={country.code} value={country.code}>{country.name}</option>
          ))}
        </select>
        {errors.countryCode ? <span className="field-error" id="countryCode-error">{errors.countryCode}</span> : null}
      </div>

      <fieldset className="field account-type-field">
        <legend>I’m joining as a…</legend>
        <div className="account-type-toggle">
          {ACCOUNT_TYPES.map((accountType) => (
            <label className={`account-type${values.accountType === accountType ? " is-selected" : ""}`} key={accountType}>
              <input
                type="radio"
                name="accountType"
                value={accountType}
                checked={values.accountType === accountType}
                onChange={() => updateField("accountType", accountType)}
                disabled={submitting}
              />
              <Icon name={accountType === "CREATOR" ? "video" : "play"} />
              <span><strong>{accountType === "CREATOR" ? "Creator" : "Viewer"}</strong><small>{accountType === "CREATOR" ? "I want to publish" : "I’m here to watch"}</small></span>
              <span className="radio-indicator" aria-hidden="true" />
            </label>
          ))}
        </div>
        {errors.accountType ? <span className="field-error">{errors.accountType}</span> : null}
      </fieldset>

      <button className="button button--primary button--full" type="submit" disabled={submitting}>
        {submitting ? <><span className="spinner" /> Creating account…</> : <>Create my account <Icon name="arrow-right" /></>}
      </button>

      <p className="form-switch">Already have an account? <Link href="/login">Log in</Link></p>
    </form>
  );
}
