"use client";

import { SignUp } from "@clerk/nextjs";
import { AuthFormFallback, AuthShell } from "@/components/auth/auth-shell";
import { clerkAppearance } from "@/components/auth/clerk-appearance";

export function SignUpView() {
  return (
    <AuthShell mode="signup">
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/login"
        fallbackRedirectUrl="/"
        appearance={clerkAppearance}
        fallback={<AuthFormFallback />}
      />
    </AuthShell>
  );
}
