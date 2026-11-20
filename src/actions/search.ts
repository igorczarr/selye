"use server";

import { connection } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import {
  getOrCreateDemoUser,
  getDashboardData,
  resolveAthleteModalityProfileForUser,
} from "./workout";
import { sortRoutinesChronologically } from "@/lib/week";
import { calculateWeeklyStreak } from "@/core/consistency/streak-calculator";
import { getExerciseCategoryMeta } from "@/core/catalog/exercise-categories";
import type { CoreModalityCode } from "@/core/modalities";

export interface GlobalSearchSnapshot {
  userName: string;
  currentWeeklyStreak: number;
  activeDaysInYear: number;
  eaReservePercent: number;
  availableReserveEa: number;
  personalCapacityEa: number;
  athleteModalityProfile: {
    primaryModality: CoreModalityCode;
    complementaryModalities: CoreModalityCode[];
  };
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

    const [
      activeRows,
      routinesRows,
      exercisesRows,
      athletesRows,
      teamsRows,
      completedRows,
      activityRows,
      goalRows,
      streakRows,
    ] = await Promise.all([
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
          nameEn: schema.exercises.nameEn,
          modalityCode: schema.exercises.modalityCode,
          secondaryMuscles: schema.exercises.secondaryMuscles,
          difficulty: schema.exercises.difficulty,
          instructionsPt: schema.exercises.instructionsPt,
        })
        .from(schema.exercises)
        .limit(120),
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
      db
        .select({
          startedAt: schema.workoutSessions.startedAt,
          finishedAt: schema.workoutSessions.finishedAt,
        })
        .from(schema.workoutSessions)
        .where(
          and(
            eq(schema.workoutSessions.userId, user.id),
            eq(schema.workoutSessions.status, "completed")
          )
        ),
      db
        .select({
          localDate: schema.activityEvents.localDate,
          countsForStreak: schema.activityEvents.countsForStreak,
        })
        .from(schema.activityEvents)
        .where(eq(schema.activityEvents.userId, user.id)),
      db
        .select({ targetDaysPerWeek: schema.weeklyGoals.targetDaysPerWeek })
        .from(schema.weeklyGoals)
        .where(eq(schema.weeklyGoals.userId, user.id))
        .limit(1),
      db
        .select({ currentWeeklyStreak: schema.streaks.currentWeeklyStreak })
        .from(schema.streaks)
        .where(eq(schema.streaks.userId, user.id))
        .limit(1),
    ]);

    const sortedRoutines = sortRoutinesChronologically(routinesRows);
    const active = activeRows[0];

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const yearPrefix = `${now.getFullYear()}-`;
    const dateSet = new Set<string>();
    for (const a of activityRows) {
      if (a.countsForStreak && a.localDate) dateSet.add(String(a.localDate));
    }
    for (const s of completedRows) {
      dateSet.add(new Date(s.finishedAt || s.startedAt).toISOString().split("T")[0]);
    }
    const uniqueDates = Array.from(dateSet).sort();
    const targetDays = goalRows[0]?.targetDaysPerWeek || 4;
    const streakCalc = calculateWeeklyStreak(uniqueDates, targetDays, todayStr);
    const currentWeeklyStreak = Math.max(
      streakCalc.current,
      streakRows[0]?.currentWeeklyStreak || 0
    );
    const activeDaysInYear = uniqueDates.filter((d) =>
      d.startsWith(yearPrefix)
    ).length;

    let eaReservePercent = 82;
    let availableReserveEa = 1455;
    let personalCapacityEa = 1800;
    let athleteModalityProfile: {
      primaryModality: CoreModalityCode;
      complementaryModalities: CoreModalityCode[];
    } = {
      primaryModality: "strength",
      complementaryModalities: [],
    };
    try {
      const [dash, modProfile] = await Promise.all([
        getDashboardData(),
        resolveAthleteModalityProfileForUser(user.id),
      ]);
      const ap = dash.performanceSummary.adaptiveProfile;
      eaReservePercent = ap.reservePercent;
      availableReserveEa = ap.availableReserveEa;
      personalCapacityEa = ap.personalCapacityEa;
      athleteModalityProfile = {
        primaryModality: modProfile.primaryModality,
        complementaryModalities: modProfile.complementaryModalities,
      };
    } catch {
      // mantém valores padrão
    }

    return {
      userName: user.name || "Atleta",
      currentWeeklyStreak,
      activeDaysInYear,
      eaReservePercent,
      availableReserveEa,
      personalCapacityEa,
      athleteModalityProfile,
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
      exercises: exercisesRows.map((ex) => {
        const cat = getExerciseCategoryMeta(ex);
        return {
          id: ex.id,
          namePt: ex.namePt,
          muscle: cat.label,
          difficulty: ex.difficulty,
          instructionsPt: ex.instructionsPt,
        };
      }),
      athletes: athletesRows,
      teams: teamsRows,
    };
  } catch {
    return {
      userName: "Atleta",
      currentWeeklyStreak: 0,
      activeDaysInYear: 0,
      eaReservePercent: 80,
      availableReserveEa: 1455,
      personalCapacityEa: 1800,
      athleteModalityProfile: {
        primaryModality: "strength",
        complementaryModalities: [],
      },
      activeSession: null,
      routines: [],
      exercises: [],
      athletes: [],
      teams: [],
    };
  }
}
