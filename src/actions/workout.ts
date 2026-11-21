"use server";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, desc, asc, and, gte, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { connection } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import {
  calculateWeeklyStreak,
  getIsoWeekStart,
} from "@/core/consistency/streak-calculator";
import { getDailyEditorialForDate } from "@/core/editorial/daily-quotes";
import {
  aggregateDailyLoads,
  calculateACWR,
  calculateUnifiedSessionLoad,
  calculateWeeklyRecoveryBudget,
  getModalityProfile,
} from "@/core/performance/training-load";
import {
  calculateSubjectiveReadinessScore,
  evaluateDailyDecision,
  type MorningCheckinInput,
} from "@/core/performance/daily-decision";
import {
  analyzeWeeklyScheduleInterference,
  type SchedulableRoutine,
} from "@/core/performance/weekly-rescheduler";
import {
  learnAdaptiveAthleteProfile,
  RECOVERY_ATTITUDE_MAP,
  type RecoveryAttitudeCode,
  type HistoricalCheckinSample,
  type LoggedRecoveryAttitude,
} from "@/core/ml/adaptive-athlete-engine";
import { generatePerformanceRecommendations } from "@/core/performance/recommendations-engine";
import { getWeekdayLabelPt } from "@/lib/week";
import { getLocalTodayDateStr } from "@/lib/date";
import { getUserRoutines } from "./routines";
import { dispatchSmartNotification } from "./notifications";
import { evaluateAndUnlockAchievements } from "./achievements";
import {
  getModalitySpec,
  resolveCoreModalityCode,
  type ActivityClass,
  type AthleteModalityProfile,
  type CoreModalityCode,
  type ExperienceLevel,
} from "@/core/modalities";
import {
  classifyImportedOrFreeActivity,
  type ActivityClassChoice,
} from "@/core/integrations/activity-classifier";

const DEMO_USER_EMAIL =
  process.env.ACTIVE_USER_EMAIL || "igorsantos979.is@gmail.com";

export async function resolveAthleteModalityProfileForUser(
  userId: string
): Promise<AthleteModalityProfile> {
  const [profileRows, userSportRows] = await Promise.all([
    db
      .select({
        experienceLevel: schema.profiles.experienceLevel,
        eaCalibration: schema.profiles.eaCalibration,
      })
      .from(schema.profiles)
      .where(eq(schema.profiles.userId, userId))
      .limit(1),
    db
      .select({
        role: schema.userSports.role,
        isPriority: schema.userSports.isPriority,
        experienceLevel: schema.userSports.experienceLevel,
        code: schema.sports.code,
      })
      .from(schema.userSports)
      .innerJoin(schema.sports, eq(schema.userSports.sportId, schema.sports.id))
      .where(eq(schema.userSports.userId, userId)),
  ]);

  const primarySportRow =
    userSportRows.find((s) => s.role === "primary") ||
    userSportRows.find((s) => s.isPriority) ||
    userSportRows[0];

  const primaryModality: CoreModalityCode =
    profileRows[0]?.eaCalibration?.inputs?.primaryModality ||
    resolveCoreModalityCode(primarySportRow?.code) ||
    "strength";

  const compSet = new Set<CoreModalityCode>();
  for (const row of userSportRows) {
    if (row.role === "complementary") {
      const core = resolveCoreModalityCode(row.code);
      if (core && core !== primaryModality) compSet.add(core);
    }
  }
  const calComps = profileRows[0]?.eaCalibration?.inputs?.complementaryModalities;
  if (Array.isArray(calComps)) {
    for (const c of calComps) {
      const core = resolveCoreModalityCode(c);
      if (core && core !== primaryModality) compSet.add(core);
    }
  }

  const validLevels: ExperienceLevel[] = [
    "beginner",
    "intermediate",
    "advanced",
    "competitive",
  ];
  const rawLevel = (profileRows[0]?.experienceLevel ||
    primarySportRow?.experienceLevel ||
    "intermediate") as ExperienceLevel;
  const experienceLevel: ExperienceLevel = validLevels.includes(rawLevel)
    ? rawLevel
    : "intermediate";

  return {
    primaryModality,
    complementaryModalities: Array.from(compSet),
    experienceLevel,
  };
}

export async function resolveSportIdForModalityCode(
  modalityCode?: string | null
): Promise<string | null> {
  if (!modalityCode) return null;
  const normalized = modalityCode.trim().toLowerCase();
  const core = resolveCoreModalityCode(normalized);
  const candidates = core && core !== normalized ? [normalized, core] : [normalized];
  const rows = await db
    .select({ id: schema.sports.id, code: schema.sports.code })
    .from(schema.sports)
    .where(inArray(schema.sports.code, candidates));

  const exact = rows.find((r) => r.code === normalized);
  return exact?.id || rows[0]?.id || null;
}

