"use server";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  getOrCreateDemoUser,
  resolveAthleteModalityProfileForUser,
  resolveSportIdForModalityCode,
} from "./workout";
import { dispatchSmartNotification } from "./notifications";
import {
  isDuplicateActivity,
  type ExistingActivity,
  type IncomingExternalActivity,
} from "@/core/integrations/dedupe";
import { parseActivityFileContent } from "@/core/integrations/activity-file-parser";
import {
  classifyExternalActivityBatch,
  classifyImportedOrFreeActivity,
  type ActivityClassChoice,
} from "@/core/integrations/activity-classifier";
import type { ActivityClass } from "@/core/modalities";
import { calculateUnifiedSessionLoad } from "@/core/performance/training-load";

export interface IntegrationStatus {
  provider: "strava" | "apple_health" | "health_connect" | "garmin";
  name: string;
  description: string;
  isConnected: boolean;
  lastSyncAt: Date | null;
  syncCount: number;
}

export async function getUserIntegrations(): Promise<IntegrationStatus[]> {
  const user = await getOrCreateDemoUser();

  const userIntegrationsList = await db
    .select()
    .from(schema.userIntegrations)
    .where(eq(schema.userIntegrations.userId, user.id));

  const providers = [
    {
      provider: "strava" as const,
      name: "Strava",
      description: "Sincronização bidirecional de corridas, pedaladas e treinos com controle de rate limit.",
    },
    {
      provider: "apple_health" as const,
      name: "Apple Health / HealthKit",
      description: "Leitura de treinos, passos diários e frequência cardíaca de repouso gravados no Apple Watch.",
    },
    {
      provider: "health_connect" as const,
      name: "Google Health Connect",
      description: "Sincronização de atividades físicas e métricas corporais em ecossistemas Android e WearOS.",
    },
    {
      provider: "garmin" as const,
      name: "Garmin Connect",
      description: "Importação direta de arquivos de sessão .FIT, potência (Watts) e cadência de precisão.",
    },
  ];

  return providers.map((p) => {
    const record = userIntegrationsList.find((i) => i.provider === p.provider);
    return {
      ...p,
      isConnected: record ? record.status === "connected" : false,
      lastSyncAt: record?.lastSyncAt || null,
      syncCount: record ? 12 : 0,
    };
  });
}

export async function toggleIntegration(
  provider: "strava" | "apple_health" | "health_connect" | "garmin",
  connect: boolean
) {
  const user = await getOrCreateDemoUser();

  const [existing] = await db
    .select()
    .from(schema.userIntegrations)
    .where(
      and(
        eq(schema.userIntegrations.userId, user.id),
        eq(schema.userIntegrations.provider, provider)
      )
    )
    .limit(1);

  if (existing) {
    await db
      .update(schema.userIntegrations)
      .set({
        status: connect ? "connected" : "disconnected",
        lastSyncAt: connect ? new Date() : existing.lastSyncAt,
        updatedAt: new Date(),
      })
      .where(eq(schema.userIntegrations.id, existing.id));
  } else if (connect) {
    await db.insert(schema.userIntegrations).values({
      userId: user.id,
      provider,
      status: "connected",
      accessToken: `mock_oauth_${provider}_${Date.now()}`,
      lastSyncAt: new Date(),
    });
  }

  revalidatePath("/integracoes");
  revalidatePath("/performance");
}

/**
 * Sincroniza atividades externas aplicando deduplicação estrita (§16.2)
 */
