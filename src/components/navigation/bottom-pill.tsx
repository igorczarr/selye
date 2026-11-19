"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Dumbbell,
  Activity,
  Users,
  User,
} from "lucide-react";

export interface ActiveSessionPillInfo {
  id: string;
  title: string;
  startedAt: string;
}

const PILL_ITEMS = [
  {
    id: "home",
    label: "Início",
    href: "/",
    matchPrefixes: ["/"],
    icon: Home,
  },
  {
    id: "treinos",
    label: "Treinos",
    href: "/treinos",
    matchPrefixes: ["/treinos"],
    icon: Dumbbell,
  },
  {
    id: "evolucao",
    label: "Evolução",
    href: "/evolucao",
    matchPrefixes: ["/evolucao", "/performance", "/analytics"],
    icon: Activity,
  },
  {
    id: "comunidade",
    label: "Comunidade",
    href: "/comunidade",
    matchPrefixes: ["/comunidade", "/equipes", "/atleta"],
    icon: Users,
  },
  {
    id: "perfil",
    label: "Perfil",
    href: "/perfil",
    matchPrefixes: ["/perfil", "/integracoes"],
    icon: User,
  },
] as const;

export function BottomPill({
  activeSession,
}: {
  activeSession?: ActiveSessionPillInfo | null;
}) {
  const pathname = usePathname();

  const isTabActive = (item: (typeof PILL_ITEMS)[number]) => {
    if (item.href === "/") {
      return pathname === "/";
    }
    return item.matchPrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );
  };

  return (
    <div className="fixed bottom-[max(16px,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2 max-w-[calc(100vw-20px)] pointer-events-none">
      {/* Mini-pílula de sessão de treino em andamento */}
      {activeSession && pathname !== "/" && (
        <Link
          href="/"
          className="pointer-events-auto inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-noite/95 text-osso border border-lima/40 shadow-lg backdrop-blur-xl text-[11px] font-mono hover:border-lima transition-colors"
        >
          <span className="w-2 h-2 rounded-full bg-lima animate-pulse shrink-0" />
          <span className="truncate max-w-[200px] font-semibold text-lima">
            Treino ativo: {activeSession.title}
          </span>
        </Link>
      )}

      {/* Bottom Floating Pill principal: apenas ícones nas abas inativas; ícone + nome apenas na aba ativa */}
      <nav
        aria-label="Navegação principal"
        className="pointer-events-auto flex items-center gap-1 p-1.5 rounded-full bg-noite/95 text-osso backdrop-blur-xl border border-white/12 shadow-[var(--shadow-pill)]"
      >
        {PILL_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isTabActive(item);

          return (
            <Link
              key={item.id}
              href={item.href}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              title={item.label}
              className={`relative flex items-center justify-center rounded-full transition-all duration-200 select-none ${
                active
                  ? "h-10 px-4 bg-lima text-grafite font-semibold text-xs gap-2 shadow-sm"
                  : "w-10 h-10 text-nevoa hover:text-osso hover:bg-white/10"
              }`}
            >
              <Icon
                size={18}
                strokeWidth={active ? 2.2 : 1.8}
                className="shrink-0"
              />
              {active ? (
                <span className="whitespace-nowrap tracking-tight">
                  {item.label}
                </span>
              ) : (
                <span className="sr-only">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