export async function getOrCreateDemoUser() {
  try {
    await connection();
  } catch {
    // Fora de requisição Next.js (ex: testes unitários ou scripts CLI)
  }

  let targetEmail = DEMO_USER_EMAIL;
  let clerkImageUrl: string | null = null;
  let clerkFullName: string | null = null;

  try {
    const clerkUser = await currentUser();
    const primaryEmail = clerkUser?.emailAddresses?.[0]?.emailAddress;
    if (primaryEmail) {
      targetEmail = primaryEmail;
    }
    if (clerkUser?.imageUrl) {
      clerkImageUrl = clerkUser.imageUrl;
    }
    if (clerkUser?.fullName || clerkUser?.firstName) {
      clerkFullName = clerkUser.fullName || clerkUser.firstName || null;
    }
  } catch {
    // Fora de requisição HTTP (ex: testes unitários ou scripts CLI)
  }

  const existing = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, targetEmail))
    .limit(1);

  if (existing.length > 0) {
    const current = existing[0];
    // Sincroniza avatar do Clerk automaticamente para exibir a foto de perfil
    if (clerkImageUrl && current.avatarUrl !== clerkImageUrl) {
      const [updated] = await db
        .update(schema.users)
        .set({
          avatarUrl: clerkImageUrl,
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, current.id))
        .returning();
      return updated || { ...current, avatarUrl: clerkImageUrl };
    }
    return current;
  }

  const [newUser] = await db
    .insert(schema.users)
    .values({
      name: clerkFullName || "Atleta Selye",
      email: targetEmail,
      username: targetEmail.split("@")[0].replace(/[^a-zA-Z0-9_]/g, ""),
      avatarUrl: clerkImageUrl,
      bio: "Atleta em jornada de evolução física no Selye.",
    })
    .returning();

  await db.insert(schema.profiles).values({
    userId: newUser.id,
    timezone: "America/Sao_Paulo",
    experienceLevel: "beginner",
    goals: ["Força", "Consistência"],
  });

  await db.insert(schema.weeklyGoals).values({
    userId: newUser.id,
    targetDaysPerWeek: 4,
    effectiveFrom: new Date().toISOString().split("T")[0],
  });

  return newUser;
}

