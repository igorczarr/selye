"use client";

import { SignIn } from "@clerk/nextjs";
import { AuthFormFallback, AuthShell } from "@/components/auth/auth-shell";
import { clerkAppearance } from "@/components/auth/clerk-appearance";

export function LoginView() {
  return (
    <AuthShell mode="login">
      <SignIn
        routing="path"
        path="/login"
        signUpUrl="/sign-up"
        fallbackRedirectUrl="/"
        appearance={clerkAppearance}
        fallback={<AuthFormFallback />}
      />
    </AuthShell>
  );
}
