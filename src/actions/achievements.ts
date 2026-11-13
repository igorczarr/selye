"use server";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getOrCreateDemoUser } from "./workout";

export async function getAchievementsCatalog() {
  return await db
    .select()
    .from(schema.achievements)
    .orderBy(schema.achievements.createdAt);
}

export async function getUserAchievements(userId?: string) {
  let targetUserId = userId;
  if (!targetUserId) {
    const user = await getOrCreateDemoUser();
    targetUserId = user.id;
  }

  // Avaliar automaticamente se o usuário desbloqueou novas conquistas
  await evaluateAndUnlockAchievements(targetUserId);

  const unlocked = await db
    .select({
      id: schema.achievements.id,
      code: schema.achievements.code,
      title: schema.achievements.title,
      description: schema.achievements.description,
      category: schema.achievements.category,
      icon: schema.achievements.icon,
      unlockedAt: schema.userAchievements.unlockedAt,
    })
    .from(schema.userAchievements)
    .innerJoin(
      schema.achievements,
      eq(schema.userAchievements.achievementId, schema.achievements.id)
    )
    .where(eq(schema.userAchievements.userId, targetUserId))
    .orderBy(desc(schema.userAchievements.unlockedAt));

  return unlocked;
}

/**
 * Avalia critérios e desbloqueia conquistas (§13 e §15)
 */
export async function evaluateAndUnlockAchievements(userId: string) {
  // 1. Obter catálogo de conquistas
  const catalog = await db.select().from(schema.achievements);
  const catalogMap = new Map(catalog.map((a) => [a.code, a.id]));

  // 2. Conquistas que o usuário já tem
  const currentUnlocked = await db
    .select({ code: schema.achievements.code })
    .from(schema.userAchievements)
    .innerJoin(
      schema.achievements,
      eq(schema.userAchievements.achievementId, schema.achievements.id)
    )
    .where(eq(schema.userAchievements.userId, userId));

  const unlockedCodes = new Set(currentUnlocked.map((u) => u.code));

  // 3. Verificar Primeiro Treino (`first_workout`)
  if (!unlockedCodes.has("first_workout")) {
    const sessions = await db
      .select({ id: schema.workoutSessions.id })
      .from(schema.workoutSessions)
      .where(
        and(
          eq(schema.workoutSessions.userId, userId),
          eq(schema.workoutSessions.status, "completed")
        )
      )
      .limit(1);

    if (sessions.length > 0) {
      const achId = catalogMap.get("first_workout");
      if (achId) {
        await db.insert(schema.userAchievements).values({
          userId,
          achievementId: achId,
        });
        unlockedCodes.add("first_workout");
      }
    }
  }

  // 4. Verificar Streaks Semanais (`streak_week_3`, `streak_week_10`)
  const [streak] = await db
    .select()
    .from(schema.streaks)
    .where(eq(schema.streaks.userId, userId))
    .limit(1);

  if (streak) {
    if (streak.currentWeeklyStreak >= 3 && !unlockedCodes.has("streak_week_3")) {
      const achId = catalogMap.get("streak_week_3");
      if (achId) {
        await db.insert(schema.userAchievements).values({
          userId,
          achievementId: achId,
        });
        unlockedCodes.add("streak_week_3");
      }
    }

    if (streak.currentWeeklyStreak >= 10 && !unlockedCodes.has("streak_week_10")) {
      const achId = catalogMap.get("streak_week_10");
      if (achId) {
        await db.insert(schema.userAchievements).values({
          userId,
          achievementId: achId,
        });
        unlockedCodes.add("streak_week_10");
      }
    }
  }

  // 5. Verificar Atleta Multimodal (`multimodal_athlete`)
  if (!unlockedCodes.has("multimodal_athlete")) {
    const sports = await db
      .select({ id: schema.userSports.id })
      .from(schema.userSports)
      .where(eq(schema.userSports.userId, userId));

    if (sports.length >= 2) {
      const achId = catalogMap.get("multimodal_athlete");
      if (achId) {
        await db.insert(schema.userAchievements).values({
          userId,
          achievementId: achId,
        });
        unlockedCodes.add("multimodal_athlete");
      }
    }
  }

  // 6. Verificar Espírito de Equipe (`team_belonging`)
  if (!unlockedCodes.has("team_belonging")) {
    const teams = await db
      .select({ id: schema.teamMemberships.id })
      .from(schema.teamMemberships)
      .where(
        and(
          eq(schema.teamMemberships.userId, userId),
          eq(schema.teamMemberships.status, "active")
        )
      )
      .limit(1);

    if (teams.length > 0) {
      const achId = catalogMap.get("team_belonging");
      if (achId) {
        await db.insert(schema.userAchievements).values({
          userId,
          achievementId: achId,
        });
        unlockedCodes.add("team_belonging");
      }
    }
  }

  // 7. Verificar Recorde Pessoal (`pr_achiever`)
  if (!unlockedCodes.has("pr_achiever")) {
    const prMetrics = await db
      .select({ id: schema.sessionMetrics.id })
      .from(schema.sessionMetrics)
      .where(eq(schema.sessionMetrics.metricKey, "pr_count"))
      .limit(1);

    if (prMetrics.length > 0) {
      const achId = catalogMap.get("pr_achiever");
      if (achId) {
        await db.insert(schema.userAchievements).values({
          userId,
          achievementId: achId,
        });
        unlockedCodes.add("pr_achiever");
      }
    }
  }
}