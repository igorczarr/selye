"use server";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getOrCreateDemoUser } from "./workout";

import { getUserAchievements, getAchievementsCatalog } from "./achievements";

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

  const userAchievements = await getUserAchievements(user.id);
  const achievementsCatalog = await getAchievementsCatalog();

  return {
    user,
    profile,
    metrics,
    userSportsList,
    allAvailableSports,
    streak: streak || null,
    userAchievements,
    achievementsCatalog,
  };
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
