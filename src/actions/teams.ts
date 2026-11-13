"use server";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getOrCreateDemoUser } from "./workout";

export interface CreateTeamInput {
  name: string;
  slug: string;
  description?: string;
  privacy?: string;
  location?: string;
}

export async function createTeam(input: CreateTeamInput) {
  const user = await getOrCreateDemoUser();

  const [team] = await db
    .insert(schema.teams)
    .values({
      name: input.name,
      slug: input.slug.toLowerCase().trim().replace(/\s+/g, "-"),
      description: input.description,
      ownerId: user.id,
      privacy: input.privacy || "invite_only",
      location: input.location,
    })
    .returning();

  // Adiciona criador como Proprietário (Owner)
  await db.insert(schema.teamMemberships).values({
    teamId: team.id,
    userId: user.id,
    role: "owner",
    status: "active",
  });

  // Gera código inicial de convite
  await db.insert(schema.teamInvitations).values({
    teamId: team.id,
    inviterId: user.id,
    inviteCode: `SELYE-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    inviteType: "link",
    status: "active",
  });

  revalidatePath("/equipes");
  return team;
}

export async function getAllTeams() {
  const teamsList = await db
    .select({
      id: schema.teams.id,
      name: schema.teams.name,
      slug: schema.teams.slug,
      description: schema.teams.description,
      privacy: schema.teams.privacy,
      location: schema.teams.location,
      createdAt: schema.teams.createdAt,
      ownerName: schema.users.name,
    })
    .from(schema.teams)
    .innerJoin(schema.users, eq(schema.teams.ownerId, schema.users.id))
    .orderBy(desc(schema.teams.createdAt));

  const enriched = await Promise.all(
    teamsList.map(async (t) => {
      const members = await db
        .select()
        .from(schema.teamMemberships)
        .where(
          and(
            eq(schema.teamMemberships.teamId, t.id),
            eq(schema.teamMemberships.status, "active")
          )
        );

      return {
        ...t,
        membersCount: members.length,
      };
    })
  );

  return enriched;
}

export async function joinTeamByCode(inviteCode: string) {
  const user = await getOrCreateDemoUser();

  const [invitation] = await db
    .select()
    .from(schema.teamInvitations)
    .where(
      and(
        eq(schema.teamInvitations.inviteCode, inviteCode.trim().toUpperCase()),
        eq(schema.teamInvitations.status, "active")
      )
    )
    .limit(1);

  if (!invitation) {
    throw new Error("Código de convite inválido ou expirado.");
  }

  // Verifica se já é membro
  const [existing] = await db
    .select()
    .from(schema.teamMemberships)
    .where(
      and(
        eq(schema.teamMemberships.teamId, invitation.teamId),
        eq(schema.teamMemberships.userId, user.id)
      )
    )
    .limit(1);

  if (existing) {
    return existing;
  }

  const [membership] = await db
    .insert(schema.teamMemberships)
    .values({
      teamId: invitation.teamId,
      userId: user.id,
      role: "athlete",
      status: "active",
    })
    .returning();

  // Incrementa uso do convite
  await db
    .update(schema.teamInvitations)
    .set({ usedCount: invitation.usedCount + 1 })
    .where(eq(schema.teamInvitations.id, invitation.id));

  revalidatePath("/equipes");
  revalidatePath("/comunidade");
  return membership;
}
