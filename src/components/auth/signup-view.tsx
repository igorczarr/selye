"use client";

import { SignUp } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth/auth-shell";
import { clerkAppearance } from "@/components/auth/clerk-appearance";

export function SignUpView() {
  return (
    <AuthShell
      eyebrow="Comece agora"
      title="Criar sua conta"
      description="Leva menos de um minuto. Organize, registre e acompanhe sua evolução."
      quote="O desenvolvimento físico não acontece em saltos repentinos, mas na constância silenciosa dos dias comuns."
      quoteAuthor="Selye · Editorial"
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
