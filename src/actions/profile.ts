"use server";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getOrCreateDemoUser, getDashboardData } from "./workout";
import { getUserAchievements, getAchievementsCatalog } from "./achievements";
import { getUserHealthyHabitsSnapshot } from "./habits";
import {
  calibrateInitialEaFromOnboarding,
  type EaOnboardingCalibrationResult,
  type EaOnboardingInput,
} from "@/core/ml/ea-onboarding-calibrator";
import {
  MODALITY_REGISTRY,
  type CoreModalityCode,
} from "@/core/modalities";

export async function getProfileData() {
  const user = await getOrCreateDemoUser();

  const [profile] = await db
    .select()
    .from(schema.profiles)
    .where(eq(schema.profiles.userId, user.id))
    .limit(1);

  const metrics = await db
    .select()
    .from(schema.bodyMetrics)
    .where(eq(schema.bodyMetrics.userId, user.id))
    .orderBy(desc(schema.bodyMetrics.recordedAt));

  const userSportsList = await db
    .select({
      id: schema.userSports.id,
      sportId: schema.userSports.sportId,
      experienceLevel: schema.userSports.experienceLevel,
      isPriority: schema.userSports.isPriority,
      role: schema.userSports.role,
      targetKpiKey: schema.userSports.targetKpiKey,
      targetKpiValue: schema.userSports.targetKpiValue,
      targetKpiUnit: schema.userSports.targetKpiUnit,
      weeklySessionsTarget: schema.userSports.weeklySessionsTarget,
      namePt: schema.sports.namePt,
      code: schema.sports.code,
      icon: schema.sports.icon,
    })
    .from(schema.userSports)
    .innerJoin(schema.sports, eq(schema.userSports.sportId, schema.sports.id))
    .where(eq(schema.userSports.userId, user.id));

  const allAvailableSports = await db.select().from(schema.sports);

  const [streak] = await db
    .select()
    .from(schema.streaks)
    .where(eq(schema.streaks.userId, user.id))
    .limit(1);

  const [weeklyGoal] = await db
    .select()
    .from(schema.weeklyGoals)
    .where(eq(schema.weeklyGoals.userId, user.id))
    .orderBy(desc(schema.weeklyGoals.createdAt))
    .limit(1);

  const [userAchievements, achievementsCatalog, healthyHabits] =
    await Promise.all([
      getUserAchievements(user.id),
      getAchievementsCatalog(),
      getUserHealthyHabitsSnapshot(user.id),
    ]);

  let eaCondition = {
    reservePercent: 82,
    availableReserveEa: 1455,
    personalCapacityEa: 1800,
    modelConfidencePercent: 32,
    learningStageLabel: "Conhecendo seu Ritmo",
  };
  try {
    const dash = await getDashboardData();
    const ap = dash.performanceSummary.adaptiveProfile;
    eaCondition = {
      reservePercent: ap.reservePercent,
      availableReserveEa: ap.availableReserveEa,
      personalCapacityEa: ap.personalCapacityEa,
      modelConfidencePercent: ap.modelConfidencePercent,
      learningStageLabel: ap.learningStageLabel,
    };
  } catch {
    // fallback seguro
  }

  return {
    user,
    profile: profile || null,
    metrics,
    userSportsList,
    allAvailableSports,
    streak: streak || null,
    weeklyGoal: weeklyGoal || null,
    userAchievements,
    achievementsCatalog,
    eaCondition,
    healthyHabits,
  };
}

export interface SaveOnboardingPayload extends EaOnboardingInput {
  targetKpiKey?: string | null;
  baselineKpiValue?: number | null;
  targetKpiValue?: number | null;
  goalSummaryText?: string | null;
}

/**
 * Salva o Onboarding Científico completo (§Fase 2):
 * - Calibra EA individual no servidor
 * - Persiste perfil fisiológico em `profiles.ea_calibration` e `onboarding_completed_at`
 * - Vincula modalidade principal (`role='primary'`) + complementares (`role='complementary'`) em `user_sports`
 * - Atualiza meta semanal (`weekly_goals`), biometria privada (`body_metrics`) e baseline de KPI (`athlete_kpi_measurements`)
 */