export async function syncExternalActivities(
  provider: "strava" | "apple_health" | "health_connect" | "garmin"
) {
  const user = await getOrCreateDemoUser();

  // 1. Obter atividades existentes registradas
  const existingRecords = await db
    .select({
      id: schema.activityEvents.id,
      externalActivityId: schema.activityEvents.externalActivityId,
      source: schema.activityEvents.source,
      startedAt: schema.activityEvents.createdAt,
      durationMinutes: schema.activityEvents.durationMinutes,
    })
    .from(schema.activityEvents)
    .where(eq(schema.activityEvents.userId, user.id));

  const existingFormatted: ExistingActivity[] = existingRecords.map((r) => ({
    id: r.id,
    externalActivityId: r.externalActivityId,
    source: r.source,
    startedAt: r.startedAt.toISOString(),
    durationMinutes: r.durationMinutes,
  }));

  // 2. Simular nova atividade recebida do provedor externo
  const today = new Date().toISOString().split("T")[0];
  const sampleIncoming: IncomingExternalActivity = {
    externalActivityId: `${provider}-${Date.now()}`,
    source: provider,
    startedAt: new Date().toISOString(),
    durationMinutes: 42,
    sportCode: provider === "strava" ? "running" : "cycling",
  };

  const dedupeCheck = isDuplicateActivity(sampleIncoming, existingFormatted);

  if (dedupeCheck.isDuplicate) {
    return {
      success: false,
      isDuplicate: true,
      reason: dedupeCheck.reason,
    };
  }

  const athleteProfile = await resolveAthleteModalityProfileForUser(user.id);
  const classification = classifyImportedOrFreeActivity({
    activityModalityCode: sampleIncoming.sportCode,
    athleteProfile,
    explicitClass: "auto",
  });

  // 3. Inserir no histórico de atividades
  await db.insert(schema.activityEvents).values({
    userId: user.id,
    source: provider,
    activityClass: classification.activityClass,
    externalActivityId: sampleIncoming.externalActivityId,
    localDate: today,
    durationMinutes: sampleIncoming.durationMinutes,
    countsForStreak: true,
  });

  // Atualizar lastSyncAt na integração
  await db
    .update(schema.userIntegrations)
    .set({ lastSyncAt: new Date() })
    .where(
      and(
        eq(schema.userIntegrations.userId, user.id),
        eq(schema.userIntegrations.provider, provider)
      )
    );

  revalidatePath("/integracoes");
  revalidatePath("/evolucao");
  revalidatePath("/performance");
  revalidatePath("/analytics");

  return {
    success: true,
    isDuplicate: false,
    syncedActivityId: sampleIncoming.externalActivityId,
    activityClass: classification.activityClass,
    classificationBadgePt: classification.presentation.badgePt,
    classificationRationalePt: classification.rationalePt,
  };
}

export interface ImportedActivitySummaryItem {
  title: string;
  modalityCode: string;
  localDate: string;
  durationMinutes: number;
  distanceKm: number | null;
  loadEa: number;
  activityClass: ActivityClass;
  badgePt: string;
  titlePt: string;
  rationalePt: string;
}

/**
 * Importa arquivo real de atividade esportiva (.GPX, .TCX, .CSV, .JSON) com deduplicação automática,
 * classificação automática entre Modalidade Principal, Suporte e Atividade Solta (Fase 6)
 * e conversão imediata em Energia Adaptativa (EA).
 */
