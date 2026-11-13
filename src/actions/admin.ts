"use server";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { ExerciseCatalogService } from "@/core/catalog/api-ninjas-adapter";

export async function getAdminOverview() {
  const usersCount = (await db.select().from(schema.users)).length;
  const exercisesCount = (await db.select().from(schema.exercises)).length;
  const teamsCount = (await db.select().from(schema.teams)).length;
  const sessionsCount = (await db.select().from(schema.workoutSessions)).length;

  const messages = await db
    .select()
    .from(schema.dailyMessages)
    .orderBy(desc(schema.dailyMessages.publishDate))
    .limit(10);

  return {
    stats: {
      usersCount,
      exercisesCount,
      teamsCount,
      sessionsCount,
    },
    messages,
  };
}

export async function addDailyMessage(
  publishDate: string,
  messageText: string,
  category: string,
  author: string = "Selye Editorial"
) {
  await db
    .insert(schema.dailyMessages)
    .values({
      publishDate,
      messageText,
      category,
      author,
      isActive: true,
    })
    .onConflictDoUpdate({
      target: schema.dailyMessages.publishDate,
      set: { messageText, category, author },
    });

  revalidatePath("/");
  revalidatePath("/admin");
}

export async function syncMuscleGroupExercises(muscle: string) {
  const service = new ExerciseCatalogService();
  const count = await service.syncExercisesFromNinja({ muscle });
  revalidatePath("/");
  revalidatePath("/admin");
  return count;
}
