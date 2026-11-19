"use client";

import { SignUp } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth/auth-shell";
import { clerkAppearance } from "@/components/auth/clerk-appearance";

export function SignUpView() {
  return (
    <AuthShell
      mode="signup"
      eyebrow="Nova Conta"
      title="Comece sua jornada"
      description="Crie sua conta em segundos para organizar fichas e acompanhar sua evolução."
    >
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/login"
        fallbackRedirectUrl="/"
        appearance={clerkAppearance}
      />
    </AuthShell>
  );
}
