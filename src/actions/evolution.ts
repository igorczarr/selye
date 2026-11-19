"use server";

import { connection } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { getOrCreateDemoUser } from "./workout";
import {
  aggregateDailyLoads,
  calculateACWR,
  calculateUnifiedSessionLoad,
  calculateWeeklyRecoveryBudget,
  getModalityProfile,
  type ACWRResult,
  type RecoveryBudgetResult,
} from "@/core/performance/training-load";
import {
  evaluateDailyDecision,
  type DailyDecisionResult,
  type MorningCheckinInput,
} from "@/core/performance/daily-decision";
import {
  generatePerformanceRecommendations,
  type PerformanceRecommendation,
} from "@/core/performance/recommendations-engine";
import {
  calculateWeeklyStreak,
  getIsoWeekStart,
} from "@/core/consistency/streak-calculator";
import { getWeekdayLabelPt, jsDayToMondayIndex } from "@/lib/week";
import {
  learnAdaptiveAthleteProfile,
  RECOVERY_ATTITUDE_MAP,
  type AdaptiveAthleteMLProfile,
  type HistoricalCheckinSample,
  type LoggedRecoveryAttitude,
  type RecoveryAttitudeCode,
} from "@/core/ml/adaptive-athlete-engine";

export interface EvolutionData {
  acwrResult: ACWRResult;
  recoveryBudget: RecoveryBudgetResult;
  adaptiveProfile: AdaptiveAthleteMLProfile;
  dailyDecision: DailyDecisionResult;
  todayCheckin: MorningCheckinInput | null;
  isCurrentWeekShielded: boolean;
  recommendations: PerformanceRecommendation[];
  calibrationSessionsCount: number;
  averageRpe: number;
  consecutiveDays: number;
  last7DaysChart: { date: string; dayName: string; load: number }[];
  last28DaysChart: {
    date: string;
    shortDate: string;
    dayName: string;
    load: number;
  }[];
  metrics: {
    totalWorkouts: number;
    monthlyVolumeKg: number;
    totalVolumeKg: number;
    weeklyAdherence: number;
    activeDaysLast28: number;
    activeDaysInYear: number;
    targetDaysPerWeek: number;
    targetDaysLast28: number;
    currentWeeklyStreak: number;
    bestWeeklyStreak: number;
  };
  personalRecords: {
    exerciseId: string;
    exerciseName: string;
    maxLoadKg: number;
    reps: number;
    date: string;
  }[];
  heatmapDays: {
    date: string;
    dayNumber: number;
    weekdayShort: string;
    active: boolean;
    isToday: boolean;
    isFuture: boolean;
  }[];
  recentWorkouts: {
    id: string;
    title: string;
    modalityCode: string;
    modalityLabel: string;
    status: string;
    startedAt: string;
    finishedAt: string | null;
    rpeSession: number | null;
    loadUa: number;
  }[];
}

