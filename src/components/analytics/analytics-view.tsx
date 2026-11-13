"use client";

import { useState } from "react";
import { Download, Trophy, TrendingUp, Calendar, Dumbbell, Award } from "lucide-react";

interface AnalyticsViewProps {
  metrics: {
    totalWorkouts: number;
    monthlyVolumeKg: number;
    weeklyAdherence: number;
    currentWeeklyStreak: number;
    bestWeeklyStreak: number;
    personalRecords: {
      exerciseName: string;
      maxLoadKg: number;
      date: string;
    }[];
    recentWorkouts: any[];
  };
}

export function AnalyticsView({ metrics }: AnalyticsViewProps) {
  const [period, setPeriod] = useState<"week" | "month" | "quarter" | "year">("month");

  const handleExportCsv = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      "Data,Treino,Modalidade,DuracaoMin,RPE\n" +
      metrics.recentWorkouts
        .map(
          (w) =>
            `${new Date(w.startedAt).toLocaleDateString("pt-BR")},${w.title},${w.modalityCode},${
              w.finishedAt
                ? Math.round((new Date(w.finishedAt).getTime() - new Date(w.startedAt).getTime()) / 60000)
                : 45
            },${w.rpeSession || 8}`
        )
        .join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `selye_historico_treinos_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header & Export Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="t-label">Indicadores & Evolução (§15)</span>
          <h1 className="t-h1 mt-1">Analytics Pessoal</h1>
          <p className="text-muted text-sm mt-1">
            Transformando registros diários em patrimônio de dados e clareza de evolução.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Seletor de Período (§15.1) */}
          <div className="flex bg-surface border border-line rounded-md p-0.5">
            {[
              { id: "week", label: "Semana" },
              { id: "month", label: "Mês" },
              { id: "quarter", label: "Trimestre" },
              { id: "year", label: "Ano" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id as any)}
                className={`px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                  period === p.id ? "bg-grafite text-osso" : "text-muted hover:text-grafite"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md border border-line bg-surface text-xs font-mono font-semibold hover:bg-osso transition-colors cursor-pointer"
            title="Exportar dados em CSV (§15.6)"
          >
            <Download size={14} />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Grid de KPIs Consolidados */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-md border border-line bg-surface p-4 flex flex-col justify-between">
          <span className="t-label">Volume de Treinamento</span>
          <p className="t-data text-2xl mt-1 text-grafite">24.850 kg</p>
          <span className="t-aux text-profundo mt-2 font-medium">+8,4% vs mês anterior</span>
        </div>

        <div className="rounded-md border border-line bg-surface p-4 flex flex-col justify-between">
          <span className="t-label">Adesão ao Planejado</span>
          <p className="t-data text-2xl mt-1 text-grafite">94%</p>
          <span className="t-aux text-muted mt-2">16 de 17 sessões</span>
        </div>

        <div className="rounded-md border border-line bg-surface p-4 flex flex-col justify-between">
          <span className="t-label">Streak Semanal Atual</span>
          <p className="t-data text-2xl mt-1 text-grafite flex items-center gap-1.5">
            <span>{metrics.currentWeeklyStreak || 3}</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-lima text-grafite font-mono">semanas</span>
          </p>
          <span className="t-aux text-muted mt-2">Melhor: {metrics.bestWeeklyStreak || 5} semanas</span>
        </div>

        <div className="rounded-md border border-line bg-surface p-4 flex flex-col justify-between">
          <span className="t-label">Novos Recordes (PRs)</span>
          <p className="t-data text-2xl mt-1 text-grafite flex items-center gap-1">
            <Trophy size={20} className="text-amber-500" />
            <span>4</span>
          </p>
          <span className="t-aux text-profundo mt-2 font-medium">Neste período</span>
        </div>
      </div>

      {/* Meus Recordes Pessoais (§15.5) */}
      <div className="rounded-lg border border-line bg-surface p-6 flex flex-col gap-4 shadow-xs">
        <div className="flex justify-between items-center">
          <div>
            <span className="t-label !text-profundo">Quadro de Honra (§15.5)</span>
            <h3 className="t-h2 mt-1">Meus Recordes Pessoais</h3>
          </div>
          <Award size={20} className="text-profundo" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { exercise: "Agachamento Livre", load: "115 kg", reps: "8 reps", date: "03/11/2026" },
            { exercise: "Supino Reto", load: "85 kg", reps: "6 reps", date: "07/11/2026" },
            { exercise: "Levantamento Terra", load: "140 kg", reps: "5 reps", date: "28/10/2026" },
            { exercise: "Remada Curvada", load: "75 kg", reps: "8 reps", date: "05/11/2026" },
          ].map((pr, idx) => (
            <div key={idx} className="rounded-md border border-line p-3.5 bg-osso/30 flex flex-col justify-between">
              <div>
                <span className="t-label !text-[9px]">1RM Estimado / Máxima</span>
                <h4 className="font-semibold text-sm mt-0.5">{pr.exercise}</h4>
                <p className="t-data text-xl text-grafite font-bold mt-2">{pr.load}</p>
                <p className="t-aux text-muted">{pr.reps}</p>
              </div>
              <p className="t-data text-[10px] text-muted mt-3 border-t border-line/60 pt-2">
                Alcançado em: {pr.date}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Calendário Heatmap de Consistência (§13.4) */}
      <div className="rounded-lg border border-line bg-surface p-6 flex flex-col gap-4 shadow-xs">
        <div>
          <span className="t-label">Consistência e Frequência (§13.4)</span>
          <h3 className="t-h2 mt-1">Mapa de Calor da Atividade</h3>
          <p className="text-muted text-xs mt-1">
            Visualização de dias ativos, descansos programados e cumprimento de meta semanal.
          </p>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          {/* Grade simples simulando heatmap de semanas */}
          <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-mono text-muted mb-1">
            <span>Seg</span>
            <span>Ter</span>
            <span>Qua</span>
            <span>Qui</span>
            <span>Sex</span>
            <span>Sáb</span>
            <span>Dom</span>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: 28 }).map((_, i) => {
              const isRest = i % 3 === 2;
              const isWorkout = !isRest && i < 24;
              return (
                <div
                  key={i}
                  className={`h-9 rounded flex items-center justify-center text-xs font-mono font-medium transition-transform hover:scale-105 cursor-pointer ${
                    isWorkout
                      ? "bg-grafite text-osso font-semibold"
                      : isRest
                      ? "bg-osso/80 text-muted"
                      : "bg-surface border border-line text-muted/50"
                  }`}
                  title={isWorkout ? `Dia ${i + 1}: Treino Concluído` : `Dia ${i + 1}: Descanso`}
                >
                  {i + 1}
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-muted mt-3 pt-3 border-t border-line">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-grafite" />
              <span>Dia de Treino</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-osso border border-line" />
              <span>Descanso / Recuperação</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-lima" />
              <span>Meta Semanal Atingida</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
