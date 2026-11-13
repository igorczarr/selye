"use server";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, desc, and, gte } from "drizzle-orm";
import { getOrCreateDemoUser } from "./workout";
import {
  calculateSessionLoad,
  aggregateDailyLoads,
  calculateACWR,
  type ACWRResult,
} from "@/core/performance/training-load";
import {
  generatePerformanceRecommendations,
  type PerformanceRecommendation,
} from "@/core/performance/recommendations-engine";

export async function getPerformanceOverview() {
  const user = await getOrCreateDemoUser();

  // 1. Obter sessões dos últimos 28 dias para cálculo de ACWR
  const now = new Date();
  const past28Days = new Date(now);
  past28Days.setDate(now.getDate() - 28);

  const sessions = await db
    .select({
      id: schema.workoutSessions.id,
      title: schema.workoutSessions.title,
      modalityCode: schema.workoutSessions.modalityCode,
      startedAt: schema.workoutSessions.startedAt,
      finishedAt: schema.workoutSessions.finishedAt,
      rpeSession: schema.workoutSessions.rpeSession,
    })
    .from(schema.workoutSessions)
    .where(
      and(
        eq(schema.workoutSessions.userId, user.id),
        eq(schema.workoutSessions.status, "completed"),
        gte(schema.workoutSessions.startedAt, past28Days)
      )
    )
    .orderBy(desc(schema.workoutSessions.startedAt));

  // Converter para formato diário
  const sessionData = sessions.map((s) => {
    const durationMinutes = s.finishedAt
      ? Math.max(15, Math.round((new Date(s.finishedAt).getTime() - new Date(s.startedAt).getTime()) / 60000))
      : 45;

    return {
      date: new Date(s.startedAt).toISOString().split("T")[0],
      durationMinutes,
      rpe: s.rpeSession || 7,
      modality: s.modalityCode,
    };
  });

  const dailyLoads = aggregateDailyLoads(sessionData);
  const acwrResult = calculateACWR(dailyLoads);

  // 2. Obter meta semanal e dias consecutivos
  const [goal] = await db
    .select()
    .from(schema.weeklyGoals)
    .where(eq(schema.weeklyGoals.userId, user.id))
    .limit(1);

  // Calcular dias consecutivos recentes
  let consecutiveDays = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const dateKey = d.toISOString().split("T")[0];
    if (dailyLoads.has(dateKey) && (dailyLoads.get(dateKey) || 0) > 0) {
      consecutiveDays++;
    } else if (i > 0) {
      break;
    }
  }

  // Média de RPE nos últimos 7 dias
  const last7DaysSessions = sessionData.filter((s) => {
    const d = new Date(s.date).getTime();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000).getTime();
    return d >= weekAgo;
  });

  const avgRpe =
    last7DaysSessions.length > 0
      ? last7DaysSessions.reduce((acc, s) => acc + s.rpe, 0) / last7DaysSessions.length
      : 6.5;

  // 3. Gerar recomendações explicáveis (§21)
  const recommendations = generatePerformanceRecommendations({
    acwrResult,
    consecutiveTrainingDays: consecutiveDays,
    averageRpeLast7Days: Math.round(avgRpe * 10) / 10,
    weeklyGoalTarget: goal?.targetDaysPerWeek || 4,
    completedDaysThisWeek: last7DaysSessions.length,
  });

  // 4. Histórico dos últimos 7 dias para visualização diária
  const last7DaysChart: { date: string; dayName: string; load: number }[] = [];
  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const dateKey = d.toISOString().split("T")[0];
    last7DaysChart.push({
      date: dateKey,
      dayName: dayNames[d.getDay()],
      load: dailyLoads.get(dateKey) || 0,
    });
  }

  return {
    acwrResult,
    recommendations,
    last7DaysChart,
    totalSessionsCount: sessions.length,
    consecutiveDays,
    averageRpe: Math.round(avgRpe * 10) / 10,
  };
}