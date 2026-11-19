import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "../src/db";
import * as schema from "../src/db/schema";
import { eq, inArray } from "drizzle-orm";
import { searchYouTubeExerciseVideo } from "../src/lib/youtube-search";
import { classifyMedia } from "../src/core/catalog/exercise-media";

async function main() {
  if (!process.env.YOUTUBE_API_KEY) {
    console.error("YOUTUBE_API_KEY ausente em .env.local");
    process.exit(1);
  }

  // 1. Descobre todos os exercícios usados nas fichas ativas
  const prescriptions = await db
    .select({ exerciseId: schema.templatePrescriptions.exerciseId })
    .from(schema.templatePrescriptions);

  const prescribedIds = Array.from(
    new Set(prescriptions.map((p) => p.exerciseId))
  );

  console.log(
    `Encontrados ${prescribedIds.length} exercícios únicos prescritos nas fichas.`
  );

  // Busca todos os exercícios do catálogo, colocando os prescritos na frente
  const allExercises = await db.select().from(schema.exercises);
  const prioritized = [
    ...allExercises.filter((e) => prescribedIds.includes(e.id)),
    ...allExercises.filter((e) => !prescribedIds.includes(e.id)),
  ];

  let enrichedCount = 0;
  let alreadyHadVideo = 0;
  const MAX_SEARCHES = 10; // Completa os prescritos que faltavam + alguns extras

  for (const ex of prioritized) {
    const media = classifyMedia(ex.mediaUrls);
    if (media.youtubeEmbeds.length > 0) {
      alreadyHadVideo++;
      continue;
    }

    if (enrichedCount >= MAX_SEARCHES) {
      break;
    }

    const hit = await searchYouTubeExerciseVideo(ex.namePt, ex.nameEn);
    if (!hit) {
      console.log(`⚠️ Sem resultado incorporável para: ${ex.namePt}`);
      continue;
    }

    const currentUrls = Array.isArray(ex.mediaUrls) ? ex.mediaUrls : [];
    const nextUrls = [...currentUrls, hit.watchUrl];

    await db
      .update(schema.exercises)
      .set({ mediaUrls: nextUrls, updatedAt: new Date() })
      .where(eq(schema.exercises.id, ex.id));

    enrichedCount++;
    console.log(
      `✅ [${enrichedCount}] ${ex.namePt} -> ${hit.watchUrl} (${hit.channelTitle})`
    );
  }

  console.log(
    `\nConcluído! ${enrichedCount} novos vídeos YouTube anexados (${alreadyHadVideo} já possuíam vídeo).`
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
