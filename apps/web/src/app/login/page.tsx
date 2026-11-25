import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/forms/login-form";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to your Influence account and creator studio.",
};

export default function LoginPage() {
  return (
    <AuthShell
      title="Good to see you again."
      description="Your videos, profile, and creator workspace are right where you left them."
    >
      <LoginForm />
    </AuthShell>
  );
}
