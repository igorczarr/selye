"use server";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getOrCreateDemoUser } from "./workout";

export interface CreateRoutineInput {
  title: string;
  description?: string;
  modalityCode?: string;
  exercises: {
    exerciseId: string;
    orderIndex: number;
    targetSets: number;
    targetReps: string;
    targetLoadKg?: number;
    restSeconds?: number;
    setType?: string;
    notes?: string;
  }[];
}

/**
 * Cria uma nova rotina/ficha de treino própria (§8.6 e §9).
 * Cria o programa, a versão inicial (v1 imutável), o template e as prescrições de exercícios.
 */
export async function createRoutine(input: CreateRoutineInput) {
  const user = await getOrCreateDemoUser();

  // 1. Cria programa
  const [program] = await db
    .insert(schema.trainingPrograms)
    .values({
      title: input.title,
      description: input.description,
      modalityCode: input.modalityCode || "strength",
      creatorUserId: user.id,
      isArchived: false,
    })
    .returning();

  // 2. Cria versão 1 (imutabilidade §8.5)
  const [version] = await db
    .insert(schema.programVersions)
    .values({
      programId: program.id,
      versionNumber: 1,
      changeLog: "Versão inicial criada pelo atleta.",
      isCurrent: true,
      rawPlanData: input,
    })
    .returning();

  // 3. Cria o template
  const [template] = await db
    .insert(schema.workoutTemplates)
    .values({
      programVersionId: version.id,
      title: input.title,
      orderIndex: 1,
      notes: input.description,
    })
    .returning();

  // 4. Insere prescrições de exercícios
  for (const ex of input.exercises) {
    await db.insert(schema.templatePrescriptions).values({
      templateId: template.id,
      exerciseId: ex.exerciseId,
      orderIndex: ex.orderIndex,
      targetSets: ex.targetSets,
      targetReps: ex.targetReps,
      targetLoadKg: ex.targetLoadKg,
      restSeconds: ex.restSeconds || 90,
      setType: ex.setType || "effective",
      notes: ex.notes,
    });
  }

  revalidatePath("/treinos");
  return { programId: program.id, versionId: version.id };
}

/**
 * Retorna as rotinas e fichas ativas do usuário
 */
export async function getUserRoutines() {
  const user = await getOrCreateDemoUser();

  const programs = await db
    .select()
    .from(schema.trainingPrograms)
    .where(
      and(
        eq(schema.trainingPrograms.creatorUserId, user.id),
        eq(schema.trainingPrograms.isArchived, false)
      )
    )
    .orderBy(desc(schema.trainingPrograms.createdAt));

  const detailedPrograms = await Promise.all(
    programs.map(async (p) => {
      // Pega versão atual
      const [curVersion] = await db
        .select()
        .from(schema.programVersions)
        .where(
          and(
            eq(schema.programVersions.programId, p.id),
            eq(schema.programVersions.isCurrent, true)
          )
        )
        .limit(1);

      if (!curVersion) return { ...p, version: null, templates: [] };

      const templates = await db
        .select()
        .from(schema.workoutTemplates)
        .where(eq(schema.workoutTemplates.programVersionId, curVersion.id));

      const templatesWithExercises = await Promise.all(
        templates.map(async (t) => {
          const prescriptions = await db
            .select({
              id: schema.templatePrescriptions.id,
              orderIndex: schema.templatePrescriptions.orderIndex,
              targetSets: schema.templatePrescriptions.targetSets,
              targetReps: schema.templatePrescriptions.targetReps,
              targetLoadKg: schema.templatePrescriptions.targetLoadKg,
              restSeconds: schema.templatePrescriptions.restSeconds,
              setType: schema.templatePrescriptions.setType,
              exerciseNamePt: schema.exercises.namePt,
              exerciseNameEn: schema.exercises.nameEn,
              secondaryMuscles: schema.exercises.secondaryMuscles,
            })
            .from(schema.templatePrescriptions)
            .innerJoin(
              schema.exercises,
              eq(schema.templatePrescriptions.exerciseId, schema.exercises.id)
            )
            .where(eq(schema.templatePrescriptions.templateId, t.id))
            .orderBy(schema.templatePrescriptions.orderIndex);

          return { ...t, prescriptions };
        })
      );

      return {
        ...p,
        version: curVersion,
        templates: templatesWithExercises,
      };
    })
  );

  return detailedPrograms;
}

/**
 * Duplicar ficha existente (§8.6)
 */