export async function getEvolutionData(): Promise<EvolutionData> {
  try {
    await connection();
  } catch {
    // fora de requisição HTTP
  }

  const user = await getOrCreateDemoUser();
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const past28Days = new Date(now);
  past28Days.setDate(now.getDate() - 28);
  const past28Str = past28Days.toISOString().split("T")[0];
  const currentYearPrefix = `${now.getFullYear()}-`;

  const [
    workouts,
    streakRows,
    goalRows,
    activityRows,
    recentBodyMetrics,
    userProfileRows,
  ] = await Promise.all([
    db
      .select()
      .from(schema.workoutSessions)
      .where(eq(schema.workoutSessions.userId, user.id))
      .orderBy(desc(schema.workoutSessions.startedAt))
      .limit(120),
    db
      .select()
      .from(schema.streaks)
      .where(eq(schema.streaks.userId, user.id))
      .limit(1),
    db
      .select()
      .from(schema.weeklyGoals)
      .where(eq(schema.weeklyGoals.userId, user.id))
      .limit(1),
    db
      .select()
      .from(schema.activityEvents)
      .where(eq(schema.activityEvents.userId, user.id)),
    db
      .select()
      .from(schema.bodyMetrics)
      .where(eq(schema.bodyMetrics.userId, user.id))
      .orderBy(desc(schema.bodyMetrics.recordedAt))
      .limit(60),
    db
      .select()
      .from(schema.profiles)
      .where(eq(schema.profiles.userId, user.id))
      .limit(1),
  ]);

  const completedWorkouts = workouts.filter((w) => w.status === "completed");
  const last28Completed = completedWorkouts.filter(
    (w) => new Date(w.startedAt) >= past28Days
  );

  // 1. Carga fisiológica (ACWR + 28d)
  const sessionLoadInputs = last28Completed.map((s) => {
    const durationMinutes = s.finishedAt
      ? Math.max(
          15,
          Math.round(
            (new Date(s.finishedAt).getTime() -
              new Date(s.startedAt).getTime()) /
              60000
          )
        )
      : 45;
    return {
      date: new Date(s.startedAt).toISOString().split("T")[0],
      durationMinutes,
      rpe: s.rpeSession || 7,
      modality: s.modalityCode,
    };
  });

  const dailyLoads = aggregateDailyLoads(sessionLoadInputs);
  const acwrResult = calculateACWR(dailyLoads);

  let consecutiveDays = 0;
  for (let i = 0; i < 14; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = d.toISOString().split("T")[0];
    if ((dailyLoads.get(key) || 0) > 0) {
      consecutiveDays++;
    } else if (i > 0) {
      break;
    }
  }

  const weekAgoMs = now.getTime() - 7 * 24 * 3600 * 1000;
  const last7Sessions = sessionLoadInputs.filter(
    (s) => new Date(s.date).getTime() >= weekAgoMs
  );
  const averageRpe =
    last7Sessions.length > 0
      ? Math.round(
          (last7Sessions.reduce((acc, s) => acc + s.rpe, 0) /
            last7Sessions.length) *
            10
        ) / 10
      : 0;

  const targetDaysPerWeek = goalRows[0]?.targetDaysPerWeek || 4;
  const currentIsoWeekStart = getIsoWeekStart(todayStr);

  const shieldedWeeks: string[] = [];
  let todayCheckin: MorningCheckinInput | null = null;
  const checkinsLast28Days: HistoricalCheckinSample[] = [];
  const recoveryAttitudesLast7Days: LoggedRecoveryAttitude[] = [];
  let restingHrBpm: number | null = null;

  for (const row of recentBodyMetrics) {
    const recDate = new Date(row.recordedAt).toISOString().split("T")[0];
    if (
      row.metricType === "regenerative_week_shield" &&
      row.valueNumeric > 0 &&
      row.notes
    ) {
      shieldedWeeks.push(row.notes.trim());
    } else if (row.metricType === "resting_hr" && restingHrBpm === null) {
      restingHrBpm = row.valueNumeric;
    } else if (row.metricType === "morning_checkin") {
      let parsed: any = null;
      if (row.notes) {
        try {
          parsed = JSON.parse(row.notes);
        } catch {
          parsed = null;
        }
      }
      const localDate = parsed?.localDate || recDate;
      if (parsed && localDate >= past28Str) {
        const sample: HistoricalCheckinSample = {
          localDate,
          sleepQuality: Number(parsed.sleepQuality) || 4,
          energyLevel: Number(parsed.energyLevel) || 4,
          muscleFreshness: Number(parsed.muscleFreshness) || 4,
          moodLevel: Number(parsed.moodLevel) || 4,
        };
        checkinsLast28Days.push(sample);
        if (localDate === todayStr && !todayCheckin) {
          todayCheckin = sample;
        }
      }
    } else if (row.metricType === "recovery_attitude" && row.notes) {
      try {
        const parsed = JSON.parse(row.notes);
        if (parsed?.code && parsed.code in RECOVERY_ATTITUDE_MAP) {
          recoveryAttitudesLast7Days.push({
            code: parsed.code as RecoveryAttitudeCode,
            localDate: parsed.localDate || recDate,
            rechargeEa: row.valueNumeric || undefined,
          });
        }
      } catch {
        // ignora
      }
    }
  }

  const isCurrentWeekShielded = shieldedWeeks.includes(currentIsoWeekStart);

  const baseRecoveryBudget = calculateWeeklyRecoveryBudget({
    sessionsLast7Days: last7Sessions.map((s) => ({
      modalityCode: s.modality,
      durationMinutes: s.durationMinutes,
      rpe: s.rpe,
    })),
    chronicDailyLoadUa: acwrResult.chronicLoad,
    targetDaysPerWeek,
  });

  const adaptiveProfile = learnAdaptiveAthleteProfile({
    experienceLevel: userProfileRows[0]?.experienceLevel || "intermediate",
    targetDaysPerWeek,
    currentWeeklyStreak: streakRows[0]?.currentWeeklyStreak || 0,
    restingHrBpm,
    sessionsLast28Days: sessionLoadInputs.map((s) => ({
      date: s.date,
      modalityCode: s.modality || "strength",
      durationMinutes: s.durationMinutes,
      rpe: s.rpe,
      rawLoadEa: calculateUnifiedSessionLoad({
        durationMinutes: s.durationMinutes,
        rpe: s.rpe,
        modalityCode: s.modality,
      }),
    })),
    checkinsLast28Days,
    recoveryAttitudesLast7Days,
    todayDateStr: todayStr,
  });

  const recoveryBudget = {
    ...baseRecoveryBudget,
    weeklyBudgetTargetUa: adaptiveProfile.personalCapacityEa,
    weeklySpentUa: adaptiveProfile.netSpentEa,
    weeklyRemainingUa: adaptiveProfile.availableReserveEa,
    usagePercent: adaptiveProfile.usagePercent,
  };

  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(now.getDate() - 1);
  const yesterdayStr = yesterdayDate.toISOString().split("T")[0];
  const yesterdayLoadUa = dailyLoads.get(yesterdayStr) || 0;
  const yesterdaySession = sessionLoadInputs.find(
    (s) => s.date === yesterdayStr
  );
  const yesterdayModalityLabel = yesterdaySession
    ? getModalityProfile(yesterdaySession.modality).labelPt
    : null;

  const dailyDecision = evaluateDailyDecision({
    checkin: todayCheckin,
    yesterdayLoadUa,
    yesterdayLastModalityLabel: yesterdayModalityLabel,
    recoveryBudgetUsagePercent: recoveryBudget.usagePercent,
    recoveryBudgetRemainingUa: recoveryBudget.weeklyRemainingUa,
    acwr: acwrResult.acwr,
    consecutiveTrainingDays: consecutiveDays,
  });

  const recommendations = generatePerformanceRecommendations({
    acwrResult,
    consecutiveTrainingDays: consecutiveDays,
    averageRpeLast7Days: averageRpe || 6.5,
    weeklyGoalTarget: targetDaysPerWeek,
    completedDaysThisWeek: last7Sessions.length,
  });

  // 2. Séries temporais (7d e 28d em ordem cronológica crescente)
  const last28DaysChart: EvolutionData["last28DaysChart"] = [];
  for (let i = 27; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const dateKey = d.toISOString().split("T")[0];
    last28DaysChart.push({
      date: dateKey,
      shortDate: `${String(d.getDate()).padStart(2, "0")}/${String(
        d.getMonth() + 1
      ).padStart(2, "0")}`,
      dayName: getWeekdayLabelPt(d, "short"),
      load: dailyLoads.get(dateKey) || 0,
    });
  }
  const last7DaysChart = last28DaysChart.slice(-7).map((d) => ({
    date: d.date,
    dayName: d.dayName,
    load: d.load,
  }));

  // 3. Volume real & Recordes Pessoais (PRs)
  const sessionIds = workouts.map((w) => w.id);
  const last28IdsSet = new Set(last28Completed.map((w) => w.id));
  let totalVolumeKg = 0;
  let monthlyVolumeKg = 0;
  const prMap = new Map<
    string,
    {
      exerciseId: string;
      exerciseName: string;
      maxLoadKg: number;
      reps: number;
      date: string;
    }
  >();

  if (sessionIds.length > 0) {
    const [logs, sessExercises, exercisesCatalog] = await Promise.all([
      db
        .select()
        .from(schema.setLogs)
        .where(inArray(schema.setLogs.sessionId, sessionIds)),
      db
        .select()
        .from(schema.sessionExercises)
        .where(inArray(schema.sessionExercises.sessionId, sessionIds)),
      db.select().from(schema.exercises),
    ]);

    const exerciseNameById = new Map(
      exercisesCatalog.map((e) => [e.id, e.namePt || e.nameEn || "Exercício"])
    );
    const exerciseIdBySessExId = new Map(
      sessExercises.map((se) => [se.id, se.exerciseId])
    );
    const sessionDateById = new Map(
      workouts.map((w) => [
        w.id,
        new Date(w.finishedAt || w.startedAt).toLocaleDateString("pt-BR"),
      ])
    );

    for (const log of logs) {
      const weight = log.weightKg || 0;
      const reps = log.reps || 0;
      const vol = weight * reps;
      totalVolumeKg += vol;
      if (last28IdsSet.has(log.sessionId)) {
        monthlyVolumeKg += vol;
      }

      const exId = exerciseIdBySessExId.get(log.sessionExerciseId);
      if (exId && weight > 0) {
        const exName = exerciseNameById.get(exId) || "Exercício";
        const currentPr = prMap.get(exId);
        if (!currentPr || weight > currentPr.maxLoadKg) {
          prMap.set(exId, {
            exerciseId: exId,
            exerciseName: exName,
            maxLoadKg: weight,
            reps,
            date: sessionDateById.get(log.sessionId) || "Recente",
          });
        }
      }
    }
  }

  const personalRecords = Array.from(prMap.values())
    .sort((a, b) => b.maxLoadKg - a.maxLoadKg)
    .slice(0, 8);

  // 4. Consistência e Mapa de Calor alinhado à grade Segunda → Domingo (5 semanas = 35 células)
  const activeDatesSet = new Set<string>();
  for (const act of activityRows) {
    if (act.countsForStreak && act.localDate) {
      activeDatesSet.add(String(act.localDate));
    }
  }
  for (const w of completedWorkouts) {
    const dStr = new Date(w.finishedAt || w.startedAt)
      .toISOString()
      .split("T")[0];
    activeDatesSet.add(dStr);
  }

  const allUniqueDates = Array.from(activeDatesSet).sort();
  const streakCalc = calculateWeeklyStreak(
    allUniqueDates,
    targetDaysPerWeek,
    todayStr,
    shieldedWeeks
  );
  const activeDaysLast28 = allUniqueDates.filter((d) => d >= past28Str).length;
  const activeDaysInYear = allUniqueDates.filter((d) =>
    d.startsWith(currentYearPrefix)
  ).length;
  const targetDaysLast28 = targetDaysPerWeek * 4;
  const weeklyAdherence = Math.min(
    100,
    Math.round((activeDaysLast28 / Math.max(1, targetDaysLast28)) * 100)
  );

  // Calcula segunda-feira da semana atual e volta 4 semanas (35 dias alinhados Seg → Dom)
  const todayMondayIdx = jsDayToMondayIndex(now.getDay());
  const currentWeekMonday = new Date(now);
  currentWeekMonday.setDate(now.getDate() - todayMondayIdx);
  const gridStart = new Date(currentWeekMonday);
  gridStart.setDate(currentWeekMonday.getDate() - 28); // 4 semanas anteriores + semana atual

  const heatmapDays: EvolutionData["heatmapDays"] = [];
  for (let i = 0; i < 35; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    const iso = d.toISOString().split("T")[0];
    heatmapDays.push({
      date: iso,
      dayNumber: d.getDate(),
      weekdayShort: getWeekdayLabelPt(d, "short"),
      active: activeDatesSet.has(iso),
      isToday: iso === todayStr,
      isFuture: iso > todayStr,
    });
  }

  return {
    acwrResult,
    recoveryBudget,
    adaptiveProfile,
    dailyDecision,
    todayCheckin,
    isCurrentWeekShielded,
    recommendations,
    calibrationSessionsCount: last28Completed.length,
    averageRpe,
    consecutiveDays,
    last7DaysChart,
    last28DaysChart,
    metrics: {
      totalWorkouts: Math.max(completedWorkouts.length, activityRows.length),
      monthlyVolumeKg: Math.round(monthlyVolumeKg),
      totalVolumeKg: Math.round(totalVolumeKg),
      weeklyAdherence,
      activeDaysLast28,
      activeDaysInYear,
      targetDaysPerWeek,
      targetDaysLast28,
      currentWeeklyStreak: Math.max(
        streakCalc.current,
        streakRows[0]?.currentWeeklyStreak || 0
      ),
      bestWeeklyStreak: Math.max(
        streakCalc.best,
        streakRows[0]?.bestWeeklyStreak || 0
      ),
    },
    personalRecords,
    heatmapDays,
    recentWorkouts: workouts.map((w) => {
      const durationMinutes = w.finishedAt
        ? Math.max(
            15,
            Math.round(
              (new Date(w.finishedAt).getTime() -
                new Date(w.startedAt).getTime()) /
                60000
            )
          )
        : 45;
      const modProfile = getModalityProfile(w.modalityCode);
      const loadUa = calculateUnifiedSessionLoad({
        durationMinutes,
        rpe: w.rpeSession || 7,
        modalityCode: w.modalityCode,
      });
      return {
        id: w.id,
        title: w.title,
        modalityCode: w.modalityCode,
        modalityLabel: modProfile.labelPt,
        status: w.status,
        startedAt: new Date(w.startedAt).toISOString(),
        finishedAt: w.finishedAt ? new Date(w.finishedAt).toISOString() : null,
        rpeSession: w.rpeSession,
        loadUa,
      };
    }),
  };
}
