"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { EvolutionData } from "@/actions/evolution";
import { WEEKDAYS_MONDAY_FIRST } from "@/lib/week";
import { ExerciseLink } from "@/components/catalog/exercise-link";
import { DailyDecisionCard } from "@/components/home/daily-decision-card";
import {
  Activity,
  Award,
  Calendar,
  ChevronDown,
  ChevronUp,
  Cpu,
  Download,
  Dumbbell,
  Flame,
  HelpCircle,
  Info,
  ShieldCheck,
  AlertTriangle,
  Smartphone,
  TrendingUp,
} from "lucide-react";

export type EvolutionTab = "hoje" | "carga" | "forca" | "consistencia";

const TABS: { id: EvolutionTab; label: string; icon: typeof Activity }[] = [
  { id: "hoje", label: "Hoje", icon: Activity },
  { id: "carga", label: "Carga", icon: TrendingUp },
  { id: "forca", label: "Força", icon: Award },
  { id: "consistencia", label: "Consistência", icon: Calendar },
];

type PeriodKey = "week" | "month" | "quarter" | "year";
const PERIOD_DAYS: Record<PeriodKey, number> = {
  week: 7,
  month: 30,
  quarter: 90,
  year: 365,
};

function formatVolume(kg: number): string {
  if (kg >= 1000) {
    return `${(kg / 1000).toLocaleString("pt-BR", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })} t`;
  }
  return `${kg.toLocaleString("pt-BR")} kg`;
}

function AcwrRing({
  acwr,
  status,
  statusLabel,
}: {
  acwr: number;
  status: string;
  statusLabel: string;
}) {
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const ratioNorm = Math.min(1, Math.max(0, acwr / 2.0));
  const strokeDashoffset = circumference * (1 - ratioNorm);

  const strokeColor =
    status === "sweet_spot"
      ? "var(--lima)"
      : status === "danger_zone"
        ? "#e57373"
        : status === "elevated_risk"
          ? "#e0b354"
          : "var(--mineral)";

  return (
    <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
      <svg
        viewBox="0 0 140 140"
        className="w-full h-full -rotate-90"
        role="img"
        aria-label={`ACWR ${acwr.toFixed(2)} — ${statusLabel}`}
      >
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          className="text-white/10"
        />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: "stroke-dashoffset 500ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="t-data text-3xl font-semibold text-osso leading-none">
          {acwr.toFixed(2)}
        </span>
        <span className="text-[10px] font-mono uppercase tracking-wider text-nevoa mt-1">
          7d / 28d
        </span>
      </div>
    </div>
  );
}

