import { Suspense } from "react";
import { Navbar } from "@/components/navigation/navbar";
import { RoutineBuilder } from "@/components/routines/routine-builder";
import { db } from "@/db";
import * as schema from "@/db/schema";

export const instant = false;

async function NewRoutineLoader() {
  const catalogExercises = await db
    .select({
      id: schema.exercises.id,
      namePt: schema.exercises.namePt,
      nameEn: schema.exercises.nameEn,
      secondaryMuscles: schema.exercises.secondaryMuscles,
    })
    .from(schema.exercises)
    .limit(100);

  return <RoutineBuilder availableExercises={catalogExercises} />;
}

export default function NewRoutinePage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pb-16 md:pb-0">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
        <div className="mb-6">
          <span className="t-label">Planejamento & Prescrição</span>
          <h1 className="t-h1 mt-1">Nova Ficha de Treinamento</h1>
          <p className="text-muted text-sm mt-1">
            Configure exercícios, séries, repetições, cargas-alvo e intervalos.
          </p>
        </div>

        <Suspense
          fallback={
            <div className="py-20 text-center text-muted font-mono text-sm animate-pulse">
              Carregando catálogo de exercícios...
            </div>
          }
        >
          <NewRoutineLoader />
        </Suspense>
      </main>
    </div>
  );
}