export async function getDashboardData() {
  const user = await getOrCreateDemoUser();
  const now = new Date();
  const today = getLocalTodayDateStr(now);
  const past28Days = new Date(now);
  past28Days.setDate(now.getDate() - 28);

  // 1. Nota do dia
  const [dailyNote] = await db
    .select()
    .from(schema.dailyMessages)
    .where(eq(schema.dailyMessages.publishDate, today))
    .limit(1);

  // 2. Exercícios cadastrados no banco
  const exerciseList = await db.select().from(schema.exercises).limit(25);

  // 3. Sessão ativa em andamento (se houver)
  const [activeSession] = await db
    .select()
    .from(schema.workoutSessions)
    .where(
      and(
        eq(schema.workoutSessions.userId, user.id),
        eq(schema.workoutSessions.status, "in_progress")
      )
    )
    .orderBy(desc(schema.workoutSessions.startedAt))
    .limit(1);

  // 4. Todas as sessões concluídas do usuário
  const completedSessions = await db
    .select()
    .from(schema.workoutSessions)
    .where(
      and(
        eq(schema.workoutSessions.userId, user.id),
        eq(schema.workoutSessions.status, "completed")
      )
    )
    .orderBy(desc(schema.workoutSessions.finishedAt));

  const recentSessions = completedSessions.slice(0, 5);

  // 5. Histórico de eventos, metas, perfil e telemetria biométrica (check-ins, atitudes +EA e escudo semanal)
  const [activities, goals, savedStreaks, userProfileRows, bodyMetricsRows] =
    await Promise.all([
      db
        .select()
        .from(schema.activityEvents)
        .where(eq(schema.activityEvents.userId, user.id)),
      db
        .select()
        .from(schema.weeklyGoals)
        .where(eq(schema.weeklyGoals.userId, user.id))
        .limit(1),
      db
        .select()
        .from(schema.streaks)
        .where(eq(schema.streaks.userId, user.id))
        .limit(1),
      db
        .select()
        .from(schema.profiles)
        .where(eq(schema.profiles.userId, user.id))
        .limit(1),
      db
        .select()
        .from(schema.bodyMetrics)
        .where(eq(schema.bodyMetrics.userId, user.id))
        .orderBy(desc(schema.bodyMetrics.recordedAt))
        .limit(60),
    ]);

  const targetDaysPerWeek = goals[0]?.targetDaysPerWeek || 4;
  const currentIsoWeekStart = getIsoWeekStart(today);

  const shieldedWeeks: string[] = [];
  for (const bm of bodyMetricsRows) {
    if (bm.metricType === "regenerative_week_shield" && bm.valueNumeric > 0 && bm.notes) {
      shieldedWeeks.push(bm.notes.trim());
    }
  }
  const isCurrentWeekShielded = shieldedWeeks.includes(currentIsoWeekStart);

  // Datas únicas de treino combinando activity_events e workout_sessions concluídas
  const dateSet = new Set<string>();
  for (const act of activities) {
    if (act.countsForStreak && act.localDate) {
      dateSet.add(String(act.localDate));
    }
  }
  for (const sess of completedSessions) {
    const dt = (sess.finishedAt || sess.startedAt).toISOString().split("T")[0];
    dateSet.add(dt);
  }
  const uniqueDates = Array.from(dateSet).sort();

  // Dias ativos no ano corrente (ex: 2026)
  const currentYearPrefix = `${now.getFullYear()}-`;
  const activeDaysInYear = uniqueDates.filter((d) =>
    d.startsWith(currentYearPrefix)
  ).length;

  // Dias ativos nos últimos 28 dias -> frequência média semanal
  const past28Str = past28Days.toISOString().split("T")[0];
  const activeDaysLast28 = uniqueDates.filter((d) => d >= past28Str).length;
  const weeklyFrequencyAvg =
    Math.round((activeDaysLast28 / 4) * 10) / 10;

  // Streak semanal calculado sobre o histórico real + semanas regenerativas protegidas (Fase 14)
  const calculatedStreak = calculateWeeklyStreak(
    uniqueDates,
    targetDaysPerWeek,
    today,
    shieldedWeeks
  );
  const currentWeeklyStreak = Math.max(
    calculatedStreak.current,
    savedStreaks[0]?.currentWeeklyStreak || 0
  );
  const bestWeeklyStreak = Math.max(
    calculatedStreak.best,
    savedStreaks[0]?.bestWeeklyStreak || 0,
    currentWeeklyStreak
  );

  // Volume real nos últimos 28 dias a partir de set_logs das sessões do usuário
  const sessionsLast28 = completedSessions.filter(
    (s) => new Date(s.startedAt) >= past28Days
  );
  const sessionsLast28Ids = sessionsLast28.map((s) => s.id);

  let monthlyVolumeKg = 0;
  const volumeBySessionId = new Map<string, number>();
  const distanceBySessionId = new Map<string, number>();
  if (sessionsLast28Ids.length > 0) {
    const [logs, metricsRows] = await Promise.all([
      db
        .select({
          sessionId: schema.setLogs.sessionId,
          weightKg: schema.setLogs.weightKg,
          reps: schema.setLogs.reps,
        })
        .from(schema.setLogs)
        .where(inArray(schema.setLogs.sessionId, sessionsLast28Ids)),
      db
        .select({
          sessionId: schema.sessionMetrics.sessionId,
          metricKey: schema.sessionMetrics.metricKey,
          metricValue: schema.sessionMetrics.metricValue,
        })
        .from(schema.sessionMetrics)
        .where(inArray(schema.sessionMetrics.sessionId, sessionsLast28Ids)),
    ]);

    for (const l of logs) {
      const vol = (l.weightKg || 0) * (l.reps || 0);
      monthlyVolumeKg += vol;
      volumeBySessionId.set(
        l.sessionId,
        (volumeBySessionId.get(l.sessionId) || 0) + vol
      );
    }

    for (const m of metricsRows) {
      if (m.metricKey === "distance_km" && m.metricValue > 0) {
        distanceBySessionId.set(m.sessionId, m.metricValue);
      }
    }
  }

  // 6. Frase do dia editorial com contagem anual (Dia X de 365)
  const dailyEditorial = getDailyEditorialForDate(now, dailyNote);

  // 7. Rotinas do atleta ordenadas (Dia 1 → Dia 5 / Seg → Dom)
  const routines = await getUserRoutines();

  // 8. Resumo assertivo de Performance Multimodal (ACWR + Orçamento de Recuperação Semanal + 7 dias)
  const sessionLoadInputs = sessionsLast28.map((s) => {
    const durationMinutes = s.finishedAt
      ? Math.max(
          15,
          Math.round(
            (new Date(s.finishedAt).getTime() -
              new Date(s.startedAt).getTime()) /
              60000
          )
        )
      : 45;
    const volumeKg = volumeBySessionId.get(s.id) || 0;
    const distanceKm = distanceBySessionId.get(s.id) || 0;
    return {
      id: s.id,
      date: new Date(s.startedAt).toISOString().split("T")[0],
      durationMinutes,
      rpe: s.rpeSession || 7,
      modalityCode: s.modalityCode,
      volumeKg,
      distanceKm,
    };
  });

  const dailyLoads = aggregateDailyLoads(sessionLoadInputs);
  const acwrResult = calculateACWR(dailyLoads);

  let consecutiveDays = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = d.toISOString().split("T")[0];
    if ((dailyLoads.get(key) || 0) > 0) {
      consecutiveDays++;
    } else if (i > 0) {
      break;
    }
  }

  const weekAgoTime = now.getTime() - 7 * 24 * 3600 * 1000;
  const last7Sessions = sessionLoadInputs.filter(
    (s) => new Date(s.date).getTime() >= weekAgoTime
  );
  const avgRpe =
    last7Sessions.length > 0
      ? Math.round(
          (last7Sessions.reduce((acc, s) => acc + s.rpe, 0) /
            last7Sessions.length) *
            10
        ) / 10
      : 7.0;

  const baseRecoveryBudget = calculateWeeklyRecoveryBudget({
    sessionsLast7Days: last7Sessions,
    chronicDailyLoadUa: acwrResult.chronicLoad,
    targetDaysPerWeek,
  });

  // Extrai check-ins matinais, atitudes regenerativas (+EA) e FC de repouso de body_metrics
  let todayCheckin: MorningCheckinInput | null = null;
  const checkinsLast28Days: HistoricalCheckinSample[] = [];
  const recoveryAttitudesLast7Days: LoggedRecoveryAttitude[] = [];
  let restingHrBpm: number | null = null;

  for (const row of bodyMetricsRows) {
    const recDate = new Date(row.recordedAt).toISOString().split("T")[0];
    if (row.metricType === "resting_hr" && restingHrBpm === null) {
      restingHrBpm = row.valueNumeric;
    } else if (row.metricType === "morning_checkin") {
      let parsed: any = null;
      if (row.notes) {
        try {
          parsed = JSON.parse(row.notes);
        } catch {
          parsed = null;
        }
      }
      const localDate = parsed?.localDate || recDate;
      if (parsed && localDate >= past28Str) {
        const sample: HistoricalCheckinSample = {
          localDate,
          sleepQuality: Number(parsed.sleepQuality) || 4,
          energyLevel: Number(parsed.energyLevel) || 4,
          muscleFreshness: Number(parsed.muscleFreshness) || 4,
          moodLevel: Number(parsed.moodLevel) || 4,
        };
        checkinsLast28Days.push(sample);
        if (localDate === today && !todayCheckin) {
          todayCheckin = sample;
        }
      }
    } else if (row.metricType === "recovery_attitude" && row.notes) {
      try {
        const parsed = JSON.parse(row.notes);
        if (parsed?.code && parsed.code in RECOVERY_ATTITUDE_MAP) {
          recoveryAttitudesLast7Days.push({
            code: parsed.code as RecoveryAttitudeCode,
            localDate: parsed.localDate || recDate,
            rechargeEa: row.valueNumeric || undefined,
          });
        }
      } catch {
        // ignora
      }
    }
  }

  // Motor de Machine Learning Individual do Selye (calcula EA personalizada, +EA e -EA)
  const adaptiveProfile = learnAdaptiveAthleteProfile({
    experienceLevel: userProfileRows[0]?.experienceLevel || "intermediate",
    targetDaysPerWeek,
    currentWeeklyStreak,
    restingHrBpm,
    eaCalibration: userProfileRows[0]?.eaCalibration ?? null,
    sessionsLast28Days: sessionLoadInputs.map((s) => ({
      date: s.date,
      modalityCode: s.modalityCode || "strength",
      durationMinutes: s.durationMinutes,
      rpe: s.rpe,
      rawLoadEa: calculateUnifiedSessionLoad({
        durationMinutes: s.durationMinutes,
        rpe: s.rpe,
        modalityCode: s.modalityCode,
        volumeKg: s.volumeKg,
        distanceKm: s.distanceKm,
      }),
    })),
    checkinsLast28Days,
    recoveryAttitudesLast7Days,
    todayDateStr: today,
  });

  const recoveryBudget = {
    ...baseRecoveryBudget,
    weeklyBudgetTargetUa: adaptiveProfile.personalCapacityEa,
    weeklySpentUa: adaptiveProfile.netSpentEa,
    weeklyRemainingUa: adaptiveProfile.availableReserveEa,
    usagePercent: adaptiveProfile.usagePercent,
  };

  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(now.getDate() - 1);
  const yesterdayStr = getLocalTodayDateStr(yesterdayDate);
  const yesterdayLoadUa = dailyLoads.get(yesterdayStr) || 0;
  const yesterdaySession = sessionLoadInputs.find(
    (s) => s.date === yesterdayStr
  );
  const yesterdayModalityLabel = yesterdaySession
    ? getModalityProfile(yesterdaySession.modalityCode).labelPt
    : null;

  const [athleteModProfile, activeGoalRows] = await Promise.all([
    resolveAthleteModalityProfileForUser(user.id),
    db
      .select({ eventTitle: schema.planningGoals.eventTitle })
      .from(schema.planningGoals)
      .where(
        and(
          eq(schema.planningGoals.userId, user.id),
          eq(schema.planningGoals.status, "active")
        )
      )
      .orderBy(desc(schema.planningGoals.createdAt))
      .limit(1),
  ]);
  const primarySpec = getModalitySpec(athleteModProfile.primaryModality);

  const dailyDecision = evaluateDailyDecision({
    checkin: todayCheckin,
    yesterdayLoadUa,
    yesterdayLastModalityLabel: yesterdayModalityLabel,
    recoveryBudgetUsagePercent: recoveryBudget.usagePercent,
    recoveryBudgetRemainingUa: recoveryBudget.weeklyRemainingUa,
    acwr: acwrResult.acwr,
    consecutiveTrainingDays: consecutiveDays,
    modalityShortNamePt: primarySpec?.shortNamePt || null,
    activeGoalTitle: activeGoalRows[0]?.eventTitle || null,
  });

  // 8.5 Reagendamento Inteligente da Semana & Detecção de Interferência (Fase 13)
  const schedulableRoutines: SchedulableRoutine[] = routines.map((r) => {
    const firstTemplate = r.templates?.[0];
    const prescs = firstTemplate?.prescriptions || [];
    return {
      id: r.id,
      title: r.title,
      modalityCode: r.modalityCode,
      dayOfWeek:
        typeof firstTemplate?.dayOfWeek === "number"
          ? firstTemplate.dayOfWeek
          : null,
      exercises: prescs.map((p: any) => ({
        namePt: p.exerciseNamePt || "",
        nameEn: p.exerciseNameEn || null,
        modalityCode: r.modalityCode,
        secondaryMuscles: p.secondaryMuscles || [],
        targetSets: p.targetSets,
      })),
    };
  });

  const recentCompletedForScheduler = last7Sessions.map((s) => ({
    id: s.id,
    title:
      completedSessions.find((cs) => cs.id === s.id)?.title ||
      getModalityProfile(s.modalityCode).labelPt,
    modalityCode: s.modalityCode || "other",
    localDate: s.date,
    jsDay: new Date(`${s.date}T12:00:00Z`).getUTCDay(),
    durationMinutes: s.durationMinutes,
    rpe: s.rpe,
    loadUa: calculateUnifiedSessionLoad({
      durationMinutes: s.durationMinutes,
      rpe: s.rpe,
      modalityCode: s.modalityCode,
      volumeKg: s.volumeKg,
      distanceKm: s.distanceKm,
    }),
  }));

  const rescheduleProposals = analyzeWeeklyScheduleInterference({
    routines: schedulableRoutines,
    recentActivities: recentCompletedForScheduler,
    todayDateStr: today,
    todayJsDay: now.getDay(),
    recoveryBudgetUsagePercent: recoveryBudget.usagePercent,
  });

  const todayCompletedSessions = completedSessions
    .filter(
      (s) => getLocalTodayDateStr(new Date(s.finishedAt || s.startedAt)) === today
    )
    .map((s) => {
      const durationMinutes = s.finishedAt
        ? Math.max(
            15,
            Math.round(
              (new Date(s.finishedAt).getTime() -
                new Date(s.startedAt).getTime()) /
                60000
            )
          )
        : 45;
      const loadUa = calculateUnifiedSessionLoad({
        durationMinutes,
        rpe: s.rpeSession || 7,
        modalityCode: s.modalityCode,
        volumeKg: volumeBySessionId.get(s.id) || 0,
        distanceKm: distanceBySessionId.get(s.id) || 0,
      });
      return {
        id: s.id,
        title: s.title,
        modalityCode: s.modalityCode,
        durationMinutes,
        loadUa,
        rpeSession: s.rpeSession ?? 7,
        finishedAt: (s.finishedAt || s.startedAt).toISOString(),
      };
    });

  const recentSessionsEnriched = recentSessions.map((s) => {
    const durationMinutes = s.finishedAt
      ? Math.max(
          15,
          Math.round(
            (new Date(s.finishedAt).getTime() -
              new Date(s.startedAt).getTime()) /
              60000
          )
        )
      : 45;
    const loadUa = calculateUnifiedSessionLoad({
      durationMinutes,
      rpe: s.rpeSession || 7,
      modalityCode: s.modalityCode,
      volumeKg: volumeBySessionId.get(s.id) || 0,
      distanceKm: distanceBySessionId.get(s.id) || 0,
    });
    const modProfile = getModalityProfile(s.modalityCode);
    return {
      ...s,
      durationMinutes,
      loadUa,
      modalityLabel: modProfile.labelPt,
    };
  });

  const recommendations = generatePerformanceRecommendations({
    acwrResult,
    consecutiveTrainingDays: consecutiveDays,
    averageRpeLast7Days: avgRpe,
    weeklyGoalTarget: targetDaysPerWeek,
    completedDaysThisWeek: last7Sessions.length,
  });

  const last7DaysChart: { date: string; dayName: string; load: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const dateKey = d.toISOString().split("T")[0];
    last7DaysChart.push({
      date: dateKey,
      dayName: getWeekdayLabelPt(d, "short"),
      load: dailyLoads.get(dateKey) || 0,
    });
  }

  // 9. Exercícios e séries reais da sessão ativa (se houver sessão em andamento)
  let activeSessionExercises: any[] = [];
  if (activeSession) {
    const [sessExRows, sessSetLogs] = await Promise.all([
      db
        .select({
          id: schema.exercises.id,
          sessionExerciseId: schema.sessionExercises.id,
          orderIndex: schema.sessionExercises.orderIndex,
          namePt: schema.exercises.namePt,
          nameEn: schema.exercises.nameEn,
          secondaryMuscles: schema.exercises.secondaryMuscles,
          instructionsPt: schema.exercises.instructionsPt,
          safetyInfoPt: schema.exercises.safetyInfoPt,
          difficulty: schema.exercises.difficulty,
          equipmentCodes: schema.exercises.equipmentCodes,
        })
        .from(schema.sessionExercises)
        .innerJoin(
          schema.exercises,
          eq(schema.sessionExercises.exerciseId, schema.exercises.id)
        )
        .where(eq(schema.sessionExercises.sessionId, activeSession.id))
        .orderBy(asc(schema.sessionExercises.orderIndex)),
      db
        .select({
          id: schema.setLogs.id,
          sessionExerciseId: schema.setLogs.sessionExerciseId,
          setNumber: schema.setLogs.setNumber,
          setType: schema.setLogs.setType,
          weightKg: schema.setLogs.weightKg,
          reps: schema.setLogs.reps,
          isCompleted: schema.setLogs.isCompleted,
        })
        .from(schema.setLogs)
        .where(eq(schema.setLogs.sessionId, activeSession.id))
        .orderBy(asc(schema.setLogs.setNumber)),
    ]);

    const setsBySessEx = new Map<string, typeof sessSetLogs>();
    for (const s of sessSetLogs) {
      const list = setsBySessEx.get(s.sessionExerciseId) || [];
      list.push(s);
      setsBySessEx.set(s.sessionExerciseId, list);
    }

    activeSessionExercises = sessExRows.map((row) => ({
      ...row,
      sets: setsBySessEx.get(row.sessionExerciseId) || [],
    }));
  }

  return {
    user,
    dailyEditorial,
    dailyNote: {
      messageText: dailyEditorial.quote.messageText,
      author: dailyEditorial.quote.author,
      category: dailyEditorial.quote.category,
    },
    routines,
    performanceSummary: {
      acwrResult,
      recoveryBudget,
      adaptiveProfile,
      dailyDecision,
      todayCheckin,
      rescheduleProposals,
      headlineRecommendation: recommendations[0] || null,
      last7DaysChart,
      averageRpe: avgRpe,
      consecutiveDays,
    },
    exerciseList,
    activeSession: activeSession || null,
    activeSessionExercises,
    recentSessions: recentSessionsEnriched,
    todayCompletedSessions,
    activitiesCount: Math.max(activities.length, completedSessions.length),
    stats: {
      monthlyVolumeKg: Math.round(monthlyVolumeKg),
      weeklyFrequencyAvg,
      targetDaysPerWeek,
      currentWeeklyStreak,
      bestWeeklyStreak,
      isCurrentWeekShielded,
      activeDaysInYear,
      activeDaysLast28,
      onboardingCompleted: Boolean(userProfileRows[0]?.onboardingCompletedAt),
      primaryModalityCode:
        userProfileRows[0]?.eaCalibration?.inputs?.primaryModality ?? null,
      totalCompletedWorkouts: Math.max(
        completedSessions.length,
        activities.length
      ),
    },
  };
}

