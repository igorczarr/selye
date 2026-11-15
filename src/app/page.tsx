import { Suspense } from "react";
import { Navbar } from "@/components/navigation/navbar";
import { getDashboardData } from "@/actions/workout";
import { WorkoutRunner } from "@/components/workout/workout-runner";
import { ExerciseExplorer } from "@/components/catalog/exercise-explorer";
import { SelyeLogo } from "@/components/brand/logo";

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
  const { stats } = data;
  const frequencyMet = stats.weeklyFrequencyAvg >= stats.targetDaysPerWeek;

  return (
    <>
      {/* Nota do Dia */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-noite to-grafite text-osso p-6 sm:p-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-lg fade-up before:absolute before:-right-24 before:-top-24 before:h-64 before:w-64 before:rounded-full before:bg-lima/10 before:blur-3xl">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-lima" />
            <span className="t-label !text-nevoa">
              Nota do dia · {data.dailyNote.category}
            </span>
          </div>
          <p className="t-h3 sm:t-h2 !text-osso italic font-normal">
            &ldquo;{data.dailyNote.messageText}&rdquo;
          </p>
          <p className="t-aux text-nevoa">— {data.dailyNote.author}</p>
        </div>
        <div className="hidden lg:flex flex-col items-end text-right border-l border-white/10 pl-6">
          <span className="t-label !text-nevoa">Posicionamento</span>
          <span className="t-aux text-osso mt-1">Organizar. Registrar.</span>
          <span className="t-aux text-osso">Acompanhar.</span>
        </div>
      </section>

      {/* Grade de Indicadores Reais */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card card-interactive p-5 flex flex-col justify-between">
          <span className="t-label">Volume (28d)</span>
          <p className="t-data text-2xl mt-1 text-foreground">
            {formatVolume(stats.monthlyVolumeKg)}
          </p>
          <span className="t-aux text-muted mt-2">
            {stats.monthlyVolumeKg > 0
              ? "Séries concluídas no ciclo"
              : "Complete 1 treino para iniciar"}
          </span>
        </div>

        <div className="card card-interactive p-5 flex flex-col justify-between">
          <span className="t-label">Frequência</span>
          <p className="t-data text-2xl mt-1 text-foreground">
            {stats.weeklyFrequencyAvg.toLocaleString("pt-BR")}{" "}
            <span className="text-xs font-sans text-muted">dias/sem</span>
          </p>
          <span
            className={`t-aux mt-2 font-medium ${
              frequencyMet ? "text-accent-text" : "text-muted"
            }`}
          >
            Meta: {stats.targetDaysPerWeek} dias {frequencyMet ? "✓" : ""}
          </span>
        </div>

        <div className="card card-interactive p-5 flex flex-col justify-between">
          <span className="t-label">Streak Semanal</span>
          <p className="t-data text-2xl mt-1 text-foreground flex items-center gap-1.5">
            <span>{stats.currentWeeklyStreak}</span>
            <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-lima text-grafite">
              {stats.currentWeeklyStreak === 1 ? "semana" : "semanas"}
            </span>
          </p>
          <span className="t-aux text-muted mt-2">
            Recorde: {stats.bestWeeklyStreak}{" "}
            {stats.bestWeeklyStreak === 1 ? "semana" : "semanas"}
          </span>
        </div>

        <div className="card card-interactive p-5 flex flex-col justify-between">
          <span className="t-label">Treinos Concluídos</span>
          <p className="t-data text-2xl mt-1 text-foreground">
            {stats.totalCompletedWorkouts}
          </p>
          <span className="t-aux text-muted mt-2">Histórico consolidado</span>
        </div>
      </section>

      {/* Execução em Tempo Real */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="t-label">Treino de hoje</span>
            <h2 className="t-h2 mt-0.5">Execução do treino</h2>
          </div>
        </div>
        <WorkoutRunner
          initialSession={data.activeSession}
          catalogSample={data.exerciseList}
        />
      </section>

      {/* Catálogo de Exercícios */}
      <section>
        <ExerciseExplorer exercises={data.exerciseList} />
      </section>

      {/* Histórico Recente e Ritual Pós-Treino */}
      <section className="card p-6 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div>
            <span className="t-label">Comunidade</span>
            <h2 className="t-h2 mt-1">Ritual pós-treino</h2>
          </div>
          <span className="t-data text-xs text-muted">
            {data.recentSessions.length}{" "}
            {data.recentSessions.length === 1 ? "registro" : "registros"}
          </span>
        </div>

        {data.recentSessions.length === 0 ? (
          <p className="text-sm text-muted">
            Nenhuma sessão concluída ainda. Complete seu primeiro treino acima para gerar o relatório pós-treino.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.recentSessions.map((s) => (
              <div
                key={s.id}
                className="rounded-xl border border-line p-4 bg-foreground/[0.02] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="t-label !text-accent-text">
                      SELYE TRAINING REPORT
                    </span>
                    <span className="t-data text-xs text-muted">
                      {new Date(s.finishedAt || s.startedAt).toLocaleDateString(
                        "pt-BR"
                      )}
                    </span>
                  </div>
                  <h3 className="font-semibold text-base mt-2 text-foreground">
                    {s.title}
                  </h3>
                  <p className="t-aux text-muted mt-1">
                    RPE da sessão: {s.rpeSession || 8}/10 · Fuso: {s.timezone}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-line flex items-center justify-between text-xs font-mono">
                  <span className="text-muted">Concluído</span>
                  <span className="text-accent-text font-semibold">
                    Registrado no Histórico
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pb-20 md:pb-0">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex-1 flex flex-col gap-8 w-full">
        <Suspense
          fallback={
            <div className="flex flex-col gap-4" aria-busy="true">
              <div className="skeleton h-32" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="skeleton h-24" />
                <div className="skeleton h-24" />
                <div className="skeleton h-24" />
                <div className="skeleton h-24" />
              </div>
              <div className="skeleton h-64" />
            </div>
          }
        >
          <DashboardContent />
        </Suspense>
      </main>

      <footer className="border-t border-line bg-surface py-8 mt-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <SelyeLogo height={20} className="text-foreground" />
            <span className="t-aux text-muted">
              · Seu corpo. Sua gestão. Sua evolução.
            </span>
          </div>
          <p className="t-aux text-muted">© 2026 Selye</p>
        </div>
      </footer>
    </div>
  );
}
