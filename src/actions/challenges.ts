"use server";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, desc, and, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getOrCreateDemoUser } from "./workout";
import { dispatchSmartNotification } from "./notifications";
import { calculateUnifiedSessionLoad } from "@/core/performance/training-load";

export type ChallengeScoringFormat =
  | "active_days"
  | "adaptive_energy"
  | "minutes";

export interface CreateChallenge3TapsInput {
  scoringFormat: ChallengeScoringFormat;
  durationDays: 7 | 28 | 90;
  title?: string;
  description?: string;
}

const SCORING_DEFAULTS: Record<
  ChallengeScoringFormat,
  {
    defaultTitle: string;
    metricLabel: string;
    targetPerWeek: number;
    descriptionPt: string;
  }
> = {
  active_days: {
    defaultTitle: "Desafio de Constância Multimodal",
    metricLabel: "dias ativos",
    targetPerWeek: 4,
    descriptionPt:
      "Cada dia com treino ou atividade registrada soma 1 ponto no placar, independente do esporte.",
  },
  adaptive_energy: {
    defaultTitle: "Copa Energia Adaptativa (EA)",
    metricLabel: "EA",
    targetPerWeek: 1500,
    descriptionPt:
      "Placar unificado Selye: soma a Energia Adaptativa (EA) de musculação, areia, corrida, futsal e hábitos regenerativos.",
  },
  minutes: {
    defaultTitle: "Desafio Movimento Contínuo",
    metricLabel: "min",
    targetPerWeek: 180,
    descriptionPt:
      "Soma os minutos ativos em qualquer modalidade física ao longo do ciclo.",
  },
};

/**
 * Calcula a pontuação real de um conjunto de usuários dentro da janela [startDate, endDate] do desafio.
 */
async function computeParticipantsLiveScores(
  userIds: string[],
  startDateStr: string,
  endDateStr: string,
  challengeType: string
): Promise<Map<string, number>> {
  const scores = new Map<string, number>();
  if (userIds.length === 0) return scores;

  const [sessions, events, recoveryMetrics] = await Promise.all([
    db
      .select()
      .from(schema.workoutSessions)
      .where(
        and(
          inArray(schema.workoutSessions.userId, userIds),
          eq(schema.workoutSessions.status, "completed")
        )
      ),
    db
      .select()
      .from(schema.activityEvents)
      .where(inArray(schema.activityEvents.userId, userIds)),
    db
      .select()
      .from(schema.bodyMetrics)
      .where(
        and(
          inArray(schema.bodyMetrics.userId, userIds),
          eq(schema.bodyMetrics.metricType, "recovery_attitude")
        )
      ),
  ]);

  for (const uid of userIds) {
    const userSessions = sessions.filter((s) => {
      if (s.userId !== uid) return false;
      const d = new Date(s.finishedAt || s.startedAt)
        .toISOString()
        .split("T")[0];
      return d >= startDateStr && d <= endDateStr;
    });

    const userEvents = events.filter((e) => {
      if (e.userId !== uid || !e.countsForStreak) return false;
      const d = String(e.localDate);
      return d >= startDateStr && d <= endDateStr;
    });

    if (challengeType === "adaptive_energy") {
      let totalEa = 0;
      for (const s of userSessions) {
        const dur = s.finishedAt
          ? Math.max(
              15,
              Math.round(
                (new Date(s.finishedAt).getTime() -
                  new Date(s.startedAt).getTime()) /
                  60000
              )
            )
          : 45;
        totalEa += calculateUnifiedSessionLoad({
          durationMinutes: dur,
          rpe: s.rpeSession || 7,
          modalityCode: s.modalityCode,
        });
      }
      // Soma também atitudes regenerativas (+EA) para premiar recuperação inteligente!
      const userRec = recoveryMetrics.filter((m) => {
        if (m.userId !== uid) return false;
        const d = new Date(m.recordedAt).toISOString().split("T")[0];
        return d >= startDateStr && d <= endDateStr;
      });
      for (const r of userRec) {
        totalEa += Math.round(r.valueNumeric || 60);
      }
      scores.set(uid, totalEa);
    } else if (challengeType === "minutes") {
      let totalMin = 0;
      if (userSessions.length > 0) {
        for (const s of userSessions) {
          const dur = s.finishedAt
            ? Math.max(
                15,
                Math.round(
                  (new Date(s.finishedAt).getTime() -
                    new Date(s.startedAt).getTime()) /
                    60000
                )
              )
            : 45;
          totalMin += dur;
        }
      } else {
        for (const e of userEvents) {
          totalMin += e.durationMinutes || 45;
        }
      }
      scores.set(uid, totalMin);
    } else {
      // Dias ativos únicos (padrão)
      const activeDates = new Set<string>();
      for (const s of userSessions) {
        activeDates.add(
          new Date(s.finishedAt || s.startedAt).toISOString().split("T")[0]
        );
      }
      for (const e of userEvents) {
        if (e.localDate) activeDates.add(String(e.localDate));
      }
      scores.set(uid, activeDates.size);
    }
  }

  return scores;
}

