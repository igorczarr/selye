"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { SelyeLogo } from "@/components/brand/logo";
import { AntigravityAuthStage } from "@/components/auth/antigravity-stage";

type AuthShellProps = {
  mode: "login" | "signup";
  children: ReactNode;
};

/**
 * Shell minimalista de autenticação (Padrão Antigravity + Caixa Central Única).
 * Executa o pre-loader zero-gravity na entrada e, em seguida, revela exclusivamente
 * a caixa de autenticação centralizada na tela.
 */
export function AuthShell({ mode, children }: AuthShellProps) {
  const { isLoaded } = useAuth();
  const [revealed, setRevealed] = useState(false);
  const [pointerInsideCard, setPointerInsideCard] = useState(false);

  return (
    <div className="selye-auth-viewport relative flex min-h-dvh w-full items-center justify-center overflow-x-clip p-4 sm:p-6">
      <AntigravityAuthStage
        isAuthReady={Boolean(isLoaded)}
        onRevealChange={setRevealed}
        isPointerInsideCard={pointerInsideCard}
      />

      <main
        aria-hidden={!revealed}
        onPointerEnter={() => setPointerInsideCard(true)}
        onPointerLeave={() => setPointerInsideCard(false)}
        className={`relative z-10 w-full max-w-[404px] transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          revealed
            ? "translate-y-0 scale-100 opacity-100"
            : "pointer-events-none translate-y-3.5 scale-[0.98] opacity-0"
        }`}
      >
        <div className="selye-auth-card">
          {/* Assinatura horizontal oficial centralizada */}
          <div className="mb-5 flex justify-center">
            <Link
              href="/"
              aria-label="Selye — Página inicial"
              tabIndex={revealed ? 0 : -1}
              className="inline-flex items-center rounded-md transition-opacity hover:opacity-85"
            >
              <SelyeLogo height={28} className="text-foreground" />
            </Link>
          </div>

          {/* Controle de autenticação unificado */}
          <div className="w-full">{children}</div>

          {/* Alternância limpa entre login e cadastro */}
          <div className="mt-6 border-t border-line/70 pt-5 text-center text-[13px] text-muted">
            {mode === "login" ? (
              <>
                Ainda não tem uma conta?{" "}
                <Link
                  href="/sign-up"
                  tabIndex={revealed ? 0 : -1}
                  className="font-semibold text-foreground underline decoration-line underline-offset-4 transition-colors hover:text-accent-text hover:decoration-current"
                >
                  Criar conta
                </Link>
              </>
            ) : (
              <>
                Já possui uma conta?{" "}
                <Link
                  href="/login"
                  tabIndex={revealed ? 0 : -1}
                  className="font-semibold text-foreground underline decoration-line underline-offset-4 transition-colors hover:text-accent-text hover:decoration-current"
                >
                  Entrar
                </Link>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

/** Placeholder interno dimensionalmente alinhado enquanto o formulário do Clerk monta. */
export function AuthFormFallback() {
  return (
    <div className="w-full space-y-4 py-1" aria-hidden="true">
      <div className="mx-auto space-y-2 text-center">
        <div className="skeleton mx-auto h-6 w-44 rounded-md" />
        <div className="skeleton mx-auto h-4 w-60 rounded-md" />
      </div>
      <div className="skeleton mt-5 h-11 w-full rounded-[12px]" />
      <div className="py-1">
        <div className="h-px w-full bg-line/70" />
      </div>
      <div className="space-y-2">
        <div className="skeleton h-3.5 w-16 rounded" />
        <div className="skeleton h-11 w-full rounded-[12px]" />
      </div>
      <div className="skeleton h-11 w-full rounded-[12px]" />
    </div>
  );
}

/**
 * Fallback de Suspense da rota: espelha exatamente o quadro zero do pre-loader
 * para que não exista nenhum salto visual entre SSR e hidratação no cliente.
 */
export function AuthSkeleton() {
  return (
    <div
      className="selye-auth-viewport fixed inset-0 grid min-h-dvh place-items-center bg-background"
      aria-busy="true"
      aria-label="Preparando acesso ao Selye"
    >
      <div className="flex flex-col items-center gap-5 select-none">
        <div className="flex flex-col items-center gap-3">
          <svg
            viewBox="12 8 78 96"
            width={39}
            height={48}
            aria-hidden="true"
            className="text-foreground"
          >
            <g
              fill="none"
              stroke="currentColor"
              strokeWidth={7.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M75 21 C63 12 42 12 29 21 C15 31 16 45 31 51 C37 54 43 55 46 56" />
              <path d="M55 56 C62 58 70 61 76 66 C86 75 82 88 71 94 C57 102 36 98 23 86" />
              <circle cx={50.5} cy={55.5} r={5.5} fill="#C7D977" stroke="none" />
            </g>
          </svg>
        </div>
        <div className="h-[1.5px] w-24 overflow-hidden rounded-full bg-foreground/12" />
      </div>
    </div>
  );
}
