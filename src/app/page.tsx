import { Suspense } from "react";
import { SelyeLogo } from "@/components/brand/logo";
import { getDashboardData } from "@/actions/workout";
import { WorkoutRunner } from "@/components/workout/workout-runner";
import { ExerciseExplorer } from "@/components/catalog/exercise-explorer";

export const instant = false;

async function DashboardContent() {
  const data = await getDashboardData();

  return (
    <>
      {/* Nota do Dia (§14 - Requisito Editorial do Briefing) */}
      <section className="rounded-lg bg-noite text-osso p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-xs">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-lima" />
            <span className="t-label !text-nevoa">Nota do Dia · {data.dailyNote.category}</span>
          </div>
          <p className="t-h3 sm:t-h2 !text-osso italic font-normal">
            "{data.dailyNote.messageText}"
          </p>
          <p className="t-aux text-nevoa">— {data.dailyNote.author}</p>
        </div>
        <div className="hidden lg:flex flex-col items-end text-right border-l border-white/10 pl-6">
          <span className="t-label !text-nevoa">Posicionamento</span>
          <span className="t-aux text-osso mt-1">Organizar. Registrar.</span>
          <span className="t-aux text-osso">Acompanhar.</span>
        </div>
      </section>

      {/* Grade de Indicadores Principais (§15 Dashboard Pessoal) */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-md border border-line bg-surface p-4 flex flex-col justify-between">
          <span className="t-label">Volume do Mês</span>
          <p className="t-data text-2xl mt-1">24,8 t</p>
          <span className="t-aux text-muted mt-2">Últimas 4 semanas</span>
        </div>
        <div className="rounded-md border border-line bg-surface p-4 flex flex-col justify-between">
          <span className="t-label">Frequência</span>
          <p className="t-data text-2xl mt-1">
            4,2 <span className="text-xs font-sans text-muted">dias/sem</span>
          </p>
          <span className="t-aux text-profundo mt-2 font-medium">Meta: 4 dias ✓</span>
        </div>
        <div className="rounded-md border border-line bg-surface p-4 flex flex-col justify-between">
          <span className="t-label">Streak Semanal</span>
          <p className="t-data text-2xl mt-1 text-grafite flex items-center gap-1.5">
            <span>3</span>
            <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-lima text-grafite">semanas</span>
          </p>
          <span className="t-aux text-muted mt-2">Recorde: 5 semanas</span>
        </div>
        <div className="rounded-md border border-line bg-surface p-4 flex flex-col justify-between">
          <span className="t-label">Treinos Concluídos</span>
          <p className="t-data text-2xl mt-1">
            {data.activitiesCount + data.recentSessions.length}
          </p>
          <span className="t-aux text-muted mt-2">Histórico auditado</span>
        </div>
      </section>

      {/* Workout Engine: Execução em Tempo Real (§10) */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="t-label">Workout Engine (§10)</span>
            <h2 className="t-h2 mt-0.5">Execução do Treinamento</h2>
          </div>
        </div>
        <WorkoutRunner
          initialSession={data.activeSession}
          catalogSample={data.exerciseList}
        />
      </section>

      {/* Exercise Catalog (§6): Prova da API Ninjas integrada ao Neon */}
      <section>
        <ExerciseExplorer exercises={data.exerciseList} />
      </section>

      {/* Histórico Recente e Ritual do PÓS (§12) */}
      <section className="rounded-lg bg-surface border border-line p-6 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div>
            <span className="t-label">Comunidade & Ritual (§12)</span>
            <h2 className="t-h2 mt-1">O Ritual do PÓS</h2>
          </div>
          <span className="t-data text-xs text-muted">
            {data.recentSessions.length} registros
          </span>
        </div>

        {data.recentSessions.length === 0 ? (
          <p className="text-sm text-muted">
            Nenhuma sessão concluída ainda. Complete o primeiro treino acima para gerar o card do ritual PÓS.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.recentSessions.map((s) => (
              <div
                key={s.id}
                className="rounded-md border border-line p-4 bg-osso/20 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="t-label !text-profundo">SELYE TRAINING REPORT</span>
                    <span className="t-data text-[10px] text-muted">
                      {new Date(s.finishedAt!).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  <h3 className="font-semibold text-base mt-2">{s.title}</h3>
                  <p className="t-aux text-muted mt-1">
                    RPE Registrado: {s.rpeSession || "8"} · Fuso: {s.timezone}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-line flex items-center justify-between text-xs font-mono">
                  <span className="text-muted">Status: Concluído ✓</span>
                  <span className="text-profundo font-semibold">Compartilhado na Equipe</span>
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
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Barra de Navegação Superior */}
      <header className="border-b border-line bg-surface/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SelyeLogo height={26} className="text-grafite" />
          </div>
          <div className="flex items-center gap-3">
            <span className="t-label hidden sm:inline-block">Atleta</span>
            <span className="t-data text-xs px-2.5 py-1 rounded bg-osso border border-line">
              Marina Costa
            </span>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal com Suspense */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex-1 flex flex-col gap-8 w-full">
        <Suspense
          fallback={
            <div className="py-20 text-center text-muted font-mono text-sm animate-pulse">
              Carregando dados do Selye...
            </div>
          }
        >
          <DashboardContent />
        </Suspense>
      </main>

      {/* Rodapé institucional com princípios da marca */}
      <footer className="border-t border-line bg-surface py-8 mt-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <SelyeLogo height={20} className="text-grafite" />
            <span className="t-aux text-muted">· Seu corpo. Sua gestão. Sua evolução.</span>
          </div>
          <p className="t-data text-xs text-muted">
            Neon Postgres · API Ninjas · Drizzle ORM · Next.js
          </p>
        </div>
      </footer>
    </div>
  );
}
