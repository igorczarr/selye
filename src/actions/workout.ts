"use server";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, desc, and, gte, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { currentUser } from "@clerk/nextjs/server";
import { calculateWeeklyStreak } from "@/core/consistency/streak-calculator";

const DEMO_USER_EMAIL =
  process.env.ACTIVE_USER_EMAIL || "igorsantos979.is@gmail.com";

export async function getOrCreateDemoUser() {
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
  const sessionsLast28Ids = completedSessions
    .filter((s) => new Date(s.startedAt) >= past28Days)
    .map((s) => s.id);

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

  return {
    user,
    dailyNote: dailyNote || {
      messageText:
        "Menos achismo, mais histórico. O que se registra pode ser compreendido e aprimorado.",
      author: "Selye Editorial",
      category: "consistencia",
    },
    exerciseList,
    activeSession: activeSession || null,
    recentSessions,
    activitiesCount: Math.max(activities.length, completedSessions.length),
    stats: {
      monthlyVolumeKg: Math.round(monthlyVolumeKg),
      weeklyFrequencyAvg,
      targetDaysPerWeek,
      currentWeeklyStreak,
      bestWeeklyStreak,
      totalCompletedWorkouts: Math.max(
        completedSessions.length,
        activities.length
      ),
    },
  };
}

export async function startWorkout(title: string = "Força e Estabilidade") {
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

  const [session] = await db
    .insert(schema.workoutSessions)
    .values({
      userId: user.id,
      title,
      modalityCode: "strength",
      status: "in_progress",
      startedAt: new Date(),
      clientSessionId,
      timezone: "America/Sao_Paulo",
    })
    .returning();

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
  revalidatePath("/analytics");
  revalidatePath("/performance");
  return session;
}
