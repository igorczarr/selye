"use client";

import { SignIn } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth/auth-shell";
import { clerkAppearance } from "@/components/auth/clerk-appearance";

export function LoginView() {
  return (
    <AuthShell
      eyebrow="Bem-vindo de volta"
      title="Entrar no Selye"
      description="Acesse seus treinos, sua consistência e seu histórico."
      quote="O estresse não é necessariamente um mal. É o estímulo que molda a capacidade do organismo de resistir, adaptar-se e evoluir."
      quoteAuthor="Hans Selye · Síndrome Geral de Adaptação"
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
