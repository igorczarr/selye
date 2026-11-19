"use server";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, desc, asc, and, gte, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { connection } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { calculateWeeklyStreak } from "@/core/consistency/streak-calculator";
import { getDailyEditorialForDate } from "@/core/editorial/daily-quotes";
import {
  aggregateDailyLoads,
  calculateACWR,
} from "@/core/performance/training-load";
import { generatePerformanceRecommendations } from "@/core/performance/recommendations-engine";
import { getWeekdayLabelPt } from "@/lib/week";
import { getUserRoutines } from "./routines";

const DEMO_USER_EMAIL =
  process.env.ACTIVE_USER_EMAIL || "igorsantos979.is@gmail.com";

export async function getOrCreateDemoUser() {
  try {
    await connection();
  } catch {
    // Fora de requisição Next.js (ex: testes unitários ou scripts CLI)
  }

  let targetEmail = DEMO_USER_EMAIL;

  try {
    const clerkUser = await currentUser();
    const primaryEmail = clerkUser?.emailAddresses?.[0]?.emailAddress;
    if (primaryEmail) {
      targetEmail = primaryEmail;
    }
  } catch {
    // Fora de requisição HTTP (ex: testes unitários ou scripts CLI)
  }

  const existing = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, targetEmail))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  const [newUser] = await db
    .insert(schema.users)
    .values({
      name: "Atleta Selye",
      email: targetEmail,
      username: targetEmail.split("@")[0].replace(/[^a-zA-Z0-9_]/g, ""),
      bio: "Atleta em jornada de evolução física no Selye.",
    })
    .returning();

  await db.insert(schema.profiles).values({
    userId: newUser.id,
    timezone: "America/Sao_Paulo",
    experienceLevel: "beginner",
    goals: ["Força", "Consistência"],
  });

  await db.insert(schema.weeklyGoals).values({
    userId: newUser.id,
    targetDaysPerWeek: 4,
    effectiveFrom: new Date().toISOString().split("T")[0],
  });

  return newUser;
}

