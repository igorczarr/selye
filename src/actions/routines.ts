"use server";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, desc, asc, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { connection } from "next/server";
import { getOrCreateDemoUser } from "./workout";
import { dispatchSmartNotification } from "./notifications";
import { sortRoutinesChronologically } from "@/lib/week";

export interface CreateRoutineInput {
  title: string;
  description?: string;
  modalityCode?: string;
  dayOfWeek?: number | null;
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
      dayOfWeek:
        typeof input.dayOfWeek === "number" ? input.dayOfWeek : null,
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

  await dispatchSmartNotification({
    recipientUserId: user.id,
    eventType: "coach_program_published",
    params: {
      programTitle: input.title,
      customNotes: `Sua nova ficha "${input.title}" com ${input.exercises.length} exercício(s) foi salva e já está pronta para iniciar na sua semana.`,
    },
  });

  revalidatePath("/treinos");
  revalidatePath("/");
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
        .where(eq(schema.workoutTemplates.programVersionId, curVersion.id))
        .orderBy(asc(schema.workoutTemplates.orderIndex));

      const templatesWithExercises = await Promise.all(
        templates.map(async (t) => {
          const prescriptions = await db
            .select({
              id: schema.templatePrescriptions.id,
              exerciseId: schema.templatePrescriptions.exerciseId,
              orderIndex: schema.templatePrescriptions.orderIndex,
              targetSets: schema.templatePrescriptions.targetSets,
              targetReps: schema.templatePrescriptions.targetReps,
              targetLoadKg: schema.templatePrescriptions.targetLoadKg,
              restSeconds: schema.templatePrescriptions.restSeconds,
              setType: schema.templatePrescriptions.setType,
              notes: schema.templatePrescriptions.notes,
              exerciseNamePt: schema.exercises.namePt,
              exerciseNameEn: schema.exercises.nameEn,
              secondaryMuscles: schema.exercises.secondaryMuscles,
              instructionsPt: schema.exercises.instructionsPt,
              safetyInfoPt: schema.exercises.safetyInfoPt,
              difficulty: schema.exercises.difficulty,
              equipmentCodes: schema.exercises.equipmentCodes,
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

  return sortRoutinesChronologically(detailedPrograms);
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
 * Arquiva (remove da lista ativa) uma ficha de treino sem destruir o histórico de sessões concluídas.
 */
export async function archiveRoutine(programId: string) {
  const user = await getOrCreateDemoUser();

  await db
    .update(schema.trainingPrograms)
    .set({ isArchived: true, updatedAt: new Date() })
    .where(
      and(
        eq(schema.trainingPrograms.id, programId),
        eq(schema.trainingPrograms.creatorUserId, user.id)
      )
    );

  revalidatePath("/treinos");
  revalidatePath("/");
}

/**
 * Carrega uma ficha específica para edição (com sua versão atual e exercícios prescritos).
 */
export async function getRoutineForEdit(programId: string) {
  try {
    await connection();
  } catch {
    // fora de requisição HTTP
  }

  const user = await getOrCreateDemoUser();

  const [program] = await db
    .select()
    .from(schema.trainingPrograms)
    .where(
      and(
        eq(schema.trainingPrograms.id, programId),
        eq(schema.trainingPrograms.creatorUserId, user.id)
      )
    )
    .limit(1);

  if (!program) return null;

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

  const [template] = await db
    .select()
    .from(schema.workoutTemplates)
    .where(eq(schema.workoutTemplates.programVersionId, curVersion.id))
    .orderBy(asc(schema.workoutTemplates.orderIndex))
    .limit(1);

  const prescriptions = template
    ? await db
        .select({
          id: schema.templatePrescriptions.id,
          exerciseId: schema.templatePrescriptions.exerciseId,
          orderIndex: schema.templatePrescriptions.orderIndex,
          targetSets: schema.templatePrescriptions.targetSets,
          targetReps: schema.templatePrescriptions.targetReps,
          targetLoadKg: schema.templatePrescriptions.targetLoadKg,
          restSeconds: schema.templatePrescriptions.restSeconds,
          setType: schema.templatePrescriptions.setType,
          exerciseNamePt: schema.exercises.namePt,
          secondaryMuscles: schema.exercises.secondaryMuscles,
        })
        .from(schema.templatePrescriptions)
        .innerJoin(
          schema.exercises,
          eq(schema.templatePrescriptions.exerciseId, schema.exercises.id)
        )
        .where(eq(schema.templatePrescriptions.templateId, template.id))
        .orderBy(asc(schema.templatePrescriptions.orderIndex))
    : [];

  return {
    id: program.id,
    title: program.title,
    description: program.description || "",
    modalityCode: program.modalityCode,
    dayOfWeek: template?.dayOfWeek ?? null,
    exercises: prescriptions.map((p) => ({
      exerciseId: p.exerciseId,
      exerciseName: p.exerciseNamePt,
      muscleGroup: p.secondaryMuscles?.[0] || "Geral",
      targetSets: p.targetSets ?? 3,
      targetReps: p.targetReps || "8-12",
      targetLoadKg: p.targetLoadKg ?? 0,
      restSeconds: p.restSeconds ?? 90,
      setType: p.setType || "effective",
    })),
  };
}

/**
 * Atualiza uma ficha existente criando uma nova versão imutável (preservando histórico passado).
 */
export async function updateRoutine(
  programId: string,
  input: CreateRoutineInput
) {
  const user = await getOrCreateDemoUser();

  const [program] = await db
    .select()
    .from(schema.trainingPrograms)
    .where(
      and(
        eq(schema.trainingPrograms.id, programId),
        eq(schema.trainingPrograms.creatorUserId, user.id)
      )
    )
    .limit(1);

  if (!program) {
    throw new Error("Ficha não encontrada ou sem permissão para editar.");
  }

  await db
    .update(schema.trainingPrograms)
    .set({
      title: input.title,
      description: input.description,
      modalityCode: input.modalityCode || "strength",
      updatedAt: new Date(),
    })
    .where(eq(schema.trainingPrograms.id, program.id));

  const versions = await db
    .select({ versionNumber: schema.programVersions.versionNumber })
    .from(schema.programVersions)
    .where(eq(schema.programVersions.programId, program.id))
    .orderBy(desc(schema.programVersions.versionNumber));

  const nextVersionNumber = (versions[0]?.versionNumber || 0) + 1;

  await db
    .update(schema.programVersions)
    .set({ isCurrent: false })
    .where(eq(schema.programVersions.programId, program.id));

  const [newVersion] = await db
    .insert(schema.programVersions)
    .values({
      programId: program.id,
      versionNumber: nextVersionNumber,
      changeLog: "Ficha atualizada pelo atleta.",
      isCurrent: true,
      rawPlanData: input,
    })
    .returning();

  const [template] = await db
    .insert(schema.workoutTemplates)
    .values({
      programVersionId: newVersion.id,
      title: input.title,
      dayOfWeek:
        typeof input.dayOfWeek === "number" ? input.dayOfWeek : null,
      orderIndex: 1,
      notes: input.description,
    })
    .returning();

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
  revalidatePath("/");
  return { programId: program.id, versionId: newVersion.id };
}

/**
 * Retorna dados detalhados da ficha formatados para impressão / exportação PDF (§18)
 */
export async function getRoutineForPrint(programId: string) {
  try {
    await connection();
  } catch {
    // Ignora se executado fora do escopo HTTP do Next.js
  }

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

/**
 * Aplica com 1 toque uma sugestão do Reagendamento Inteligente da Semana (§Fase 13):
 * - move_day: Move a ficha alvo para um novo dia da semana (Seg → Dom).
 * - swap_days: Troca os dias da semana entre duas fichas.
 * - deload_volume: Reduz 1 série (mínimo 2 séries) nas prescrições válidas da ficha para aliviar fadiga residual.
 */
export async function applySmartRescheduleAction(input: {
  actionType: "move_day" | "swap_days" | "deload_volume";
  targetProgramId: string;
  toJsDay?: number;
  swapWithProgramId?: string;
}) {
  const user = await getOrCreateDemoUser();

  const [targetProgram] = await db
    .select()
    .from(schema.trainingPrograms)
    .where(
      and(
        eq(schema.trainingPrograms.id, input.targetProgramId),
        eq(schema.trainingPrograms.creatorUserId, user.id)
      )
    )
    .limit(1);

  if (!targetProgram) {
    throw new Error("Ficha não encontrada para reagendamento.");
  }

  const [targetVersion] = await db
    .select()
    .from(schema.programVersions)
    .where(
      and(
        eq(schema.programVersions.programId, targetProgram.id),
        eq(schema.programVersions.isCurrent, true)
      )
    )
    .limit(1);

  if (!targetVersion) {
    throw new Error("Versão ativa da ficha não localizada.");
  }

  const [targetTemplate] = await db
    .select()
    .from(schema.workoutTemplates)
    .where(eq(schema.workoutTemplates.programVersionId, targetVersion.id))
    .orderBy(asc(schema.workoutTemplates.orderIndex))
    .limit(1);

  if (!targetTemplate) {
    throw new Error("Template da ficha não localizado.");
  }

  if (input.actionType === "move_day" && typeof input.toJsDay === "number") {
    await db
      .update(schema.workoutTemplates)
      .set({ dayOfWeek: input.toJsDay })
      .where(eq(schema.workoutTemplates.id, targetTemplate.id));
  } else if (
    input.actionType === "swap_days" &&
    input.swapWithProgramId
  ) {
    const [otherVersion] = await db
      .select()
      .from(schema.programVersions)
      .where(
        and(
          eq(schema.programVersions.programId, input.swapWithProgramId),
          eq(schema.programVersions.isCurrent, true)
        )
      )
      .limit(1);

    if (otherVersion) {
      const [otherTemplate] = await db
        .select()
        .from(schema.workoutTemplates)
        .where(eq(schema.workoutTemplates.programVersionId, otherVersion.id))
        .orderBy(asc(schema.workoutTemplates.orderIndex))
        .limit(1);

      if (otherTemplate) {
        const dayA = targetTemplate.dayOfWeek;
        const dayB = otherTemplate.dayOfWeek;

        await Promise.all([
          db
            .update(schema.workoutTemplates)
            .set({ dayOfWeek: dayB })
            .where(eq(schema.workoutTemplates.id, targetTemplate.id)),
          db
            .update(schema.workoutTemplates)
            .set({ dayOfWeek: dayA })
            .where(eq(schema.workoutTemplates.id, otherTemplate.id)),
        ]);
      }
    }
  } else if (input.actionType === "deload_volume") {
    const prescs = await db
      .select()
      .from(schema.templatePrescriptions)
      .where(eq(schema.templatePrescriptions.templateId, targetTemplate.id));

    for (const p of prescs) {
      const currentSets = p.targetSets ?? 3;
      const reducedSets = Math.max(2, currentSets - 1);
      if (reducedSets !== currentSets) {
        await db
          .update(schema.templatePrescriptions)
          .set({ targetSets: reducedSets })
          .where(eq(schema.templatePrescriptions.id, p.id));
      }
    }
  }

  await dispatchSmartNotification({
    recipientUserId: user.id,
    eventType: "smart_reschedule_applied",
    params: {
      programTitle: targetProgram.title,
    },
  });

  revalidatePath("/");
  revalidatePath("/treinos");
  revalidatePath("/evolucao");
  return { ok: true };
}