export async function startWorkout(
  title: string = "Força e Estabilidade",
  programId?: string
) {
  const user = await getOrCreateDemoUser();
  const clientSessionId = `client_sess_${Date.now()}_${Math.random()
    .toString(36)
    .substring(2, 9)}`;

  const [existing] = await db
    .select()
    .from(schema.workoutSessions)
    .where(
      and(
        eq(schema.workoutSessions.userId, user.id),
        eq(schema.workoutSessions.status, "in_progress")
      )
    )
    .limit(1);

  if (existing) {
    return existing;
  }

  // Descobrir os exercícios prescritos da rotina selecionada (ou da primeira rotina do atleta)
  const userRoutines = await getUserRoutines();
  const targetRoutine = programId
    ? userRoutines.find((r) => r.id === programId)
    : userRoutines[0];

  const resolvedTitle = targetRoutine?.title || title;
  const resolvedModality = targetRoutine?.modalityCode || "strength";
  const prescriptions = targetRoutine?.templates?.[0]?.prescriptions || [];

  const [athleteProfile, sportId] = await Promise.all([
    resolveAthleteModalityProfileForUser(user.id),
    resolveSportIdForModalityCode(resolvedModality),
  ]);
  const classification = classifyImportedOrFreeActivity({
    activityModalityCode: resolvedModality,
    athleteProfile,
    linkedToPlannedSession: true,
  });

  const [session] = await db
    .insert(schema.workoutSessions)
    .values({
      userId: user.id,
      title: resolvedTitle,
      modalityCode: resolvedModality,
      sportId,
      activityClass: classification.activityClass,
      status: "in_progress",
      startedAt: new Date(),
      clientSessionId,
      timezone: "America/Sao_Paulo",
    })
    .returning();

  if (prescriptions.length > 0) {
    for (let i = 0; i < prescriptions.length; i++) {
      const p = prescriptions[i];
      const [sessEx] = await db
        .insert(schema.sessionExercises)
        .values({
          sessionId: session.id,
          exerciseId: p.exerciseId,
          orderIndex: i + 1,
        })
        .returning();

      const setsCount = Math.max(1, p.targetSets || 3);
      const numericReps =
        Number.parseInt(String(p.targetReps || "10"), 10) || 10;

      for (let setNum = 1; setNum <= setsCount; setNum++) {
        await db.insert(schema.setLogs).values({
          sessionId: session.id,
          sessionExerciseId: sessEx.id,
          setNumber: setNum,
          setType: p.setType || "effective",
          weightKg: p.targetLoadKg || 40,
          reps: numericReps,
          isCompleted: false,
          clientEventId: `evt_${session.id}_${sessEx.id}_${setNum}`,
        });
      }
    }
  } else {
    const catalogExercises = await db.select().from(schema.exercises).limit(4);
    for (let i = 0; i < catalogExercises.length; i++) {
      const ex = catalogExercises[i];
      const [sessEx] = await db
        .insert(schema.sessionExercises)
        .values({
          sessionId: session.id,
          exerciseId: ex.id,
          orderIndex: i + 1,
        })
        .returning();

      for (let setNum = 1; setNum <= 3; setNum++) {
        await db.insert(schema.setLogs).values({
          sessionId: session.id,
          sessionExerciseId: sessEx.id,
          setNumber: setNum,
          setType: "effective",
          weightKg: 40 + i * 10,
          reps: 10,
          isCompleted: false,
          clientEventId: `evt_${session.id}_${sessEx.id}_${setNum}`,
        });
      }
    }
  }

  revalidatePath("/");
  return session;
}

