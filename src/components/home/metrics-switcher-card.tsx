"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleRegenerativeWeekShield } from "@/actions/workout";
import {
  CalendarCheck2,
  Dumbbell,
  Flame,
  Layers,
  ShieldCheck,
} from "lucide-react";

type MetricView = "frequencia" | "volume" | "sessoes";

interface MetricsSwitcherStats {
  monthlyVolumeKg: number;
  weeklyFrequencyAvg: number;
  targetDaysPerWeek: number;
  currentWeeklyStreak: number;
  bestWeeklyStreak: number;
  isCurrentWeekShielded?: boolean;
  totalCompletedWorkouts: number;
  activeDaysInYear: number;
}

function formatVolume(kg: number): string {
  if (kg >= 1000) {
    return `${(kg / 1000).toLocaleString("pt-BR", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })} t`;
  }
  return `${kg.toLocaleString("pt-BR")} kg`;
}

export function MetricsSwitcherCard({
  stats,
}: {
  stats: MetricsSwitcherStats;
}) {
  const router = useRouter();
  const [view, setView] = useState<MetricView>("frequencia");
  const [shielded, setShielded] = useState(
    Boolean(stats.isCurrentWeekShielded)
  );
  const [isPending, startTransition] = useTransition();

  const handleToggleShield = () => {
    setShielded((prev) => !prev);
    startTransition(async () => {
      await toggleRegenerativeWeekShield();
      router.refresh();
    });
  };

  const freqProgress = Math.min(
    100,
    Math.round(
      (stats.weeklyFrequencyAvg / Math.max(1, stats.targetDaysPerWeek)) * 100
    )
  );
  const yearProgress = Math.min(
    100,
    Math.round((stats.activeDaysInYear / 200) * 100)
  );
  const volumeProgress =
    stats.monthlyVolumeKg > 0
      ? Math.min(100, Math.max(18, Math.round((stats.monthlyVolumeKg / 40000) * 100)))
      : 0;

  return (
    <section
      aria-label="Pulso de Indicadores: Frequência, Volume e Sessões"
      className="col-span-12 sm:col-span-6 lg:col-span-12 xl:col-span-3 card p-5 flex flex-col justify-between gap-4"
    >
      {/* Topo: Chave de Alternância (Segmented Control) */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="t-label">Pulso Semanal</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={isPending}
              onClick={handleToggleShield}
              aria-pressed={shielded}
              title={
                shielded
                  ? "Semana Regenerativa Ativa: seu streak está protegido nesta semana para priorizar recuperação"
                  : "Ativar Semana Regenerativa (Escudo de Recuperação) para proteger seu streak sem culpa"
              }
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono transition-colors cursor-pointer ${
                shielded
                  ? "bg-lima text-grafite font-semibold"
                  : "bg-foreground/6 text-muted hover:text-foreground"
              }`}
            >
              <ShieldCheck size={11} />
              <span>{shielded ? "Escudo Ativo" : "Escudo"}</span>
            </button>

            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-lima/25 text-foreground text-[11px] font-mono font-semibold"
              title={`Streak atual: ${stats.currentWeeklyStreak} sem · Recorde: ${stats.bestWeeklyStreak} sem`}
            >
              <Flame size={12} className="text-accent-text shrink-0" />
              <span>{stats.currentWeeklyStreak} sem</span>
            </span>
          </div>
        </div>

        <div
          role="tablist"
          aria-label="Alternar indicador"
          className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-foreground/[0.04] border border-line"
        >
          {(
            [
              { id: "frequencia", label: "Frequência", icon: CalendarCheck2 },
              { id: "volume", label: "Volume", icon: Dumbbell },
              { id: "sessoes", label: "Sessões", icon: Layers },
            ] as const
          ).map((tab) => {
            const active = view === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setView(tab.id)}
                className={`h-8 px-2 rounded-lg text-[11px] font-mono font-semibold transition-all cursor-pointer truncate ${
                  active
                    ? "bg-foreground text-background shadow-sm"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Corpo: Valor Principal + Barra de Progresso Contextual */}
      {view === "frequencia" && (
        <div className="flex flex-col gap-2 fade-up">
          <div className="flex items-baseline justify-between gap-2">
            <p className="t-data text-3xl font-semibold text-foreground">
              {stats.weeklyFrequencyAvg.toLocaleString("pt-BR")}
              <span className="text-xs font-sans text-muted font-normal ml-1">
                dias/sem
              </span>
            </p>
            <span className="text-[11px] font-mono text-accent-text font-semibold">
              Meta: {stats.targetDaysPerWeek}×/sem
            </span>
          </div>

          <div className="w-full h-2 rounded-full bg-foreground/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-lima transition-all duration-300"
              style={{ width: `${Math.max(8, freqProgress)}%` }}
            />
          </div>

          <p className="t-aux text-muted">
            Média semanal (28d) · Recorde de streak:{" "}
            <strong className="text-foreground font-mono">
              {stats.bestWeeklyStreak} sem
            </strong>
          </p>
        </div>
      )}

      {view === "volume" && (
        <div className="flex flex-col gap-2 fade-up">
          <div className="flex items-baseline justify-between gap-2">
            <p className="t-data text-3xl font-semibold text-foreground">
              {formatVolume(stats.monthlyVolumeKg)}
            </p>
            <span className="text-[11px] font-mono text-accent-text font-semibold">
              Ciclo 28d
            </span>
          </div>

          <div className="w-full h-2 rounded-full bg-foreground/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-profundo transition-all duration-300"
              style={{ width: `${Math.max(8, volumeProgress)}%` }}
            />
          </div>

          <p className="t-aux text-muted">
            {stats.monthlyVolumeKg > 0
              ? "Peso total levantado nas séries concluídas"
              : "Conclua séries com carga (kg) para acompanhar o peso levantado"}
          </p>
        </div>
      )}

      {view === "sessoes" && (
        <div className="flex flex-col gap-2 fade-up">
          <div className="flex items-baseline justify-between gap-2">
            <p className="t-data text-3xl font-semibold text-foreground">
              {stats.totalCompletedWorkouts}
              <span className="text-xs font-sans text-muted font-normal ml-1">
                {stats.totalCompletedWorkouts === 1 ? "sessão" : "sessões"}
              </span>
            </p>
            <span className="text-[11px] font-mono text-accent-text font-semibold">
              {stats.activeDaysInYear} dias no ano
            </span>
          </div>

          <div className="w-full h-2 rounded-full bg-foreground/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-lima transition-all duration-300"
              style={{ width: `${Math.max(8, yearProgress)}%` }}
            />
          </div>

          <p className="t-aux text-muted">
            Total histórico de fichas e atividades livres concluídas
          </p>
        </div>
      )}
    </section>
  );
}
