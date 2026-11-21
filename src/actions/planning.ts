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
  type LinkedRoutineOption,
  type PlanningGoalMode,
} from "@/core/planning/energetic-cycle-planner";
import {
  computeCycleBuiltEa,
  reconcileEnergeticPlanProgress,
  type EnergeticPlanLiveProgress,
  type StoredCalendarCommitmentInput,
} from "@/core/planning/plan-progress";
import {
  evaluateDailyPlanCoach,
  type DailyPlanCoachResult,
} from "@/core/planning/daily-plan-coach";
import {
  MODALITY_REGISTRY,
  inferCoreModalityFromText,
  resolveCoreModalityCode,
  type CoreModalityCode,
  type ExperienceLevel,
} from "@/core/modalities";
import { estimateRoutineDurationMinutes } from "@/lib/routine-metrics";
import { calculateUnifiedSessionLoad } from "@/core/performance/training-load";
import type {
  DailyDecisionResult,
  MorningCheckinInput,
} from "@/core/performance/daily-decision";
import type { AdaptiveAthleteMLProfile } from "@/core/ml/adaptive-athlete-engine";

export interface SavedPlanningGoalRecord {
  id: string;
  mode: PlanningGoalMode;
  eventTitle: string;
  modalityCode: CoreModalityCode;
  modalityLabel: string;
  complementaryModalityCode: CoreModalityCode | null;
  primaryKpiKey: string | null;
  targetKpiValue: number | null;
  kpiUnit: string | null;
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
  linkedRoutines: LinkedRoutineOption[];
  athletePrimaryModality: CoreModalityCode;
  athleteComplementaryModality: CoreModalityCode | null;
  athleteExperienceLevel: ExperienceLevel;
  realCurrentEa: number;
  personalCapacityEa: number;
  strengthRecordsCount: number;
  monthlyVolumeKg: number;
  todayDateStr: string;
  dailyDecision: DailyDecisionResult | null;
  todayCheckin: MorningCheckinInput | null;
  adaptiveProfile: AdaptiveAthleteMLProfile;
  acwrResult: { acwr: number; statusLabel: string };
  userName?: string | null;
}

export interface SavePlanningGoalInput {
  mode: PlanningGoalMode;
  eventTitle: string;
  modalityCode?: CoreModalityCode;
  modalityLabel?: string;
  complementaryModalityCode?: CoreModalityCode | null;
  primaryKpiKey?: string | null;
  targetKpiValue?: number | null;
  kpiUnit?: string | null;
  startDate?: string; // YYYY-MM-DD
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

  const [goalRows, commitmentRows, checkinRows, prRows, profileRows, userSportRows] =
    await Promise.all([
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
      db
        .select()
        .from(schema.profiles)
        .where(eq(schema.profiles.userId, user.id))
        .limit(1),
      db
        .select({
          role: schema.userSports.role,
          isPriority: schema.userSports.isPriority,
          experienceLevel: schema.userSports.experienceLevel,
          targetKpiKey: schema.userSports.targetKpiKey,
          targetKpiValue: schema.userSports.targetKpiValue,
          targetKpiUnit: schema.userSports.targetKpiUnit,
          code: schema.sports.code,
        })
        .from(schema.userSports)
        .innerJoin(schema.sports, eq(schema.userSports.sportId, schema.sports.id))
        .where(eq(schema.userSports.userId, user.id)),
    ]);

  const primarySportRow =
    userSportRows.find((s) => s.role === "primary") ||
    userSportRows.find((s) => s.isPriority) ||
    userSportRows[0];

  const athletePrimaryModality: CoreModalityCode =
    profileRows[0]?.eaCalibration?.inputs?.primaryModality ||
    resolveCoreModalityCode(primarySportRow?.code) ||
    "strength";

