"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Activity,
  ClipboardList,
  ShieldCheck,
  Lock,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { SelyeLogo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/navigation/theme-toggle";
import {
  getDailyEditorialForDate,
  CURATED_QUOTES,
  type DailyEditorialResult,
} from "@/core/editorial/daily-quotes";

const PILLARS: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: ClipboardList,
    title: "Organize seu ciclo",
    text: "Fichas versionadas Seg→Dom com passo a passo ilustrado e vídeo sob demanda.",
  },
  {
    icon: Activity,
    title: "Fisiologia de precisão",
    text: "Acompanhamento real do seu ritmo semanal, volume de treino e recordes pessoais.",
  },
  {
    icon: ShieldCheck,
    title: "Privacidade e papéis no login",
    text: "Atleta, Treinador e Admin separados pela credencial. Seus dados são seus (LGPD).",
  },
];

type AuthShellProps = {
  mode: "login" | "signup";
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
};

const INITIAL_EDITORIAL: DailyEditorialResult = {
  quote: CURATED_QUOTES[0],
  dayOfYear: 1,
  totalDaysInYear: 365,
  year: 2026,
  dayCounterLabel: "Curadoria Editorial",
  yearProgressPercent: 100,
};

/** Layout split-screen reformado de Login e Cadastro (Fase 8). */
export function AuthShell({
  mode,
  eyebrow,
  title,
  description,
  children,
  footer,
}: AuthShellProps) {
  const [editorial, setEditorial] =
    useState<DailyEditorialResult>(INITIAL_EDITORIAL);

  useEffect(() => {
    setEditorial(getDailyEditorialForDate(new Date()));
  }, []);

  return (
    <div className="min-h-dvh w-full overflow-x-clip grid grid-cols-1 lg:grid-cols-12 bg-background text-foreground">
      {/* Palco Editorial & Telemetria (Desktop) */}
      <aside className="relative hidden lg:flex lg:col-span-6 xl:col-span-5 flex-col justify-between overflow-hidden bg-noite p-10 xl:p-14 text-osso border-r border-white/10">
        {/* Grade arquitetônica sutil */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(199,217,119,0.11)_1px,transparent_1px)] [background-size:24px_24px] opacity-60"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-lima/12 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-28 -left-20 h-80 w-80 rounded-full bg-profundo/25 blur-3xl"
        />

        {/* Topo: Logo + Contador do Ano */}
        <div className="relative z-10 flex items-center justify-between gap-4">
          <Link href="/" aria-label="Selye — início" className="w-fit">
            <SelyeLogo height={22} className="text-osso" />
          </Link>
          <span className="t-data text-[11px] px-2.5 py-1 rounded-full bg-white/8 text-lima border border-white/10">
            {editorial.dayCounterLabel}
          </span>
        </div>

        {/* Centro: Frase do Dia + Cartão de Telemetria + Pilares */}
        <div className="relative z-10 space-y-8 my-8">
          <figure className="border-l-2 border-lima pl-5 space-y-2.5">
            <span className="t-label !text-lima block">
              Nota do dia · {editorial.quote.categoryLabelPt}
            </span>
            <blockquote className="text-lg xl:text-xl leading-relaxed text-osso font-light italic">
              &ldquo;{editorial.quote.messageText}&rdquo;
            </blockquote>
            <figcaption className="t-aux text-nevoa">
              — <span className="text-osso font-semibold">{editorial.quote.author}</span>
              {" · "}
              {editorial.quote.roleOrContext}
            </figcaption>
          </figure>

          {/* Prévia de Telemetria Selye */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-lima text-grafite flex items-center justify-center shrink-0">
                <TrendingUp size={20} strokeWidth={2.2} />
              </div>
              <div>
                <span className="t-label !text-nevoa block">
                  Ritmo da Semana vs. Mês
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="t-data text-xl text-osso font-semibold">
                    1.08
                  </span>
                  <span className="text-[11px] font-mono text-lima">
                    Zona Ótima · 0.8–1.3
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-end gap-1 h-9" aria-hidden>
              {[38, 62, 48, 80, 70, 92, 65].map((h, i) => (
                <span
                  key={i}
                  className={`w-1.5 rounded-sm ${
                    i === 5 ? "bg-lima" : "bg-white/25"
                  }`}
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>

          <ul className="space-y-4">
            {PILLARS.map(({ icon: Icon, title: t, text }) => (
              <li key={t} className="flex items-start gap-3.5">
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/6 text-lima ring-1 ring-white/10">
                  <Icon size={16} strokeWidth={1.8} aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-semibold text-osso">{t}</p>
                  <p className="mt-0.5 text-xs text-nevoa leading-relaxed">
                    {text}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Rodapé da marca */}
        <div className="relative z-10 flex items-center justify-between text-[11px] font-mono text-nevoa pt-4 border-t border-white/10">
          <span>ORGANIZAR · REGISTRAR · ACOMPANHAR</span>
          <span>SELYE v2</span>
        </div>
      </aside>

      {/* Área do Formulário */}
      <main className="lg:col-span-6 xl:col-span-7 flex min-h-dvh flex-col px-5 py-6 sm:px-10 lg:px-14">
        {/* Topo da coluna direita */}
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/"
            aria-label="Selye — início"
            className="lg:invisible flex items-center"
          >
            <SelyeLogo height={20} className="text-foreground" />
          </Link>

          <div className="flex items-center gap-2">
            <div
              role="tablist"
              aria-label="Alternar entre entrar e criar conta"
              className="flex items-center p-1 rounded-lg border border-line bg-surface"
            >
              <Link
                href="/login"
                role="tab"
                aria-selected={mode === "login"}
                className={`px-3 py-1 rounded-md text-xs font-mono font-semibold transition-colors ${
                  mode === "login"
                    ? "bg-foreground text-background"
                    : "text-muted hover:text-foreground"
                }`}
              >
                Entrar
              </Link>
              <Link
                href="/sign-up"
                role="tab"
                aria-selected={mode === "signup"}
                className={`px-3 py-1 rounded-md text-xs font-mono font-semibold transition-colors ${
                  mode === "signup"
                    ? "bg-foreground text-background"
                    : "text-muted hover:text-foreground"
                }`}
              >
                Criar conta
              </Link>
            </div>
            <ThemeToggle />
          </div>
        </div>

        {/* Cartão central de autenticação */}
        <div className="mx-auto my-auto w-full max-w-[420px] py-8 fade-up">
          <div className="card p-6 sm:p-8 shadow-md">
            <p className="t-label !text-accent-text">{eyebrow}</p>
            <h1 className="t-h1 mt-1.5">{title}</h1>
            <p className="mt-1.5 text-sm text-muted">{description}</p>

            <div className="mt-6">{children}</div>

            {footer && <div className="mt-6">{footer}</div>}
          </div>
        </div>

        {/* Rodapé de segurança e LGPD */}
        <p className="text-center t-aux text-muted inline-flex items-center justify-center gap-1.5">
          <Lock size={12} className="text-accent-text shrink-0" />
          <span>
            Acesso criptografado · Tratamento de dados conforme a LGPD.
          </span>
        </p>
      </main>
    </div>
  );
}

/** Estado de carregamento das telas de autenticação sem salto de layout. */
export function AuthSkeleton() {
  return (
    <div
      className="grid min-h-dvh place-items-center bg-background px-6"
      aria-busy="true"
      aria-label="Carregando autenticação"
    >
      <div className="card p-8 w-full max-w-[420px] space-y-4">
        <div className="skeleton h-4 w-28" />
        <div className="skeleton h-8 w-3/4" />
        <div className="skeleton h-4 w-full" />
        <div className="skeleton mt-6 h-11 w-full" />
        <div className="skeleton h-11 w-full" />
        <div className="skeleton h-11 w-full" />
      </div>
    </div>
  );
}