export async function duplicateRoutine(programId: string) {
  const user = await getOrCreateDemoUser();

  const [original] = await db
    .select()
    .from(schema.trainingPrograms)
    .where(eq(schema.trainingPrograms.id, programId))
    .limit(1);

  if (!original) throw new Error("Ficha não encontrada");

  const [curVersion] = await db
    .select()
    .from(schema.programVersions)
    .where(
      and(
        eq(schema.programVersions.programId, programId),
        eq(schema.programVersions.isCurrent, true)
      )
    )
    .limit(1);

  const [newProgram] = await db
    .insert(schema.trainingPrograms)
    .values({
      title: `${original.title} (Cópia)`,
      description: original.description,
      modalityCode: original.modalityCode,
      creatorUserId: user.id,
      isArchived: false,
    })
    .returning();

  const [newVersion] = await db
    .insert(schema.programVersions)
    .values({
      programId: newProgram.id,
      versionNumber: 1,
      changeLog: `Duplicado a partir de ${original.title}`,
      isCurrent: true,
      rawPlanData: curVersion?.rawPlanData,
    })
    .returning();

  if (curVersion) {
    const templates = await db
      .select()
      .from(schema.workoutTemplates)
      .where(eq(schema.workoutTemplates.programVersionId, curVersion.id));

    for (const t of templates) {
      const [newT] = await db
        .insert(schema.workoutTemplates)
        .values({
          programVersionId: newVersion.id,
          title: t.title,
          dayOfWeek: t.dayOfWeek,
          orderIndex: t.orderIndex,
          notes: t.notes,
        })
        .returning();

      const prescs = await db
        .select()
        .from(schema.templatePrescriptions)
        .where(eq(schema.templatePrescriptions.templateId, t.id));

      for (const p of prescs) {
        await db.insert(schema.templatePrescriptions).values({
          templateId: newT.id,
          exerciseId: p.exerciseId,
          orderIndex: p.orderIndex,
          targetSets: p.targetSets,
          targetReps: p.targetReps,
          targetLoadKg: p.targetLoadKg,
          targetRpe: p.targetRpe,
          targetRir: p.targetRir,
          restSeconds: p.restSeconds,
          setType: p.setType,
          notes: p.notes,
        });
      }
    }
  }

  revalidatePath("/treinos");
  return newProgram;
}

/**
 * Retorna dados detalhados da ficha formatados para impressão / exportação PDF (§18)
 */
export async function getRoutineForPrint(programId: string) {
  const [program] = await db
    .select()
    .from(schema.trainingPrograms)
    .where(eq(schema.trainingPrograms.id, programId))
    .limit(1);

  if (!program) return null;

  const [creator] = await db
    .select({ name: schema.users.name, username: schema.users.username })
    .from(schema.users)
    .where(eq(schema.users.id, program.creatorUserId))
    .limit(1);

  const [curVersion] = await db
    .select()
    .from(schema.programVersions)
    .where(
      and(
        eq(schema.programVersions.programId, program.id),
        eq(schema.programVersions.isCurrent, true)
      )
    )
    .limit(1);

  if (!curVersion) return null;

  const templates = await db
    .select()
    .from(schema.workoutTemplates)
    .where(eq(schema.workoutTemplates.programVersionId, curVersion.id));

  const templatesWithDetails = await Promise.all(
    templates.map(async (t) => {
      const prescriptions = await db
        .select({
          id: schema.templatePrescriptions.id,
          orderIndex: schema.templatePrescriptions.orderIndex,
          targetSets: schema.templatePrescriptions.targetSets,
          targetReps: schema.templatePrescriptions.targetReps,
          targetLoadKg: schema.templatePrescriptions.targetLoadKg,
          targetRpe: schema.templatePrescriptions.targetRpe,
          restSeconds: schema.templatePrescriptions.restSeconds,
          setType: schema.templatePrescriptions.setType,
          notes: schema.templatePrescriptions.notes,
          exerciseNamePt: schema.exercises.namePt,
          exerciseNameEn: schema.exercises.nameEn,
          instructionsPt: schema.exercises.instructionsPt,
        })
        .from(schema.templatePrescriptions)
        .innerJoin(schema.exercises, eq(schema.templatePrescriptions.exerciseId, schema.exercises.id))
        .where(eq(schema.templatePrescriptions.templateId, t.id))
        .orderBy(schema.templatePrescriptions.orderIndex);

      return {
        ...t,
        prescriptions,
      };
    })
  );

  return {
    program,
    creator,
    version: curVersion,
    templates: templatesWithDetails,
  };
}