export async function finishWorkout(sessionId: string, rpe: number = 8) {
  const user = await getOrCreateDemoUser();
  const finishedAt = new Date();
  const todayStr = getLocalTodayDateStr(finishedAt);

  const [session] = await db
    .update(schema.workoutSessions)
    .set({
      status: "completed",
      finishedAt,
      rpeSession: rpe,
      updatedAt: finishedAt,
    })
    .where(eq(schema.workoutSessions.id, sessionId))
    .returning();

  if (session) {
    await db
      .update(schema.setLogs)
      .set({ isCompleted: true, completedAt: finishedAt })
      .where(eq(schema.setLogs.sessionId, session.id));

    const durationMinutes = Math.max(
      15,
      Math.round(
        (finishedAt.getTime() - new Date(session.startedAt).getTime()) / 60000
      )
    );

    await db.insert(schema.activityEvents).values({
      userId: user.id,
      sessionId: session.id,
      source: "app_workout",
      activityClass: (session.activityClass as ActivityClass) || "serious",
      localDate: todayStr,
      durationMinutes,
      countsForStreak: true,
    });

    const loadEa = calculateUnifiedSessionLoad({
      durationMinutes,
      rpe,
      modalityCode: session.modalityCode,
    });

    await dispatchSmartNotification({
      recipientUserId: user.id,
      eventType: "workout_completed",
      params: {
        title: session.title,
        durationMinutes,
        loadEa,
      },
    });

    await evaluateAndUnlockAchievements(user.id);

    const { autoSyncTodayPlanCommitment } = await import("./planning");
    await autoSyncTodayPlanCommitment("workout");
  }

  revalidatePath("/");
  revalidatePath("/treinos");
  revalidatePath("/calendario");
  revalidatePath("/evolucao");
  revalidatePath("/analytics");
  revalidatePath("/performance");
  return session;
}

