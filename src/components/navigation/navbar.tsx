"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SignInButton,
  SignUpButton,
  Show,
  UserButton,
  useUser,
} from "@clerk/nextjs";
import { SelyeLogo, SelyeMark } from "@/components/brand/logo";
import { BottomPill } from "@/components/navigation/bottom-pill";
import { CommandPalette } from "@/components/navigation/command-palette";
import { getGlobalShellSnapshot, type GlobalSearchSnapshot } from "@/actions/search";
import { getSmartNotifications } from "@/actions/notifications";
import type { RescheduleProposal } from "@/core/performance/weekly-rescheduler";
import { NotificationBell } from "@/components/navigation/notification-bell";
import { QuickActivityLauncher } from "@/components/home/quick-activity-modal";
import { ConditionArrowBadge } from "@/components/ui/condition-arrow-badge";
import { resolveConditionArrow } from "@/core/performance/condition-arrow";
import { resolveUserRole } from "@/core/auth/rbac";
import { buildContextualGreeting } from "@/core/navigation/greeting";
import {
  Shield,
  Settings,
  PlusCircle,
  Search,
  ChevronDown,
  Flame,
  Sun,
  Moon,
} from "lucide-react";

function RoleAccessMenu() {
  const { user, isLoaded } = useUser();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", handleOutside);
    window.addEventListener("keydown", handleEsc);
    return () => {
      window.removeEventListener("mousedown", handleOutside);
      window.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  if (!isLoaded || !user) return null;

  const role = resolveUserRole({
    metadataRole: user.publicMetadata?.role,
    email: user.primaryEmailAddress?.emailAddress,
  });

  // Atletas comuns nunca veem opções de Coach ou Admin na interface
  if (role === "athlete") return null;

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Acessos da conta por perfil"
        className="h-8 px-2 rounded-lg border border-line bg-surface text-foreground hover:bg-foreground/5 flex items-center gap-1 text-[11px] font-mono font-semibold transition-colors cursor-pointer"
      >
        <Shield size={12} className="text-accent-text shrink-0" />
        <span className="uppercase hidden sm:inline">{role}</span>
        <ChevronDown size={11} className="text-muted shrink-0" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Ambientes habilitados para seu perfil"
          className="absolute right-0 mt-2 w-52 rounded-xl border border-line bg-surface p-1.5 shadow-lg z-50 flex flex-col gap-0.5"
        >
          <div className="px-2.5 py-1.5 border-b border-line mb-1">
            <span className="t-label block">Credencial Ativa</span>
            <span className="text-xs font-mono font-semibold text-foreground">
              {role === "admin" ? "Administrador Global" : "Treinador (Coach)"}
            </span>
          </div>

          <Link
            href="/coach"
            role="menuitem"
            className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-foreground/5 transition-colors"
          >
            <Shield size={14} className="text-accent-text" />
            <span>Painel do Treinador</span>
          </Link>

          {role === "admin" && (
            <Link
              href="/admin"
              role="menuitem"
              className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-foreground/5 transition-colors"
            >
              <Settings size={14} className="text-accent-text" />
              <span>Painel Administrativo</span>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function HeaderGreeting({ fallbackName }: { fallbackName?: string | null }) {
  const { user, isLoaded } = useUser();
  const [greetingText, setGreetingText] = useState<string>("Olá, Atleta");

  useEffect(() => {
    const rawName =
      (isLoaded && (user?.firstName || user?.fullName)) ||
      fallbackName ||
      "Atleta";
    const result = buildContextualGreeting({ name: rawName });
    setGreetingText(result.fullGreeting);
  }, [isLoaded, user?.firstName, user?.fullName, fallbackName]);

  return (
    <div className="hidden md:flex items-center gap-2.5 pl-3 border-l border-line min-w-0">
      <span className="w-1.5 h-1.5 rounded-full bg-lima shrink-0" />
      <span className="text-xs font-medium text-foreground truncate">
        {greetingText}
      </span>
    </div>
  );
}

export function Navbar() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<GlobalSearchSnapshot | null>(null);
  const [notifications, setNotifications] = useState<RescheduleProposal[]>([]);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const current =
      document.documentElement.getAttribute("data-theme") === "dark"
        ? "dark"
        : "light";
    setTheme(current);
  }, []);

  const handleToggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    if (next === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    try {
      localStorage.setItem("selye-theme", next);
    } catch {
      // ignora em modo privado
    }
  };

  useEffect(() => {
    let active = true;
    getGlobalShellSnapshot()
      .then((data) => {
        if (active) setSnapshot(data);
      })
      .catch(() => {});

    getSmartNotifications()
      .then((data) => {
        if (active) setNotifications(data);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    };
    const handleCustomOpen = () => setPaletteOpen(true);

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("selye:open-command-palette", handleCustomOpen);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener(
        "selye:open-command-palette",
        handleCustomOpen
      );
    };
  }, []);

  return (
    <>
      {/* Top Bar enxuta (56 px): Logo + Saudação + Barra de Pesquisa (⌘K) + Nova Ficha + Perfil */}
      <header className="w-full overflow-x-clip border-b border-line bg-surface/85 backdrop-blur-xl supports-[backdrop-filter]:bg-surface/75 sticky top-0 z-40">
        <div className="selye-container h-14 flex items-center justify-between gap-2 sm:gap-4 min-w-0">
          {/* Esquerda: Logo + Saudação Contextual */}
          <div className="flex items-center gap-3 min-w-0 shrink-0">
            <Link
              href="/"
              aria-label="Selye — Página inicial"
              className="flex items-center shrink-0"
            >
              <SelyeMark size={26} className="text-foreground sm:hidden" />
              <SelyeLogo
                height={20}
                className="text-foreground hidden sm:block"
              />
            </Link>

            <Suspense fallback={null}>
              <HeaderGreeting fallbackName={snapshot?.userName} />
            </Suspense>
          </div>

          {/* Centro: Barra de Pesquisa global (abre Command Palette ⌘K) */}
          <div className="flex-1 max-w-md xl:max-w-xl min-w-0">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              aria-label="Buscar exercícios, fichas, atletas ou comandos (Ctrl+K)"
              className="w-full h-9 px-3 rounded-lg border border-line bg-background/60 hover:bg-foreground/[0.04] hover:border-mineral/60 text-muted flex items-center justify-between gap-2 text-xs transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2 min-w-0">
                <Search size={14} className="text-muted shrink-0" />
                <span className="truncate">
                  <span className="sm:hidden">Buscar...</span>
                  <span className="hidden sm:inline">
                    Buscar exercícios, fichas, atletas...
                  </span>
                </span>
              </span>
              <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded border border-line bg-surface text-[10px] font-mono text-muted shrink-0">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Direita: Registrar Atividade + Nova Ficha + Notificações (Sininho) + Streak + Perfil */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Registrar Atividade ao lado de Nova Ficha */}
            <QuickActivityLauncher variant="secondary" compact={true} />

            <Link
              href="/treinos/novo"
              aria-label="Criar nova ficha de treino"
              className="h-9 px-2.5 sm:px-3 rounded-lg bg-lima text-grafite text-xs font-mono font-bold hover:brightness-95 transition-all inline-flex items-center gap-1.5 shrink-0"
            >
              <PlusCircle size={15} strokeWidth={2} />
              <span className="hidden sm:inline">Nova Ficha</span>
            </Link>

            {/* Sininho de Notificações com Inteligência Adaptativa */}
            <NotificationBell proposals={notifications} />

            {/* Contador de Streak no lugar do antigo botão de tema */}
            <Link
              href="/evolucao?tab=consistencia"
              title={`Streak atual: ${snapshot?.currentWeeklyStreak ?? 0} ${
                (snapshot?.currentWeeklyStreak ?? 0) === 1 ? "semana" : "semanas"
              } · ${snapshot?.activeDaysInYear ?? 0} dias ativos no ano`}
              aria-label={`Sequência semanal: ${snapshot?.currentWeeklyStreak ?? 0}`}
              className={`h-9 px-2.5 rounded-lg border text-xs font-mono font-semibold inline-flex items-center gap-1.5 transition-colors shrink-0 ${
                (snapshot?.currentWeeklyStreak ?? 0) > 0
                  ? "border-lima/70 bg-lima/15 text-foreground hover:bg-lima/25"
                  : "border-line bg-surface text-muted hover:text-foreground hover:bg-foreground/5"
              }`}
            >
              <Flame
                size={14}
                className={
                  (snapshot?.currentWeeklyStreak ?? 0) > 0
                    ? "text-accent-text"
                    : "text-muted"
                }
              />
              <span className="t-data text-foreground">
                {snapshot?.currentWeeklyStreak ?? 0}
              </span>
            </Link>

            <div className="flex items-center gap-1.5 ml-0.5">
              <Suspense
                fallback={<div className="w-8 h-8 rounded-full skeleton" />}
              >
                <Show when="signed-out">
                  <div className="flex items-center gap-1.5">
                    <SignInButton mode="modal">
                      <button
                        type="button"
                        className="h-8 px-2.5 rounded-lg border border-line text-xs font-mono font-medium text-foreground hover:bg-foreground/5 transition-colors cursor-pointer"
                      >
                        Entrar
                      </button>
                    </SignInButton>
                    <SignUpButton mode="modal">
                      <button
                        type="button"
                        className="hidden sm:inline-flex h-8 px-2.5 items-center rounded-lg bg-foreground text-background text-xs font-mono font-bold hover:opacity-90 transition-colors cursor-pointer"
                      >
                        Cadastrar
                      </button>
                    </SignUpButton>
                  </div>
                </Show>
                <Show when="signed-in">
                  <div className="flex items-center gap-1.5">
                    <RoleAccessMenu />
                    <div
                      className="relative inline-flex items-center"
                      title={
                        resolveConditionArrow({
                          reservePercent: snapshot?.eaReservePercent ?? 82,
                          availableReserveEa: snapshot?.availableReserveEa,
                          personalCapacityEa: snapshot?.personalCapacityEa,
                        }).descriptionPt
                      }
                    >
                      <UserButton
                        appearance={{
                          elements: {
                            userButtonAvatarBox:
                              "w-9 h-9 rounded-full border border-line shadow-sm",
                            userButtonPopoverFooter: "hidden",
                          },
                        }}
                      >
                        <UserButton.MenuItems>
                          <UserButton.Action
                            label={
                              theme === "dark"
                                ? "Mudar para Tema Claro"
                                : "Mudar para Tema Escuro"
                            }
                            labelIcon={
                              theme === "dark" ? (
                                <Sun size={14} />
                              ) : (
                                <Moon size={14} />
                              )
                            }
                            onClick={handleToggleTheme}
                          />
                        </UserButton.MenuItems>
                      </UserButton>
                      <ConditionArrowBadge
                        reservePercent={snapshot?.eaReservePercent ?? 82}
                        availableReserveEa={snapshot?.availableReserveEa}
                        personalCapacityEa={snapshot?.personalCapacityEa}
                        size="sm"
                        className="absolute -bottom-1 -right-1 pointer-events-none z-10"
                      />
                    </div>
                  </div>
                </Show>
              </Suspense>
            </div>
          </div>
        </div>
      </header>

      {/* Bottom Floating Pill (todas as telas): apenas ícones; aba ativa = ícone + nome */}
      <BottomPill activeSession={snapshot?.activeSession} />

      {/* Command Palette (⌘K / Busca Global) */}
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        snapshot={snapshot}
      />
    </>
  );
}
