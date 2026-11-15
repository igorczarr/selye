import { Suspense } from "react";
import { Navbar } from "@/components/navigation/navbar";
import { AnalyticsView } from "@/components/analytics/analytics-view";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { getOrCreateDemoUser } from "@/actions/workout";
import { desc, eq, inArray } from "drizzle-orm";
import { calculateWeeklyStreak } from "@/core/consistency/streak-calculator";

export const instant = false;

async function AnalyticsLoader() {
  const user = await getOrCreateDemoUser();
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  const [workouts, streakRows, goalRows, activityRows] = await Promise.all([
    db
      .select()
      .from(schema.workoutSessions)
      .where(eq(schema.workoutSessions.userId, user.id))
      .orderBy(desc(schema.workoutSessions.startedAt))
      .limit(60),
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
  const sessionIds = workouts.map((w) => w.id);

  // Buscar séries e nomes de exercícios para calcular volume real e PRs reais
  let totalVolumeKg = 0;
  const prMap = new Map<
    string,
    { exerciseName: string; maxLoadKg: number; reps: number; date: string }
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
      totalVolumeKg += weight * reps;

      const exId = exerciseIdBySessExId.get(log.sessionExerciseId);
      if (exId && weight > 0) {
        const exName = exerciseNameById.get(exId) || "Exercício";
        const currentPr = prMap.get(exId);
        if (!currentPr || weight > currentPr.maxLoadKg) {
          prMap.set(exId, {
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
    .slice(0, 4);

  // Datas ativas reais (últimos 28 dias) para o Mapa de Calor e Adesão
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

  const targetDaysPerWeek = goalRows[0]?.targetDaysPerWeek || 4;
  const allUniqueDates = Array.from(activeDatesSet).sort();
  const streakCalc = calculateWeeklyStreak(
    allUniqueDates,
    targetDaysPerWeek,
    todayStr
  );

  // Últimos 28 dias (do mais antigo para hoje)
  const heatmapDays: { date: string; dayNumber: number; active: boolean }[] = [];
  let activeInLast28 = 0;
  for (let i = 27; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const iso = d.toISOString().split("T")[0];
    const isActive = activeDatesSet.has(iso);
    if (isActive) activeInLast28++;
    heatmapDays.push({
      date: iso,
      dayNumber: d.getDate(),
      active: isActive,
    });
  }

  const targetIn28Days = targetDaysPerWeek * 4;
  const weeklyAdherence = Math.min(
    100,
    Math.round((activeInLast28 / Math.max(1, targetIn28Days)) * 100)
  );

  return (
    <AnalyticsView
      metrics={{
        totalWorkouts: Math.max(completedWorkouts.length, activityRows.length),
        monthlyVolumeKg: Math.round(totalVolumeKg),
        weeklyAdherence,
        activeDaysLast28: activeInLast28,
        targetDaysLast28: targetIn28Days,
        currentWeeklyStreak: Math.max(
          streakCalc.current,
          streakRows[0]?.currentWeeklyStreak || 0
        ),
        bestWeeklyStreak: Math.max(
          streakCalc.best,
          streakRows[0]?.bestWeeklyStreak || 0
        ),
        personalRecords,
        heatmapDays,
        recentWorkouts: workouts,
      }}
    />
  );
}

function AnalyticsSkeleton() {
  return (
    <div
      className="flex flex-col gap-6"
      aria-busy="true"
      aria-label="Carregando analytics"
    >
      <div className="flex justify-between items-end">
        <div className="space-y-2">
          <div className="skeleton h-4 w-32" />
          <div className="skeleton h-8 w-64" />
          <div className="skeleton h-4 w-80" />
        </div>
        <div className="skeleton h-10 w-56" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="skeleton h-28" />
        <div className="skeleton h-28" />
        <div className="skeleton h-28" />
        <div className="skeleton h-28" />
      </div>
      <div className="skeleton h-48 w-full" />
      <div className="skeleton h-56 w-full" />
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pb-20 md:pb-0">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
        <Suspense fallback={<AnalyticsSkeleton />}>
          <AnalyticsLoader />
        </Suspense>
      </main>
    </div>
  );
}
