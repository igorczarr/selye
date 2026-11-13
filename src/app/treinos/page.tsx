import { Suspense } from "react";
import Link from "next/link";
import { Navbar } from "@/components/navigation/navbar";
import { getUserRoutines, duplicateRoutine } from "@/actions/routines";
import { PlusCircle, Copy, Play, Dumbbell, Calendar, Clock } from "lucide-react";

export const instant = false;

async function RoutinesList() {
  const routines = await getUserRoutines();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="t-label">Minhas Fichas (§8.6)</span>
          <h1 className="t-h1 mt-1">Rotinas de Treinamento</h1>
          <p className="text-muted text-sm mt-1">
            Organize suas fichas, prescreva exercícios e acompanhe versões.
          </p>
        </div>
        <Link
          href="/treinos/novo"
          className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-md bg-grafite text-osso font-semibold hover:bg-noite transition-colors shadow-xs"
        >
          <PlusCircle size={17} strokeWidth={2} />
          <span>Criar Nova Ficha</span>
        </Link>
      </div>

      {routines.length === 0 ? (
        <div className="rounded-lg border border-line bg-surface p-12 text-center flex flex-col items-center gap-3">
          <Dumbbell size={36} className="text-muted" strokeWidth={1.5} />
          <h3 className="t-h2">Nenhuma ficha criada ainda</h3>
          <p className="text-muted text-sm max-w-sm">
            Crie sua primeira programação com séries, repetições e intervalos para começar a treinar.
          </p>
          <Link
            href="/treinos/novo"
            className="mt-2 inline-flex items-center gap-2 h-10 px-4 rounded-md bg-lima text-grafite font-bold text-sm"
          >
            Começar do Zero
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {routines.map((routine) => (
            <div
              key={routine.id}
              className="rounded-lg border border-line bg-surface p-5 flex flex-col justify-between hover:border-profundo/50 transition-all shadow-xs"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="t-label !text-profundo">
                    Versão {routine.version?.versionNumber || 1} · {routine.modalityCode}
                  </span>
                  <span className="t-data text-xs text-muted">
                    {routine.templates?.[0]?.prescriptions?.length || 0} exercícios
                  </span>
                </div>
                <h3 className="t-h2 mt-2">{routine.title}</h3>
                {routine.description && (
                  <p className="text-muted text-xs mt-1 line-clamp-2">
                    {routine.description}
                  </p>
                )}

                {/* Prévia dos exercícios da rotina */}
                <div className="mt-4 space-y-1.5 border-t border-line/60 pt-3">
                  {routine.templates?.[0]?.prescriptions?.slice(0, 4).map((p, idx) => (
                    <div key={p.id} className="flex justify-between items-center text-xs">
                      <span className="font-medium text-grafite">
                        0{idx + 1}. {p.exerciseNamePt}
                      </span>
                      <span className="t-data text-muted">
                        {p.targetSets} × {p.targetReps} {p.targetLoadKg ? `(${p.targetLoadKg} kg)` : ""}
                      </span>
                    </div>
                  ))}
                  {(routine.templates?.[0]?.prescriptions?.length || 0) > 4 && (
                    <p className="t-aux text-muted pt-1">
                      + {(routine.templates?.[0]?.prescriptions?.length || 0) - 4} outros exercícios
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-line flex items-center justify-between gap-2">
                <form
                  action={async () => {
                    "use server";
                    await duplicateRoutine(routine.id);
                  }}
                >
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-line text-xs font-mono text-muted hover:text-grafite hover:bg-osso transition-colors cursor-pointer"
                    title="Duplicar ficha"
                  >
                    <Copy size={13} strokeWidth={1.75} />
                    <span>Duplicar</span>
                  </button>
                </form>

                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-grafite text-osso text-xs font-semibold hover:bg-noite transition-colors"
                >
                  <Play size={13} fill="currentColor" />
                  <span>Iniciar Ficha</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TreinosPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pb-16 md:pb-0">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
        <Suspense
          fallback={
            <div className="py-20 text-center text-muted font-mono text-sm animate-pulse">
              Carregando rotinas...
            </div>
          }
        >
          <RoutinesList />
        </Suspense>
      </main>
    </div>
  );
}
