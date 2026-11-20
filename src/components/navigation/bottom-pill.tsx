"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Dumbbell,
  CalendarDays,
  Activity,
  Users,
  User,
  Plus,
  PlusCircle,
  Zap,
  X,
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
    id: "calendario",
    label: "Calendário",
    href: "/calendario",
    matchPrefixes: ["/calendario"],
    icon: CalendarDays,
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
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);
  const quickActionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuickMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!quickMenuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (
        quickActionRef.current &&
        !quickActionRef.current.contains(e.target as Node)
      ) {
        setQuickMenuOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setQuickMenuOpen(false);
    };
    window.addEventListener("mousedown", handleOutside);
    window.addEventListener("keydown", handleEsc);
    return () => {
      window.removeEventListener("mousedown", handleOutside);
      window.removeEventListener("keydown", handleEsc);
    };
  }, [quickMenuOpen]);

  const isTabActive = (item: (typeof PILL_ITEMS)[number]) => {
    if (item.href === "/") {
      return pathname === "/";
    }
    return item.matchPrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );
  };

  const handleOpenQuickActivity = () => {
    setQuickMenuOpen(false);
    window.dispatchEvent(new CustomEvent("selye:open-quick-activity"));
  };

  return (
    <div className="fixed bottom-[max(16px,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2 max-w-[calc(100vw-16px)] pointer-events-none">
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

      {/* Linha principal: Bottom Floating Pill + Botão Rápido "+" no mobile */}
      <div className="pointer-events-auto flex items-center gap-1.5 max-w-full">
        <nav
          aria-label="Navegação principal"
          className="flex items-center gap-0.5 sm:gap-1 p-1 sm:p-1.5 rounded-full bg-noite/95 text-osso backdrop-blur-xl border border-white/12 shadow-[var(--shadow-pill)] min-w-0"
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
                className={`relative flex items-center justify-center rounded-full transition-all duration-200 select-none shrink-0 ${
                  active
                    ? "h-9 px-3 sm:h-10 sm:px-4 bg-lima text-grafite font-semibold text-xs gap-1.5 sm:gap-2 shadow-sm"
                    : "w-8 h-9 sm:w-10 sm:h-10 text-nevoa hover:text-osso hover:bg-white/10"
                }`}
              >
                <Icon
                  size={17}
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

        {/* Botão rápido mobile (+) para Registrar Atividade ou Nova Ficha */}
        <div ref={quickActionRef} className="relative sm:hidden shrink-0">
          {quickMenuOpen && (
            <div
              role="menu"
              aria-label="Ações rápidas"
              className="absolute right-0 bottom-13 w-52 rounded-2xl border border-line bg-surface p-1.5 shadow-2xl flex flex-col gap-1"
            >
              <button
                type="button"
                role="menuitem"
                onClick={handleOpenQuickActivity}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs font-semibold text-foreground hover:bg-foreground/5 transition-colors cursor-pointer"
              >
                <span className="w-7 h-7 rounded-lg bg-lima/20 text-accent-text flex items-center justify-center shrink-0">
                  <Zap size={14} />
                </span>
                <span className="min-w-0">
                  <span className="block leading-tight">Registrar Atividade</span>
                  <span className="block text-[10px] font-normal text-muted mt-0.5">
                    Cardio solto, esporte ou treino
                  </span>
                </span>
              </button>

              <Link
                href="/treinos/novo"
                role="menuitem"
                onClick={() => setQuickMenuOpen(false)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs font-semibold text-foreground hover:bg-foreground/5 transition-colors"
              >
                <span className="w-7 h-7 rounded-lg bg-foreground/8 text-foreground flex items-center justify-center shrink-0">
                  <PlusCircle size={14} />
                </span>
                <span className="min-w-0">
                  <span className="block leading-tight">Nova Ficha</span>
                  <span className="block text-[10px] font-normal text-muted mt-0.5">
                    Criar treino estruturado
                  </span>
                </span>
              </Link>
            </div>
          )}

          <button
            type="button"
            onClick={() => setQuickMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={quickMenuOpen}
            aria-label="Ações rápidas: registrar atividade ou criar ficha"
            className="w-11 h-11 rounded-full bg-lima text-grafite border border-white/15 shadow-[var(--shadow-pill)] flex items-center justify-center hover:brightness-95 active:scale-95 transition-all cursor-pointer"
          >
            {quickMenuOpen ? (
              <X size={18} strokeWidth={2.4} />
            ) : (
              <Plus size={19} strokeWidth={2.5} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
