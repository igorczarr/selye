"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Activity,
  Zap,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  TrendingUp,
  RotateCcw,
  Layers,
  ChevronDown,
  ChevronUp,
  Cpu,
  Printer,
  Smartphone,
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
  const { acwrResult, recommendations, last7DaysChart, consecutiveDays, averageRpe } = data;
  const [expandedRationale, setExpandedRationale] = useState<Record<string, boolean>>({});

  const toggleRationale = (id: string) => {
    setExpandedRationale((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Cores de status de ACWR
  const getStatusColor = (status: string) => {
    switch (status) {
      case "sweet_spot":
        return {
          bg: "bg-profundo/10",
          border: "border-profundo/40",
          text: "text-profundo",
          badge: "bg-lima text-grafite",
        };
      case "under_training":
        return {
          bg: "bg-blue-50/50",
          border: "border-blue-200",
          text: "text-blue-700",
          badge: "bg-blue-100 text-blue-800",
        };
      case "elevated_risk":
        return {
          bg: "bg-amber-50/50",
          border: "border-amber-300",
          text: "text-amber-800",
          badge: "bg-amber-100 text-amber-900",
        };
      case "danger_zone":
        return {
          bg: "bg-red-50/50",
          border: "border-red-300",
          text: "text-red-700",
          badge: "bg-red-100 text-red-800",
        };
      default:
        return {
          bg: "bg-surface",
          border: "border-line",
          text: "text-grafite",
          badge: "bg-osso text-grafite",
        };
    }
  };

  const statusStyle = getStatusColor(acwrResult.status);
  const maxDailyLoad = Math.max(1, ...last7DaysChart.map((d) => d.load));

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="t-label">Gestão de Carga & Fisiologia (§17 e §21)</span>
          <h1 className="t-h1 mt-1">Performance & Carga de Treinamento</h1>
          <p className="text-muted text-xs mt-1">
            Acompanhamento da Razão de Carga Aguda:Crônica (ACWR), estresse adaptativo e recomendações explicáveis.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/integracoes"
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md border border-line bg-surface text-grafite text-xs font-semibold hover:bg-osso transition-colors shadow-xs"
          >
            <Smartphone size={14} />
            <span>Dispositivos & Wearables</span>
          </Link>
          <Link
            href="/treinos"
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-grafite text-osso text-xs font-semibold hover:bg-noite transition-colors shadow-xs"
          >
            <Printer size={14} />
            <span>Fichas Imprimíveis</span>
          </Link>
        </div>
      </div>

      {/* Card Principal: ACWR (Razão Aguda:Crônica) */}
      <div className={`rounded-lg border ${statusStyle.border} ${statusStyle.bg} p-6 shadow-xs flex flex-col gap-5`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="t-label !text-profundo">ACWR (Gabbett Ratio)</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${statusStyle.badge}`}>
                {acwrResult.statusLabel}
              </span>
            </div>
            <div className="flex items-baseline gap-3 mt-1">
              <span className="t-data text-4xl font-bold tracking-tight text-grafite">
                {acwrResult.acwr.toFixed(2)}
              </span>
              <span className="text-xs text-muted font-mono">
                Faixa Ótima: {acwrResult.sweetSpotMin} a {acwrResult.sweetSpotMax}
              </span>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="p-3 rounded-md bg-surface border border-line/60 text-center min-w-[100px]">
              <span className="t-label !text-[9px]">Carga Aguda (7d)</span>
              <p className="t-data text-base font-bold text-grafite">{acwrResult.acuteLoad} UA</p>
            </div>
            <div className="p-3 rounded-md bg-surface border border-line/60 text-center min-w-[100px]">
              <span className="t-label !text-[9px]">Carga Crônica (28d)</span>
              <p className="t-data text-base font-bold text-grafite">{acwrResult.chronicLoad} UA</p>
            </div>
          </div>
        </div>

        {/* Visual Bar do Sweet Spot */}
        <div className="flex flex-col gap-1.5 pt-2">
          <div className="flex justify-between text-[10px] font-mono text-muted">
            <span>Sub-treinamento (&lt; 0.8)</span>
            <span className="text-profundo font-semibold">Sweet Spot (0.8 - 1.3)</span>
            <span className="text-amber-700">Aceleração (1.3 - 1.5)</span>
            <span className="text-red-700">Pico Crítico (&gt; 1.5)</span>
          </div>

          {/* Barra segmentada */}
          <div className="w-full h-3 rounded-full bg-line overflow-hidden flex relative">
            <div className="w-[30%] bg-blue-200" title="Sub-treinamento" />
            <div className="w-[35%] bg-lima" title="Zona Ótima (Sweet Spot)" />
            <div className="w-[15%] bg-amber-300" title="Risco Elevado" />
            <div className="w-[20%] bg-red-400" title="Zona de Risco de Sobrecarga" />

            {/* Marcador da Razão Atual */}
            <div
              className="absolute top-0 bottom-0 w-1.5 bg-grafite border-x border-white shadow"
              style={{
                left: `${Math.min(98, Math.max(2, (acwrResult.acwr / 2.0) * 100))}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Indicadores Fisiológicos Complementares: Monotonia, Strain, Dias Consecutivos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg border border-line bg-surface p-5 flex flex-col justify-between shadow-xs">
          <div>
            <span className="t-label">Monotonia da Carga</span>
            <h4 className="t-data text-2xl font-bold mt-1">{acwrResult.monotony}</h4>
          </div>
          <p className="text-[11px] text-muted mt-2">
            Relação média/desvio nos 7 dias. Valores &gt; 2.0 indicam ausência de variação e risco de estagnação.
          </p>
        </div>

        <div className="rounded-lg border border-line bg-surface p-5 flex flex-col justify-between shadow-xs">
          <div>
            <span className="t-label">Tensão Semanal (Strain)</span>
            <h4 className="t-data text-2xl font-bold mt-1 text-profundo">
              {acwrResult.strain.toLocaleString("pt-BR")}
            </h4>
          </div>
          <p className="text-[11px] text-muted mt-2">
            Índice de estresse biológico ponderado (Carga Semanal × Monotonia).
          </p>
        </div>

        <div className="rounded-lg border border-line bg-surface p-5 flex flex-col justify-between shadow-xs">
          <div>
            <span className="t-label">Dias Consecutivos</span>
            <h4 className="t-data text-2xl font-bold mt-1">{consecutiveDays} dias</h4>
          </div>
          <p className="text-[11px] text-muted mt-2">
            Sessões registradas sem descanso ativo nos últimos dias.
          </p>
        </div>

        <div className="rounded-lg border border-line bg-surface p-5 flex flex-col justify-between shadow-xs">
          <div>
            <span className="t-label">RPE Médio da Semana</span>
            <h4 className="t-data text-2xl font-bold mt-1">RPE {averageRpe}</h4>
          </div>
          <p className="text-[11px] text-muted mt-2">
            Percepção subjetiva média de esforço na escala Foster (1 a 10).
          </p>
        </div>
      </div>

      {/* Gráfico Diário de Carga (Últimos 7 dias) */}
      <div className="rounded-lg border border-line bg-surface p-6 shadow-xs flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="t-label">Distribuição Temporal</span>
            <h3 className="t-h2 mt-1">Carga Diária nos Últimos 7 Dias</h3>
          </div>
          <span className="t-data text-xs text-muted font-mono">
            Total Semanal: {acwrResult.weeklyLoadTotal} UA
          </span>
        </div>

        <div className="grid grid-cols-7 gap-2 items-end h-40 pt-6">
          {last7DaysChart.map((d) => {
            const heightPercent = Math.max(8, (d.load / maxDailyLoad) * 100);
            return (
              <div key={d.date} className="flex flex-col items-center gap-2 h-full justify-end">
                <span className="t-data text-[10px] text-muted font-mono">{d.load}</span>
                <div
                  className="w-full max-w-[42px] rounded-t-md bg-profundo/80 hover:bg-profundo transition-all"
                  style={{ height: `${heightPercent}%` }}
                />
                <span className="text-[11px] font-semibold text-grafite">{d.dayName}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recomendações Explicáveis & Transparentes (XAI - §21) */}
      <div className="rounded-lg border border-line bg-surface p-6 shadow-xs flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu size={18} className="text-profundo" />
            <div>
              <span className="t-label">Transparência Algorítmica (§21)</span>
              <h3 className="t-h2 mt-0.5">Recomendações Baseadas em Evidências</h3>
            </div>
          </div>
          <span className="t-aux text-muted">Sem diagnósticos médicos</span>
        </div>

        <div className="flex flex-col gap-3">
          {recommendations.map((rec) => {
            const isRationaleOpen = expandedRationale[rec.id];

            return (
              <div
                key={rec.id}
                className="rounded-lg border border-line bg-osso/20 p-4 flex flex-col gap-2.5 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    {rec.urgency === "alert" && (
                      <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
                    )}
                    {rec.urgency === "warning" && (
                      <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                    )}
                    {rec.urgency === "info" && (
                      <ShieldCheck size={18} className="text-profundo shrink-0 mt-0.5" />
                    )}

                    <div>
                      <h4 className="font-semibold text-sm text-grafite">{rec.title}</h4>
                      <p className="text-xs text-foreground/85 mt-1 leading-relaxed">{rec.message}</p>
                      {rec.actionableStep && (
                        <p className="text-xs font-semibold text-profundo mt-1.5 flex items-center gap-1">
                          <span>→ Sugestão prática:</span>
                          <span className="font-normal text-foreground">{rec.actionableStep}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Botão de Explicabilidade Obrigatória (§21.1) */}
                <div className="border-t border-line/50 pt-2 flex flex-col">
                  <button
                    onClick={() => toggleRationale(rec.id)}
                    className="text-[11px] text-muted hover:text-grafite flex items-center gap-1 cursor-pointer font-medium self-start"
                  >
                    <HelpCircle size={12} />
                    <span>Por que estou vendo esta recomendação?</span>
                    {isRationaleOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>

                  {isRationaleOpen && (
                    <div className="mt-2 p-3 rounded-md bg-surface border border-line text-[11px] text-muted leading-relaxed font-mono">
                      {rec.scientificRationale}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}