/**
 * Atualiza uma série individual em tempo real durante o treino (carga, reps ou conclusão).
 */
export async function updateSetLog(
  setLogId: string,
  patch: {
    isCompleted?: boolean;
    weightKg?: number | null;
    reps?: number | null;
  }
) {
  await getOrCreateDemoUser();

  const updateValues: Partial<typeof schema.setLogs.$inferInsert> = {};
  if (typeof patch.isCompleted === "boolean") {
    updateValues.isCompleted = patch.isCompleted;
    updateValues.completedAt = patch.isCompleted ? new Date() : null;
  }
  if (patch.weightKg !== undefined) {
    updateValues.weightKg = patch.weightKg;
  }
  if (patch.reps !== undefined) {
    updateValues.reps = patch.reps;
  }

  if (Object.keys(updateValues).length === 0) return null;

  const [updated] = await db
    .update(schema.setLogs)
    .set(updateValues)
    .where(eq(schema.setLogs.id, setLogId))
    .returning();

  return updated || null;
}

/**
 * Descarta uma sessão em andamento caso o atleta queira trocar de ficha.
 */
export async function cancelWorkout(sessionId: string) {
  const user = await getOrCreateDemoUser();

  await db
    .update(schema.workoutSessions)
    .set({
      status: "abandoned",
      finishedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.workoutSessions.id, sessionId),
        eq(schema.workoutSessions.userId, user.id)
      )
    );

  revalidatePath("/");
}

