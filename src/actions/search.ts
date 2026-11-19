"use server";

import { connection } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getOrCreateDemoUser } from "./workout";
import { sortRoutinesChronologically } from "@/lib/week";

export interface GlobalSearchSnapshot {
  userName: string;
  activeSession: {
    id: string;
    title: string;
    startedAt: string;
  } | null;
  routines: {
    id: string;
    title: string;
    modalityCode: string;
  }[];
  exercises: {
    id: string;
    namePt: string;
    muscle: string;
    difficulty: string | null;
    instructionsPt: string | null;
  }[];
  athletes: {
    id: string;
    name: string;
    username: string;
  }[];
  teams: {
    id: string;
    name: string;
    slug: string;
  }[];
}

/**
 * Carrega o índice leve para a Command Palette (⌘K), a saudação contextual
 * e o indicador de treino em andamento na Bottom Pill.
 */
export async function getGlobalShellSnapshot(): Promise<GlobalSearchSnapshot> {
  try {
    await connection();
  } catch {
    // Fora de requisição HTTP
  }

  try {
    const user = await getOrCreateDemoUser();

    const [activeRows, routinesRows, exercisesRows, athletesRows, teamsRows] =
      await Promise.all([
        db
          .select({
            id: schema.workoutSessions.id,
            title: schema.workoutSessions.title,
            startedAt: schema.workoutSessions.startedAt,
          })
          .from(schema.workoutSessions)
          .where(
            and(
              eq(schema.workoutSessions.userId, user.id),
              eq(schema.workoutSessions.status, "in_progress")
            )
          )
          .orderBy(desc(schema.workoutSessions.startedAt))
          .limit(1),
        db
          .select({
            id: schema.trainingPrograms.id,
            title: schema.trainingPrograms.title,
            modalityCode: schema.trainingPrograms.modalityCode,
            createdAt: schema.trainingPrograms.createdAt,
          })
          .from(schema.trainingPrograms)
          .where(
            and(
              eq(schema.trainingPrograms.creatorUserId, user.id),
              eq(schema.trainingPrograms.isArchived, false)
            )
          )
          .limit(20),
        db
          .select({
            id: schema.exercises.id,
            namePt: schema.exercises.namePt,
            secondaryMuscles: schema.exercises.secondaryMuscles,
            difficulty: schema.exercises.difficulty,
            instructionsPt: schema.exercises.instructionsPt,
          })
          .from(schema.exercises)
          .limit(60),
        db
          .select({
            id: schema.users.id,
            name: schema.users.name,
            username: schema.users.username,
          })
          .from(schema.users)
          .limit(20),
        db
          .select({
            id: schema.teams.id,
            name: schema.teams.name,
            slug: schema.teams.slug,
          })
          .from(schema.teams)
          .limit(15),
      ]);

    const sortedRoutines = sortRoutinesChronologically(routinesRows);
    const active = activeRows[0];

    return {
      userName: user.name || "Atleta",
      activeSession: active
        ? {
            id: active.id,
            title: active.title,
            startedAt: new Date(active.startedAt).toISOString(),
          }
        : null,
      routines: sortedRoutines.map((r) => ({
        id: r.id,
        title: r.title,
        modalityCode: r.modalityCode,
      })),
      exercises: exercisesRows.map((ex) => ({
        id: ex.id,
        namePt: ex.namePt,
        muscle: ex.secondaryMuscles?.[0] || "Musculação",
        difficulty: ex.difficulty,
        instructionsPt: ex.instructionsPt,
      })),
      athletes: athletesRows,
      teams: teamsRows,
    };
  } catch {
    return {
      userName: "Atleta",
      activeSession: null,
      routines: [],
      exercises: [],
      athletes: [],
      teams: [],
    };
  }
}
