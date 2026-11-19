import { Suspense } from "react";
import Link from "next/link";
import { ArrowUpRight, Flame, CalendarCheck2 } from "lucide-react";
import { Navbar } from "@/components/navigation/navbar";
import { getDashboardData } from "@/actions/workout";
import { WorkoutRunner } from "@/components/workout/workout-runner";

export const instant = false;

function formatVolume(kg: number): string {
  if (kg >= 1000) {
    return `${(kg / 1000).toLocaleString("pt-BR", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })} t`;
  }
  return `${kg.toLocaleString("pt-BR")} kg`;
}

async function DashboardContent() {
  const data = await getDashboardData();
  const { stats, dailyEditorial, performanceSummary } = data;
  const { quote } = dailyEditorial;
  const { acwrResult, headlineRecommendation, last7DaysChart } =
    performanceSummary;
  const maxLoad = Math.max(1, ...last7DaysChart.map((d) => d.load));
  const hasHistory = stats.totalCompletedWorkouts > 0;

  return (
    <>
      <div className="bento-grid">
        {/* Frase do dia + contagem anual */}
        <section className="col-span-12 lg:col-span-8 relative overflow-hidden rounded-2xl bg-gradient-to-br from-noite to-grafite text-osso p-6 sm:p-8 flex flex-col justify-between gap-6 shadow-lg fade-up">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-lima" />
              <span className="t-label !text-nevoa">
                Nota do dia · {quote.categoryLabelPt}
              </span>
            </div>
            <span className="t-data text-xs px-2.5 py-1 rounded-full bg-white/8 text-lima">
              {dailyEditorial.dayCounterLabel}
            </span>
          </div>

          <figure className="space-y-3">
            <blockquote className="text-xl sm:text-2xl leading-snug font-light italic text-osso text-balance">
              &ldquo;{quote.messageText}&rdquo;
            </blockquote>
            <figcaption className="t-aux text-nevoa">
              — <span className="text-osso font-semibold">{quote.author}</span>
              <span className="hidden sm:inline"> · {quote.roleOrContext}</span>
            </figcaption>
          </figure>

          <div className="space-y-2">
            <div
              className="h-1 w-full rounded-full bg-white/10 overflow-hidden"
              role="progressbar"
              aria-valuenow={dailyEditorial.yearProgressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${dailyEditorial.yearProgressPercent}% de ${dailyEditorial.year} concluído`}
            >
              <div
                className="h-full bg-lima"
                style={{ width: `${dailyEditorial.yearProgressPercent}%` }}
              />
            </div>
            <p className="t-aux text-nevoa flex items-center gap-1.5">
              <CalendarCheck2 size={13} className="text-lima shrink-0" />
              <span>
                <span className="text-osso font-semibold">
                  {stats.activeDaysInYear}
                </span>{" "}
                {stats.activeDaysInYear === 1 ? "dia ativo" : "dias ativos"} em{" "}
                {dailyEditorial.year}
              </span>
            </p>
          </div>
        </section>

        {/* Forma de hoje (resumo de Evolução) */}
        <Link
          href="/evolucao"
          className="col-span-12 lg:col-span-4 card card-interactive p-5 flex flex-col justify-between gap-4 group"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="t-label">Forma de hoje</span>
              <p className="t-data text-3xl font-semibold mt-1 text-foreground">
                {acwrResult.acwr.toFixed(2)}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-lima text-grafite">
                {acwrResult.statusLabel}
              </span>
              <ArrowUpRight
                size={16}
                className="text-muted group-hover:text-foreground transition-colors"
              />
            </div>
          </div>

          <p className="text-xs text-muted leading-relaxed line-clamp-3">
            {headlineRecommendation
              ? headlineRecommendation.actionableStep ||
                headlineRecommendation.message
              : "Registre treinos para calibrar sua carga aguda e crônica."}
          </p>

          <div
            className="grid grid-cols-7 gap-1.5 items-end h-14"
            aria-label="Carga dos últimos 7 dias"
          >
            {last7DaysChart.map((d, i) => {
              const isToday = i === last7DaysChart.length - 1;
              const h = d.load > 0 ? Math.max(14, (d.load / maxLoad) * 100) : 8;
              return (
                <div
                  key={d.date}
                  className="flex flex-col items-center gap-1 h-full justify-end min-w-0"
                  title={`${d.dayName}: ${d.load} UA`}
                >
                  <div
                    className={`w-full rounded-sm ${
                      d.load > 0
                        ? isToday
                          ? "bg-lima"
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
      </div>

      {/* Treino de hoje: carrossel de fichas / execução */}
      <section className="flex flex-col gap-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <span className="t-label">Treino de hoje</span>
            <h2 className="t-h2 mt-0.5">
              {data.activeSession ? "Execução do treino" : "Escolha sua ficha"}
            </h2>
          </div>
          <Link
            href="/treinos"
            className="t-aux text-accent-text hover:underline shrink-0"
          >
            Ver todas
          </Link>
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

      {/* Indicadores */}
      {hasHistory ? (
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="card p-4 flex flex-col gap-1">
            <span className="t-label">Volume (28d)</span>
            <p className="t-data text-xl text-foreground">
              {formatVolume(stats.monthlyVolumeKg)}
            </p>
          </div>
          <div className="card p-4 flex flex-col gap-1">
            <span className="t-label">Frequência</span>
            <p className="t-data text-xl text-foreground">
              {stats.weeklyFrequencyAvg.toLocaleString("pt-BR")}
              <span className="text-xs font-sans text-muted"> dias/sem</span>
            </p>
            <span className="t-aux text-muted">Meta: {stats.targetDaysPerWeek}</span>
          </div>
          <div className="card p-4 flex flex-col gap-1">
            <span className="t-label">Streak semanal</span>
            <p className="t-data text-xl text-foreground flex items-center gap-1.5">
              <Flame size={16} className="text-accent-text" />
              {stats.currentWeeklyStreak}
            </p>
            <span className="t-aux text-muted">Recorde: {stats.bestWeeklyStreak}</span>
          </div>
          <div className="card p-4 flex flex-col gap-1">
            <span className="t-label">Treinos</span>
            <p className="t-data text-xl text-foreground">
              {stats.totalCompletedWorkouts}
            </p>
            <span className="t-aux text-muted">Histórico total</span>
          </div>
        </section>
      ) : (
        <section className="card p-5 text-sm text-muted">
          Conclua seu primeiro treino para liberar volume, frequência e streak.
        </section>
      )}

      {/* Últimos registros */}
      {data.recentSessions.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="t-h3">Últimos treinos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.recentSessions.map((s) => (
              <div
                key={s.id}
                className="card p-4 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{s.title}</p>
                  <p className="t-aux text-muted">
                    RPE {s.rpeSession || 8}/10
                  </p>
                </div>
                <span className="t-data text-xs text-muted shrink-0">
                  {new Date(s.finishedAt || s.startedAt).toLocaleDateString(
                    "pt-BR"
                  )}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pb-24">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex-1 flex flex-col gap-6 w-full">
        <Suspense
          fallback={
            <div className="flex flex-col gap-4" aria-busy="true">
              <div className="bento-grid">
                <div className="skeleton col-span-12 lg:col-span-8 h-56" />
                <div className="skeleton col-span-12 lg:col-span-4 h-56" />
              </div>
              <div className="skeleton h-40" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="skeleton h-24" />
                <div className="skeleton h-24" />
                <div className="skeleton h-24" />
                <div className="skeleton h-24" />
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