export interface FreeActivityInput {
  title: string;
  modalityCode: string;
  durationMinutes: number;
  rpe: number;
  localDate?: string;
  distanceKm?: number | null;
  notes?: string;
  activityClass?: ActivityClassChoice;
}

/**
 * Registra qualquer atividade livre concluída (corrida, pedal, futsal, natação, caminhada, etc.)
 * sem restringir às fichas previamente cadastradas, separando modalidade séria, suporte e atividade solta.
 */
export async function logFreeActivity(input: FreeActivityInput) {
  const user = await getOrCreateDemoUser();
  const cleanTitle = input.title.trim();
  if (!cleanTitle) {
    throw new Error("Informe o nome da atividade.");
  }

  const duration = Math.max(5, Math.min(600, Math.round(input.durationMinutes || 45)));
  const rpe = Math.max(1, Math.min(10, Math.round(input.rpe || 7)));
  const dateStr =
    input.localDate && /^\d{4}-\d{2}-\d{2}$/.test(input.localDate)
      ? input.localDate
      : new Date().toISOString().split("T")[0];

  const finishedAt = new Date(`${dateStr}T12:00:00Z`);
  const startedAt = new Date(finishedAt.getTime() - duration * 60_000);
  const clientSessionId = `free_act_${Date.now()}_${Math.random()
    .toString(36)
    .substring(2, 8)}`;

  const [athleteProfile, sportId] = await Promise.all([
    resolveAthleteModalityProfileForUser(user.id),
    resolveSportIdForModalityCode(input.modalityCode || "other"),
  ]);
  const classification = classifyImportedOrFreeActivity({
    activityModalityCode: input.modalityCode || "other",
    athleteProfile,
    explicitClass: input.activityClass ?? "auto",
  });

  const [session] = await db
    .insert(schema.workoutSessions)
    .values({
      userId: user.id,
      title: cleanTitle,
      modalityCode: input.modalityCode || "other",
      sportId,
      activityClass: classification.activityClass,
      status: "completed",
      startedAt,
      finishedAt,
      rpeSession: rpe,
      notes: input.notes?.trim() || null,
      clientSessionId,
      timezone: "America/Sao_Paulo",
    })
    .returning();

  await db.insert(schema.activityEvents).values({
    userId: user.id,
    sessionId: session.id,
    source: "app_workout",
    activityClass: classification.activityClass,
    localDate: dateStr,
    durationMinutes: duration,
    countsForStreak: true,
  });

  if (typeof input.distanceKm === "number" && input.distanceKm > 0) {
    await db.insert(schema.sessionMetrics).values({
      sessionId: session.id,
      metricKey: "distance_km",
      metricValue: input.distanceKm,
      unit: "km",
    });
  }

  const modProfile = getModalityProfile(input.modalityCode);
  const loadEa = calculateUnifiedSessionLoad({
    durationMinutes: duration,
    rpe,
    modalityCode: input.modalityCode,
    distanceKm: input.distanceKm,
  });

  await dispatchSmartNotification({
    recipientUserId: user.id,
    eventType: "free_activity_logged",
    params: {
      title: cleanTitle,
      modalityLabel: `${modProfile.labelPt} · ${classification.presentation.titlePt}`,
      durationMinutes: duration,
      loadEa,
    },
  });

  await evaluateAndUnlockAchievements(user.id);

  if (dateStr === new Date().toISOString().split("T")[0]) {
    const { autoSyncTodayPlanCommitment } = await import("./planning");
    await autoSyncTodayPlanCommitment("workout");
  }

  revalidatePath("/");
  revalidatePath("/calendario");
  revalidatePath("/evolucao");
  revalidatePath("/comunidade");
  revalidatePath("/perfil");
  return session;
}

/**
 * Inicia o cronômetro ao vivo para qualquer atividade livre (corrida, futsal, ciclismo, etc.).
 */
export async function startFreeActivity(input: {
  title: string;
  modalityCode: string;
  activityClass?: ActivityClassChoice;
}) {
  const user = await getOrCreateDemoUser();
  const cleanTitle = input.title.trim() || "Atividade Livre";

  const [existing] = await db
    .select()
    .from(schema.workoutSessions)
    .where(
      and(
        eq(schema.workoutSessions.userId, user.id),
        eq(schema.workoutSessions.status, "in_progress")
      )
    )
    .limit(1);

  if (existing) {
    return existing;
  }

  const clientSessionId = `live_act_${Date.now()}_${Math.random()
    .toString(36)
    .substring(2, 8)}`;

  const [athleteProfile, sportId] = await Promise.all([
    resolveAthleteModalityProfileForUser(user.id),
    resolveSportIdForModalityCode(input.modalityCode || "other"),
  ]);
  const classification = classifyImportedOrFreeActivity({
    activityModalityCode: input.modalityCode || "other",
    athleteProfile,
    explicitClass: input.activityClass ?? "auto",
  });

  const [session] = await db
    .insert(schema.workoutSessions)
    .values({
      userId: user.id,
      title: cleanTitle,
      modalityCode: input.modalityCode || "other",
      sportId,
      activityClass: classification.activityClass,
      status: "in_progress",
      startedAt: new Date(),
      clientSessionId,
      timezone: "America/Sao_Paulo",
    })
    .returning();

  revalidatePath("/");
  return session;
}

/**
 * Salva ou atualiza o Check-in Matinal de 10 segundos (Sono, Energia, Musculatura, Humor)
 * para recalibrar instantaneamente a Decisão do Dia (Fase 12).
 */
