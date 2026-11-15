"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Cpu,
  Printer,
  Smartphone,
  Activity,
} from "lucide-react";
import { type ACWRResult } from "@/core/performance/training-load";
import { type PerformanceRecommendation } from "@/core/performance/recommendations-engine";

interface PerformanceDashboardProps {
  data: {
    acwrResult: ACWRResult;
    recommendations: PerformanceRecommendation[];
    last7DaysChart: { date: string; dayName: string; load: number }[];
    totalSessionsCount: number;
    consecutiveDays: number;
    averageRpe: number;
  };
}

export function PerformanceDashboard({ data }: PerformanceDashboardProps) {
  const {
    acwrResult,
    recommendations,
    last7DaysChart,
    consecutiveDays,
    averageRpe,
  } = data;
  const [expandedRationale, setExpandedRationale] = useState<
    Record<string, boolean>
  >({});

  const toggleRationale = (id: string) => {
    setExpandedRationale((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Estilos semânticos dentro da paleta Selye (compatíveis com tema claro e escuro)
  const getStatusStyle = (status: string) => {
    switch (status) {
      case "sweet_spot":
        return {
          border: "border-profundo/50",
          bg: "bg-lima/10",
          badge: "bg-lima text-grafite",
          indicator: "Zona Ótima",
        };
      case "under_training":
        return {
          border: "border-line",
          bg: "bg-surface",
          badge: "bg-foreground/10 text-foreground",
          indicator: "Estímulo Baixo",
        };
      case "elevated_risk":
        return {
          border: "border-mineral",
          bg: "bg-mineral/10",
          badge: "bg-profundo text-osso",
          indicator: "Atenção à Carga",
        };
      case "danger_zone":
        return {
          border: "border-foreground",
          bg: "bg-noite text-osso",
          badge: "bg-lima text-grafite",
          indicator: "Sobrecarga Aguda",
        };
      default:
        return {
          border: "border-line",
          bg: "bg-surface",
          badge: "bg-foreground/10 text-foreground",
          indicator: "Em calibração",
        };
    }
  };

  const statusStyle = getStatusStyle(acwrResult.status);
  const isInvertedCard = acwrResult.status === "danger_zone";
  const maxDailyLoad = Math.max(1, ...last7DaysChart.map((d) => d.load));
  const markerPositionPercent = Math.min(
    98,
    Math.max(2, (acwrResult.acwr / 2.0) * 100)
  );

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full fade-up">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="t-label">Fisiologia do Exercício</span>
          <h1 className="t-h1 mt-1">Performance & Carga Adaptativa</h1>
          <p className="text-muted text-sm mt-1">
            Monitoramento da razão de carga aguda:crônica (ACWR), monotonia semanal e orientações baseadas em evidências.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <Link href="/integracoes" className="btn btn-ghost h-10 px-3.5 text-xs">
            <Smartphone size={14} />
            <span>Dispositivos</span>
          </Link>
          <Link href="/treinos" className="btn btn-dark h-10 px-3.5 text-xs">
            <Printer size={14} />
            <span>Fichas Técnicas</span>
          </Link>
        </div>
      </div>

      {/* Painel Principal: ACWR (Gabbett Ratio) */}
      <section
        className={`rounded-2xl border ${statusStyle.border} ${statusStyle.bg} p-6 sm:p-8 flex flex-col gap-6 transition-colors`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5">
              <span
                className={`t-label ${
                  isInvertedCard ? "!text-nevoa" : "!text-accent-text"
                }`}
              >
                Razão Aguda : Crônica (ACWR)
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold ${statusStyle.badge}`}
              >
                {acwrResult.statusLabel}
              </span>
            </div>

            <div className="flex items-baseline gap-3 mt-2">
              <span
                className={`t-data text-4xl sm:text-5xl font-semibold tracking-tight ${
                  isInvertedCard ? "text-osso" : "text-foreground"
                }`}
              >
                {acwrResult.acwr.toFixed(2)}
              </span>
              <span
                className={`text-xs font-mono ${
                  isInvertedCard ? "text-nevoa" : "text-muted"
                }`}
              >
                Faixa ideal: {acwrResult.sweetSpotMin} – {acwrResult.sweetSpotMax}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:min-w-[260px]">
            <div className="p-3.5 rounded-xl bg-surface text-foreground border border-line">
              <span className="t-label block">Carga Aguda (7d)</span>
              <p className="t-data text-lg font-semibold mt-1">
                {acwrResult.acuteLoad}{" "}
                <span className="text-xs font-normal text-muted">UA</span>
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-surface text-foreground border border-line">
              <span className="t-label block">Carga Crônica (28d)</span>
              <p className="t-data text-lg font-semibold mt-1">
                {acwrResult.chronicLoad}{" "}
                <span className="text-xs font-normal text-muted">UA</span>
              </p>
            </div>
          </div>
        </div>

        {/* Régua de Zonas Fisiológicas */}
        <div className="flex flex-col gap-2 pt-2">
          <div
            className={`grid grid-cols-4 text-xs font-mono ${
              isInvertedCard ? "text-nevoa" : "text-muted"
            }`}
          >
            <span>Base (&lt; 0.8)</span>
            <span
              className={`font-semibold ${
                isInvertedCard ? "text-lima" : "text-accent-text"
              }`}
            >
              Zona Ótima (0.8–1.3)
            </span>
            <span className="text-right sm:text-left">Transição (1.3–1.5)</span>
            <span className="text-right">Sobrecarga (&gt; 1.5)</span>
          </div>

          <div className="w-full h-3 rounded-full bg-foreground/10 overflow-hidden flex relative">
            <div className="w-[40%] bg-mineral/35" title="Sub-treinamento (< 0.8)" />
            <div className="w-[25%] bg-lima" title="Zona Ótima (0.8 a 1.3)" />
            <div className="w-[10%] bg-profundo/70" title="Transição / Atenção (1.3 a 1.5)" />
            <div className="w-[25%] bg-grafite" title="Sobrecarga (> 1.5)" />

            <div
              aria-label={`Marcador atual de ACWR em ${acwrResult.acwr.toFixed(2)}`}
              className="absolute -top-1 -bottom-1 w-2 rounded-full bg-foreground ring-2 ring-surface transition-all"
              style={{ left: `${markerPositionPercent}%` }}
            />
          </div>
        </div>
      </section>

      {/* Indicadores Fisiológicos Complementares */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5 flex flex-col justify-between">
          <div>
            <span className="t-label">Monotonia (7d)</span>
            <p className="t-data text-2xl font-semibold mt-1 text-foreground">
              {acwrResult.monotony}
            </p>
          </div>
          <p className="t-aux text-muted mt-3">
            Relação média/desvio. Acima de 2,0 sugere pouca variação de estímulo.
          </p>
        </div>

        <div className="card p-5 flex flex-col justify-between">
          <div>
            <span className="t-label">Tensão Semanal (Strain)</span>
            <p className="t-data text-2xl font-semibold mt-1 text-accent-text">
              {acwrResult.strain.toLocaleString("pt-BR")}
            </p>
          </div>
          <p className="t-aux text-muted mt-3">
            Estresse fisiológico ponderado (Carga Semanal × Monotonia).
          </p>
        </div>

        <div className="card p-5 flex flex-col justify-between">
          <div>
            <span className="t-label">Dias Consecutivos</span>
            <p className="t-data text-2xl font-semibold mt-1 text-foreground">
              {consecutiveDays} {consecutiveDays === 1 ? "dia" : "dias"}
            </p>
          </div>
          <p className="t-aux text-muted mt-3">
            Sequência atual de treinos sem dia de recuperação intercalado.
          </p>
        </div>

        <div className="card p-5 flex flex-col justify-between">
          <div>
            <span className="t-label">Esforço Médio (7d)</span>
            <p className="t-data text-2xl font-semibold mt-1 text-foreground">
              RPE {averageRpe}
            </p>
          </div>
          <p className="t-aux text-muted mt-3">
            Percepção subjetiva média na escala de Foster (1 a 10).
          </p>
        </div>
      </section>

      {/* Distribuição de Carga nos Últimos 7 Dias */}
      <section className="card p-6 flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <span className="t-label">Distribuição Temporal</span>
            <h2 className="t-h2 mt-1">Carga Diária (Últimos 7 Dias)</h2>
          </div>
          <span className="t-data text-xs text-muted">
            Acumulado: {acwrResult.weeklyLoadTotal} UA
          </span>
        </div>

        <div className="grid grid-cols-7 gap-2 sm:gap-4 items-end h-44 pt-6 border-b border-line pb-3">
          {last7DaysChart.map((d, idx) => {
            const isToday = idx === last7DaysChart.length - 1;
            const hasLoad = d.load > 0;
            const heightPercent = hasLoad
              ? Math.max(14, Math.round((d.load / maxDailyLoad) * 100))
              : 6;

            return (
              <div
                key={d.date}
                className="flex flex-col items-center gap-2 h-full justify-end"
              >
                <span className="t-data text-xs text-muted">
                  {hasLoad ? d.load : "—"}
                </span>
                <div className="w-full max-w-[44px] h-full flex items-end">
                  <div
                    title={`${d.dayName} (${d.date}): ${d.load} UA`}
                    className={`w-full rounded-t-lg transition-all ${
                      hasLoad
                        ? isToday
                          ? "bg-lima"
                          : "bg-profundo hover:bg-mineral"
                        : "bg-foreground/10"
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  />
                </div>
                <span
                  className={`text-xs font-mono ${
                    isToday
                      ? "font-semibold text-foreground"
                      : "text-muted"
                  }`}
                >
                  {d.dayName}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Recomendações Baseadas em Evidências */}
      <section className="card p-6 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-lima/25 text-foreground flex items-center justify-center shrink-0">
              <Cpu size={18} />
            </div>
            <div>
              <span className="t-label">Orientação Explicável</span>
              <h2 className="t-h2 mt-0.5">Recomendações de Ajuste</h2>
            </div>
          </div>
          <span className="chip">Caráter informativo · Não substitui avaliação clínica</span>
        </div>

        <div className="flex flex-col gap-3">
          {recommendations.map((rec) => {
            const isRationaleOpen = Boolean(expandedRationale[rec.id]);
            const isHighUrgency = rec.urgency === "alert";

            return (
              <article
                key={rec.id}
                className={`rounded-xl border p-4 flex flex-col gap-3 transition-all ${
                  isHighUrgency
                    ? "border-profundo bg-lima/15"
                    : "border-line bg-foreground/[0.02]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0 text-accent-text">
                    {rec.urgency === "info" ? (
                      <ShieldCheck size={18} />
                    ) : (
                      <AlertTriangle size={18} />
                    )}
                  </div>

                  <div className="flex-1">
                    <h3 className="font-semibold text-sm text-foreground">
                      {rec.title}
                    </h3>
                    <p className="text-xs text-muted mt-1 leading-relaxed">
                      {rec.message}
                    </p>
                    {rec.actionableStep && (
                      <p className="text-xs font-medium text-foreground mt-2 flex items-center gap-1.5">
                        <Activity size={13} className="text-accent-text shrink-0" />
                        <span>Sugestão prática: {rec.actionableStep}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="border-t border-line/60 pt-2.5 flex flex-col">
                  <button
                    type="button"
                    aria-expanded={isRationaleOpen}
                    onClick={() => toggleRationale(rec.id)}
                    className="text-xs text-muted hover:text-foreground flex items-center gap-1.5 cursor-pointer font-mono self-start"
                  >
                    <HelpCircle size={13} />
                    <span>Por que estou vendo esta recomendação?</span>
                    {isRationaleOpen ? (
                      <ChevronUp size={13} />
                    ) : (
                      <ChevronDown size={13} />
                    )}
                  </button>

                  {isRationaleOpen && (
                    <div className="mt-2.5 p-3.5 rounded-lg bg-surface border border-line text-xs text-muted leading-relaxed font-mono">
                      {rec.scientificRationale}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