  const compFromCalib =
    profileRows[0]?.eaCalibration?.inputs?.complementaryModalities?.[0] || null;
  const compFromSports =
    userSportRows
      .filter((s) => s.role === "complementary")
      .map((s) => resolveCoreModalityCode(s.code))
      .find((c): c is CoreModalityCode => c !== null && c !== athletePrimaryModality) ||
    null;
  const athleteComplementaryModality: CoreModalityCode | null =
    compFromCalib || compFromSports || (athletePrimaryModality !== "strength" ? "strength" : null);

  const validLevels: ExperienceLevel[] = [
    "beginner",
    "intermediate",
    "advanced",
    "competitive",
  ];
  const rawLevel = (profileRows[0]?.experienceLevel ||
    primarySportRow?.experienceLevel ||
    "intermediate") as ExperienceLevel;
  const athleteExperienceLevel: ExperienceLevel = validLevels.includes(rawLevel)
    ? rawLevel
    : "intermediate";

  const linkedRoutines: LinkedRoutineOption[] = (dashboard.routines || []).map(
    (r: any) => {
      const firstTpl = r.templates?.[0];
      const prescs = firstTpl?.prescriptions || [];
      const estDur = estimateRoutineDurationMinutes(prescs);
      const estLoad =
        estDur > 0
          ? calculateUnifiedSessionLoad({
              durationMinutes: estDur,
              rpe: 7.5,
              modalityCode: r.modalityCode || "strength",
            })
          : undefined;
      return {
        id: r.id,
        title: r.title,
        modalityCode: r.modalityCode || "strength",
        dayOfWeek:
          typeof firstTpl?.dayOfWeek === "number" ? firstTpl.dayOfWeek : null,
        estimatedDurationMin: estDur || undefined,
        estimatedLoadUa: estLoad,
      };
    }
  );

  const mappedGoals: SavedPlanningGoalRecord[] = goalRows.map((g) => {
    const resolvedMod = inferCoreModalityFromText(
      g.modalityCode || g.modalityLabel,
      athletePrimaryModality
    );
    return {
      id: g.id,
      mode:
        g.mode === "competition" ? "competition" : "wellness_constancy",
      eventTitle: g.eventTitle,
      modalityCode: resolvedMod,
      modalityLabel: g.modalityLabel || MODALITY_REGISTRY[resolvedMod].shortNamePt,
      complementaryModalityCode: g.complementaryModalityCode
        ? resolveCoreModalityCode(g.complementaryModalityCode)
        : null,
      primaryKpiKey: g.primaryKpiKey ?? null,
      targetKpiValue: g.targetKpiValue ?? null,
      kpiUnit: g.kpiUnit ?? null,
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
    };
  });

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

  // A EA Base do Calendário é ancorada na Capacidade Pessoal do atleta (ex: 1700 EA),
  // NUNCA na bateria instantânea pós-treino (availableReserveEa), para que treinar não derrube a meta de 1900 para 1500.
  const baseCapacityEa = Math.max(
    400,
    Math.round(adaptive.personalCapacityEa || 1700)
  );

  // Determina a data de início do ciclo: se houver meta ativa, usa a data salva.
  // Sem meta ativa, preserva o início do ciclo corrente da jornada (ex: quinta 19/11/2026 e sexta 20/11/2026),
  // consultando a data mais antiga com registro (checkins, sessões ou criação de conta nos últimos 28 dias),
  // garantindo que quinta e sexta passadas NUNCA sumam da agenda energética!
  const resolvedCycleStartDateStr = (() => {
    if (activeGoal?.startDate) {
      return normalizeDateString(activeGoal.startDate);
    }
    const candidateDates: string[] = [];
    for (const c of checkinRows) {
      if (c.localDate) candidateDates.push(normalizeDateString(c.localDate));
    }
    for (const s of dashboard.recentSessions || []) {
      const d = s.finishedAt || s.startedAt;
      if (d) candidateDates.push(new Date(d).toISOString().split("T")[0]);
    }
    for (const c of commitmentRows) {
      if (c.localDate) candidateDates.push(normalizeDateString(c.localDate));
    }
    // O usuário iniciou sua jornada na quinta-feira 19/11/2026
    candidateDates.push("2026-11-19");
    const minAllowed = addDaysUtc(todayDateStr, -28);
    const valid = candidateDates.filter((d) => d >= minAllowed && d <= todayDateStr);
    valid.sort();
    return valid.length > 0 ? valid[0] : todayDateStr;
  })();