export async function submitMorningCheckin(input: MorningCheckinInput) {
  const user = await getOrCreateDemoUser();
  const todayStr =
    input.localDate && /^\d{4}-\d{2}-\d{2}$/.test(input.localDate)
      ? input.localDate
      : getLocalTodayDateStr();

  const cleanInput: MorningCheckinInput = {
    sleepQuality: Math.max(1, Math.min(5, Math.round(input.sleepQuality || 4))),
    energyLevel: Math.max(1, Math.min(5, Math.round(input.energyLevel || 4))),
    muscleFreshness: Math.max(
      1,
      Math.min(5, Math.round(input.muscleFreshness || 4))
    ),
    moodLevel: Math.max(1, Math.min(5, Math.round(input.moodLevel || 4))),
    localDate: todayStr,
  };

  const subjectiveScore = calculateSubjectiveReadinessScore(cleanInput);

  // Verifica se já existe check-in hoje para atualizar sem duplicar
  const recent = await db
    .select()
    .from(schema.bodyMetrics)
    .where(
      and(
        eq(schema.bodyMetrics.userId, user.id),
        eq(schema.bodyMetrics.metricType, "morning_checkin")
      )
    )
    .orderBy(desc(schema.bodyMetrics.recordedAt))
    .limit(5);

  const existingToday = recent.find((row) => {
    try {
      const parsed = row.notes ? JSON.parse(row.notes) : null;
      return (
        parsed?.localDate === todayStr ||
        new Date(row.recordedAt).toISOString().split("T")[0] === todayStr
      );
    } catch {
      return false;
    }
  });

  if (existingToday) {
    await db
      .update(schema.bodyMetrics)
      .set({
        valueNumeric: subjectiveScore,
        notes: JSON.stringify(cleanInput),
        recordedAt: new Date(),
      })
      .where(eq(schema.bodyMetrics.id, existingToday.id));
  } else {
    await db.insert(schema.bodyMetrics).values({
      userId: user.id,
      metricType: "morning_checkin",
      valueNumeric: subjectiveScore,
      unit: "pts",
      visibility: "private",
      source: "manual",
      notes: JSON.stringify(cleanInput),
    });
  }

  await dispatchSmartNotification({
    recipientUserId: user.id,
    eventType: "morning_checkin_done",
    params: {
      readinessScore: subjectiveScore,
    },
  });

  revalidatePath("/");
  revalidatePath("/calendario");
  revalidatePath("/evolucao");
  return {
    subjectiveScore,
    checkin: cleanInput,
  };
}

/**
 * Registra ou desmarca uma Atitude Regenerativa (+EA) no dia de hoje,
 * aumentando a Reserva de Energia Adaptativa do usuário e alimentando o Motor ML.
 */
export async function toggleRecoveryAttitude(code: RecoveryAttitudeCode) {
  const user = await getOrCreateDemoUser();
  const meta = RECOVERY_ATTITUDE_MAP[code];
  if (!meta) throw new Error("Atitude regenerativa inválida.");

  const todayStr = getLocalTodayDateStr();
  const recent = await db
    .select()
    .from(schema.bodyMetrics)
    .where(
      and(
        eq(schema.bodyMetrics.userId, user.id),
        eq(schema.bodyMetrics.metricType, "recovery_attitude")
      )
    )
    .orderBy(desc(schema.bodyMetrics.recordedAt))
    .limit(20);

  const existing = recent.find((row) => {
    try {
      const parsed = row.notes ? JSON.parse(row.notes) : null;
      return parsed?.code === code && parsed?.localDate === todayStr;
    } catch {
      return false;
    }
  });

  if (existing) {
    await db
      .delete(schema.bodyMetrics)
      .where(eq(schema.bodyMetrics.id, existing.id));
  } else {
    await db.insert(schema.bodyMetrics).values({
      userId: user.id,
      metricType: "recovery_attitude",
      valueNumeric: meta.baseRechargeEa,
      unit: "EA",
      visibility: "private",
      source: "manual",
      notes: JSON.stringify({
        code,
        localDate: todayStr,
        labelPt: meta.labelPt,
      }),
    });

    await dispatchSmartNotification({
      recipientUserId: user.id,
      eventType: "recovery_attitude_logged",
      params: {
        title: meta.labelPt,
        rechargeEa: meta.baseRechargeEa,
      },
    });

    const { autoSyncTodayPlanCommitment } = await import("./planning");
    await autoSyncTodayPlanCommitment("recharge_habit");
  }

  revalidatePath("/");
  revalidatePath("/calendario");
  revalidatePath("/evolucao");
  return { active: !existing, code, baseRechargeEa: meta.baseRechargeEa };
}

/**
 * Ativa ou desativa a Semana Regenerativa / Escudo de Recuperação (Streak com Perdão — Fase 14),
 * protegendo o streak semanal quando o atleta ou o Motor ML priorizam regeneração.
 */
export async function toggleRegenerativeWeekShield() {
  const user = await getOrCreateDemoUser();
  const todayStr = getLocalTodayDateStr();
  const currentWeekStart = getIsoWeekStart(todayStr);

  const existingRows = await db
    .select()
    .from(schema.bodyMetrics)
    .where(
      and(
        eq(schema.bodyMetrics.userId, user.id),
        eq(schema.bodyMetrics.metricType, "regenerative_week_shield")
      )
    );

  const existing = existingRows.find(
    (r) => r.notes?.trim() === currentWeekStart
  );

  if (existing) {
    await db
      .delete(schema.bodyMetrics)
      .where(eq(schema.bodyMetrics.id, existing.id));
  } else {
    await db.insert(schema.bodyMetrics).values({
      userId: user.id,
      metricType: "regenerative_week_shield",
      valueNumeric: 1,
      unit: "week",
      visibility: "private",
      source: "manual",
      notes: currentWeekStart,
    });

    await dispatchSmartNotification({
      recipientUserId: user.id,
      eventType: "regenerative_shield_activated",
    });
  }

  revalidatePath("/");
  revalidatePath("/evolucao");
  return { shielded: !existing, weekStart: currentWeekStart };
}