export async function importExternalActivityFile(input: {
  fileName: string;
  content: string;
  provider?: "strava" | "apple_health" | "health_connect" | "garmin";
  activityClassOverride?: ActivityClassChoice;
}) {
  const user = await getOrCreateDemoUser();
  const provider = input.provider || "strava";

  const parsedList = parseActivityFileContent(input.content, input.fileName);
  if (parsedList.length === 0) {
    throw new Error(
      "Não foi possível extrair atividades deste arquivo. Utilize formatos .GPX, .TCX, .CSV ou .JSON."
    );
  }

  const [existingRecords, athleteProfile, commitmentRows] = await Promise.all([
    db
      .select({
        id: schema.activityEvents.id,
        externalActivityId: schema.activityEvents.externalActivityId,
        source: schema.activityEvents.source,
        startedAt: schema.activityEvents.createdAt,
        durationMinutes: schema.activityEvents.durationMinutes,
      })
      .from(schema.activityEvents)
      .where(eq(schema.activityEvents.userId, user.id)),
    resolveAthleteModalityProfileForUser(user.id),
    db
      .select({
        localDate: schema.calendarCommitments.localDate,
      })
      .from(schema.calendarCommitments)
      .where(eq(schema.calendarCommitments.userId, user.id)),
  ]);

  const plannedDatesSet = new Set(
    commitmentRows.map((c) => String(c.localDate))
  );

  const existingFormatted: ExistingActivity[] = existingRecords.map((r) => ({
    id: r.id,
    externalActivityId: r.externalActivityId,
    source: r.source,
    startedAt: r.startedAt.toISOString(),
    durationMinutes: r.durationMinutes,
  }));

  const classifiedBatch = classifyExternalActivityBatch({
    activities: parsedList,
    athleteProfile,
    explicitOverride: input.activityClassOverride ?? "auto",
    plannedDatesSet,
  });

  let importedCount = 0;
  let skippedDuplicatesCount = 0;
  let totalEaAdded = 0;
  const importedTitles: string[] = [];
  const importedItems: ImportedActivitySummaryItem[] = [];

  for (const { activity: act, classification } of classifiedBatch) {
    const incoming: IncomingExternalActivity = {
      externalActivityId: act.externalId,
      source: provider,
      startedAt: act.startedAtIso,
      durationMinutes: act.durationMinutes,
      sportCode: act.modalityCode,
    };

    const dedupe = isDuplicateActivity(incoming, existingFormatted);
    if (dedupe.isDuplicate) {
      skippedDuplicatesCount++;
      continue;
    }

    const startedAt = new Date(act.startedAtIso);
    const finishedAt = new Date(
      startedAt.getTime() + act.durationMinutes * 60_000
    );
    const clientSessionId = `import_${act.externalId}_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 7)}`;

    const sportId = await resolveSportIdForModalityCode(act.modalityCode);

    const [session] = await db
      .insert(schema.workoutSessions)
      .values({
        userId: user.id,
        title: act.title,
        modalityCode: act.modalityCode,
        sportId,
        activityClass: classification.activityClass,
        status: "completed",
        startedAt,
        finishedAt,
        rpeSession: act.estimatedRpe,
        notes: `Importado via ${input.fileName} (${act.sourceFormat.toUpperCase()}) · ${classification.presentation.titlePt}`,
        clientSessionId,
        timezone: "America/Sao_Paulo",
      })
      .returning();

    await db.insert(schema.activityEvents).values({
      userId: user.id,
      sessionId: session.id,
      source: provider,
      activityClass: classification.activityClass,
      externalActivityId: act.externalId,
      localDate: act.localDate,
      durationMinutes: act.durationMinutes,
      countsForStreak: true,
    });

    if (act.distanceKm && act.distanceKm > 0) {
      await db.insert(schema.sessionMetrics).values({
        sessionId: session.id,
        metricKey: "distance_km",
        metricValue: act.distanceKm,
        unit: "km",
      });
    }

    if (act.avgHeartRateBpm && act.avgHeartRateBpm > 0) {
      await db.insert(schema.sessionMetrics).values({
        sessionId: session.id,
        metricKey: "avg_hr_bpm",
        metricValue: act.avgHeartRateBpm,
        unit: "bpm",
      });
    }

    const loadEa = calculateUnifiedSessionLoad({
      durationMinutes: act.durationMinutes,
      rpe: act.estimatedRpe,
      modalityCode: act.modalityCode,
      distanceKm: act.distanceKm,
    });

    totalEaAdded += loadEa;
    importedCount++;
    importedTitles.push(
      `${act.title} [${classification.presentation.badgePt}] (${act.durationMinutes} min${
        act.distanceKm ? ` · ${act.distanceKm} km` : ""
      } · -${loadEa} EA)`
    );
    importedItems.push({
      title: act.title,
      modalityCode: act.modalityCode,
      localDate: act.localDate,
      durationMinutes: act.durationMinutes,
      distanceKm: act.distanceKm,
      loadEa,
      activityClass: classification.activityClass,
      badgePt: classification.presentation.badgePt,
      titlePt: classification.presentation.titlePt,
      rationalePt: classification.rationalePt,
    });

    existingFormatted.push({
      id: session.id,
      externalActivityId: act.externalId,
      source: provider,
      startedAt: act.startedAtIso,
      durationMinutes: act.durationMinutes,
    });
  }

  if (importedCount > 0) {
    await dispatchSmartNotification({
      recipientUserId: user.id,
      eventType: "external_activities_imported",
      params: {
        importedCount,
        loadEa: totalEaAdded,
      },
    });
  }

  revalidatePath("/");
  revalidatePath("/calendario");
  revalidatePath("/evolucao");
  revalidatePath("/integracoes");
  revalidatePath("/comunidade/desafios");

  return {
    importedCount,
    skippedDuplicatesCount,
    totalEaAdded,
    importedTitles,
    importedItems,
  };
}

