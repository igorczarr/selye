"use server";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { connection } from "next/server";
import { ExerciseCatalogService } from "@/core/catalog/api-ninjas-adapter";
import { assertActionRole } from "@/lib/auth-role";
import { searchYouTubeExerciseVideo } from "@/lib/youtube-search";

export async function getAdminOverview() {
  try {
    await connection();
  } catch {
    // Ignora se executado fora do escopo HTTP do Next.js
  }
  await assertActionRole("admin");

  const usersCount = (await db.select().from(schema.users)).length;
  const exercisesCount = (await db.select().from(schema.exercises)).length;
  const teamsCount = (await db.select().from(schema.teams)).length;
  const sessionsCount = (await db.select().from(schema.workoutSessions)).length;

  const messages = await db
    .select()
    .from(schema.dailyMessages)
    .orderBy(desc(schema.dailyMessages.publishDate))
    .limit(10);

  const exercisesList = await db
    .select({
      id: schema.exercises.id,
      namePt: schema.exercises.namePt,
      nameEn: schema.exercises.nameEn,
      modalityCode: schema.exercises.modalityCode,
      secondaryMuscles: schema.exercises.secondaryMuscles,
      mediaUrls: schema.exercises.mediaUrls,
    })
    .from(schema.exercises)
    .orderBy(schema.exercises.namePt);

  return {
    stats: {
      usersCount,
      exercisesCount,
      teamsCount,
      sessionsCount,
    },
    messages,
    exercises: exercisesList,
  };
}

export async function attachExerciseMedia(exerciseId: string, mediaUrl: string) {
  await assertActionRole("admin");
  const cleanUrl = mediaUrl.trim();
  if (!cleanUrl) throw new Error("Informe uma URL válida de vídeo ou imagem.");

  const [existing] = await db
    .select({ mediaUrls: schema.exercises.mediaUrls })
    .from(schema.exercises)
    .where(eq(schema.exercises.id, exerciseId))
    .limit(1);

  if (!existing) throw new Error("Exercício não encontrado.");

  const current = Array.isArray(existing.mediaUrls) ? existing.mediaUrls : [];
  const next = current.includes(cleanUrl) ? current : [...current, cleanUrl];

  await db
    .update(schema.exercises)
    .set({ mediaUrls: next, updatedAt: new Date() })
    .where(eq(schema.exercises.id, exerciseId));

  revalidatePath("/admin");
  revalidatePath("/treinos");
  return next.length;
}

export async function autoFetchYouTubeForExercise(exerciseId: string) {
  await assertActionRole("admin");

  const [ex] = await db
    .select({
      id: schema.exercises.id,
      namePt: schema.exercises.namePt,
      nameEn: schema.exercises.nameEn,
      mediaUrls: schema.exercises.mediaUrls,
    })
    .from(schema.exercises)
    .where(eq(schema.exercises.id, exerciseId))
    .limit(1);

  if (!ex) throw new Error("Exercício não encontrado.");

  const hit = await searchYouTubeExerciseVideo(ex.namePt, ex.nameEn);
  if (!hit) {
    throw new Error("Não foi possível localizar um vídeo incorporável no YouTube.");
  }

  const current = Array.isArray(ex.mediaUrls) ? ex.mediaUrls : [];
  const withoutOldYoutube = current.filter(
    (u) => !/youtube\.com|youtu\.be|youtube-nocookie\.com/i.test(u)
  );
  const next = [...withoutOldYoutube, hit.watchUrl];

  await db
    .update(schema.exercises)
    .set({ mediaUrls: next, updatedAt: new Date() })
    .where(eq(schema.exercises.id, exerciseId));

  revalidatePath("/admin");
  revalidatePath("/treinos");
  return {
    watchUrl: hit.watchUrl,
    title: hit.title,
    channelTitle: hit.channelTitle,
  };
}

export async function addDailyMessage(
  publishDate: string,
  messageText: string,
  category: string,
  author: string = "Selye Editorial"
) {
  await assertActionRole("admin");
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
  await assertActionRole("admin");
  const service = new ExerciseCatalogService();
  const count = await service.syncExercisesFromNinja({ muscle });
  revalidatePath("/");
  revalidatePath("/admin");
  return count;
}
