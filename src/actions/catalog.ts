"use server";

import { connection } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import {
  classifyMedia,
  equipmentToPt,
  levelToPt,
  looksEnglish,
  muscleToPt,
  splitInstructionSteps,
} from "@/core/catalog/exercise-media";
import { getExerciseCategoryMeta } from "@/core/catalog/exercise-categories";
import { searchYouTubeExerciseVideo } from "@/lib/youtube-search";

export interface ExerciseDetail {
  id: string;
  namePt: string;
  categoryLabel: string;
  primaryMuscle: string | null;
  secondaryMuscles: string[];
  equipment: string[];
  level: string;
  steps: string[];
  /** true quando só existe texto em inglês e o passo a passo foi omitido */
  stepsPendingTranslation: boolean;
  safety: string | null;
  images: string[];
  videos: string[];
  youtubeEmbeds: string[];
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Carrega sob demanda o detalhe de um exercício (chamado ao abrir a ExerciseSheet). */
export async function getExerciseDetail(id: string): Promise<ExerciseDetail | null> {
  try {
    await connection();
  } catch {
    // fora de requisição Next.js
  }

  if (!UUID_RE.test(id)) return null;

  const [row] = await db
    .select({
      ex: schema.exercises,
      muscleCode: schema.muscles.code,
      musclePt: schema.muscles.namePt,
    })
    .from(schema.exercises)
    .leftJoin(schema.muscles, eq(schema.exercises.primaryMuscleId, schema.muscles.id))
    .where(eq(schema.exercises.id, id))
    .limit(1);

  if (!row) return null;
  const { ex } = row;

  const instructions = ex.instructionsPt;
  const hasEnglishOnly = looksEnglish(instructions);
  const steps = hasEnglishOnly ? [] : splitInstructionSteps(instructions);
  const safety = ex.safetyInfoPt && !looksEnglish(ex.safetyInfoPt) ? ex.safetyInfoPt : null;
  let media = classifyMedia(ex.mediaUrls);

  // Busca e persiste automaticamente o vídeo demonstrativo do YouTube na 1ª consulta
  if (media.youtubeEmbeds.length === 0 && process.env.YOUTUBE_API_KEY) {
    const hit = await searchYouTubeExerciseVideo(ex.namePt, ex.nameEn);
    if (hit) {
      const currentUrls = Array.isArray(ex.mediaUrls) ? ex.mediaUrls : [];
      if (!currentUrls.includes(hit.watchUrl)) {
        const updatedUrls = [...currentUrls, hit.watchUrl];
        try {
          await db
            .update(schema.exercises)
            .set({ mediaUrls: updatedUrls, updatedAt: new Date() })
            .where(eq(schema.exercises.id, ex.id));
        } catch {
          // Ignora falha de cache não-bloqueante
        }
        media = classifyMedia(updatedUrls);
      }
    }
  }

  const categoryMeta = getExerciseCategoryMeta(ex);

  return {
    id: ex.id,
    namePt: ex.namePt,
    categoryLabel: categoryMeta.label,
    primaryMuscle: row.musclePt ?? (row.muscleCode ? muscleToPt(row.muscleCode) : null),
    secondaryMuscles: (ex.secondaryMuscles ?? []).map((m) => muscleToPt(m)),
    equipment: (ex.equipmentCodes ?? []).map((e) => equipmentToPt(e)),
    level: levelToPt(ex.difficulty),
    steps,
    stepsPendingTranslation: hasEnglishOnly,
    safety,
    images: media.images,
    videos: media.videos,
    youtubeEmbeds: media.youtubeEmbeds,
  };
}
