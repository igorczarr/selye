"use server";

import { connection } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { getOrCreateDemoUser, getDashboardData } from "./workout";
import { dispatchSmartNotification } from "./notifications";
import {
  planEnergeticGrowthCurve,
  selectOptimalWorkoutJsDays,
  type EnergeticGrowthPlanResult,
  type PlanningGoalMode,
} from "@/core/planning/energetic-cycle-planner";
import {
  reconcileEnergeticPlanProgress,
  type EnergeticPlanLiveProgress,
  type StoredCalendarCommitmentInput,
} from "@/core/planning/plan-progress";
import {
  evaluateDailyPlanCoach,
  type DailyPlanCoachResult,
} from "@/core/planning/daily-plan-coach";

export interface SavedPlanningGoalRecord {
  id: string;
  mode: PlanningGoalMode;
  eventTitle: string;
  modalityLabel: string;
  startDate: string;
  targetDate: string;
  initialEa: number;
  targetEa: number;
  projectedPeakEa: number;
  targetDaysPerWeek: number;
  preferredWorkoutDays: number[];
  status: string;
  notes: string | null;
  createdAt: string;
}

export interface ActivePlanningSnapshot {
  hasCustomGoal: boolean;
  activeGoal: SavedPlanningGoalRecord | null;
  pastGoals: SavedPlanningGoalRecord[];
  plan: EnergeticGrowthPlanResult;
  progress: EnergeticPlanLiveProgress;
  dailyCoach: DailyPlanCoachResult;
  commitments: StoredCalendarCommitmentInput[];
  realCurrentEa: number;
  personalCapacityEa: number;
  strengthRecordsCount: number;
  monthlyVolumeKg: number;
  todayDateStr: string;
}

export interface SavePlanningGoalInput {
  mode: PlanningGoalMode;
  eventTitle: string;
  modalityLabel?: string;
  targetDate: string; // YYYY-MM-DD
  targetEa: number;
  initialEa?: number;
  targetDaysPerWeek?: number;
  preferredWorkoutDays?: number[];
  notes?: string;
}

export interface AddCalendarCommitmentInput {
  localDate: string; // YYYY-MM-DD
  kind: "personal_block" | "custom_habit" | "custom_workout" | "event_milestone";
  title: string;
  notes?: string;
  blocksWorkout?: boolean;
  eaSignedDelta?: number;
  goalId?: string | null;
}

function normalizeDateString(raw: string | Date): string {
  if (raw instanceof Date) {
    return raw.toISOString().split("T")[0];
  }
  const str = String(raw || "");
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.slice(0, 10);
  }
  return new Date().toISOString().split("T")[0];
}

