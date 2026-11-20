import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  learnAdaptiveAthleteProfile,
  RECOVERY_ATTITUDES_CATALOG,
} from "./adaptive-athlete-engine";

describe("Phase 14 - Individual Machine Learning Adaptive Athlete Engine (EA)", () => {
  test("Não assume a mesma reserva para pessoas diferentes: diferencia perfil Iniciante vs Avançado com histórico distinto", () => {
    const beginnerProfile = learnAdaptiveAthleteProfile({
      experienceLevel: "beginner",
      targetDaysPerWeek: 3,
      currentWeeklyStreak: 0,
      restingHrBpm: 78,
      sessionsLast28Days: [],
      checkinsLast28Days: [],
      recoveryAttitudesLast7Days: [],
      todayDateStr: "2026-11-19",
    });

    const advancedProfile = learnAdaptiveAthleteProfile({
      experienceLevel: "advanced",
      targetDaysPerWeek: 5,
      currentWeeklyStreak: 8,
      restingHrBpm: 52,
      sessionsLast28Days: [
        { date: "2026-11-15", modalityCode: "strength", durationMinutes: 60, rpe: 8, rawLoadEa: 520 },
        { date: "2026-11-16", modalityCode: "beach_volleyball", durationMinutes: 75, rpe: 8, rawLoadEa: 680 },
        { date: "2026-11-17", modalityCode: "strength", durationMinutes: 55, rpe: 7, rawLoadEa: 440 },
        { date: "2026-11-18", modalityCode: "running", durationMinutes: 45, rpe: 7, rawLoadEa: 360 },
      ],
      checkinsLast28Days: [
        { localDate: "2026-11-16", sleepQuality: 5, energyLevel: 5, muscleFreshness: 4, moodLevel: 5 },
        { localDate: "2026-11-17", sleepQuality: 5, energyLevel: 4, muscleFreshness: 4, moodLevel: 4 },
        { localDate: "2026-11-19", sleepQuality: 5, energyLevel: 5, muscleFreshness: 5, moodLevel: 5 },
      ],
      recoveryAttitudesLast7Days: [],
      todayDateStr: "2026-11-19",
    });

    assert.ok(
      advancedProfile.personalCapacityEa > beginnerProfile.personalCapacityEa * 1.6,
      `Capacidade do atleta avançado (${advancedProfile.personalCapacityEa} EA) deve ser significativamente superior à do iniciante (${beginnerProfile.personalCapacityEa} EA)`
    );
    assert.ok(
      advancedProfile.recoveryVelocityMultiplier > 1.0,
      `ML deve aprender velocidade de regeneração > 1.0x (${advancedProfile.recoveryVelocityMultiplier})`
    );
  });

  test("Balanço bidirecional: treinos consomem (-EA) e atitudes regenerativas aumentam (+EA) a Reserva Adaptativa", () => {
    const baseWithoutHabits = learnAdaptiveAthleteProfile({
      experienceLevel: "intermediate",
      targetDaysPerWeek: 4,
      currentWeeklyStreak: 2,
      sessionsLast28Days: [
        { date: "2026-11-18", modalityCode: "strength", durationMinutes: 60, rpe: 8, rawLoadEa: 500 },
      ],
      checkinsLast28Days: [],
      recoveryAttitudesLast7Days: [],
      todayDateStr: "2026-11-19",
    });

    const withRecoveryHabits = learnAdaptiveAthleteProfile({
      experienceLevel: "intermediate",
      targetDaysPerWeek: 4,
      currentWeeklyStreak: 2,
      sessionsLast28Days: [
        { date: "2026-11-18", modalityCode: "strength", durationMinutes: 60, rpe: 8, rawLoadEa: 500 },
      ],
      checkinsLast28Days: [
        { localDate: "2026-11-19", sleepQuality: 5, energyLevel: 4, muscleFreshness: 4, moodLevel: 5 },
      ],
      recoveryAttitudesLast7Days: [
        { code: "mobility_session", localDate: "2026-11-19" },
        { code: "hydration_nutrition", localDate: "2026-11-19" },
      ],
      todayDateStr: "2026-11-19",
    });

    assert.ok(
      withRecoveryHabits.recoveryRechargeEa > baseWithoutHabits.recoveryRechargeEa + 150,
      "Atitudes regenerativas devem aumentar +EA na reserva"
    );
    assert.ok(
      withRecoveryHabits.availableReserveEa > baseWithoutHabits.availableReserveEa,
      "A Reserva Adaptativa líquida deve subir após registrar sono profundo, mobilidade e hidratação"
    );
    assert.ok(RECOVERY_ATTITUDES_CATALOG.length >= 6);
  });

  test("Preencher o Check-in Matinal nunca reduz a Capacidade Base (ex: 1700 EA) nem faz a reserva cair", () => {
    const mockCalibration = {
      schemaVersion: "1.0" as const,
      calibratedAt: "2026-11-20T08:00:00Z",
      calibratedCapacityEa: 1700,
      recoveryVelocityPrior: 1.05,
      recoveryGainPrior: 1.02,
      initialConfidencePercent: 78,
      uncertaintyMarginEa: 90,
      readinessBaselineScore: 84,
      readinessTierLabelPt: "Atleta Estruturado",
      summaryPt: "Base calibrada em 1700 EA",
      priorityRecommendationsPt: [],
      factors: [],
      inputs: {
        primaryModality: "strength" as const,
        complementaryModalities: [],
        experienceLevel: "intermediate" as const,
        trainingYears: 3,
        weeklyHoursLast3Months: 5,
        targetDaysPerWeek: 4,
        habitualSleepHours: 7.5,
        sleepRegularity: "consistent" as const,
        lifeStressLevel: "low" as const,
        occupationDemand: "sedentary_desk" as const,
        tissueStatus: "fully_healthy" as const,
      },
    };

    const beforeCheckin = learnAdaptiveAthleteProfile({
      experienceLevel: "intermediate",
      targetDaysPerWeek: 4,
      currentWeeklyStreak: 0,
      eaCalibration: mockCalibration,
      sessionsLast28Days: [
        { date: "2026-11-19", modalityCode: "strength", durationMinutes: 50, rpe: 7, rawLoadEa: 350 },
      ],
      checkinsLast28Days: [],
      recoveryAttitudesLast7Days: [],
      todayDateStr: "2026-11-20",
    });

    const afterNormalCheckin = learnAdaptiveAthleteProfile({
      experienceLevel: "intermediate",
      targetDaysPerWeek: 4,
      currentWeeklyStreak: 0,
      eaCalibration: mockCalibration,
      sessionsLast28Days: [
        { date: "2026-11-19", modalityCode: "strength", durationMinutes: 50, rpe: 7, rawLoadEa: 350 },
      ],
      checkinsLast28Days: [
        { localDate: "2026-11-20", sleepQuality: 3, energyLevel: 3, muscleFreshness: 3, moodLevel: 3 },
      ],
      recoveryAttitudesLast7Days: [],
      todayDateStr: "2026-11-20",
    });

    assert.ok(
      afterNormalCheckin.personalCapacityEa >= 1700,
      `EA Base (${afterNormalCheckin.personalCapacityEa}) jamais deve cair abaixo dos 1700 EA calibrados`
    );
    assert.ok(
      afterNormalCheckin.availableReserveEa > beforeCheckin.availableReserveEa,
      `Acordar e registrar o check-in matinal deve recarregar a reserva (${beforeCheckin.availableReserveEa} -> ${afterNormalCheckin.availableReserveEa}), nunca derrubá-la`
    );
  });
});
