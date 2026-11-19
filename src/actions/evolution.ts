"use server";

import { connection } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { getOrCreateDemoUser } from "./workout";
import {
  aggregateDailyLoads,
  calculateACWR,
  type ACWRResult,
} from "@/core/performance/training-load";
import {
  generatePerformanceRecommendations,
  type PerformanceRecommendation,
} from "@/core/performance/recommendations-engine";
import { calculateWeeklyStreak } from "@/core/consistency/streak-calculator";
import { getWeekdayLabelPt, jsDayToMondayIndex } from "@/lib/week";

export interface EvolutionData {
  acwrResult: ACWRResult;
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
    status: string;
    startedAt: string;
    finishedAt: string | null;
    rpeSession: number | null;
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

  const [workouts, streakRows, goalRows, activityRows] = await Promise.all([
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
    todayStr
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
    recentWorkouts: workouts.map((w) => ({
      id: w.id,
      title: w.title,
      modalityCode: w.modalityCode,
      status: w.status,
      startedAt: new Date(w.startedAt).toISOString(),
      finishedAt: w.finishedAt ? new Date(w.finishedAt).toISOString() : null,
      rpeSession: w.rpeSession,
    })),
  };
}
