import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calibrateInitialEaFromOnboarding,
  type EaOnboardingInput,
} from "./ea-onboarding-calibrator";
import { learnAdaptiveAthleteProfile } from "./adaptive-athlete-engine";
import { SCIENTIFIC_REFERENCES } from "../modalities";

const BASE_ATHLETE: EaOnboardingInput = {
  primaryModality: "running",
  complementaryModalities: ["strength"],
  experienceLevel: "intermediate",
  trainingAge: "1_to_3y",
  recentWeeklyHours: "4_to_7h",
  targetDaysPerWeek: 4,
  preferredWorkoutDays: [1, 2, 4, 6],
  sleepDuration: "7_to_8h",
  sleepQuality: "restorative",
  lifeStress: "moderate",
  occupationalDemand: "sedentary",
  tissueStatus: "normal_training",
  ageYears: 31,
  bodyWeightKg: 74,
  restingHrBpm: 54,
};

describe("Phase 2 - Scientific EA Onboarding Calibrator", () => {
  it("diferencia significativamente a EA inicial entre perfil descansado/treinado vs. estressado/pouco sono", () => {
    const optimal = calibrateInitialEaFromOnboarding(BASE_ATHLETE);

    const stressedPoorSleep = calibrateInitialEaFromOnboarding({
      ...BASE_ATHLETE,
      sleepDuration: "under_6h",
      sleepQuality: "poor",
      lifeStress: "very_high",
      occupationalDemand: "heavy_manual",
      restingHrBpm: 79,
    });

    assert.ok(
      optimal.calibratedCapacityEa > stressedPoorSleep.calibratedCapacityEa + 500,
      `Esperado diferença >500 EA entre ótimo (${optimal.calibratedCapacityEa}) e sobrecarregado (${stressedPoorSleep.calibratedCapacityEa})`
    );
    assert.ok(
      optimal.recoveryVelocityPrior > stressedPoorSleep.recoveryVelocityPrior + 0.15
    );
    assert.ok(stressedPoorSleep.priorityRecommendationsPt.length >= 2);
  });

  it("aplica margem protetora de retorno para lesão ou pausa prolongada", () => {
    const normal = calibrateInitialEaFromOnboarding(BASE_ATHLETE);
    const rehab = calibrateInitialEaFromOnboarding({
      ...BASE_ATHLETE,
      tissueStatus: "injury_rehab",
    });

    assert.ok(rehab.calibratedCapacityEa < normal.calibratedCapacityEa);
    assert.ok(
      rehab.factors.some((f) => f.code === "tissue_status" && f.impact === "protective")
    );
  });

  it("eleva a confiança inicial quando sinais biométricos opcionais (idade, peso, FC repouso) são fornecidos", () => {
    const minimal = calibrateInitialEaFromOnboarding({
      ...BASE_ATHLETE,
      ageYears: null,
      bodyWeightKg: null,
      restingHrBpm: null,
    });
    const full = calibrateInitialEaFromOnboarding(BASE_ATHLETE);

    assert.ok(full.initialConfidencePercent > minimal.initialConfidencePercent);
    assert.ok(full.initialConfidencePercent <= 82);
    assert.ok(full.uncertaintyMarginEa < minimal.uncertaintyMarginEa);
  });

  it("referencia apenas IDs científicos válidos do catálogo na explicação de fatores", () => {
    const res = calibrateInitialEaFromOnboarding({
      ...BASE_ATHLETE,
      tissueStatus: "returning_detrained",
    });

    for (const f of res.factors) {
      assert.ok(
        SCIENTIFIC_REFERENCES[f.scientificRefId],
        `Referência inválida ${f.scientificRefId} no fator ${f.code}`
      );
    }
  });

  it("alimenta diretamente o motor online learnAdaptiveAthleteProfile mantendo retrocompatibilidade", () => {
    const calibrated = calibrateInitialEaFromOnboarding({
      ...BASE_ATHLETE,
      recentWeeklyHours: "7_to_10h",
      experienceLevel: "advanced",
      trainingAge: "over_3y",
    });

    const profileWithCalib = learnAdaptiveAthleteProfile({
      experienceLevel: "advanced",
      targetDaysPerWeek: 4,
      currentWeeklyStreak: 2,
      restingHrBpm: 54,
      sessionsLast28Days: [],
      checkinsLast28Days: [],
      recoveryAttitudesLast7Days: [],
      todayDateStr: "2026-11-19",
      eaCalibration: calibrated,
    });

    const profileLegacy = learnAdaptiveAthleteProfile({
      experienceLevel: "advanced",
      targetDaysPerWeek: 4,
      currentWeeklyStreak: 2,
      restingHrBpm: 54,
      sessionsLast28Days: [],
      checkinsLast28Days: [],
      recoveryAttitudesLast7Days: [],
      todayDateStr: "2026-11-19",
    });

    // Com calibração completa, a confiança inicial já supera os 35% padrão do cold start
    assert.ok(
      profileWithCalib.modelConfidencePercent > profileLegacy.modelConfidencePercent,
      `Confiança calibrada (${profileWithCalib.modelConfidencePercent}%) deve superar cold start (${profileLegacy.modelConfidencePercent}%)`
    );
    assert.ok(
      profileWithCalib.personalCapacityEa > profileLegacy.personalCapacityEa,
      `Capacidade calibrada (${profileWithCalib.personalCapacityEa}) deve refletir base crônica 7-10h/sem`
    );
  });
});
