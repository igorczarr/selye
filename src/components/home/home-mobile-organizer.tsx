"use client";

import { useState, type ReactNode } from "react";
import { Dumbbell, Activity, History } from "lucide-react";

export function HomeMobileOrganizer({
  workoutSection,
  planSection,
  summarySection,
  historySection,
}: {
  workoutSection: ReactNode;
  planSection: ReactNode;
  summarySection: ReactNode;
  historySection: ReactNode;
}) {
  const [mobileTab, setMobileTab] = useState<"workout" | "summary" | "history">(
    "workout"
  );

  return (
    <>
      {/* Barra de Filtro Rápido Mobile (reduz rolagem e foca em 1 objetivo por vez) */}
      <div
        role="tablist"
        aria-label="Organizar visão da página inicial"
        className="lg:hidden grid grid-cols-3 gap-1 p-1 rounded-xl border border-line bg-surface"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === "workout"}
          onClick={() => setMobileTab("workout")}
          className={`h-9 rounded-lg text-xs font-mono font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
            mobileTab === "workout"
              ? "bg-lima text-grafite"
              : "text-muted hover:text-foreground"
          }`}
        >
          <Dumbbell size={13} />
          <span>Treino & Hoje</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === "summary"}
          onClick={() => setMobileTab("summary")}
          className={`h-9 rounded-lg text-xs font-mono font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
            mobileTab === "summary"
              ? "bg-lima text-grafite"
              : "text-muted hover:text-foreground"
          }`}
        >
          <Activity size={13} />
          <span>Bateria & Ritmo</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === "history"}
          onClick={() => setMobileTab("history")}
          className={`h-9 rounded-lg text-xs font-mono font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
            mobileTab === "history"
              ? "bg-lima text-grafite"
              : "text-muted hover:text-foreground"
          }`}
        >
          <History size={13} />
          <span>Histórico</span>
        </button>
      </div>

      {/* 2. HIERARQUIA SECUNDÁRIA (BENTO 12 COLS): visível no desktop ou na aba 'Bateria & Ritmo' no mobile */}
      <div
        className={`stagger-2 ${
          mobileTab === "summary" ? "block" : "hidden lg:block"
        }`}
      >
        {summarySection}
      </div>

      {/* 3. SEU PASSO DE HOJE NO CALENDÁRIO: visível no desktop ou na aba 'Treino & Hoje' no mobile */}
      <div
        className={`stagger-3 ${
          mobileTab === "workout" ? "block" : "hidden lg:block"
        }`}
      >
        {planSection}
      </div>

      {/* 4. EXECUÇÃO (BENTO 8 + 4): Treino do Dia + Histórico */}
      <div className="bento-grid items-start stagger-4">
        <div
          className={`col-span-12 xl:col-span-8 ${
            mobileTab === "workout" ? "block" : "hidden lg:block"
          }`}
        >
          {workoutSection}
        </div>

        <div
          className={`col-span-12 xl:col-span-4 ${
            mobileTab === "history" ? "block" : "hidden lg:block"
          }`}
        >
          {historySection}
        </div>
      </div>
    </>
  );
}
