import type { ReactNode } from "react";
import Link from "next/link";
import { Activity, ClipboardList, ShieldCheck, type LucideIcon } from "lucide-react";
import { SelyeLogo } from "@/components/brand/logo";

const PILLARS: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: ClipboardList,
    title: "Organize",
    text: "Fichas e rotinas estruturadas para qualquer modalidade.",
  },
  {
    icon: Activity,
    title: "Registre",
    text: "Cada série, carga e esforço percebido, sem fricção.",
  },
  {
    icon: ShieldCheck,
    title: "Acompanhe com privacidade",
    text: "Seus dados são seus. Nunca são vendidos nem expostos.",
  },
];

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  quote: string;
  quoteAuthor: string;
  children: ReactNode;
  footer?: ReactNode;
};

/** Layout compartilhado de login e cadastro: painel de marca + área do formulário. */
export function AuthShell({
  eyebrow,
  title,
  description,
  quote,
  quoteAuthor,
  children,
  footer,
}: AuthShellProps) {
  return (
    <div className="min-h-dvh w-full grid grid-cols-1 lg:grid-cols-[minmax(420px,5fr)_7fr] bg-background">
      {/* Painel de marca (somente desktop) */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-noite to-grafite p-12 xl:p-16 text-osso">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-lima/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-profundo/30 blur-3xl"
        />

        <Link href="/" aria-label="Selye — início" className="relative z-10 w-fit">
          <SelyeLogo height={34} className="text-osso" />
        </Link>

        <div className="relative z-10 space-y-10 py-10">
          <figure className="border-l-2 border-lima pl-5">
            <blockquote className="text-xl leading-relaxed text-osso/95 font-light">
              &ldquo;{quote}&rdquo;
            </blockquote>
            <figcaption className="mt-3 t-label !text-nevoa">{quoteAuthor}</figcaption>
          </figure>

          <ul className="space-y-5">
            {PILLARS.map(({ icon: Icon, title: t, text }) => (
              <li key={t} className="flex items-start gap-4">
                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/5 text-lima ring-1 ring-white/10">
                  <Icon size={18} strokeWidth={1.75} aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-semibold text-osso">{t}</p>
                  <p className="mt-0.5 text-sm text-nevoa">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 t-label !text-nevoa">Organizar. Registrar. Acompanhar.</p>
      </aside>

      {/* Área do formulário */}
      <main className="flex min-h-dvh flex-col px-6 py-8 sm:px-12 lg:px-16">
        <div className="flex items-center justify-between lg:hidden">
          <Link href="/" aria-label="Selye — início">
            <SelyeLogo height={28} className="text-foreground" />
          </Link>
        </div>

        <div className="mx-auto my-auto w-full max-w-[420px] py-10 fade-up">
          <p className="t-label text-accent-text">{eyebrow}</p>
          <h1 className="t-h1 mt-2">{title}</h1>
          <p className="mt-2 text-muted">{description}</p>

          <div className="mt-8">{children}</div>

          {footer && <div className="mt-8">{footer}</div>}
        </div>

        <p className="text-center t-aux text-muted">
          Ao continuar, você concorda com o tratamento dos seus dados conforme a LGPD.
        </p>
      </main>
    </div>
  );
}

/** Estado de carregamento das telas de autenticação. */
export function AuthSkeleton() {
  return (
    <div className="grid min-h-dvh place-items-center bg-background px-6" aria-busy="true" aria-label="Carregando">
      <div className="w-full max-w-[420px] space-y-4">
        <div className="skeleton h-4 w-24" />
        <div className="skeleton h-9 w-3/4" />
        <div className="skeleton h-4 w-full" />
        <div className="skeleton mt-8 h-11 w-full" />
        <div className="skeleton h-11 w-full" />
        <div className="skeleton h-11 w-full" />
      </div>
    </div>
  );
}
