"use client";

import { useState, type ReactNode } from "react";
import { Dumbbell, Activity, History } from "lucide-react";

type HomeTabId = "workout" | "rhythm" | "history";

interface TabConfig {
  id: HomeTabId;
  label: string;
  icon: typeof Dumbbell;
  title: string;
}

const TABS: TabConfig[] = [
  {
    id: "workout",
    label: "Treino",
    icon: Dumbbell,
    title: "Treino de hoje e passo do plano",
  },
  {
    id: "rhythm",
    label: "Ritmo",
    icon: Activity,
    title: "Ritmo do mês, pulso semanal e volume",
  },
  {
    id: "history",
    label: "Histórico",
    icon: History,
    title: "Histórico de atividades concluídas",
  },
];

export function HomeMobileOrganizer({
  workoutSection,
  planSection,
  rhythmSection,
  historySection,
}: {
  workoutSection: ReactNode;
  planSection: ReactNode;
  rhythmSection: ReactNode;
  historySection: ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<HomeTabId>("workout");

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      {/* 
        Barra de Abas Enxuta (Mobile & Desktop):
        - Apenas ÍCONES nas abas inativas
        - Ícone + Nome APENAS na aba ativa
        - Economiza espaço horizontal, remove poluição visual e atrito
      */}
      <div className="flex items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Visualização do dia a dia"
          className="inline-flex items-center gap-1 p-1 rounded-2xl border border-line bg-surface/90 backdrop-blur-sm"
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                title={tab.title}
                aria-label={tab.label}
                onClick={() => setActiveTab(tab.id)}
                className={`h-9 rounded-xl text-xs font-mono font-semibold inline-flex items-center justify-center transition-all cursor-pointer ${
                  isActive
                    ? "bg-lima text-grafite px-3.5 gap-2 shadow-sm"
                    : "px-3 text-muted hover:text-foreground hover:bg-foreground/[0.04]"
                }`}
              >
                <Icon size={15} className="shrink-0" />
                {isActive && <span className="truncate">{tab.label}</span>}
              </button>
            );
          })}
        </div>

        <span className="text-[11px] font-mono text-muted hidden sm:inline">
          {activeTab === "workout"
            ? "Passo de Hoje & Fichas"
            : activeTab === "rhythm"
              ? "Tendência & Equilíbrio de Carga"
              : "Últimas Sessões Concluídas"}
        </span>
      </div>

      {/* ABA 1: TREINO (Foco na execução de hoje sem ruído) */}
      {activeTab === "workout" && (
        <div className="flex flex-col gap-4 sm:gap-5 fade-up">
          {/* Passo de Hoje no Calendário */}
          <div className="stagger-1">{planSection}</div>

          {/* Treino Runner / Fichas do Dia */}
          <div className="stagger-2">{workoutSection}</div>
        </div>
      )}

      {/* ABA 2: RITMO (Realocado: Ritmo do Mês ACWR + Pulso Semanal) */}
      {activeTab === "rhythm" && (
        <div className="flex flex-col gap-4 fade-up">
          <div className="rounded-xl border border-line bg-surface/50 p-4">
            <span className="t-label !text-accent-text">
              Ritmo & Equilíbrio do Seu Corpo
            </span>
            <p className="text-xs text-muted mt-0.5">
              Aqui você monitora a relação entre o esforço desta semana e a média do mês (sem cansaço acumulado) e protege sua consistência.
            </p>
          </div>
          <div>{rhythmSection}</div>
        </div>
      )}

      {/* ABA 3: HISTÓRICO (Realocado em seção limpa e dedicada) */}
      {activeTab === "history" && (
        <div className="flex flex-col gap-4 fade-up">
          <div>{historySection}</div>
        </div>
      )}
    </div>
  );
}
