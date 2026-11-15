import { Suspense } from "react";
import Link from "next/link";
import { Navbar } from "@/components/navigation/navbar";
import { getUserRoutines, duplicateRoutine } from "@/actions/routines";
import { PlusCircle, Copy, Play, Dumbbell, Printer } from "lucide-react";

export const instant = false;

const MODALITY_LABELS: Record<string, string> = {
  strength: "Musculação",
  calisthenics: "Calistenia",
  functional: "Funcional",
  running: "Corrida",
};

async function RoutinesList() {
  const routines = await getUserRoutines();

  return (
    <div className="flex flex-col gap-6 fade-up">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="t-label">Planejamento</span>
          <h1 className="t-h1 mt-1">Rotinas de Treinamento</h1>
          <p className="text-muted text-sm mt-1">
            Organize suas fichas, prescreva exercícios e acompanhe a evolução de versões.
          </p>
        </div>
        <Link href="/treinos/novo" className="btn btn-primary h-11 px-5 shrink-0">
          <PlusCircle size={17} strokeWidth={2} />
          <span>Criar Nova Ficha</span>
        </Link>
      </div>

      {routines.length === 0 ? (
        <div className="card p-12 text-center flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-foreground/5 flex items-center justify-center text-muted">
            <Dumbbell size={24} strokeWidth={1.75} />
          </div>
          <h2 className="t-h2 mt-1">Nenhuma ficha criada ainda</h2>
          <p className="text-muted text-sm max-w-sm">
            Monte sua primeira programação com séries, repetições, cargas e intervalos de descanso.
          </p>
          <Link href="/treinos/novo" className="btn btn-primary mt-2">
            <PlusCircle size={16} />
            <span>Começar do Zero</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {routines.map((routine) => {
            const prescriptions = routine.templates?.[0]?.prescriptions || [];
            const modalityLabel =
              MODALITY_LABELS[routine.modalityCode] || routine.modalityCode;

            return (
              <article
                key={routine.id}
                className="card card-interactive p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="chip">
                      v{routine.version?.versionNumber || 1}.0 · {modalityLabel}
                    </span>
                    <span className="t-data text-xs text-muted">
                      {prescriptions.length}{" "}
                      {prescriptions.length === 1 ? "exercício" : "exercícios"}
                    </span>
                  </div>

                  <h2 className="t-h2 mt-3">{routine.title}</h2>
                  {routine.description && (
                    <p className="text-muted text-xs mt-1 line-clamp-2">
                      {routine.description}
                    </p>
                  )}

                  {/* Prévia tabular dos exercícios */}
                  <div className="mt-4 space-y-2 border-t border-line pt-3">
                    {prescriptions.slice(0, 4).map((p, idx) => (
                      <div
                        key={p.id}
                        className="flex justify-between items-center text-xs gap-2"
                      >
                        <span className="font-medium text-foreground truncate">
                          <span className="t-data text-muted mr-1.5">
                            {String(idx + 1).padStart(2, "0")}.
                          </span>
                          {p.exerciseNamePt}
                        </span>
                        <span className="t-data text-muted shrink-0">
                          {p.targetSets} × {p.targetReps}
                          {p.targetLoadKg ? ` · ${p.targetLoadKg} kg` : ""}
                        </span>
                      </div>
                    ))}
                    {prescriptions.length > 4 && (
                      <p className="t-aux text-muted pt-1">
                        + {prescriptions.length - 4} outros exercícios na ficha
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-line flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <form
                      action={async () => {
                        "use server";
                        await duplicateRoutine(routine.id);
                      }}
                    >
                      <button
                        type="submit"
                        className="btn btn-ghost h-9 px-3 text-xs font-mono"
                        title="Duplicar ficha"
                      >
                        <Copy size={14} strokeWidth={1.75} />
                        <span>Duplicar</span>
                      </button>
                    </form>

                    <Link
                      href={`/treinos/${routine.id}/imprimir`}
                      className="btn btn-ghost h-9 px-3 text-xs font-mono"
                      title="Imprimir ficha técnica ou salvar em PDF"
                    >
                      <Printer size={14} strokeWidth={1.75} />
                      <span>Folha A4</span>
                    </Link>
                  </div>

                  <Link href="/" className="btn btn-dark h-9 px-4 text-xs">
                    <Play size={13} fill="currentColor" />
                    <span>Treinar</span>
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RoutinesSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Carregando rotinas">
      <div className="flex justify-between items-end">
        <div className="space-y-2">
          <div className="skeleton h-4 w-24" />
          <div className="skeleton h-8 w-64" />
          <div className="skeleton h-4 w-80" />
        </div>
        <div className="skeleton h-11 w-40" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="skeleton h-64" />
        <div className="skeleton h-64" />
      </div>
    </div>
  );
}

export default function TreinosPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pb-20 md:pb-0">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
        <Suspense fallback={<RoutinesSkeleton />}>
          <RoutinesList />
        </Suspense>
      </main>
    </div>
  );
}