function addDaysUtc(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

/**
 * Carrega o estado completo e vivo do Calendário Perene de Ciclo Energético (§Fase 18):
 * - Meta/competição ativa (ou ciclo perene automático de 28 dias caso o usuário ainda não tenha definido uma prova)
 * - Compromissos pessoais e bloqueios de agenda salvos no banco
 * - Checklist diário concluído com recálculo em tempo real da distância até a meta de EA
 */
export async function getActivePlanningSnapshot(): Promise<ActivePlanningSnapshot> {
  try {
    await connection();
  } catch {
    // Fora de requisição HTTP
  }

  const dashboard = await getDashboardData();
  const user = dashboard.user;
  const adaptive = dashboard.performanceSummary.adaptiveProfile;
  const todayDateStr = new Date().toISOString().split("T")[0];

  const [goalRows, commitmentRows, checkinRows, prRows] = await Promise.all([
    db
      .select()
      .from(schema.planningGoals)
      .where(eq(schema.planningGoals.userId, user.id))
      .orderBy(desc(schema.planningGoals.createdAt))
      .limit(12),
    db
      .select()
      .from(schema.calendarCommitments)
      .where(eq(schema.calendarCommitments.userId, user.id))
      .orderBy(desc(schema.calendarCommitments.localDate))
      .limit(120),
    db
      .select()
      .from(schema.planDailyCheckins)
      .where(
        and(
          eq(schema.planDailyCheckins.userId, user.id),
          eq(schema.planDailyCheckins.completed, true)
        )
      )
      .limit(400),
    db
      .select({ id: schema.setLogs.id })
      .from(schema.setLogs)
      .innerJoin(
        schema.workoutSessions,
        eq(schema.setLogs.sessionId, schema.workoutSessions.id)
      )
      .where(
        and(
          eq(schema.workoutSessions.userId, user.id),
          eq(schema.setLogs.isCompleted, true)
        )
      )
      .limit(30),
  ]);

  const mappedGoals: SavedPlanningGoalRecord[] = goalRows.map((g) => ({
    id: g.id,
    mode:
      g.mode === "competition" ? "competition" : "wellness_constancy",
    eventTitle: g.eventTitle,
    modalityLabel: g.modalityLabel,
    startDate: normalizeDateString(g.startDate),
    targetDate: normalizeDateString(g.targetDate),
    initialEa: g.initialEa,
    targetEa: g.targetEa,
    projectedPeakEa: g.projectedPeakEa,
    targetDaysPerWeek: g.targetDaysPerWeek,
    preferredWorkoutDays: Array.isArray(g.preferredWorkoutDays)
      ? g.preferredWorkoutDays
      : selectOptimalWorkoutJsDays(g.targetDaysPerWeek),
    status: g.status,
    notes: g.notes,
    createdAt: new Date(g.createdAt).toISOString(),
  }));

  const activeGoal =
    mappedGoals.find((g) => g.status === "active") || null;
  const pastGoals = mappedGoals.filter((g) => g.status !== "active");

  const commitments: StoredCalendarCommitmentInput[] = commitmentRows.map(
    (c) => ({
      id: c.id,
      localDate: normalizeDateString(c.localDate),
      kind: c.kind,
      title: c.title,
      notes: c.notes,
      blocksWorkout: c.blocksWorkout,
      eaSignedDelta: c.eaSignedDelta,
    })
  );

  const blockedDates = commitments
    .filter((c) => c.blocksWorkout)
    .map((c) => c.localDate);

  const relevantCheckins = activeGoal
    ? checkinRows.filter(
        (c) => c.goalId === activeGoal.id || c.goalId === null
      )
    : checkinRows;

  const completedKeys = relevantCheckins.map((c) => c.commitmentKey);

  // Calcula bônus real de hábitos de recarga concluídos no checklist do plano
  const planRechargeHabitBonusEa = relevantCheckins
    .filter((c) => c.kind === "recharge_habit" && c.eaSignedDelta > 0)
    .reduce((acc, c) => acc + Math.min(140, c.eaSignedDelta), 0);

  const baseCurrentEa = Math.max(
    400,
    Math.round(adaptive.availableReserveEa || adaptive.personalCapacityEa || 1455)
  );
  const realCurrentEa = baseCurrentEa + Math.round(planRechargeHabitBonusEa * 0.35);
  const strengthRecordsCount = Math.min(12, Math.floor(prRows.length / 3));

  const plan = activeGoal
    ? planEnergeticGrowthCurve({
        mode: activeGoal.mode,
        eventTitle: activeGoal.eventTitle,
        modalityLabelPt: activeGoal.modalityLabel,
        currentEa: activeGoal.initialEa,
        targetEa: activeGoal.targetEa,
        startDateStr: activeGoal.startDate,
        targetDateStr: activeGoal.targetDate,
        targetDaysPerWeek: activeGoal.targetDaysPerWeek,
        preferredWorkoutJsDays: activeGoal.preferredWorkoutDays,
        blockedDates,
        strengthRecordsCount,
        monthlyVolumeKg: dashboard.stats.monthlyVolumeKg,
      })
    : planEnergeticGrowthCurve({
        mode: "wellness_constancy",
        eventTitle: "Ciclo de Vitalidade & Constância",
        modalityLabelPt: "Multimodal & Força",
        currentEa: baseCurrentEa,
        targetEa: Math.round(baseCurrentEa * 1.15),
        startDateStr: todayDateStr,
        targetDateStr: addDaysUtc(todayDateStr, 28),
        targetDaysPerWeek: dashboard.stats.targetDaysPerWeek || 4,
        blockedDates,
        strengthRecordsCount,
        monthlyVolumeKg: dashboard.stats.monthlyVolumeKg,
      });

  const progress = reconcileEnergeticPlanProgress({
    plan,
    currentRealEa: activeGoal ? realCurrentEa : baseCurrentEa,
    todayDateStr,
    completedCommitmentKeys: completedKeys,
    customCommitments: commitments,
  });

  const dailyCoach = evaluateDailyPlanCoach({
    plan,
    progress,
    todayReadinessScore:
      dashboard.performanceSummary.dailyDecision?.readinessScore ?? null,
    todayDecisionTier:
      dashboard.performanceSummary.dailyDecision?.tier ?? "green_push",
  });

  return {
    hasCustomGoal: Boolean(activeGoal),
    activeGoal,
    pastGoals,
    plan,
    progress,
    dailyCoach,
    commitments,
    realCurrentEa: activeGoal ? realCurrentEa : baseCurrentEa,
    personalCapacityEa: adaptive.personalCapacityEa,
    strengthRecordsCount,
    monthlyVolumeKg: dashboard.stats.monthlyVolumeKg,
    todayDateStr,
  };
}

/**
 * Cria ou substitui a Meta / Competição ativa do usuário no Calendário Energético,
 * gerando a curva de crescimento e notificando o usuário no Sininho e por E-mail (Resend).
 */
export async function savePlanningGoal(input: SavePlanningGoalInput) {
  const dashboard = await getDashboardData();
  const user = dashboard.user;
  const adaptive = dashboard.performanceSummary.adaptiveProfile;

  const todayDateStr = new Date().toISOString().split("T")[0];
  const cleanTitle = input.eventTitle.trim();
  if (!cleanTitle) {
    throw new Error("Informe o nome do seu objetivo ou competição.");
  }

  const cleanTargetDate = /^\d{4}-\d{2}-\d{2}$/.test(input.targetDate)
    ? input.targetDate
    : addDaysUtc(todayDateStr, 28);

  const initialEa = Math.max(
    400,
    Math.round(
      input.initialEa ??
        adaptive.availableReserveEa ??
        adaptive.personalCapacityEa ??
        1455
    )
  );
  const requestedTargetEa = Math.max(
    initialEa + 50,
    Math.round(input.targetEa || initialEa + 300)
  );
  const targetDaysPerWeek = Math.max(
    2,
    Math.min(6, Math.round(input.targetDaysPerWeek || dashboard.stats.targetDaysPerWeek || 4))
  );
  const preferredWorkoutDays = selectOptimalWorkoutJsDays(
    targetDaysPerWeek,
    input.preferredWorkoutDays
  );

  // Busca datas bloqueadas existentes para já computar a curva realista
  const existingBlocks = await db
    .select({
      localDate: schema.calendarCommitments.localDate,
      blocksWorkout: schema.calendarCommitments.blocksWorkout,
    })
    .from(schema.calendarCommitments)
    .where(eq(schema.calendarCommitments.userId, user.id));

  const blockedDates = existingBlocks
    .filter((b) => b.blocksWorkout)
    .map((b) => normalizeDateString(b.localDate));

  const computedPlan = planEnergeticGrowthCurve({
    mode: input.mode,
    eventTitle: cleanTitle,
    modalityLabelPt: input.modalityLabel?.trim() || "Multimodal & Força",
    currentEa: initialEa,
    targetEa: requestedTargetEa,
    startDateStr: todayDateStr,
    targetDateStr: cleanTargetDate,
    targetDaysPerWeek,
    preferredWorkoutJsDays: preferredWorkoutDays,
    blockedDates,
    monthlyVolumeKg: dashboard.stats.monthlyVolumeKg,
  });

  // Arquiva metas ativas anteriores preservando histórico
  await db
    .update(schema.planningGoals)
    .set({ status: "archived", updatedAt: new Date() })
    .where(
      and(
        eq(schema.planningGoals.userId, user.id),
        eq(schema.planningGoals.status, "active")
      )
    );

  const [created] = await db
    .insert(schema.planningGoals)
    .values({
      userId: user.id,
      mode: input.mode,
      eventTitle: cleanTitle,
      modalityLabel: input.modalityLabel?.trim() || "Multimodal & Força",
      startDate: todayDateStr,
      targetDate: computedPlan.targetDateStr,
      initialEa,
      targetEa: requestedTargetEa,
      projectedPeakEa: computedPlan.projectedPeakEa,
      targetDaysPerWeek,
      preferredWorkoutDays,
      status: "active",
      notes: input.notes?.trim() || null,
    })
    .returning();

  await dispatchSmartNotification({
    recipientUserId: user.id,
    eventType: "energetic_plan_created",
    params: {
      title: cleanTitle,
      loadEa: computedPlan.projectedPeakEa,
      actionUrl: "/calendario",
      customNotes: `${computedPlan.executiveRecipe.headlinePt} ${computedPlan.executiveRecipe.pillars[0]?.actionSummaryPt || ""}`,
    },
  });

  revalidatePath("/");
  revalidatePath("/calendario");
  revalidatePath("/evolucao");
  revalidatePath("/treinos");

  return {
    goal: created,
    plan: computedPlan,
  };
}

/**
 * Arquiva uma meta ativa (o usuário retorna suavemente ao Ciclo Perene de Constância).
 */
export async function archivePlanningGoal(goalId: string) {
  const user = await getOrCreateDemoUser();
  await db
    .update(schema.planningGoals)
    .set({ status: "archived", updatedAt: new Date() })
    .where(
      and(
        eq(schema.planningGoals.id, goalId),
        eq(schema.planningGoals.userId, user.id)
      )
    );

  revalidatePath("/");
  revalidatePath("/calendario");
  return { ok: true };
}

/**
 * Marca uma competição ou meta como concluída.
 */
export async function completePlanningGoal(goalId: string) {
  const user = await getOrCreateDemoUser();
  await db
    .update(schema.planningGoals)
    .set({ status: "completed", updatedAt: new Date() })
    .where(
      and(
        eq(schema.planningGoals.id, goalId),
        eq(schema.planningGoals.userId, user.id)
      )
    );

  revalidatePath("/");
  revalidatePath("/calendario");
  return { ok: true };
}

/**
 * Adiciona um compromisso pessoal, bloqueio de dia (viagem, trabalho, prova) ou hábito extra no calendário.
 */
export async function addCalendarCommitment(input: AddCalendarCommitmentInput) {
  const user = await getOrCreateDemoUser();
  const cleanTitle = input.title.trim();
  if (!cleanTitle) {
    throw new Error("Informe um título para o compromisso no calendário.");
  }

  const localDate = /^\d{4}-\d{2}-\d{2}$/.test(input.localDate)
    ? input.localDate
    : new Date().toISOString().split("T")[0];

  const [created] = await db
    .insert(schema.calendarCommitments)
    .values({
      userId: user.id,
      goalId: input.goalId || null,
      localDate,
      kind: input.kind,
      title: cleanTitle,
      notes: input.notes?.trim() || null,
      blocksWorkout:
        typeof input.blocksWorkout === "boolean"
          ? input.blocksWorkout
          : input.kind === "personal_block",
      eaSignedDelta: Math.round(input.eaSignedDelta || 0),
    })
    .returning();

  revalidatePath("/");
  revalidatePath("/calendario");
  return created;
}

/**
 * Remove um compromisso personalizado do calendário.
 */
export async function removeCalendarCommitment(commitmentId: string) {
  const user = await getOrCreateDemoUser();
  await db
    .delete(schema.calendarCommitments)
    .where(
      and(
        eq(schema.calendarCommitments.id, commitmentId),
        eq(schema.calendarCommitments.userId, user.id)
      )
    );

  revalidatePath("/");
  revalidatePath("/calendario");
  return { ok: true };
}

/**
 * Marca ou desmarca um item do Checklist Diário do Plano Energético
 * recalculando imediatamente a adesão e o progresso rumo à meta de EA.
 */
export async function togglePlanDailyCommitment(input: {
  commitmentKey: string;
  localDate: string;
  kind: string;
  title: string;
  eaSignedDelta?: number;
  goalId?: string | null;
}) {
  const user = await getOrCreateDemoUser();
  const localDate = /^\d{4}-\d{2}-\d{2}$/.test(input.localDate)
    ? input.localDate
    : new Date().toISOString().split("T")[0];

  const [existing] = await db
    .select()
    .from(schema.planDailyCheckins)
    .where(
      and(
        eq(schema.planDailyCheckins.userId, user.id),
        eq(schema.planDailyCheckins.commitmentKey, input.commitmentKey)
      )
    )
    .limit(1);

  if (existing) {
    const nextCompleted = !existing.completed;
    await db
      .update(schema.planDailyCheckins)
      .set({
        completed: nextCompleted,
        completedAt: new Date(),
      })
      .where(eq(schema.planDailyCheckins.id, existing.id));

    if (nextCompleted) {
      await notifyIfTodayPlanCompleted(user.id, localDate);
    }

    revalidatePath("/");
    revalidatePath("/calendario");
    return { completed: nextCompleted, commitmentKey: input.commitmentKey };
  }

  await db.insert(schema.planDailyCheckins).values({
    userId: user.id,
    goalId: input.goalId || null,
    localDate,
    commitmentKey: input.commitmentKey,
    kind: input.kind,
    title: input.title,
    eaSignedDelta: Math.round(input.eaSignedDelta || 0),
    completed: true,
  });

  await notifyIfTodayPlanCompleted(user.id, localDate);

  revalidatePath("/");
  revalidatePath("/calendario");
  return { completed: true, commitmentKey: input.commitmentKey };
}

async function notifyIfTodayPlanCompleted(userId: string, localDate: string) {
  try {
    const todayStr = new Date().toISOString().split("T")[0];
    if (localDate !== todayStr) return;

    const snap = await getActivePlanningSnapshot();
    if (snap.dailyCoach.allDoneToday) {
      await dispatchSmartNotification({
        recipientUserId: userId,
        eventType: "energetic_daily_plan_completed",
        params: {
          title: snap.plan.eventTitle,
          loadEa: snap.realCurrentEa,
          customNotes: `Todos os ${snap.dailyCoach.totalTodayCount} compromissos de hoje foram concluídos! Você está em ${snap.realCurrentEa} EA rumo aos ${snap.plan.projectedPeakEa} EA.`,
        },
      });
    }
  } catch {
    // Falha silenciosa para nunca bloquear o checklist
  }
}

/**
 * Sincronização Viva (§Fase 20):
 * Quando o usuário conclui um treino real ou marca um hábito regenerativo (+EA) no Selye,
 * o sistema marca automaticamente o compromisso correspondente de hoje no Calendário Energético.
 */
export async function autoSyncTodayPlanCommitment(
  targetKind: "workout" | "recharge_habit"
) {
  try {
    const snap = await getActivePlanningSnapshot();
    const todayDay = snap.progress.todayDay;
    if (!todayDay) return;

    const match = todayDay.commitments.find(
      (c) => !c.isCompleted && c.kind === targetKind
    );
    if (!match) return;

    const user = await getOrCreateDemoUser();
    const [existing] = await db
      .select()
      .from(schema.planDailyCheckins)
      .where(
        and(
          eq(schema.planDailyCheckins.userId, user.id),
          eq(schema.planDailyCheckins.commitmentKey, match.id)
        )
      )
      .limit(1);

    if (existing) {
      if (!existing.completed) {
        await db
          .update(schema.planDailyCheckins)
          .set({ completed: true, completedAt: new Date() })
          .where(eq(schema.planDailyCheckins.id, existing.id));
      }
    } else {
      await db.insert(schema.planDailyCheckins).values({
        userId: user.id,
        goalId: snap.activeGoal?.id || null,
        localDate: snap.todayDateStr,
        commitmentKey: match.id,
        kind: match.kind,
        title: match.titlePt,
        eaSignedDelta: Math.round(match.eaSignedDelta || 0),
        completed: true,
      });
    }

    revalidatePath("/");
    revalidatePath("/calendario");
  } catch {
    // Mantém fluxo principal resiliente
  }
}

/**
 * Envia o lembrete diário do plano energético (fase atual + passos de hoje) por E-mail via Resend
 * e salva no histórico do Sininho.
 */
export async function sendDailyPlanEmailReminder() {
  const snap = await getActivePlanningSnapshot();
  const user = await getOrCreateDemoUser();
  const todayDay = snap.progress.todayDay;

  const stepsList = (todayDay?.commitments || [])
    .map((c, idx) => `${idx + 1}. ${c.titlePt} (${c.eaImpactText})`)
    .join(" · ");

  const res = await dispatchSmartNotification({
    recipientUserId: user.id,
    eventType: "energetic_phase_shift",
    forceEmail: true,
    params: {
      title: `${snap.plan.eventTitle} · ${snap.dailyCoach.adaptation.badgePt}`,
      loadEa: snap.realCurrentEa,
      actionUrl: "/calendario",
      customNotes: `${snap.dailyCoach.adaptation.headlinePt}. Passos de hoje: ${
        stepsList || "Manter descanso e hidratação."
      } (Meta: ${snap.plan.projectedPeakEa} EA em ${snap.progress.daysRemaining} dias).`,
    },
  });

  revalidatePath("/");
  revalidatePath("/calendario");

  return {
    ok: Boolean(res.emailResult?.ok ?? res.ok),
    emailId: res.emailResult?.id,
    error: res.emailResult?.error,
  };
}
