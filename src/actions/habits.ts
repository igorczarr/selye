"use server";

import { connection } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { and, asc, eq, gte } from "drizzle-orm";
import { getOrCreateDemoUser } from "./workout";
import { getLocalTodayDateStr } from "@/lib/date";
import {
  HABIT_PRESETS_CATALOG,
  computeHealthyHabitsSnapshot,
  resolveHabitAxis,
  type HabitAxisCode,
  type HealthyHabitsSnapshot,
} from "@/core/habits/healthy-habits-catalog";

function shiftDateStr(baseStr: string, deltaDays: number): string {
  const d = new Date(`${baseStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().split("T")[0];
}

/**
 * Carrega os hábitos saudáveis ativos do atleta (ou de um aluno específico)
 * e calcula progresso diário, streak, adesão 7d e leitura de impacto positivo.
 */
export async function getUserHealthyHabitsSnapshot(
  targetUserId?: string
): Promise<HealthyHabitsSnapshot> {
  try {
    await connection();
  } catch {
    // Fora de requisição HTTP
  }

  const currentUser = await getOrCreateDemoUser();
  const userId = targetUserId || currentUser.id;
  const todayDateStr = getLocalTodayDateStr();
  const sinceDateStr = shiftDateStr(todayDateStr, -35);

  try {
    const [habitRows, logRows] = await Promise.all([
      db
        .select()
        .from(schema.userHealthyHabits)
        .where(
          and(
            eq(schema.userHealthyHabits.userId, userId),
            eq(schema.userHealthyHabits.isActive, true)
          )
        )
        .orderBy(
          asc(schema.userHealthyHabits.sortOrder),
          asc(schema.userHealthyHabits.createdAt)
        ),
      db
        .select()
        .from(schema.dailyHabitLogs)
        .where(
          and(
            eq(schema.dailyHabitLogs.userId, userId),
            gte(schema.dailyHabitLogs.localDate, sinceDateStr)
          )
        ),
    ]);

    return computeHealthyHabitsSnapshot({
      habits: habitRows.map((h) => ({
        id: h.id,
        axisCode: h.axisCode,
        presetCode: h.presetCode,
        title: h.title,
        targetLabel: h.targetLabel,
        positiveImpactPt: h.positiveImpactPt,
        eaImpact: h.eaImpact,
        createdByRole: h.createdByRole,
        isActive: h.isActive,
      })),
      logs: logRows.map((l) => ({
        habitId: l.habitId,
        localDate: String(l.localDate).slice(0, 10),
        completed: l.completed,
      })),
      todayDateStr,
    });
  } catch {
    return computeHealthyHabitsSnapshot({
      habits: [],
      logs: [],
      todayDateStr,
    });
  }
}

export interface AddHealthyHabitInput {
  presetCode?: string | null;
  axisCode: HabitAxisCode;
  title: string;
  targetLabel?: string | null;
  positiveImpactPt?: string | null;
  eaImpact?: number;
  targetUserId?: string;
  createdByRole?: "athlete" | "coach";
}

/**
 * Adiciona um hábito saudável do catálogo ou personalizado à rotina do aluno.
 * Pode ser chamado pelo próprio aluno (no Perfil) ou pelo treinador (no Painel do Coach).
 */
export async function addHealthyHabit(input: AddHealthyHabitInput) {
  const actor = await getOrCreateDemoUser();
  const targetUserId = input.targetUserId || actor.id;
  const createdByRole =
    input.createdByRole || (targetUserId !== actor.id ? "coach" : "athlete");

  const preset = input.presetCode
    ? HABIT_PRESETS_CATALOG.find((p) => p.code === input.presetCode)
    : undefined;

  const axis = resolveHabitAxis(preset?.axisCode || input.axisCode);
  const cleanTitle = (input.title || preset?.titlePt || "").trim();
  if (!cleanTitle) {
    throw new Error("Informe o nome do hábito saudável.");
  }

  // Evita duplicação exata de hábito ativo com o mesmo título ou presetCode
  const existing = await db
    .select()
    .from(schema.userHealthyHabits)
    .where(
      and(
        eq(schema.userHealthyHabits.userId, targetUserId),
        eq(schema.userHealthyHabits.isActive, true)
      )
    );

  const duplicate = existing.find(
    (h) =>
      (preset?.code && h.presetCode === preset.code) ||
      h.title.trim().toLowerCase() === cleanTitle.toLowerCase()
  );
  if (duplicate) {
    return { ok: true as const, habit: duplicate, alreadyExists: true };
  }

  const [created] = await db
    .insert(schema.userHealthyHabits)
    .values({
      userId: targetUserId,
      createdByUserId: actor.id,
      createdByRole,
      axisCode: axis.code,
      presetCode: preset?.code || null,
      title: cleanTitle,
      targetLabel:
        input.targetLabel?.trim() || preset?.targetLabelPt || null,
      positiveImpactPt:
        input.positiveImpactPt?.trim() ||
        preset?.positiveImpactPt ||
        axis.defaultImpactPt,
      eaImpact: Math.max(
        10,
        Math.min(120, Math.round(input.eaImpact ?? preset?.eaImpact ?? 40))
      ),
      isActive: true,
      sortOrder: existing.length,
    })
    .returning();

  revalidatePath("/");
  revalidatePath("/perfil");
  revalidatePath("/coach");
  return { ok: true as const, habit: created, alreadyExists: false };
}

/**
 * Ativa de uma vez o pacote essencial de 6 hábitos saudáveis (água, sol, mobilidade, respiração, caminhada, refeições limpas).
 */
export async function addStarterHealthyHabitsPack(targetUserId?: string) {
  const actor = await getOrCreateDemoUser();
  const userId = targetUserId || actor.id;
  const createdByRole = userId !== actor.id ? "coach" : "athlete";

  const existing = await db
    .select()
    .from(schema.userHealthyHabits)
    .where(
      and(
        eq(schema.userHealthyHabits.userId, userId),
        eq(schema.userHealthyHabits.isActive, true)
      )
    );

  const existingPresets = new Set(existing.map((h) => h.presetCode).filter(Boolean));
  const existingTitles = new Set(existing.map((h) => h.title.trim().toLowerCase()));

  const featured = HABIT_PRESETS_CATALOG.filter((p) => p.featured);
  let order = existing.length;
  let addedCount = 0;

  for (const preset of featured) {
    if (
      existingPresets.has(preset.code) ||
      existingTitles.has(preset.titlePt.trim().toLowerCase())
    ) {
      continue;
    }

    await db.insert(schema.userHealthyHabits).values({
      userId,
      createdByUserId: actor.id,
      createdByRole,
      axisCode: preset.axisCode,
      presetCode: preset.code,
      title: preset.titlePt,
      targetLabel: preset.targetLabelPt,
      positiveImpactPt: preset.positiveImpactPt,
      eaImpact: preset.eaImpact,
      isActive: true,
      sortOrder: order++,
    });
    addedCount++;
  }

  revalidatePath("/");
  revalidatePath("/perfil");
  revalidatePath("/coach");
  return { ok: true as const, addedCount };
}

/**
 * Remove (arquiva) um hábito da rotina diária mantendo o histórico de registros.
 */
export async function removeHealthyHabit(habitId: string) {
  const user = await getOrCreateDemoUser();

  await db
    .update(schema.userHealthyHabits)
    .set({ isActive: false, updatedAt: new Date() })
    .where(
      and(
        eq(schema.userHealthyHabits.id, habitId),
        eq(schema.userHealthyHabits.userId, user.id)
      )
    );

  revalidatePath("/");
  revalidatePath("/perfil");
  return { ok: true as const };
}

/**
 * Marca ou desmarca um hábito saudável como feito no dia atual (fuso America/Sao_Paulo).
 */
export async function toggleDailyHabitLog(
  habitId: string,
  localDate?: string
) {
  const user = await getOrCreateDemoUser();
  const dateStr =
    localDate && /^\d{4}-\d{2}-\d{2}$/.test(localDate)
      ? localDate
      : getLocalTodayDateStr();

  const [existing] = await db
    .select()
    .from(schema.dailyHabitLogs)
    .where(
      and(
        eq(schema.dailyHabitLogs.habitId, habitId),
        eq(schema.dailyHabitLogs.userId, user.id),
        eq(schema.dailyHabitLogs.localDate, dateStr)
      )
    )
    .limit(1);

  const now = new Date();
  let nextCompleted = true;

  if (existing) {
    nextCompleted = !existing.completed;
    await db
      .update(schema.dailyHabitLogs)
      .set({
        completed: nextCompleted,
        completedAt: nextCompleted ? now : null,
        updatedAt: now,
      })
      .where(eq(schema.dailyHabitLogs.id, existing.id));
  } else {
    await db.insert(schema.dailyHabitLogs).values({
      habitId,
      userId: user.id,
      localDate: dateStr,
      completed: true,
      completedAt: now,
      updatedAt: now,
    });
  }

  revalidatePath("/");
  revalidatePath("/perfil");
  revalidatePath("/evolucao");
  return { ok: true as const, completed: nextCompleted, localDate: dateStr };
}