export async function getChallenges() {
  const currentUser = await getOrCreateDemoUser();

  const allChallenges = await db
    .select()
    .from(schema.challenges)
    .where(eq(schema.challenges.isActive, true))
    .orderBy(desc(schema.challenges.createdAt));

  const enriched = await Promise.all(
    allChallenges.map(async (c) => {
      const participants = await db
        .select()
        .from(schema.challengeParticipants)
        .where(eq(schema.challengeParticipants.challengeId, c.id));

      const userParticipation = participants.find(
        (p) => p.userId === currentUser.id
      );

      let userProgress = userParticipation?.progressValue || "0";
      if (userParticipation) {
        const liveMap = await computeParticipantsLiveScores(
          [currentUser.id],
          String(c.startDate),
          String(c.endDate),
          c.challengeType
        );
        const computed = liveMap.get(currentUser.id) ?? 0;
        const stored = Number(userParticipation.progressValue) || 0;
        userProgress = String(Math.max(computed, stored));
      }

      const targetNum = Math.max(1, Number(c.targetValue || 4));
      const isCompleted =
        Number(userProgress) >= targetNum ||
        Boolean(userParticipation?.completed);

      return {
        ...c,
        participantsCount: participants.length,
        hasJoined: !!userParticipation,
        userProgress,
        isCompleted,
      };
    })
  );

  return enriched;
}

/**
 * Cria um Desafio entre Amigos em 3 Toques (Fase 14) e inscreve automaticamente o atleta criador.
 */
export async function createChallengeIn3Taps(
  input: CreateChallenge3TapsInput
) {
  const currentUser = await getOrCreateDemoUser();
  const format = input.scoringFormat || "active_days";
  const durationDays = [7, 28, 90].includes(input.durationDays)
    ? input.durationDays
    : 7;

  const preset = SCORING_DEFAULTS[format] || SCORING_DEFAULTS.active_days;
  const weeksFactor = Math.max(1, Math.round(durationDays / 7));
  const targetValue = String(preset.targetPerWeek * weeksFactor);

  const now = new Date();
  const startDate = now.toISOString().split("T")[0];
  const endObj = new Date(now);
  endObj.setDate(now.getDate() + durationDays);
  const endDate = endObj.toISOString().split("T")[0];

  const cleanTitle =
    input.title?.trim() || `${preset.defaultTitle} (${durationDays}d)`;
  const cleanDescription =
    input.description?.trim() || preset.descriptionPt;

  const [created] = await db
    .insert(schema.challenges)
    .values({
      title: cleanTitle,
      description: cleanDescription,
      startDate,
      endDate,
      challengeType: format,
      targetMetric: preset.metricLabel,
      targetValue,
      isActive: true,
    })
    .returning();

  const liveMap = await computeParticipantsLiveScores(
    [currentUser.id],
    startDate,
    endDate,
    format
  );
  const initialScore = liveMap.get(currentUser.id) ?? 1;

  await db.insert(schema.challengeParticipants).values({
    challengeId: created.id,
    userId: currentUser.id,
    progressValue: String(initialScore),
    completed: initialScore >= Number(targetValue),
  });

  await dispatchSmartNotification({
    recipientUserId: currentUser.id,
    eventType: "challenge_created",
    params: {
      challengeTitle: created.title,
    },
  });

  revalidatePath("/comunidade");
  revalidatePath("/comunidade/desafios");
  return created;
}

export async function joinChallenge(challengeId: string) {
  const currentUser = await getOrCreateDemoUser();

  const [existing] = await db
    .select()
    .from(schema.challengeParticipants)
    .where(
      and(
        eq(schema.challengeParticipants.challengeId, challengeId),
        eq(schema.challengeParticipants.userId, currentUser.id)
      )
    )
    .limit(1);

  if (!existing) {
    await db.insert(schema.challengeParticipants).values({
      challengeId,
      userId: currentUser.id,
      progressValue: "1",
      completed: false,
    });

    const [challenge] = await db
      .select({ title: schema.challenges.title })
      .from(schema.challenges)
      .where(eq(schema.challenges.id, challengeId))
      .limit(1);

    await dispatchSmartNotification({
      recipientUserId: currentUser.id,
      eventType: "challenge_joined",
      params: {
        challengeTitle: challenge?.title || "Desafio Selye",
      },
    });
  }

  revalidatePath("/comunidade");
  revalidatePath("/comunidade/desafios");
}

export async function getChallengeLeaderboard(challengeId: string) {
  const [challenge] = await db
    .select()
    .from(schema.challenges)
    .where(eq(schema.challenges.id, challengeId))
    .limit(1);

  if (!challenge) {
    return null;
  }

  const participants = await db
    .select({
      id: schema.challengeParticipants.id,
      userId: schema.challengeParticipants.userId,
      progressValue: schema.challengeParticipants.progressValue,
      completed: schema.challengeParticipants.completed,
      completedAt: schema.challengeParticipants.completedAt,
      joinedAt: schema.challengeParticipants.joinedAt,
      name: schema.users.name,
      username: schema.users.username,
      avatarUrl: schema.users.avatarUrl,
    })
    .from(schema.challengeParticipants)
    .innerJoin(
      schema.users,
      eq(schema.challengeParticipants.userId, schema.users.id)
    )
    .where(eq(schema.challengeParticipants.challengeId, challengeId));

  const liveScores = await computeParticipantsLiveScores(
    participants.map((p) => p.userId),
    String(challenge.startDate),
    String(challenge.endDate),
    challenge.challengeType
  );

  const targetNum = Math.max(1, Number(challenge.targetValue || 4));
  const enrichedParticipants = participants
    .map((p) => {
      const stored = Number(p.progressValue) || 0;
      const computed = liveScores.get(p.userId) ?? 0;
      const bestScore = Math.max(stored, computed);
      return {
        ...p,
        progressValue: String(bestScore),
        numericScore: bestScore,
        completed: bestScore >= targetNum || p.completed,
      };
    })
    .sort((a, b) => b.numericScore - a.numericScore);

  return {
    challenge,
    participants: enrichedParticipants,
  };
}
