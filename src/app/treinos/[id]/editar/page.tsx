import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/navigation/navbar";
import { RoutineBuilder } from "@/components/routines/routine-builder";
import { getRoutineForEdit } from "@/actions/routines";
import { db } from "@/db";
import * as schema from "@/db/schema";

export const instant = false;

async function EditRoutineLoader({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { id } = await params;

  const [routine, catalogExercises] = await Promise.all([
    getRoutineForEdit(id),
    db
      .select({
        id: schema.exercises.id,
        namePt: schema.exercises.namePt,
        nameEn: schema.exercises.nameEn,
        modalityCode: schema.exercises.modalityCode,
        secondaryMuscles: schema.exercises.secondaryMuscles,
      })
      .from(schema.exercises)
      .orderBy(schema.exercises.namePt)
      .limit(250),
  ]);

  if (!routine) {
    notFound();
  }

  return (
    <RoutineBuilder
      availableExercises={catalogExercises}
      initialRoutine={routine}
    />
  );
}

export default function EditRoutinePage(props: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pb-24">
      <Navbar />
      <main className="selye-container py-6 flex-1">
        <div className="mb-6">
          <Link
            href="/treinos"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-muted hover:text-foreground transition-colors mb-3"
          >
            <ArrowLeft size={14} />
            <span>Voltar para Rotinas</span>
          </Link>
          <span className="t-label block">Edição de Ficha</span>
          <h1 className="t-h1 mt-1">Editar Ficha de Treinamento</h1>
          <p className="text-muted text-sm mt-1">
            Ajuste dia da semana, movimentos, séries, repetições ou cargas mantendo seu histórico intacto.
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
          <EditRoutineLoader params={props.params} />
        </Suspense>
      </main>
    </div>
  );
}
