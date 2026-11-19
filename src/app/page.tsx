import { Suspense } from "react";
import Link from "next/link";
import { ArrowUpRight, History } from "lucide-react";
import { Navbar } from "@/components/navigation/navbar";
import { getDashboardData } from "@/actions/workout";
import { getActivePlanningSnapshot } from "@/actions/planning";
import { WorkoutRunner } from "@/components/workout/workout-runner";
import { DailyQuoteCard } from "@/components/home/daily-quote-card";
import { MetricsSwitcherCard } from "@/components/home/metrics-switcher-card";
import { DailyDecisionCard } from "@/components/home/daily-decision-card";
import { WelcomeAutonomyGuide } from "@/components/home/welcome-autonomy-guide";
import { TodayPlanWidget } from "@/components/home/today-plan-widget";

export const instant = false;

async function DashboardContent() {
  const [data, planningSnapshot] = await Promise.all([
    getDashboardData(),
    getActivePlanningSnapshot(),
  ]);
  const { stats, dailyEditorial, performanceSummary } = data;
  const {
    acwrResult,
    recoveryBudget,
    adaptiveProfile,
    dailyDecision,
    todayCheckin,
    headlineRecommendation,
    last7DaysChart,
  } = performanceSummary;
  const maxLoad = Math.max(1, ...last7DaysChart.map((d) => d.load));
  const reservePct = Math.min(100, Math.max(6, adaptiveProfile.reservePercent));

  return (
    <div className="flex flex-col gap-6 sm:gap-7">
      {/* GUIA DE AUTONOMIA EM 3 PASSOS (Para iniciantes e novos usuários) */}
      <WelcomeAutonomyGuide
        totalCompletedWorkouts={stats.totalCompletedWorkouts}
      />

      {/* 1. HIERARQUIA PRIMÁRIA: DECISÃO DO DIA + RESERVA ADAPTATIVA + CHECK-IN */}
      <div className="stagger-1">
        <DailyDecisionCard
          decision={dailyDecision}
          initialCheckin={todayCheckin}
          adaptiveProfile={adaptiveProfile}
        />
      </div>

      {/* 2. HIERARQUIA SECUNDÁRIA (BENTO 12 COLS): Nota do Dia (6) + Ritmo da Semana (3) + Pulso Semanal (3) */}
      <div className="bento-grid stagger-2">
        <DailyQuoteCard
          editorial={dailyEditorial}
          activeDaysInYear={stats.activeDaysInYear}
        />

        {/* Widget 2: Equilíbrio do Ritmo (7 dias vs 28 dias) */}
        <Link
          href="/evolucao"
          className="col-span-12 sm:col-span-6 lg:col-span-5 xl:col-span-3 card card-interactive p-5 sm:p-6 flex flex-col justify-between gap-4 group"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="t-label">Ritmo da Semana vs Mês</span>
              <p className="t-data text-3xl font-bold mt-1.5 text-foreground tracking-tight">
                {acwrResult.acwr.toFixed(2)}
              </p>
              <span className="text-[10px] font-mono text-muted block mt-0.5">
                Ideal entre 0.80 e 1.30 (evolução segura)
              </span>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              {acwrResult.statusLabel.toLowerCase() !== "início de ciclo" && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-lima text-grafite">
                  {acwrResult.statusLabel}
                </span>
              )}
              <ArrowUpRight
                size={16}
                className="text-muted group-hover:text-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all"
              />
            </div>
          </div>

          <p className="text-xs text-muted leading-relaxed line-clamp-2">
            {headlineRecommendation
              ? headlineRecommendation.actionableStep ||
                headlineRecommendation.message
              : "Compara seu esforço desta semana com o seu costume mensal para evitar cansaço excessivo."}
          </p>

          {/* Reserva de Energia Adaptativa Pessoal (Balanço Bidirecional: -EA / +EA) */}
          <div className="flex flex-col gap-1.5 pt-3 border-t border-line/70">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-muted" title="Sua bateria semanal de energia do corpo">
                Bateria do Corpo (Reserva)
              </span>
              <span className="text-foreground font-semibold">
                {adaptiveProfile.availableReserveEa} / {adaptiveProfile.personalCapacityEa} EA
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-foreground/10 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  recoveryBudget.budgetStatus === "exceeded"
                    ? "bg-[#e57373]"
                    : recoveryBudget.budgetStatus === "near_limit"
                      ? "bg-[#e0b354]"
                      : "bg-lima"
                }`}
                style={{ width: `${reservePct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-muted">
              <span>Consumo: -{adaptiveProfile.trainingDrainEa} EA</span>
              <span className="text-accent-text font-semibold">
                Recarga: +{adaptiveProfile.recoveryRechargeEa} EA
              </span>
            </div>
          </div>

          <div
            className="grid grid-cols-7 gap-1.5 items-end h-12 pt-1.5"
            aria-label="Energia Adaptativa dos últimos 7 dias"
          >
            {last7DaysChart.map((d, i) => {
              const isToday = i === last7DaysChart.length - 1;
              const h = d.load > 0 ? Math.max(16, (d.load / maxLoad) * 100) : 8;
              return (
                <div
                  key={d.date}
                  className="flex flex-col items-center gap-1 h-full justify-end min-w-0"
                  title={`${d.dayName}: ${d.load} EA`}
                >
                  <div
                    className={`w-full rounded-sm transition-all duration-300 ${
                      d.load > 0
                        ? isToday
                          ? "bg-lima shadow-[0_0_8px_rgba(199,227,91,0.5)]"
                          : "bg-profundo"
                        : "bg-foreground/10"
                    }`}
                    style={{ height: `${h}%` }}
                  />
                  <span className="text-[9px] font-mono text-muted leading-none">
                    {d.dayName.charAt(0)}
                  </span>
                </div>
              );
            })}
          </div>
        </Link>

        {/* Widget 3: Box Único Unificado (Frequência · Volume · Sessões com Chave de Alternância) */}
        <MetricsSwitcherCard stats={stats} />
      </div>

      {/* 3. SEU PASSO DE HOJE NO CALENDÁRIO ENERGÉTICO (Fase 20) */}
      <div className="stagger-3">
        <TodayPlanWidget snapshot={planningSnapshot} />
      </div>

      {/* 4. EXECUÇÃO (BENTO 8 + 4): Treino / Fichas do Dia + Atividades Recentes */}
      <div className="bento-grid items-start stagger-4">
        <section className="col-span-12 xl:col-span-8 flex flex-col gap-3">
          <div>
            <span className="t-label">Treino ou Atividade de Hoje</span>
            <h2 className="t-h2 mt-0.5">
              {data.activeSession
                ? "Sessão em andamento"
                : "Escolha uma ficha abaixo para começar"}
            </h2>
          </div>

          <WorkoutRunner
            initialSession={data.activeSession}
            sessionExercises={data.activeSessionExercises}
            routines={data.routines.map((r) => ({
              id: r.id,
              title: r.title,
              modalityCode: r.modalityCode,
              templates: r.templates?.map((t) => ({
                dayOfWeek: t.dayOfWeek,
                prescriptions: t.prescriptions.map((p) => ({ id: p.id })),
              })),
            }))}
          />
        </section>

        {/* Coluna lateral direita: Últimos Treinos & Atividades */}
        <aside className="col-span-12 xl:col-span-4 card p-5 flex flex-col gap-3.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <History size={15} className="text-accent-text shrink-0" />
              <h2 className="t-h3">Últimas Atividades</h2>
            </div>
            <Link
              href="/evolucao?tab=carga"
              className="t-aux text-accent-text hover:underline shrink-0"
            >
              Ver histórico
            </Link>
          </div>

          {data.recentSessions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line p-5 text-center space-y-1.5">
              <p className="text-xs font-medium text-foreground">
                Nenhuma atividade concluída ainda
              </p>
              <p className="text-xs text-muted">
                Inicie uma ficha ao lado ou clique em <strong>Registrar Atividade</strong> para marcar corrida, pedal, futsal ou qualquer treino.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-line">
              {data.recentSessions.map((s) => (
                <div
                  key={s.id}
                  className="py-3 first:pt-1 last:pb-0 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-xs sm:text-sm truncate text-foreground">
                      {s.title}
                    </p>
                    <p className="t-aux text-muted mt-0.5">
                      {s.modalityLabel} · Esforço {s.rpeSession || 8}/10 ·{" "}
                      <span className="font-mono text-accent-text font-semibold" title="Energia do corpo utilizada na atividade">
                        -{s.loadUa} EA
                      </span>
                    </p>
                  </div>
                  <span className="t-data text-[11px] text-muted shrink-0">
                    {new Date(s.finishedAt || s.startedAt).toLocaleDateString(
                      "pt-BR",
                      { day: "2-digit", month: "short" }
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pb-24">
      <Navbar />

      <main className="selye-container py-7 sm:py-9 flex-1">
        <Suspense
          fallback={
            <div className="flex flex-col gap-5" aria-busy="true">
              <div className="bento-grid">
                <div className="skeleton col-span-12 lg:col-span-7 xl:col-span-6 h-56" />
                <div className="skeleton col-span-12 sm:col-span-6 lg:col-span-5 xl:col-span-3 h-56" />
                <div className="skeleton col-span-12 sm:col-span-6 lg:col-span-12 xl:col-span-3 h-56" />
              </div>
              <div className="bento-grid">
                <div className="skeleton col-span-12 xl:col-span-8 h-52" />
                <div className="skeleton col-span-12 xl:col-span-4 h-52" />
              </div>
            </div>
          }
        >
          <DashboardContent />
        </Suspense>
      </main>
    </div>
  );
}
