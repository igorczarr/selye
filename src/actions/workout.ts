"use server";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// Usuário padrão de demonstração / piloto
const DEMO_USER_EMAIL = "atleta@selye.com.br";

export async function getOrCreateDemoUser() {
  const existing = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, DEMO_USER_EMAIL))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  const [newUser] = await db
    .insert(schema.users)
    .values({
      name: "Marina Costa",
      email: DEMO_USER_EMAIL,
      username: "marinacosta",
      bio: "Atleta independente e entusiasta de musculação e corrida.",
    })
    .returning();

  await db.insert(schema.profiles).values({
    userId: newUser.id,
    timezone: "America/Sao_Paulo",
    experienceLevel: "intermediate",
    goals: ["Força", "Hipertrofia", "Consistência"],
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
  const today = new Date().toISOString().split("T")[0];

  // 1. Nota do dia
  const [dailyNote] = await db
    .select()
    .from(schema.dailyMessages)
    .where(eq(schema.dailyMessages.publishDate, today))
    .limit(1);

  // 2. Exercícios cadastrados no banco
  const exerciseList = await db
    .select()
    .from(schema.exercises)
    .limit(25);

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

  // 4. Últimas sessões concluídas
  const recentSessions = await db
    .select()
    .from(schema.workoutSessions)
    .where(
      and(
        eq(schema.workoutSessions.userId, user.id),
        eq(schema.workoutSessions.status, "completed")
      )
    )
    .orderBy(desc(schema.workoutSessions.finishedAt))
    .limit(5);

  // 5. Histórico para cálculo de streak
  const activities = await db
    .select()
    .from(schema.activityEvents)
    .where(eq(schema.activityEvents.userId, user.id));

  return {
    user,
    dailyNote: dailyNote || {
      messageText: "Menos achismo, mais histórico. O que se registra pode ser compreendido e aprimorado.",
      author: "Selye Editorial",
      category: "consistencia",
    },
    exerciseList,
    activeSession: activeSession || null,
    recentSessions,
    activitiesCount: activities.length,
  };
}

export async function startWorkout(title: string = "Força e Estabilidade") {
  const user = await getOrCreateDemoUser();
  const clientSessionId = `client_sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  // Se já tiver uma sessão em andamento, recupera-a
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

  // Adiciona alguns exercícios padrão do catálogo para demonstração
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

    // 3 séries para cada
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
    // Registra evento de consistência para o streak (§13 e §26)
    await db.insert(schema.activityEvents).values({
      userId: user.id,
      sessionId: session.id,
      source: "app_workout",
      localDate: todayStr,
      durationMinutes: Math.round(
        (finishedAt.getTime() - new Date(session.startedAt).getTime()) / 60000
      ),
      countsForStreak: true,
    });
  }

  revalidatePath("/");
  return session;
}
