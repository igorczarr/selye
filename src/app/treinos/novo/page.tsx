import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/navigation/navbar";
import { RoutineBuilder } from "@/components/routines/routine-builder";
import { db } from "@/db";
import * as schema from "@/db/schema";

export const instant = false;

async function NewRoutineLoader() {
  await connection();
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
    <div className="min-h-screen bg-background text-foreground flex flex-col pb-24">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
        <div className="mb-6">
          <Link
            href="/treinos"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-muted hover:text-foreground transition-colors mb-3"
          >
            <ArrowLeft size={14} />
            <span>Voltar para Rotinas</span>
          </Link>
          <span className="t-label block">Prescrição Técnica</span>
          <h1 className="t-h1 mt-1">Nova Ficha de Treinamento</h1>
          <p className="text-muted text-sm mt-1">
            Configure movimentos, séries, faixas de repetições, cargas-alvo e intervalos de recuperação.
          </p>
        </div>

        <Suspense
          fallback={
            <div className="space-y-4" aria-busy="true">
              <div className="skeleton h-48 w-full" />
              <div className="skeleton h-64 w-full" />
            </div>
          }
        >
          <NewRoutineLoader />
        </Suspense>
      </main>
    </div>
  );
}