export async function getDashboardData() {
  const user = await getOrCreateDemoUser();
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const past28Days = new Date(now);
  past28Days.setDate(now.getDate() - 28);

  // 1. Nota do dia
  const [dailyNote] = await db
    .select()
    .from(schema.dailyMessages)
    .where(eq(schema.dailyMessages.publishDate, today))
    .limit(1);

  // 2. Exercícios cadastrados no banco
  const exerciseList = await db.select().from(schema.exercises).limit(25);

  // 3. Sessão ativa em andamento (se houver)
  const [activeSession] = await db
    .select()
    .from(schema.workoutSessions)
    .where(
      and(
        eq(schema.workoutSessions.userId, user.id),
        eq(schema.workoutSessions.status, "in_progress")
      )
    )
    .orderBy(desc(schema.workoutSessions.startedAt))
    .limit(1);

  // 4. Todas as sessões concluídas do usuário
  const completedSessions = await db
    .select()
    .from(schema.workoutSessions)
    .where(
      and(
        eq(schema.workoutSessions.userId, user.id),
        eq(schema.workoutSessions.status, "completed")
      )
    )
    .orderBy(desc(schema.workoutSessions.finishedAt));

  const recentSessions = completedSessions.slice(0, 5);

  // 5. Histórico de eventos e metas para indicadores reais
  const [activities, goals, savedStreaks] = await Promise.all([
    db
      .select()
      .from(schema.activityEvents)
      .where(eq(schema.activityEvents.userId, user.id)),
    db
      .select()
      .from(schema.weeklyGoals)
      .where(eq(schema.weeklyGoals.userId, user.id))
      .limit(1),
    db
      .select()
      .from(schema.streaks)
      .where(eq(schema.streaks.userId, user.id))
      .limit(1),
  ]);

  const targetDaysPerWeek = goals[0]?.targetDaysPerWeek || 4;

  // Datas únicas de treino combinando activity_events e workout_sessions concluídas
  const dateSet = new Set<string>();
  for (const act of activities) {
    if (act.countsForStreak && act.localDate) {
      dateSet.add(String(act.localDate));
    }
  }
  for (const sess of completedSessions) {
    const dt = (sess.finishedAt || sess.startedAt).toISOString().split("T")[0];
    dateSet.add(dt);
  }
  const uniqueDates = Array.from(dateSet).sort();

  // Dias ativos no ano corrente (ex: 2026)
  const currentYearPrefix = `${now.getFullYear()}-`;
  const activeDaysInYear = uniqueDates.filter((d) =>
    d.startsWith(currentYearPrefix)
  ).length;

  // Dias ativos nos últimos 28 dias -> frequência média semanal
  const past28Str = past28Days.toISOString().split("T")[0];
  const activeDaysLast28 = uniqueDates.filter((d) => d >= past28Str).length;
  const weeklyFrequencyAvg =
    Math.round((activeDaysLast28 / 4) * 10) / 10;

  // Streak semanal calculado sobre o histórico real (com fallback para registro salvo)
  const calculatedStreak = calculateWeeklyStreak(
    uniqueDates,
    targetDaysPerWeek,
    today
  );
  const currentWeeklyStreak = Math.max(
    calculatedStreak.current,
    savedStreaks[0]?.currentWeeklyStreak || 0
  );
  const bestWeeklyStreak = Math.max(
    calculatedStreak.best,
    savedStreaks[0]?.bestWeeklyStreak || 0,
    currentWeeklyStreak
  );

  // Volume real nos últimos 28 dias a partir de set_logs das sessões do usuário
  const sessionsLast28 = completedSessions.filter(
    (s) => new Date(s.startedAt) >= past28Days
  );
  const sessionsLast28Ids = sessionsLast28.map((s) => s.id);

  let monthlyVolumeKg = 0;
  if (sessionsLast28Ids.length > 0) {
    const logs = await db
      .select({
        weightKg: schema.setLogs.weightKg,
        reps: schema.setLogs.reps,
      })
      .from(schema.setLogs)
      .where(inArray(schema.setLogs.sessionId, sessionsLast28Ids));

    monthlyVolumeKg = logs.reduce(
      (sum, l) => sum + (l.weightKg || 0) * (l.reps || 0),
      0
    );
  }

  // 6. Frase do dia editorial com contagem anual (Dia X de 365)
  const dailyEditorial = getDailyEditorialForDate(now, dailyNote);

  // 7. Rotinas do atleta ordenadas (Dia 1 → Dia 5 / Seg → Dom)
  const routines = await getUserRoutines();

  // 8. Resumo assertivo de Performance (ACWR + 7 dias + recomendação de 1 linha)
  const sessionLoadInputs = sessionsLast28.map((s) => {
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
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = d.toISOString().split("T")[0];
    if ((dailyLoads.get(key) || 0) > 0) {
      consecutiveDays++;
    } else if (i > 0) {
      break;
    }
  }

  const weekAgoTime = now.getTime() - 7 * 24 * 3600 * 1000;
  const last7Sessions = sessionLoadInputs.filter(
    (s) => new Date(s.date).getTime() >= weekAgoTime
  );
  const avgRpe =
    last7Sessions.length > 0
      ? Math.round(
          (last7Sessions.reduce((acc, s) => acc + s.rpe, 0) /
            last7Sessions.length) *
            10
        ) / 10
      : 7.0;

  const recommendations = generatePerformanceRecommendations({
    acwrResult,
    consecutiveTrainingDays: consecutiveDays,
    averageRpeLast7Days: avgRpe,
    weeklyGoalTarget: targetDaysPerWeek,
    completedDaysThisWeek: last7Sessions.length,
  });

  const last7DaysChart: { date: string; dayName: string; load: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const dateKey = d.toISOString().split("T")[0];
    last7DaysChart.push({
      date: dateKey,
      dayName: getWeekdayLabelPt(d, "short"),
      load: dailyLoads.get(dateKey) || 0,
    });
  }

  // 9. Exercícios e séries reais da sessão ativa (se houver sessão em andamento)
  let activeSessionExercises: any[] = [];
  if (activeSession) {
    const [sessExRows, sessSetLogs] = await Promise.all([
      db
        .select({
          id: schema.exercises.id,
          sessionExerciseId: schema.sessionExercises.id,
          orderIndex: schema.sessionExercises.orderIndex,
          namePt: schema.exercises.namePt,
          nameEn: schema.exercises.nameEn,
          secondaryMuscles: schema.exercises.secondaryMuscles,
          instructionsPt: schema.exercises.instructionsPt,
          safetyInfoPt: schema.exercises.safetyInfoPt,
          difficulty: schema.exercises.difficulty,
          equipmentCodes: schema.exercises.equipmentCodes,
        })
        .from(schema.sessionExercises)
        .innerJoin(
          schema.exercises,
          eq(schema.sessionExercises.exerciseId, schema.exercises.id)
        )
        .where(eq(schema.sessionExercises.sessionId, activeSession.id))
        .orderBy(asc(schema.sessionExercises.orderIndex)),
      db
        .select({
          id: schema.setLogs.id,
          sessionExerciseId: schema.setLogs.sessionExerciseId,
          setNumber: schema.setLogs.setNumber,
          setType: schema.setLogs.setType,
          weightKg: schema.setLogs.weightKg,
          reps: schema.setLogs.reps,
          isCompleted: schema.setLogs.isCompleted,
        })
        .from(schema.setLogs)
        .where(eq(schema.setLogs.sessionId, activeSession.id))
        .orderBy(asc(schema.setLogs.setNumber)),
    ]);

    const setsBySessEx = new Map<string, typeof sessSetLogs>();
    for (const s of sessSetLogs) {
      const list = setsBySessEx.get(s.sessionExerciseId) || [];
      list.push(s);
      setsBySessEx.set(s.sessionExerciseId, list);
    }

    activeSessionExercises = sessExRows.map((row) => ({
      ...row,
      sets: setsBySessEx.get(row.sessionExerciseId) || [],
    }));
  }

  return {
    user,
    dailyEditorial,
    dailyNote: {
      messageText: dailyEditorial.quote.messageText,
      author: dailyEditorial.quote.author,
      category: dailyEditorial.quote.category,
    },
    routines,
    performanceSummary: {
      acwrResult,
      headlineRecommendation: recommendations[0] || null,
      last7DaysChart,
      averageRpe: avgRpe,
      consecutiveDays,
    },
    exerciseList,
    activeSession: activeSession || null,
    activeSessionExercises,
    recentSessions,
    activitiesCount: Math.max(activities.length, completedSessions.length),
    stats: {
      monthlyVolumeKg: Math.round(monthlyVolumeKg),
      weeklyFrequencyAvg,
      targetDaysPerWeek,
      currentWeeklyStreak,
      bestWeeklyStreak,
      activeDaysInYear,
      activeDaysLast28,
      totalCompletedWorkouts: Math.max(
        completedSessions.length,
        activities.length
      ),
    },
  };
}

export async function startWorkout(
  title: string = "Força e Estabilidade",
  programId?: string
) {
  const user = await getOrCreateDemoUser();
  const clientSessionId = `client_sess_${Date.now()}_${Math.random()
    .toString(36)
    .substring(2, 9)}`;

  const [existing] = await db
    .select()
    .from(schema.workoutSessions)
    .where(
      and(
        eq(schema.workoutSessions.userId, user.id),
        eq(schema.workoutSessions.status, "in_progress")
      )
    )
    .limit(1);

  if (existing) {
    return existing;
  }

  // Descobrir os exercícios prescritos da rotina selecionada (ou da primeira rotina do atleta)
  const userRoutines = await getUserRoutines();
  const targetRoutine = programId
    ? userRoutines.find((r) => r.id === programId)
    : userRoutines[0];

  const resolvedTitle = targetRoutine?.title || title;
  const resolvedModality = targetRoutine?.modalityCode || "strength";
  const prescriptions = targetRoutine?.templates?.[0]?.prescriptions || [];

  const [session] = await db
    .insert(schema.workoutSessions)
    .values({
      userId: user.id,
      title: resolvedTitle,
      modalityCode: resolvedModality,
      status: "in_progress",
      startedAt: new Date(),
      clientSessionId,
      timezone: "America/Sao_Paulo",
    })
    .returning();

  if (prescriptions.length > 0) {
    for (let i = 0; i < prescriptions.length; i++) {
      const p = prescriptions[i];
      const [sessEx] = await db
        .insert(schema.sessionExercises)
        .values({
          sessionId: session.id,
          exerciseId: p.exerciseId,
          orderIndex: i + 1,
        })
        .returning();

      const setsCount = Math.max(1, p.targetSets || 3);
      const numericReps =
        Number.parseInt(String(p.targetReps || "10"), 10) || 10;

      for (let setNum = 1; setNum <= setsCount; setNum++) {
        await db.insert(schema.setLogs).values({
          sessionId: session.id,
          sessionExerciseId: sessEx.id,
          setNumber: setNum,
          setType: p.setType || "effective",
          weightKg: p.targetLoadKg || 40,
          reps: numericReps,
          isCompleted: false,
          clientEventId: `evt_${session.id}_${sessEx.id}_${setNum}`,
        });
      }
    }
  } else {
    const catalogExercises = await db.select().from(schema.exercises).limit(4);
    for (let i = 0; i < catalogExercises.length; i++) {
      const ex = catalogExercises[i];
      const [sessEx] = await db
        .insert(schema.sessionExercises)
        .values({
          sessionId: session.id,
          exerciseId: ex.id,
          orderIndex: i + 1,
        })
        .returning();

      for (let setNum = 1; setNum <= 3; setNum++) {
        await db.insert(schema.setLogs).values({
          sessionId: session.id,
          sessionExerciseId: sessEx.id,
          setNumber: setNum,
          setType: "effective",
          weightKg: 40 + i * 10,
          reps: 10,
          isCompleted: false,
          clientEventId: `evt_${session.id}_${sessEx.id}_${setNum}`,
        });
      }
    }
  }

  revalidatePath("/");
  return session;
}

export async function finishWorkout(sessionId: string, rpe: number = 8) {
  const user = await getOrCreateDemoUser();
  const finishedAt = new Date();
  const todayStr = finishedAt.toISOString().split("T")[0];

  const [session] = await db
    .update(schema.workoutSessions)
    .set({
      status: "completed",
      finishedAt,
      rpeSession: rpe,
      updatedAt: finishedAt,
    })
    .where(eq(schema.workoutSessions.id, sessionId))
    .returning();

  if (session) {
    await db
      .update(schema.setLogs)
      .set({ isCompleted: true, completedAt: finishedAt })
      .where(eq(schema.setLogs.sessionId, session.id));

    await db.insert(schema.activityEvents).values({
      userId: user.id,
      sessionId: session.id,
      source: "app_workout",
      localDate: todayStr,
      durationMinutes: Math.max(
        15,
        Math.round(
          (finishedAt.getTime() - new Date(session.startedAt).getTime()) / 60000
        )
      ),
      countsForStreak: true,
    });
  }

  revalidatePath("/");
  revalidatePath("/evolucao");
  revalidatePath("/analytics");
  revalidatePath("/performance");
  return session;
}

/**
 * Atualiza uma série individual em tempo real durante o treino (carga, reps ou conclusão).
 */
export async function updateSetLog(
  setLogId: string,
  patch: {
    isCompleted?: boolean;
    weightKg?: number | null;
    reps?: number | null;
  }
) {
  await getOrCreateDemoUser();

  const updateValues: Partial<typeof schema.setLogs.$inferInsert> = {};
  if (typeof patch.isCompleted === "boolean") {
    updateValues.isCompleted = patch.isCompleted;
    updateValues.completedAt = patch.isCompleted ? new Date() : null;
  }
  if (patch.weightKg !== undefined) {
    updateValues.weightKg = patch.weightKg;
  }
  if (patch.reps !== undefined) {
    updateValues.reps = patch.reps;
  }

  if (Object.keys(updateValues).length === 0) return null;

  const [updated] = await db
    .update(schema.setLogs)
    .set(updateValues)
    .where(eq(schema.setLogs.id, setLogId))
    .returning();

  return updated || null;
}

/**
 * Descarta uma sessão em andamento caso o atleta queira trocar de ficha.
 */
export async function cancelWorkout(sessionId: string) {
  const user = await getOrCreateDemoUser();

  await db
    .update(schema.workoutSessions)
    .set({
      status: "abandoned",
      finishedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.workoutSessions.id, sessionId),
        eq(schema.workoutSessions.userId, user.id)
      )
    );

  revalidatePath("/");
}
