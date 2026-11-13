"use server";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getOrCreateDemoUser } from "./workout";
import {
  isDuplicateActivity,
  type ExistingActivity,
  type IncomingExternalActivity,
} from "@/core/integrations/dedupe";

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

  // 3. Inserir no histórico de atividades
  await db.insert(schema.activityEvents).values({
    userId: user.id,
    source: provider,
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
  revalidatePath("/performance");
  revalidatePath("/analytics");

  return {
    success: true,
    isDuplicate: false,
    syncedActivityId: sampleIncoming.externalActivityId,
  };
}