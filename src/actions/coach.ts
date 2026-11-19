"use server";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getOrCreateDemoUser } from "./workout";
import { dispatchSmartNotification } from "./notifications";
import { assertActionRole } from "@/lib/auth-role";

export async function getCoachDashboardData() {
  await assertActionRole("coach");
  const coachUser = await getOrCreateDemoUser();

  // Garante que o usuário tem registro como Coach
  let [coachProfile] = await db
    .select()
    .from(schema.coaches)
    .where(eq(schema.coaches.userId, coachUser.id))
    .limit(1);

  if (!coachProfile) {
    [coachProfile] = await db
      .insert(schema.coaches)
      .values({
        userId: coachUser.id,
        biography: "Head Coach e Especialista em Preparação de Força e Condicionamento.",
        specialties: ["Musculação", "LPO", "Periodização"],
      })
      .returning();
  }

  // Atletas atribuídos (§8.4)
  const assignments = await db
    .select({
      id: schema.athleteAssignments.id,
      athleteId: schema.users.id,
      athleteName: schema.users.name,
      athleteEmail: schema.users.email,
      status: schema.athleteAssignments.status,
      startedAt: schema.athleteAssignments.startedAt,
    })
    .from(schema.athleteAssignments)
    .innerJoin(schema.users, eq(schema.athleteAssignments.athleteUserId, schema.users.id))
    .where(eq(schema.athleteAssignments.coachId, coachProfile.id));

  // Programas criados pelo coach
  const programs = await db
    .select()
    .from(schema.trainingPrograms)
    .where(eq(schema.trainingPrograms.coachId, coachProfile.id))
    .orderBy(desc(schema.trainingPrograms.createdAt));

  // Solicitações pendentes de equipes onde é coach
  const memberships = await db
    .select({
      teamId: schema.teamMemberships.teamId,
      teamName: schema.teams.name,
    })
    .from(schema.teamMemberships)
    .innerJoin(schema.teams, eq(schema.teamMemberships.teamId, schema.teams.id))
    .where(
      and(
        eq(schema.teamMemberships.userId, coachUser.id),
        eq(schema.teamMemberships.role, "head_coach")
      )
    );

  return {
    coachUser,
    coachProfile,
    assignments,
    programs,
    memberships,
    metrics: {
      activeAthletesCount: assignments.filter((a) => a.status === "active").length,
      publishedProgramsCount: programs.length,
      pendingReviewsCount: 0,
    },
  };
}

/**
 * Publicar atualização de programação com versionamento obrigatório (§8.5)
 * O histórico passado das sessões concluídas nunca é alterado.
 */
export async function publishProgramVersion(
  programId: string,
  newPlanData: any,
  changeLog: string
) {
  await assertActionRole("coach");
  // 1. Descobre a versão anterior
  const versions = await db
    .select()
    .from(schema.programVersions)
    .where(eq(schema.programVersions.programId, programId))
    .orderBy(desc(schema.programVersions.versionNumber));

  const nextVersionNum = (versions[0]?.versionNumber || 0) + 1;

  // Marca anteriores como isCurrent = false
  await db
    .update(schema.programVersions)
    .set({ isCurrent: false })
    .where(eq(schema.programVersions.programId, programId));

  // 2. Insere nova versão com snapshot
  const [newVersion] = await db
    .insert(schema.programVersions)
    .values({
      programId,
      versionNumber: nextVersionNum,
      changeLog,
      isCurrent: true,
      rawPlanData: newPlanData,
    })
    .returning();

  const [prog] = await db
    .select()
    .from(schema.trainingPrograms)
    .where(eq(schema.trainingPrograms.id, programId))
    .limit(1);

  if (prog) {
    await dispatchSmartNotification({
      recipientUserId: prog.creatorUserId || undefined,
      eventType: "coach_program_published",
      params: {
        programTitle: prog.title,
        customNotes: changeLog,
      },
    });
  }

  revalidatePath("/coach");
  return newVersion;
}