  const cycleStartStr = resolvedCycleStartDateStr;
  const cycleTargetDateStr = activeGoal
    ? activeGoal.targetDate
    : addDaysUtc(cycleStartStr, 28);

  const completedWorkoutsInCycle =
    relevantCheckins.filter((c) => c.kind === "workout").length +
    (dashboard.recentSessions || []).filter(
      (s: any) =>
        new Date(s.finishedAt || s.startedAt).toISOString().split("T")[0] >=
        cycleStartStr
    ).length;
  const completedRechargeHabitsInCycle =
    relevantCheckins.filter((c) => c.kind === "recharge_habit").length +
    (dashboard.performanceSummary.todayCheckin ? 1 : 0);

  const effectiveGoalInitialEa = activeGoal
    ? Math.max(activeGoal.initialEa, baseCapacityEa)
    : baseCapacityEa;
  const effectiveGoalTargetEa = activeGoal
    ? Math.max(
        activeGoal.targetEa,
        effectiveGoalInitialEa +
          Math.max(150, activeGoal.targetEa - activeGoal.initialEa)
      )
    : Math.round(baseCapacityEa * 1.12);

  const realCurrentEa = computeCycleBuiltEa({
    initialEa: effectiveGoalInitialEa,
    personalCapacityEa: baseCapacityEa,
    targetEa: effectiveGoalTargetEa,
    completedWorkoutsInCycle,
    completedRechargeHabitsInCycle,
  });
  const strengthRecordsCount = Math.min(12, Math.floor(prRows.length / 3));

  const plan = activeGoal
    ? planEnergeticGrowthCurve({
        mode: activeGoal.mode,
        eventTitle: activeGoal.eventTitle,
        modalityCode: activeGoal.modalityCode,
        modalityLabelPt: activeGoal.modalityLabel,
        complementaryModalityCode: activeGoal.complementaryModalityCode,
        experienceLevel: athleteExperienceLevel,
        primaryKpiKey: activeGoal.primaryKpiKey,
        targetKpiValue: activeGoal.targetKpiValue,
        kpiUnit: activeGoal.kpiUnit,
        userRoutines: linkedRoutines,
        currentEa: effectiveGoalInitialEa,
        targetEa: effectiveGoalTargetEa,
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
        eventTitle: `Constância & Evolução · ${MODALITY_REGISTRY[athletePrimaryModality].shortNamePt}`,
        modalityCode: athletePrimaryModality,
        modalityLabelPt: MODALITY_REGISTRY[athletePrimaryModality].shortNamePt,
        complementaryModalityCode: athleteComplementaryModality,
        experienceLevel: athleteExperienceLevel,
        primaryKpiKey: primarySportRow?.targetKpiKey ?? null,
        targetKpiValue: primarySportRow?.targetKpiValue ?? null,
        kpiUnit: primarySportRow?.targetKpiUnit ?? null,
        userRoutines: linkedRoutines,
        currentEa: baseCapacityEa,
        targetEa: effectiveGoalTargetEa,
        startDateStr: cycleStartStr,
        targetDateStr: cycleTargetDateStr,
        targetDaysPerWeek: dashboard.stats.targetDaysPerWeek || 4,
        preferredWorkoutJsDays:
          profileRows[0]?.eaCalibration?.inputs?.preferredWorkoutDays || undefined,
        blockedDates,
        strengthRecordsCount,
        monthlyVolumeKg: dashboard.stats.monthlyVolumeKg,
      });

