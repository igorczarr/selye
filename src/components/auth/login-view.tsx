"use client";

import { SignIn } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth/auth-shell";
import { clerkAppearance } from "@/components/auth/clerk-appearance";

export function LoginView() {
  return (
    <AuthShell
      mode="login"
      eyebrow="Acesso Seguro"
      title="Entrar no Selye"
      description="Seu painel de treinos, evolução e comunidade em um só lugar."
    >
      <SignIn
        routing="path"
        path="/login"
        signUpUrl="/sign-up"
        fallbackRedirectUrl="/"
        appearance={clerkAppearance}
      />
    </AuthShell>
  );
}
