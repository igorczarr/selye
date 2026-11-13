"use server";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getOrCreateDemoUser } from "./workout";

export async function getChallenges() {
  const currentUser = await getOrCreateDemoUser();

  const allChallenges = await db
    .select()
    .from(schema.challenges)
    .where(eq(schema.challenges.isActive, true))
    .orderBy(desc(schema.challenges.createdAt));

  const enriched = await Promise.all(
    allChallenges.map(async (c) => {
      // Participantes
      const participants = await db
        .select()
        .from(schema.challengeParticipants)
        .where(eq(schema.challengeParticipants.challengeId, c.id));

      // Verifica se o usuário atual participa
      const userParticipation = participants.find((p) => p.userId === currentUser.id);

      return {
        ...c,
        participantsCount: participants.length,
        hasJoined: !!userParticipation,
        userProgress: userParticipation?.progressValue || "0",
        isCompleted: userParticipation?.completed || false,
      };
    })
  );

  return enriched;
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
    .innerJoin(schema.users, eq(schema.challengeParticipants.userId, schema.users.id))
    .where(eq(schema.challengeParticipants.challengeId, challengeId))
    .orderBy(desc(schema.challengeParticipants.completed), desc(schema.challengeParticipants.progressValue));

  return {
    challenge,
    participants,
  };
}