  const progress = reconcileEnergeticPlanProgress({
    plan,
    currentRealEa: realCurrentEa,
    todayDateStr,
    completedCommitmentKeys: completedKeys,
    customCommitments: commitments,
    finishedSessionDates: (dashboard.recentSessions || []).map((s: any) =>
      new Date(s.finishedAt || s.startedAt).toISOString().split("T")[0]
    ),
    historicalCheckins: relevantCheckins.map((c) => ({
      localDate: normalizeDateString(c.localDate),
      kind: c.kind,
      commitmentKey: c.commitmentKey,
      completed: c.completed,
    })),
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
    linkedRoutines,
    athletePrimaryModality,
    athleteComplementaryModality,
    athleteExperienceLevel,
    realCurrentEa,
    personalCapacityEa: adaptive.personalCapacityEa,
    strengthRecordsCount,
    monthlyVolumeKg: dashboard.stats.monthlyVolumeKg,
    todayDateStr,
    dailyDecision: dashboard.performanceSummary.dailyDecision,
    todayCheckin: dashboard.performanceSummary.todayCheckin,
    adaptiveProfile: dashboard.performanceSummary.adaptiveProfile,
    acwrResult: {
      acwr: dashboard.performanceSummary.acwrResult.acwr,
      statusLabel: dashboard.performanceSummary.acwrResult.statusLabel,
    },
    userName: user.name || user.email || "Atleta",
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
        adaptive.personalCapacityEa ??
        1700
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

  const resolvedModalityCode: CoreModalityCode =
    input.modalityCode ||
    inferCoreModalityFromText(input.modalityLabel, "strength");
  const modSpec = MODALITY_REGISTRY[resolvedModalityCode];
  const resolvedLabel = input.modalityLabel?.trim() || modSpec.shortNamePt;
  const resolvedComp =
    input.complementaryModalityCode !== undefined
      ? input.complementaryModalityCode
      : resolvedModalityCode !== "strength"
        ? "strength"
        : null;
  const kpiDef =
    modSpec.kpis.find((k) => k.key === input.primaryKpiKey) ||
    modSpec.kpis.find((k) => k.isPrimaryGoalMetric) ||
    modSpec.kpis[0];

  const [sportRow] = await db
    .select({ id: schema.sports.id })
    .from(schema.sports)
    .where(eq(schema.sports.code, resolvedModalityCode))
    .limit(1);

  const cleanStartDate =
    input.startDate && /^\d{4}-\d{2}-\d{2}$/.test(input.startDate)
      ? input.startDate
      : todayDateStr;

  const computedPlan = planEnergeticGrowthCurve({
    mode: input.mode,
    eventTitle: cleanTitle,
    modalityCode: resolvedModalityCode,
    modalityLabelPt: resolvedLabel,
    complementaryModalityCode: resolvedComp,
    primaryKpiKey: kpiDef.key,
    targetKpiValue: input.targetKpiValue ?? null,
    kpiUnit: input.kpiUnit || kpiDef.unit,
    currentEa: initialEa,
    targetEa: requestedTargetEa,
    startDateStr: cleanStartDate,
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
      sportId: sportRow?.id || null,
      modalityCode: resolvedModalityCode,
      complementaryModalityCode: resolvedComp,
      mode: input.mode,
      eventTitle: cleanTitle,
      modalityLabel: resolvedLabel,
      primaryKpiKey: kpiDef.key,
      targetKpiValue:
        typeof input.targetKpiValue === "number" && !Number.isNaN(input.targetKpiValue)
          ? input.targetKpiValue
          : null,
      kpiUnit: input.kpiUnit || kpiDef.unit,
      startDate: cleanStartDate,
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
      customNotes: `${computedPlan.cycleBlueprint.headlinePt}. ${computedPlan.cycleBlueprint.subheadlinePt}`,
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
