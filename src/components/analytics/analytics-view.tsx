"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, Trophy, Award, Calendar, Dumbbell } from "lucide-react";

interface PersonalRecordItem {
  exerciseName: string;
  maxLoadKg: number;
  reps: number;
  date: string;
}

interface HeatmapDay {
  date: string;
  dayNumber: number;
  active: boolean;
}

interface AnalyticsViewProps {
  metrics: {
    totalWorkouts: number;
    monthlyVolumeKg: number;
    weeklyAdherence: number;
    activeDaysLast28: number;
    targetDaysLast28: number;
    currentWeeklyStreak: number;
    bestWeeklyStreak: number;
    personalRecords: PersonalRecordItem[];
    heatmapDays: HeatmapDay[];
    recentWorkouts: any[];
  };
}

type PeriodKey = "week" | "month" | "quarter" | "year";

const PERIOD_DAYS: Record<PeriodKey, number> = {
  week: 7,
  month: 30,
  quarter: 90,
  year: 365,
};

export function AnalyticsView({ metrics }: AnalyticsViewProps) {
  const [period, setPeriod] = useState<PeriodKey>("month");

  const now = new Date();
  const cutoffDate = new Date(now);
  cutoffDate.setDate(now.getDate() - PERIOD_DAYS[period]);

  const filteredWorkouts = metrics.recentWorkouts.filter(
    (w) => new Date(w.startedAt) >= cutoffDate
  );

  const handleExportCsv = () => {
    const rows = (filteredWorkouts.length > 0
      ? filteredWorkouts
      : metrics.recentWorkouts
    ).map((w) => {
      const durationMin = w.finishedAt
        ? Math.max(
            1,
            Math.round(
              (new Date(w.finishedAt).getTime() -
                new Date(w.startedAt).getTime()) /
                60000
            )
          )
        : 45;
      return `${new Date(w.startedAt).toLocaleDateString("pt-BR")},"${
        w.title
      }",${w.modalityCode},${durationMin},${w.rpeSession || 8}`;
    });

    const csvContent =
      "data:text/csv;charset=utf-8,Data,Treino,Modalidade,DuracaoMin,RPE\n" +
      rows.join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `selye_historico_${period}_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-6 fade-up">
      {/* Cabeçalho e Controles de Período / Exportação */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="t-label">Patrimônio de Dados</span>
          <h1 className="t-h1 mt-1">Analytics Pessoal</h1>
          <p className="text-muted text-sm mt-1">
            Histórico consolidado de volume, constância semanal e evolução de cargas máximas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div
            role="group"
            aria-label="Selecionar período de análise"
            className="flex bg-surface border border-line rounded-lg p-1"
          >
            {(
              [
                { id: "week", label: "7d" },
                { id: "month", label: "30d" },
                { id: "quarter", label: "90d" },
                { id: "year", label: "1a" },
              ] as const
            ).map((p) => {
              const active = period === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setPeriod(p.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-mono font-semibold transition-colors cursor-pointer ${
                    active
                      ? "bg-foreground text-background"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            className="btn btn-ghost h-9 px-3.5 text-xs font-mono"
            title="Exportar histórico em CSV"
          >
            <Download size={14} />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* KPIs Consolidados (Dados Reais) */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-5 flex flex-col justify-between">
          <span className="t-label">Volume Acumulado</span>
          <p className="t-data text-2xl mt-1 text-foreground">
            {metrics.monthlyVolumeKg.toLocaleString("pt-BR")} kg
          </p>
          <span className="t-aux text-accent-text mt-2 font-medium">
            {filteredWorkouts.length}{" "}
            {filteredWorkouts.length === 1
              ? "sessão no período"
              : "sessões no período"}
          </span>
        </div>

        <div className="card p-5 flex flex-col justify-between">
          <span className="t-label">Adesão à Meta (28d)</span>
          <p className="t-data text-2xl mt-1 text-foreground">
            {metrics.weeklyAdherence}%
          </p>
          <span className="t-aux text-muted mt-2">
            {metrics.activeDaysLast28} de {metrics.targetDaysLast28} sessões planejadas
          </span>
        </div>

        <div className="card p-5 flex flex-col justify-between">
          <span className="t-label">Streak Semanal</span>
          <p className="t-data text-2xl mt-1 text-foreground flex items-center gap-1.5">
            <span>{metrics.currentWeeklyStreak}</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-lima text-grafite font-mono">
              {metrics.currentWeeklyStreak === 1 ? "semana" : "semanas"}
            </span>
          </p>
          <span className="t-aux text-muted mt-2">
            Melhor marca: {metrics.bestWeeklyStreak}{" "}
            {metrics.bestWeeklyStreak === 1 ? "semana" : "semanas"}
          </span>
        </div>

        <div className="card p-5 flex flex-col justify-between">
          <span className="t-label">Recordes Mapeados</span>
          <p className="t-data text-2xl mt-1 text-foreground flex items-center gap-2">
            <Trophy size={18} className="text-accent-text" />
            <span>{metrics.personalRecords.length}</span>
          </p>
          <span className="t-aux text-muted mt-2">
            Maiores cargas registradas
          </span>
        </div>
      </section>

      {/* Meus Recordes Pessoais (Reais do Banco) */}
      <section className="card p-6 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div>
            <span className="t-label !text-accent-text">Força Aplicada</span>
            <h2 className="t-h2 mt-1">Recordes Pessoais por Movimento</h2>
          </div>
          <Award size={20} className="text-accent-text" />
        </div>

        {metrics.personalRecords.length === 0 ? (
          <div className="py-10 border border-dashed border-line rounded-xl text-center flex flex-col items-center gap-2">
            <Dumbbell size={26} className="text-muted/60" />
            <p className="text-sm font-medium text-foreground">
              Nenhum recorde de carga registrado ainda
            </p>
            <p className="text-xs text-muted max-w-sm">
              Inicie e conclua uma sessão na página inicial para que suas cargas máximas apareçam automaticamente aqui.
            </p>
            <Link href="/" className="btn btn-primary h-9 px-4 text-xs mt-2">
              Ir para Treino de Hoje
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {metrics.personalRecords.map((pr, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-line p-4 bg-foreground/[0.02] flex flex-col justify-between"
              >
                <div>
                  <span className="t-label">Carga Máxima</span>
                  <h3 className="font-semibold text-sm text-foreground mt-1">
                    {pr.exerciseName}
                  </h3>
                  <p className="t-data text-2xl text-foreground font-semibold mt-2">
                    {pr.maxLoadKg} kg
                  </p>
                  <p className="t-aux text-muted">{pr.reps} repetições</p>
                </div>
                <p className="t-data text-xs text-muted mt-3 border-t border-line pt-2">
                  Registrado em {pr.date}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Mapa de Calor de Consistência (Últimos 28 Dias Reais) */}
      <section className="card p-6 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <span className="t-label">Constância Biológica</span>
            <h2 className="t-h2 mt-1">Mapa de Atividade (Últimos 28 Dias)</h2>
            <p className="text-muted text-xs mt-1">
              Dias com sessão registrada e dias de recuperação metabólica.
            </p>
          </div>
          <span className="t-data text-xs text-muted flex items-center gap-1.5">
            <Calendar size={13} />
            <span>{metrics.activeDaysLast28} dias ativos no ciclo</span>
          </span>
        </div>

        <div className="grid grid-cols-7 gap-2 pt-2">
          {metrics.heatmapDays.map((day, idx) => {
            const isToday = idx === metrics.heatmapDays.length - 1;
            return (
              <div
                key={day.date}
                title={`${new Date(day.date + "T12:00:00Z").toLocaleDateString(
                  "pt-BR"
                )}: ${day.active ? "Treino Registrado" : "Recuperação / Descanso"}`}
                className={`h-10 rounded-lg flex items-center justify-center t-data text-xs transition-colors ${
                  day.active
                    ? "bg-lima text-grafite font-semibold"
                    : "bg-foreground/[0.04] border border-line text-muted"
                } ${isToday ? "ring-2 ring-profundo ring-offset-1" : ""}`}
              >
                {String(day.dayNumber).padStart(2, "0")}
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-5 text-xs font-mono text-muted mt-2 pt-3 border-t border-line">
          <span className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded bg-lima inline-block" />
            <span>Sessão Concluída</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded bg-foreground/[0.04] border border-line inline-block" />
            <span>Recuperação / Descanso</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded ring-2 ring-profundo inline-block" />
            <span>Hoje</span>
          </span>
        </div>
      </section>
    </div>
  );
}