export function EvolutionHub({
  data,
  initialTab = "hoje",
}: {
  data: EvolutionData;
  initialTab?: EvolutionTab;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<EvolutionTab>(initialTab);
  const [period, setPeriod] = useState<PeriodKey>("month");
  const [expandedRationale, setExpandedRationale] = useState<
    Record<string, boolean>
  >({});
  const [hoveredDay, setHoveredDay] = useState<
    EvolutionData["last28DaysChart"][number] | null
  >(null);

  const {
    acwrResult,
    recoveryBudget,
    adaptiveProfile,
    dailyDecision,
    todayCheckin,
    recommendations,
    metrics,
  } = data;
  const headlineRec = recommendations[0];

  const handleTabChange = (tab: EvolutionTab) => {
    setActiveTab(tab);
    router.replace(`/evolucao?tab=${tab}`, { scroll: false });
  };

  const now = new Date();
  const cutoffDate = new Date(now);
  cutoffDate.setDate(now.getDate() - PERIOD_DAYS[period]);
  const filteredWorkouts = data.recentWorkouts.filter(
    (w) => new Date(w.startedAt) >= cutoffDate
  );

  const handleExportCsv = () => {
    const rows = (
      filteredWorkouts.length > 0 ? filteredWorkouts : data.recentWorkouts
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
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute(
      "download",
      `selye_evolucao_${period}_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const max28Load = Math.max(
    1,
    acwrResult.chronicLoad,
    ...data.last28DaysChart.map((d) => d.load)
  );
  const chronicLineY =
    acwrResult.chronicLoad > 0
      ? Math.max(8, 100 - Math.round((acwrResult.chronicLoad / max28Load) * 90))
      : 92;

  return (
    <div className="flex flex-col gap-6 fade-up">
      {/* Cabeçalho Unificado */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="t-label">Fisiologia & Dados Pessoais</span>
          <h1 className="t-h1 mt-1">Evolução</h1>
          <p className="text-muted text-sm mt-1">
            Prontidão diária, carga adaptativa, força aplicada e constância em um único painel.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Link href="/integracoes" className="btn btn-ghost h-9 px-3 text-xs">
            <Smartphone size={14} />
            <span>Dispositivos</span>
          </Link>
          <button
            type="button"
            onClick={handleExportCsv}
            className="btn btn-ghost h-9 px-3 text-xs font-mono"
            title="Exportar histórico em CSV"
          >
            <Download size={14} />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Abas de Navegação Interna */}
      <div
        role="tablist"
        aria-label="Seções de Evolução"
        className="card p-1.5 flex items-center gap-1 overflow-x-auto no-scrollbar"
      >
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => handleTabChange(t.id)}
              className={`h-9 px-4 rounded-lg text-xs font-mono font-semibold flex items-center gap-2 shrink-0 transition-colors cursor-pointer ${
                active
                  ? "bg-foreground text-background"
                  : "text-muted hover:text-foreground hover:bg-foreground/5"
              }`}
            >
              <Icon size={14} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ================= ABA 1: HOJE (PRONTIDÃO & ACWR EM BENTO) ================= */}
      {activeTab === "hoje" && (
        <div className="flex flex-col gap-5">
          {/* Decisão do Dia + Check-in Matinal + Motor ML (Fase 12 & 14) */}
          <DailyDecisionCard
            decision={dailyDecision}
            initialCheckin={todayCheckin}
            adaptiveProfile={adaptiveProfile}
          />

          <div className="bento-grid">
            {/* Hero ACWR Ring + Ação Direta */}
            <section className="col-span-12 xl:col-span-7 surface-hero p-6 sm:p-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 min-w-0">
                <AcwrRing
                  acwr={acwrResult.acwr}
                  status={acwrResult.status}
                  statusLabel={acwrResult.statusLabel}
                />

                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {acwrResult.statusLabel.toLowerCase() !== "início de ciclo" && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-lima text-grafite">
                        {acwrResult.statusLabel}
                      </span>
                    )}
                    <span className="t-data text-xs text-nevoa">
                      Ideal {acwrResult.sweetSpotMin}–{acwrResult.sweetSpotMax}
                    </span>
                    <span className="t-data text-xs text-nevoa">
                      · {data.calibrationSessionsCount}{" "}
                      {data.calibrationSessionsCount === 1
                        ? "sessão (28d)"
                        : "sessões (28d)"}
                    </span>
                  </div>

                  <h2 className="t-h2 !text-osso">
                    {headlineRec?.title || "Calibração em andamento"}
                  </h2>
                  <p className="text-sm text-nevoa leading-relaxed">
                    {headlineRec?.actionableStep ||
                      headlineRec?.message ||
                      "Registre suas próximas sessões para liberar recomendações personalizadas de carga."}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 w-full md:w-auto md:min-w-[200px] shrink-0">
                <div className="p-3 rounded-xl bg-white/6 border border-white/10">
                  <span className="t-label !text-nevoa block">Esta Semana (7d)</span>
                  <p className="t-data text-lg text-osso mt-1">
                    {acwrResult.acuteLoad}{" "}
                    <span className="text-[11px] text-nevoa">EA</span>
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-white/6 border border-white/10">
                  <span className="t-label !text-nevoa block">Média Mensal (28d)</span>
                  <p className="t-data text-lg text-osso mt-1">
                    {acwrResult.chronicLoad}{" "}
                    <span className="text-[11px] text-nevoa">EA</span>
                  </p>
                </div>
              </div>
            </section>

            {/* Indicadores Fisiológicos 2×2 ao lado do Hero em telas largas */}
            <section className="col-span-12 xl:col-span-5 grid grid-cols-2 gap-3">
              <div className="card p-4 flex flex-col justify-between gap-2" title="Indica se seus dias estão variados ou repetitivos">
                <span className="t-label">Variedade da Rotina</span>
                <p className="t-data text-2xl text-foreground">
                  {acwrResult.monotony}
                </p>
                <span className="t-aux text-muted">Ideal &lt; 2,0 (variar estímulos)</span>
              </div>

              <div className="card p-4 flex flex-col justify-between gap-2" title="Desgaste total acumulado na semana">
                <span className="t-label">Desgaste Semanal</span>
                <p className="t-data text-2xl text-accent-text">
                  {acwrResult.strain.toLocaleString("pt-BR")}
                </p>
                <span className="t-aux text-muted">Esforço acumulado na semana</span>
              </div>

              <div className="card p-4 flex flex-col justify-between gap-2">
                <span className="t-label">Intensidade Média (7d)</span>
                <p className="t-data text-2xl text-foreground">
                  {data.averageRpe > 0 ? `Nota ${data.averageRpe}/10` : "—"}
                </p>
                <span className="t-aux text-muted">Percepção de esforço (1 a 10)</span>
              </div>

              <div className="card p-4 flex flex-col justify-between gap-2">
                <span className="t-label">Sequência Ativa</span>
                <p className="t-data text-2xl text-foreground">
                  {data.consecutiveDays}{" "}
                  <span className="text-xs font-sans text-muted">
                    {data.consecutiveDays === 1 ? "dia" : "dias"}
                  </span>
                </p>
                <span className="t-aux text-muted">Sem pausa intercalada</span>
              </div>
            </section>
          </div>

          {/* Reserva de Energia Adaptativa Pessoal (EA) */}
          <section className="card p-5 sm:p-6 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div>
                <span className="t-label !text-accent-text">
                  Fisiologia Personalizada · Energia Adaptativa (EA)
                </span>
                <h2 className="t-h2 mt-0.5">
                  Reserva Adaptativa Pessoal (Balanço Bidirecional 7d)
                </h2>
                <p className="text-xs text-muted mt-1">
                  O Selye acompanha sua curva de recuperação ({adaptiveProfile.recoveryVelocityMultiplier.toFixed(2)}×) e contabiliza tanto o consumo dos treinos (<strong>-EA</strong>) quanto a recarga dos hábitos regenerativos (<strong>+EA</strong>).
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold bg-foreground/8 text-foreground">
                  {adaptiveProfile.learningStageLabel}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold bg-lima text-grafite">
                  {recoveryBudget.budgetStatusLabel}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-xl border border-line p-4 bg-foreground/[0.02]">
                <span className="t-label">Capacidade Pessoal</span>
                <p className="t-data text-2xl font-semibold text-foreground mt-1">
                  {adaptiveProfile.personalCapacityEa.toLocaleString("pt-BR")}{" "}
                  <span className="text-xs font-mono text-muted">EA</span>
                </p>
                <span className="t-aux text-muted">
                  Teto semanal calibrado ao seu perfil
                </span>
              </div>

              <div className="rounded-xl border border-line p-4 bg-foreground/[0.02]">
                <span className="t-label">Consumo Bruto (7d)</span>
                <p className="t-data text-2xl font-semibold text-foreground mt-1">
                  -{adaptiveProfile.trainingDrainEa.toLocaleString("pt-BR")}{" "}
                  <span className="text-xs font-mono text-muted">EA</span>
                </p>
                <span className="t-aux text-muted">
                  Treinos, jogos e desgaste acumulado
                </span>
              </div>

              <div className="rounded-xl border border-lima/50 p-4 bg-lima/10">
                <span className="t-label !text-accent-text">Recarga Biológica (+EA)</span>
                <p className="t-data text-2xl font-semibold text-accent-text mt-1">
                  +{adaptiveProfile.recoveryRechargeEa.toLocaleString("pt-BR")}{" "}
                  <span className="text-xs font-mono text-muted">EA</span>
                </p>
                <span className="t-aux text-muted">
                  Sono restaurador, mobilidade e supercompensação
                </span>
              </div>

              <div className="rounded-xl border border-line p-4 bg-foreground/[0.02]">
                <span className="t-label">Reserva Adaptativa Livre</span>
                <p className="t-data text-2xl font-semibold text-foreground mt-1">
                  {adaptiveProfile.availableReserveEa.toLocaleString("pt-BR")}{" "}
                  <span className="text-xs font-mono text-muted">EA</span>
                </p>
                <span className="t-aux text-muted">
                  {adaptiveProfile.reservePercent}% de reserva disponível hoje
                </span>
              </div>
            </div>

            {/* Barra de Reserva Adaptativa */}
            <div className="flex flex-col gap-1.5">
              <div className="w-full h-3 rounded-full bg-foreground/10 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    recoveryBudget.budgetStatus === "exceeded"
                      ? "bg-[#e57373]"
                      : recoveryBudget.budgetStatus === "near_limit"
                        ? "bg-[#e0b354]"
                        : "bg-lima"
                  }`}
                  style={{
                    width: `${Math.min(100, Math.max(6, adaptiveProfile.reservePercent))}%`,
                  }}
                />
              </div>
            </div>

            {/* Traços Fisiológicos Identificados no Perfil */}
            {adaptiveProfile.learnedTraits.length > 0 && (
              <div className="pt-2 border-t border-line flex flex-col gap-2.5">
                <span className="t-label">
                  Leitura Fisiológica do seu Ritmo
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  {adaptiveProfile.learnedTraits.map((trait) => (
                    <div
                      key={trait.id}
                      className="rounded-xl border border-line p-3.5 bg-surface flex flex-col gap-1"
                    >
                      <span className="text-xs font-semibold text-foreground">
                        {trait.labelPt}
                      </span>
                      <p className="text-[11px] text-muted leading-relaxed">
                        {trait.detailPt}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Distribuição do Esforço por Modalidade */}
            {recoveryBudget.modalitiesBreakdown.length > 0 && (
              <div className="pt-2 border-t border-line flex flex-col gap-2.5">
                <span className="t-label">
                  Distribuição do Esforço por Modalidade (Últimos 7 dias)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {recoveryBudget.modalitiesBreakdown.map((mod) => (
                    <div
                      key={mod.modalityCode}
                      className="rounded-xl border border-line p-3.5 bg-surface flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {mod.labelPt}
                        </p>
                        <p className="t-aux text-muted">
                          {mod.sessionsCount}{" "}
                          {mod.sessionsCount === 1 ? "sessão" : "sessões"} ·{" "}
                          {mod.totalMinutes} min · Fator {mod.factor.toFixed(2)}×
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="t-data text-sm font-semibold text-foreground">
                          -{mod.totalLoadUa} EA
                        </p>
                        <span className="text-[11px] font-mono text-accent-text">
                          {mod.sharePercent}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Recomendações Explicáveis em grade 2 colunas no desktop */}
          <section className="card p-5 sm:p-6 flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-lima/25 text-foreground flex items-center justify-center shrink-0">
                  <Cpu size={16} />
                </div>
                <div>
                  <span className="t-label">Orientação Explicável (Tendência 7d vs 28d)</span>
                  <h2 className="t-h3">Ajustes Recomendados</h2>
                </div>
              </div>
              <span className="chip text-[11px]">
                Indicador contextual de carga · Não prevê lesões nem substitui avaliação clínica
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {recommendations.map((rec) => {
                const open = Boolean(expandedRationale[rec.id]);
                return (
                  <article
                    key={rec.id}
                    className={`rounded-xl border p-4 flex flex-col gap-2.5 ${
                      rec.urgency === "alert"
                        ? "border-profundo bg-lima/15"
                        : "border-line bg-foreground/[0.02]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0 text-accent-text">
                        {rec.urgency === "info" ? (
                          <ShieldCheck size={17} />
                        ) : (
                          <AlertTriangle size={17} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-sm text-foreground">
                          {rec.title}
                        </h3>
                        <p className="text-xs text-muted mt-1 leading-relaxed">
                          {rec.message}
                        </p>
                        {rec.actionableStep && (
                          <p className="text-xs font-medium text-foreground mt-2">
                            Ação sugerida: {rec.actionableStep}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-line/60 pt-2">
                      <button
                        type="button"
                        aria-expanded={open}
                        onClick={() =>
                          setExpandedRationale((prev) => ({
                            ...prev,
                            [rec.id]: !prev[rec.id],
                          }))
                        }
                        className="text-xs text-muted hover:text-foreground inline-flex items-center gap-1.5 font-mono cursor-pointer"
                      >
                        <HelpCircle size={13} />
                        <span>Base fisiológica</span>
                        {open ? (
                          <ChevronUp size={13} />
                        ) : (
                          <ChevronDown size={13} />
                        )}
                      </button>
                      {open && (
                        <p className="mt-2 p-3 rounded-lg bg-surface border border-line text-xs text-muted font-mono leading-relaxed">
                          {rec.scientificRationale}
                        </p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {/* ================= ABA 2: CARGA (GRÁFICO 28 DIAS + HISTÓRICO LADO A LADO) ================= */}
      {activeTab === "carga" && (
        <div className="bento-grid items-start">
          <section className="col-span-12 xl:col-span-7 card p-5 sm:p-6 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
              <div>
                <span className="t-label">Série Temporal (28 dias)</span>
                <h2 className="t-h2 mt-0.5">Carga Diária vs Média Crônica</h2>
              </div>
              <div className="t-data text-xs text-muted">
                {hoveredDay ? (
                  <span className="text-foreground font-semibold">
                    {hoveredDay.dayName} {hoveredDay.shortDate}:{" "}
                    {hoveredDay.load} EA
                  </span>
                ) : (
                  <span>
                    Acumulado 7d: {acwrResult.weeklyLoadTotal} EA · Média 28d:{" "}
                    {acwrResult.chronicLoad} EA
                  </span>
                )}
              </div>
            </div>

            {/* Gráfico SVG Responsivo de 28 dias */}
            <div className="w-full pt-2">
              <svg
                viewBox="0 0 560 140"
                className="w-full h-44 overflow-visible"
                role="img"
                aria-label="Gráfico de carga diária nos últimos 28 dias"
              >
                {/* Linha tracejada da média crônica */}
                <line
                  x1="0"
                  x2="560"
                  y1={chronicLineY}
                  y2={chronicLineY}
                  stroke="var(--mineral)"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  opacity="0.7"
                />

                {data.last28DaysChart.map((d, idx) => {
                  const barW = 14;
                  const gap = 6;
                  const x = idx * (barW + gap);
                  const h =
                    d.load > 0
                      ? Math.max(8, Math.round((d.load / max28Load) * 95))
                      : 4;
                  const y = 110 - h;
                  const isLast7 = idx >= 21;
                  const isToday = idx === 27;

                  return (
                    <g
                      key={d.date}
                      onMouseEnter={() => setHoveredDay(d)}
                      onMouseLeave={() => setHoveredDay(null)}
                      className="cursor-pointer"
                    >
                      <rect
                        x={x}
                        y={y}
                        width={barW}
                        height={h}
                        rx="3"
                        fill={
                          d.load === 0
                            ? "color-mix(in srgb, var(--foreground) 12%, transparent)"
                            : isToday
                              ? "var(--lima)"
                              : isLast7
                                ? "var(--profundo)"
                                : "var(--mineral)"
                        }
                      />
                      {(idx % 7 === 0 || idx === 27) && (
                        <text
                          x={x + barW / 2}
                          y="130"
                          textAnchor="middle"
                          className="fill-muted text-[9px] font-mono"
                        >
                          {d.shortDate}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          </section>

          {/* Sessões no Período */}
          <section className="col-span-12 xl:col-span-5 card p-5 sm:p-6 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="t-label">Registro de Sessões</span>
                <h2 className="t-h3 mt-0.5">
                  Histórico ({filteredWorkouts.length})
                </h2>
              </div>

              <div
                role="group"
                aria-label="Filtrar período"
                className="flex bg-background border border-line rounded-lg p-1 self-start"
              >
                {(
                  [
                    { id: "week", label: "7d" },
                    { id: "month", label: "30d" },
                    { id: "quarter", label: "90d" },
                    { id: "year", label: "1a" },
                  ] as const
                ).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={period === p.id}
                    onClick={() => setPeriod(p.id)}
                    className={`px-3 py-1 rounded-md text-xs font-mono font-semibold cursor-pointer ${
                      period === p.id
                        ? "bg-foreground text-background"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredWorkouts.length === 0 ? (
              <p className="text-sm text-muted py-6 text-center">
                Nenhuma sessão concluída neste período.
              </p>
            ) : (
              <div className="divide-y divide-line">
                {filteredWorkouts.slice(0, 15).map((w) => (
                  <div
                    key={w.id}
                    className="py-3 flex items-center justify-between gap-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">
                        {w.title}
                      </p>
                      <p className="t-aux text-muted">
                        {w.modalityLabel} · RPE {w.rpeSession || 8}/10 ·{" "}
                        <span className="font-mono text-accent-text font-semibold">
                          -{w.loadUa} EA
                        </span>
                      </p>
                    </div>
                    <span className="t-data text-xs text-muted shrink-0">
                      {new Date(w.finishedAt || w.startedAt).toLocaleDateString(
                        "pt-BR"
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ================= ABA 3: FORÇA (VOLUME & PRS LADO A LADO) ================= */}
      {activeTab === "forca" && (
        <div className="bento-grid items-start">
          <section className="col-span-12 xl:col-span-4 grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-1 gap-3">
            <div className="card p-5">
              <span className="t-label">Volume (Últimos 28d)</span>
              <p className="t-data text-2xl mt-1 text-foreground">
                {formatVolume(metrics.monthlyVolumeKg)}
              </p>
              <span className="t-aux text-muted mt-1 block">
                Tonelagem efetiva do ciclo
              </span>
            </div>
            <div className="card p-5">
              <span className="t-label">Volume Acumulado Total</span>
              <p className="t-data text-2xl mt-1 text-foreground">
                {formatVolume(metrics.totalVolumeKg)}
              </p>
              <span className="t-aux text-muted mt-1 block">
                Todas as séries registradas
              </span>
            </div>
            <div className="card p-5">
              <span className="t-label">Recordes Mapeados</span>
              <p className="t-data text-2xl mt-1 text-accent-text">
                {data.personalRecords.length}
              </p>
              <span className="t-aux text-muted mt-1 block">
                Movimentos com carga máxima
              </span>
            </div>
          </section>

          <section className="col-span-12 xl:col-span-8 card p-5 sm:p-6 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div>
                <span className="t-label !text-accent-text">Força Aplicada</span>
                <h2 className="t-h2 mt-0.5">Recordes Pessoais por Movimento</h2>
              </div>
              <Award size={20} className="text-accent-text" />
            </div>

            {data.personalRecords.length === 0 ? (
              <div className="py-10 border border-dashed border-line rounded-xl text-center flex flex-col items-center gap-2">
                <Dumbbell size={26} className="text-muted/60" />
                <p className="text-sm font-medium text-foreground">
                  Nenhum recorde de carga registrado ainda
                </p>
                <p className="text-xs text-muted max-w-sm">
                  Conclua uma sessão registrando suas cargas para mapear seus recordes automaticamente.
                </p>
                <Link href="/" className="btn btn-primary h-9 px-4 text-xs mt-2">
                  Iniciar Treino
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.personalRecords.map((pr) => (
                  <div
                    key={pr.exerciseId}
                    className="rounded-xl border border-line p-4 bg-foreground/[0.02] flex flex-col justify-between gap-3"
                  >
                    <div>
                      <span className="t-label">Carga Máxima</span>
                      <h3 className="font-semibold text-sm text-foreground mt-1">
                        <ExerciseLink
                          exerciseId={pr.exerciseId}
                          className="inline-flex items-center gap-1"
                        >
                          <span>{pr.exerciseName}</span>
                          <Info size={12} className="text-muted shrink-0" />
                        </ExerciseLink>
                      </h3>
                      <p className="t-data text-2xl text-foreground font-semibold mt-2">
                        {pr.maxLoadKg} kg
                      </p>
                      <p className="t-aux text-muted">{pr.reps} repetições</p>
                    </div>
                    <p className="t-data text-[11px] text-muted border-t border-line pt-2">
                      Em {pr.date}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ================= ABA 4: CONSISTÊNCIA (HEATMAP + KPIS LADO A LADO) ================= */}
      {activeTab === "consistencia" && (
        <div className="bento-grid items-start">
          <section className="col-span-12 xl:col-span-5 grid grid-cols-2 gap-3">
            <div className="card p-4">
              <span className="t-label">Adesão (28d)</span>
              <p className="t-data text-2xl mt-1 text-foreground">
                {metrics.weeklyAdherence}%
              </p>
              <span className="t-aux text-muted">
                {metrics.activeDaysLast28}/{metrics.targetDaysLast28} dias
              </span>
            </div>
            <div className="card p-4">
              <span className="t-label">Streak Atual</span>
              <p className="t-data text-2xl mt-1 text-foreground flex items-center gap-1.5">
                <Flame size={18} className="text-accent-text" />
                {metrics.currentWeeklyStreak} sem.
              </p>
              <span className="t-aux text-muted">
                Recorde: {metrics.bestWeeklyStreak} sem.
              </span>
            </div>
            <div className="card p-4">
              <span className="t-label">Dias Ativos no Ano</span>
              <p className="t-data text-2xl mt-1 text-accent-text">
                {metrics.activeDaysInYear}
              </p>
              <span className="t-aux text-muted">Ano corrente</span>
            </div>
            <div className="card p-4">
              <span className="t-label">Meta Semanal</span>
              <p className="t-data text-2xl mt-1 text-foreground">
                {metrics.targetDaysPerWeek}×/sem
              </p>
              <span className="t-aux text-muted">
                {metrics.totalWorkouts} sessões totais
              </span>
            </div>
          </section>

          <section className="col-span-12 xl:col-span-7 card p-5 sm:p-6 flex flex-col gap-4">
            <div>
              <span className="t-label">Calendário Biológico (Seg → Dom)</span>
              <h2 className="t-h2 mt-0.5">Mapa de Constância (5 Semanas)</h2>
            </div>

            {/* Cabeçalho fixo Seg → Dom */}
            <div className="grid grid-cols-7 gap-2 text-center">
              {WEEKDAYS_MONDAY_FIRST.map((w) => (
                <span key={w.shortPt} className="t-label text-[10px]">
                  {w.shortPt}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {data.heatmapDays.map((day) => (
                <div
                  key={day.date}
                  title={`${day.weekdayShort} ${new Date(
                    day.date + "T12:00:00Z"
                  ).toLocaleDateString("pt-BR")}: ${
                    day.active
                      ? "Treino registrado"
                      : day.isFuture
                        ? "Próximo dia"
                        : "Recuperação / Descanso"
                  }`}
                  className={`h-10 rounded-lg flex items-center justify-center t-data text-xs transition-colors ${
                    day.active
                      ? "bg-lima text-grafite font-semibold"
                      : day.isFuture
                        ? "border border-dashed border-line/60 text-muted/40"
                        : "bg-foreground/[0.04] border border-line text-muted"
                  } ${day.isToday ? "ring-2 ring-profundo ring-offset-1" : ""}`}
                >
                  {String(day.dayNumber).padStart(2, "0")}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-5 text-xs font-mono text-muted pt-3 border-t border-line">
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-lima inline-block" />
                <span>Sessão concluída</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-foreground/[0.04] border border-line inline-block" />
                <span>Recuperação</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded ring-2 ring-profundo inline-block" />
                <span>Hoje</span>
              </span>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
