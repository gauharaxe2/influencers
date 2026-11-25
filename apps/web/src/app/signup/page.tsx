import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { SignupForm } from "@/components/forms/signup-form";

export const metadata: Metadata = {
  title: "Create your account",
  description: "Join Influence as a viewer or creator.",
};

export default function SignupPage() {
  return (
    <AuthShell
      title="Find your Influence."
      description="Create an account to share your videos, build your creator profile, and make space for the work that matters to you."
    >
      <SignupForm />
    </AuthShell>
  );
}