export async function saveAthleteOnboardingProfile(
  payload: SaveOnboardingPayload
): Promise<{ ok: true; calibration: EaOnboardingCalibrationResult }> {
  const user = await getOrCreateDemoUser();
  const calibration = calibrateInitialEaFromOnboarding(payload);
  const spec = MODALITY_REGISTRY[payload.primaryModality];
  const primaryKpiDef =
    spec.kpis.find((k) => k.key === payload.targetKpiKey) ||
    spec.kpis.find((k) => k.isPrimaryGoalMetric) ||
    spec.kpis[0];

  const now = new Date();
  const goalLabels: string[] = [
    payload.goalSummaryText?.trim() || `${spec.shortNamePt} · ${primaryKpiDef.shortLabelPt}`,
  ];

  // 1. Upsert do perfil com a calibração científica de EA
  const [existingProfile] = await db
    .select()
    .from(schema.profiles)
    .where(eq(schema.profiles.userId, user.id))
    .limit(1);

  if (existingProfile) {
    await db
      .update(schema.profiles)
      .set({
        experienceLevel: payload.experienceLevel,
        goals: goalLabels,
        eaCalibration: calibration,
        onboardingCompletedAt: now,
        updatedAt: now,
      })
      .where(eq(schema.profiles.userId, user.id));
  } else {
    await db.insert(schema.profiles).values({
      userId: user.id,
      experienceLevel: payload.experienceLevel,
      goals: goalLabels,
      eaCalibration: calibration,
      onboardingCompletedAt: now,
    });
  }

  // 2. Sincronizar modalidades (principal + complementares) em `user_sports`
  const allSports = await db.select().from(schema.sports);
  const sportIdByCode = Object.fromEntries(allSports.map((s) => [s.code, s.id]));

  await db.delete(schema.userSports).where(eq(schema.userSports.userId, user.id));

  const primarySportId = sportIdByCode[payload.primaryModality];
  if (primarySportId) {
    await db.insert(schema.userSports).values({
      userId: user.id,
      sportId: primarySportId,
      experienceLevel: payload.experienceLevel,
      isPriority: true,
      role: "primary",
      targetKpiKey: primaryKpiDef.key,
      targetKpiValue:
        typeof payload.targetKpiValue === "number" && !Number.isNaN(payload.targetKpiValue)
          ? payload.targetKpiValue
          : null,
      targetKpiUnit: primaryKpiDef.unit,
      weeklySessionsTarget: calibration.inputs.targetDaysPerWeek,
      updatedAt: now,
    });
  }

  for (const compCode of calibration.inputs.complementaryModalities as CoreModalityCode[]) {
    const compSportId = sportIdByCode[compCode];
    if (!compSportId) continue;
    const compRec =
      compCode === "strength"
        ? spec.complementaryStrength.recommendedFrequencyPerWeek[payload.experienceLevel].min
        : 1;
    await db.insert(schema.userSports).values({
      userId: user.id,
      sportId: compSportId,
      experienceLevel: payload.experienceLevel,
      isPriority: false,
      role: "complementary",
      weeklySessionsTarget: compRec,
      updatedAt: now,
    });
  }

  // 3. Atualizar meta semanal de dias de treino (`weekly_goals`)
  const todayIso = now.toISOString().split("T")[0];
  await db.insert(schema.weeklyGoals).values({
    userId: user.id,
    targetDaysPerWeek: calibration.inputs.targetDaysPerWeek,
    effectiveFrom: todayIso,
  });

  // 4. Registrar biometria privada opcional (Peso e FC de repouso) se informados
  if (
    typeof payload.bodyWeightKg === "number" &&
    payload.bodyWeightKg >= 35 &&
    payload.bodyWeightKg <= 200
  ) {
    await db.insert(schema.bodyMetrics).values({
      userId: user.id,
      metricType: "weight",
      valueNumeric: payload.bodyWeightKg,
      unit: "kg",
      visibility: "private",
      source: "onboarding",
    });
  }

  if (
    typeof payload.restingHrBpm === "number" &&
    payload.restingHrBpm >= 35 &&
    payload.restingHrBpm <= 105
  ) {
    await db.insert(schema.bodyMetrics).values({
      userId: user.id,
      metricType: "resting_hr",
      valueNumeric: payload.restingHrBpm,
      unit: "bpm",
      visibility: "private",
      source: "onboarding",
    });
  }

  // 5. Registrar marca inicial (baseline) do KPI se informada
  if (
    typeof payload.baselineKpiValue === "number" &&
    !Number.isNaN(payload.baselineKpiValue) &&
    payload.baselineKpiValue > 0
  ) {
    await db.insert(schema.athleteKpiMeasurements).values({
      userId: user.id,
      sportId: primarySportId || null,
      modalityCode: payload.primaryModality,
      kpiKey: primaryKpiDef.key,
      valueNumeric: payload.baselineKpiValue,
      unit: primaryKpiDef.unit,
      source: "manual_test",
      measuredAt: now,
      notes: "Linha de base informada no onboarding científico",
    });
  }

  revalidatePath("/");
  revalidatePath("/perfil");
  revalidatePath("/onboarding");
  revalidatePath("/calendario");
  revalidatePath("/evolucao");
  revalidatePath("/performance");

  return { ok: true, calibration };
}

export async function logBodyMetric(metricType: string, valueNumeric: number, unit: string) {
  const user = await getOrCreateDemoUser();

  const [metric] = await db
    .insert(schema.bodyMetrics)
    .values({
      userId: user.id,
      metricType,
      valueNumeric,
      unit,
      visibility: "private", // Privado por padrão (§7.2 e §19.2)
      source: "manual",
    })
    .returning();

  revalidatePath("/perfil");
  return metric;
}

export async function updateFavoriteSports(selectedSportIds: { sportId: string; experienceLevel: string }[]) {
  const user = await getOrCreateDemoUser();

  // Limpa anteriores e insere novas
  await db.delete(schema.userSports).where(eq(schema.userSports.userId, user.id));

  for (const s of selectedSportIds) {
    await db.insert(schema.userSports).values({
      userId: user.id,
      sportId: s.sportId,
      experienceLevel: s.experienceLevel || "intermediate",
      isPriority: true,
    });
  }

  revalidatePath("/perfil");
  revalidatePath("/");
}

/**
 * Exportação de dados do titular (LGPD Art. 18 / Briefing §19.1)
 */
export async function exportUserData() {
  const user = await getOrCreateDemoUser();

  const [profile] = await db.select().from(schema.profiles).where(eq(schema.profiles.userId, user.id));
  const metrics = await db.select().from(schema.bodyMetrics).where(eq(schema.bodyMetrics.userId, user.id));
  const workouts = await db.select().from(schema.workoutSessions).where(eq(schema.workoutSessions.userId, user.id));
  const activities = await db.select().from(schema.activityEvents).where(eq(schema.activityEvents.userId, user.id));
  const posts = await db.select().from(schema.posts).where(eq(schema.posts.userId, user.id));

  return {
    exportDate: new Date().toISOString(),
    user,
    profile,
    bodyMetrics: metrics,
    workoutSessions: workouts,
    activityEvents: activities,
    socialPosts: posts,
  };
}
