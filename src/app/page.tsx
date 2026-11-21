import { Suspense } from "react";
import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { Navbar } from "@/components/navigation/navbar";
import { getDashboardData } from "@/actions/workout";
import { getActivePlanningSnapshot } from "@/actions/planning";
import { WorkoutRunner } from "@/components/workout/workout-runner";
import { HomeEditorialHeader } from "@/components/home/home-editorial-header";
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
  const { adaptiveProfile, dailyDecision, todayCheckin } = performanceSummary;

  return (
    <div className="flex flex-col gap-6 sm:gap-7">
      {/* 0. CABEÇALHO EDITORIAL: Saudação e Frase do Dia sutil logo abaixo */}
      <HomeEditorialHeader
        userName={data.user?.name || data.user?.email}
        editorial={dailyEditorial}
        activeDaysInYear={stats.activeDaysInYear}
      />

      {/* BANNER DE CALIBRAÇÃO CIENTÍFICA DE EA & MODALIDADE (Apenas se não completou onboarding) */}
      {!stats.onboardingCompleted && (
        <section className="card p-4 sm:p-5 border-profundo/50 bg-lima/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="w-9 h-9 rounded-xl bg-lima text-grafite flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles size={17} />
            </span>
            <div>
              <span className="t-label !text-accent-text">
                Personalização Rápida · ~2 min
              </span>
              <h2 className="text-sm font-semibold text-foreground mt-0.5">
                Ajuste sua Bateria do Corpo (EA) e sua modalidade principal
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Conte sua modalidade, rotina, sono e estresse do dia a dia para o Selye adaptar seus indicadores, fortalecimento e energia diária.
              </p>
            </div>
          </div>
          <Link
            href="/onboarding"
            className="btn btn-primary h-9 px-4 text-xs font-mono font-bold shrink-0 self-start sm:self-center"
          >
            <span>Iniciar Calibração</span>
            <ArrowUpRight size={14} />
          </Link>
        </section>
      )}

      {/* GUIA DE AUTONOMIA EM 3 PASSOS (Apenas primeira visita absoluta; não persiste se dispensado) */}
      <WelcomeAutonomyGuide
        totalCompletedWorkouts={stats.totalCompletedWorkouts}
      />

      {/* 1. HIERARQUIA PRIMÁRIA: BATERIA DO CORPO (Equilibrado, autoral Selye, sugestões ativas e micro-hábitos) */}
      <div className="stagger-1">
        <DailyDecisionCard
          decision={dailyDecision}
          initialCheckin={todayCheckin}
          adaptiveProfile={adaptiveProfile}
        />
      </div>

      {/* 2. SEÇÃO DE TREINOS: Título do Header "Treinos" + Treino de Hoje em Destaque Absoluto (Zero Fricção) */}
      <div className="flex flex-col gap-4 sm:gap-5 pt-1">
        <div className="flex items-center justify-between gap-3">
          <h2 className="t-h1">Treinos</h2>
          <Link
            href="/treinos/novo"
            className="btn btn-ghost h-9 px-3 text-xs font-mono"
          >
            + Nova Ficha
          </Link>
        </div>

        {/* Treino do Dia em Destaque com Início Imediato e Troca Rápida */}
        <WorkoutRunner
          initialSession={data.activeSession}
          sessionExercises={data.activeSessionExercises}
          todayCompletedSessions={data.todayCompletedSessions}
          routines={data.routines.map((r) => ({
            id: r.id,
            title: r.title,
            modalityCode: r.modalityCode,
            templates: r.templates?.map((t) => ({
              dayOfWeek: t.dayOfWeek,
              prescriptions: t.prescriptions.map((p: any) => ({
                id: p.id,
                exerciseNamePt: p.exerciseNamePt,
                exerciseNameEn: p.exerciseNameEn,
                targetSets: p.targetSets,
                targetReps: p.targetReps,
              })),
            })),
          }))}
        />

        {/* 3. CONTEXTO DE CICLO: Seu Passo de Hoje no Calendário do Seu Corpo */}
        <TodayPlanWidget snapshot={planningSnapshot} />
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