/**
 * Carrega e atualiza a Calibração Rápida do Perfil Fisiológico (< 2 min — §Fase 15)
 * para personalizar imediatamente a Capacidade de Energia Adaptativa (EA) e a Decisão do Dia.
 */
export async function getBaselineCalibrationSnapshot() {
  const user = await getOrCreateDemoUser();
  const [profileRows, goalRows, hrRows] = await Promise.all([
    db
      .select()
      .from(schema.profiles)
      .where(eq(schema.profiles.userId, user.id))
      .limit(1),
    db
      .select()
      .from(schema.weeklyGoals)
      .where(eq(schema.weeklyGoals.userId, user.id))
      .limit(1),
    db
      .select()
      .from(schema.bodyMetrics)
      .where(
        and(
          eq(schema.bodyMetrics.userId, user.id),
          eq(schema.bodyMetrics.metricType, "resting_hr")
        )
      )
      .orderBy(desc(schema.bodyMetrics.recordedAt))
      .limit(1),
  ]);

  return {
    experienceLevel:
      (profileRows[0]?.experienceLevel as
        | "beginner"
        | "intermediate"
        | "advanced") || "intermediate",
    targetDaysPerWeek: goalRows[0]?.targetDaysPerWeek || 4,
    restingHrBpm: hrRows[0]?.valueNumeric || null,
  };
}

export async function saveBaselineCalibration(input: {
  experienceLevel: "beginner" | "intermediate" | "advanced";
  targetDaysPerWeek: number;
  restingHrBpm?: number | null;
}) {
  const user = await getOrCreateDemoUser();
  const safeDays = Math.max(2, Math.min(7, Math.round(input.targetDaysPerWeek || 4)));

  await db
    .update(schema.profiles)
    .set({
      experienceLevel: input.experienceLevel,
      updatedAt: new Date(),
    })
    .where(eq(schema.profiles.userId, user.id));

  const [existingGoal] = await db
    .select()
    .from(schema.weeklyGoals)
    .where(eq(schema.weeklyGoals.userId, user.id))
    .limit(1);

  if (existingGoal) {
    await db
      .update(schema.weeklyGoals)
      .set({ targetDaysPerWeek: safeDays })
      .where(eq(schema.weeklyGoals.id, existingGoal.id));
  } else {
    await db.insert(schema.weeklyGoals).values({
      userId: user.id,
      targetDaysPerWeek: safeDays,
      effectiveFrom: new Date().toISOString().split("T")[0],
    });
  }

  if (
    typeof input.restingHrBpm === "number" &&
    input.restingHrBpm >= 35 &&
    input.restingHrBpm <= 110
  ) {
    await db.insert(schema.bodyMetrics).values({
      userId: user.id,
      metricType: "resting_hr",
      valueNumeric: Math.round(input.restingHrBpm),
      unit: "bpm",
      visibility: "private",
      source: "manual",
    });
  }

  revalidatePath("/");
  revalidatePath("/evolucao");
  revalidatePath("/integracoes");
  revalidatePath("/perfil");
  return { ok: true };
}