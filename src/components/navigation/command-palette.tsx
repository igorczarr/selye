"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useExerciseSheet } from "@/components/catalog/exercise-sheet";
import type { GlobalSearchSnapshot } from "@/actions/search";
import { ModalPortal } from "@/components/ui/modal-portal";
import {
  Search,
  X,
  Home,
  Dumbbell,
  CalendarDays,
  Activity,
  BarChart3,
  Users,
  User,
  PlusCircle,
  Trophy,
  Smartphone,
  ArrowRight,
  SunMoon,
  Sparkles,
} from "lucide-react";

interface CommandItem {
  id: string;
  group: "Navegação" | "Minhas Fichas" | "Exercícios" | "Comunidade" | "Ações";
  title: string;
  subtitle?: string;
  keywords?: string;
  icon: typeof Home;
  onSelect: () => void;
}

const DIFFICULTY_PT: Record<string, string> = {
  beginner: "Iniciante",
  intermediate: "Intermediário",
  expert: "Avançado",
};

export function CommandPalette({
  open,
  onClose,
  snapshot,
}: {
  open: boolean;
  onClose: () => void;
  snapshot: GlobalSearchSnapshot | null;
}) {
  const router = useRouter();
  const { open: openExerciseSheet } = useExerciseSheet();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  const toggleTheme = () => {
    const html = document.documentElement;
    const isDark = html.getAttribute("data-theme") === "dark";
    const next = isDark ? "light" : "dark";
    if (next === "dark") {
      html.setAttribute("data-theme", "dark");
    } else {
      html.removeAttribute("data-theme");
    }
    try {
      localStorage.setItem("selye-theme", next);
    } catch {
      // ignora
    }
    onClose();
  };

  const allItems = useMemo<CommandItem[]>(() => {
    const navItems: CommandItem[] = [
      {
        id: "nav-home",
        group: "Navegação",
        title: "Início · Painel do Dia",
        subtitle: "Nota do dia, treino de hoje e indicadores",
        keywords: "home inicio dashboard",
        icon: Home,
        onSelect: () => {
          router.push("/");
          onClose();
        },
      },
      {
        id: "nav-treinos",
        group: "Navegação",
        title: "Treinos & Rotinas",
        subtitle: "Fichas semanais Seg→Dom e folha A4",
        keywords: "treinos fichas rotinas",
        icon: Dumbbell,
        onSelect: () => {
          router.push("/treinos");
          onClose();
        },
      },
      {
        id: "nav-novo-treino",
        group: "Ações",
        title: "Criar Nova Ficha de Treino",
        subtitle: "Prescrever séries, repetições, cargas e descanso",
        keywords: "nova ficha criar treino",
        icon: PlusCircle,
        onSelect: () => {
          router.push("/treinos/novo");
          onClose();
        },
      },
      {
        id: "nav-calendario",
        group: "Navegação",
        title: "Calendário Energético & Planejamento de Metas",
        subtitle: "Ciclo do corpo, curva de EA, compromissos e preparação para competições",
        keywords: "calendario ciclo energia meta competicao taper planejamento agenda",
        icon: CalendarDays,
        onSelect: () => {
          router.push("/calendario");
          onClose();
        },
      },
      {
        id: "nav-evolucao",
        group: "Navegação",
        title: "Evolução · Ritmo, Energia & Força",
        subtitle: "Bateria do corpo (EA), recordes pessoais e consistência",
        keywords: "evolucao performance acwr carga fadiga",
        icon: Activity,
        onSelect: () => {
          router.push("/evolucao");
          onClose();
        },
      },
      {
        id: "nav-forca",
        group: "Navegação",
        title: "Evolução · Força & Recordes Pessoais",
        subtitle: "Volume acumulado, PRs por movimento e CSV",
        keywords: "analytics forca recordes pr historico",
        icon: BarChart3,
        onSelect: () => {
          router.push("/evolucao?tab=forca");
          onClose();
        },
      },
      {
        id: "nav-comunidade",
        group: "Navegação",
        title: "Comunidade & Mural Esportivo",
        subtitle: "Relatórios pós-treino, equipes e interações",
        keywords: "comunidade feed mural social",
        icon: Users,
        onSelect: () => {
          router.push("/comunidade");
          onClose();
        },
      },
      {
        id: "nav-desafios",
        group: "Navegação",
        title: "Desafios & Ranking",
        subtitle: "Metas coletivas de constância e placar",
        keywords: "desafios ranking gymrats",
        icon: Trophy,
        onSelect: () => {
          router.push("/comunidade/desafios");
          onClose();
        },
      },
      {
        id: "nav-equipes",
        group: "Navegação",
        title: "Equipes & Assessorias",
        subtitle: "Clubes, subgrupos e convites",
        keywords: "equipes grupos time",
        icon: Users,
        onSelect: () => {
          router.push("/equipes");
          onClose();
        },
      },
      {
        id: "nav-perfil",
        group: "Navegação",
        title: "Perfil, Biometria & Conquistas",
        subtitle: "Métricas corporais privadas e modalidades",
        keywords: "perfil peso biometria lgpd",
        icon: User,
        onSelect: () => {
          router.push("/perfil");
          onClose();
        },
      },
      {
        id: "nav-integracoes",
        group: "Navegação",
        title: "Integrações & Dispositivos",
        subtitle: "Strava, Apple Health, Garmin e Health Connect",
        keywords: "integracoes strava garmin apple watch",
        icon: Smartphone,
        onSelect: () => {
          router.push("/integracoes");
          onClose();
        },
      },
      {
        id: "act-theme",
        group: "Ações",
        title: "Alternar Tema (Claro / Escuro)",
        subtitle: "Mudar aparência entre Noite e Osso",
        keywords: "tema dark light escuro claro",
        icon: SunMoon,
        onSelect: toggleTheme,
      },
    ];

    const routineItems: CommandItem[] = (snapshot?.routines || []).map((r) => ({
      id: `routine-${r.id}`,
      group: "Minhas Fichas",
      title: r.title,
      subtitle: "Abrir rotina ou imprimir folha técnica",
      keywords: `${r.title} ${r.modalityCode} ficha treino`,
      icon: Dumbbell,
      onSelect: () => {
        router.push("/treinos");
        onClose();
      },
    }));

    const exerciseItems: CommandItem[] = (snapshot?.exercises || []).map(
      (ex) => ({
        id: `ex-${ex.id}`,
        group: "Exercícios",
        title: ex.namePt,
        subtitle: `${ex.muscle} · ${
          DIFFICULTY_PT[ex.difficulty || "intermediate"] || "Intermediário"
        }`,
        keywords: `${ex.namePt} ${ex.muscle} exercicio movimento`,
        icon: Sparkles,
        onSelect: () => {
          openExerciseSheet(ex.id);
          onClose();
        },
      })
    );

    const athleteItems: CommandItem[] = (snapshot?.athletes || []).map((a) => ({
      id: `ath-${a.id}`,
      group: "Comunidade",
      title: a.name,
      subtitle: `@${a.username} · Perfil de atleta`,
      keywords: `${a.name} ${a.username} atleta`,
      icon: User,
      onSelect: () => {
        router.push(`/atleta/${encodeURIComponent(a.username)}`);
        onClose();
      },
    }));

    return [...navItems, ...routineItems, ...exerciseItems, ...athleteItems];
  }, [snapshot, router, onClose]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // Sem busca: exibe navegação rápida, fichas do atleta e primeiros movimentos
      return allItems.slice(0, 18);
    }
    return allItems
      .filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
          (item.keywords && item.keywords.toLowerCase().includes(q))
      )
      .slice(0, 24);
  }, [allItems, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) =>
          filteredItems.length > 0 ? (prev + 1) % filteredItems.length : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) =>
          filteredItems.length > 0
            ? (prev - 1 + filteredItems.length) % filteredItems.length
            : 0
        );
      } else if (e.key === "Enter" && filteredItems[activeIndex]) {
        e.preventDefault();
        filteredItems[activeIndex].onSelect();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, filteredItems, activeIndex, onClose]);

  if (!open) return null;

  // Agrupar itens mantendo a ordem e o índice global para navegação por teclado
  const groups = Array.from(new Set(filteredItems.map((i) => i.group)));

  return (
    <ModalPortal
      open={open}
      onClose={onClose}
      ariaLabel="Busca rápida e paleta de comandos"
      align="top"
      maxWidthClass="max-w-xl"
    >
      <div className="card w-full bg-surface border border-line shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Campo de Busca */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-line">
          <Search size={17} className="text-muted shrink-0" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar exercícios, fichas, atletas ou comandos..."
            aria-label="Digite para buscar no Selye"
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded border border-line bg-foreground/5 text-[10px] font-mono text-muted shrink-0">
            ESC
          </kbd>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar busca"
            className="w-7 h-7 rounded-md flex items-center justify-center text-muted hover:text-foreground hover:bg-foreground/5 cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {(
          <div className="overflow-y-auto p-2 divide-y divide-line/50">
            {filteredItems.length === 0 ? (
              <div className="py-10 text-center px-4">
                <p className="text-sm font-medium text-foreground">
                  Nenhum resultado para &ldquo;{query}&rdquo;
                </p>
                <p className="text-xs text-muted mt-1">
                  Tente buscar pelo nome de um exercício, ficha, atleta ou tela.
                </p>
              </div>
            ) : (
              groups.map((groupName) => {
                const groupItems = filteredItems.filter(
                  (i) => i.group === groupName
                );
                return (
                  <div key={groupName} className="py-2 first:pt-1 last:pb-1">
                    <span className="t-label px-3 py-1 block">{groupName}</span>
                    <div className="mt-1 flex flex-col gap-0.5">
                      {groupItems.map((item) => {
                        const globalIdx = filteredItems.indexOf(item);
                        const isSelected = globalIdx === activeIndex;
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onMouseEnter={() => setActiveIndex(globalIdx)}
                            onClick={item.onSelect}
                            className={`w-full px-3 py-2.5 rounded-lg flex items-center justify-between gap-3 text-left transition-colors cursor-pointer ${
                              isSelected
                                ? "bg-foreground text-background"
                                : "text-foreground hover:bg-foreground/5"
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                  isSelected
                                    ? "bg-lima text-grafite"
                                    : "bg-foreground/5 text-muted"
                                }`}
                              >
                                <Icon size={15} strokeWidth={1.9} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold truncate">
                                  {item.title}
                                </p>
                                {item.subtitle && (
                                  <p
                                    className={`text-[11px] truncate ${
                                      isSelected
                                        ? "text-background/75"
                                        : "text-muted"
                                    }`}
                                  >
                                    {item.subtitle}
                                  </p>
                                )}
                              </div>
                            </div>
                            <ArrowRight
                              size={13}
                              className={`shrink-0 ${
                                isSelected ? "text-lima" : "text-muted/50"
                              }`}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Rodapé de atalhos */}
        <div className="px-4 py-2.5 border-t border-line bg-foreground/[0.02] flex items-center justify-between text-[11px] font-mono text-muted">
          <span>↑↓ navegar · ↵ abrir</span>
          <span>⌘K / Ctrl+K</span>
        </div>
      </div>
    </ModalPortal>
  );
}