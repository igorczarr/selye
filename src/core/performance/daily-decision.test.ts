import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  calculateSubjectiveReadinessScore,
  evaluateDailyDecision,
} from "./daily-decision";

describe("Phase 12 - Morning Check-in (10s) & Explainable Daily Decision Engine", () => {
  test("Calcula o escore subjetivo de prontidão (20 a 100) ponderando Sono, Energia, Musculatura e Humor", () => {
    const perfect = calculateSubjectiveReadinessScore({
      sleepQuality: 5,
      energyLevel: 5,
      muscleFreshness: 5,
      moodLevel: 5,
    });
    assert.equal(perfect, 100);

    const exhausted = calculateSubjectiveReadinessScore({
      sleepQuality: 1,
      energyLevel: 1,
      muscleFreshness: 1,
      moodLevel: 1,
    });
    assert.equal(exhausted, 20);

    const moderate = calculateSubjectiveReadinessScore({
      sleepQuality: 4,
      energyLevel: 3,
      muscleFreshness: 3,
      moodLevel: 4,
    });
    assert.ok(moderate >= 65 && moderate <= 75);
  });

  test("Emite Sinal Verde (green_push) quando atleta dormiu bem, está recuperado e tem orçamento livre", () => {
    const decision = evaluateDailyDecision({
      checkin: {
        sleepQuality: 5,
        energyLevel: 4,
        muscleFreshness: 4,
        moodLevel: 5,
      },
      yesterdayLoadUa: 0,
      recoveryBudgetUsagePercent: 45,
      recoveryBudgetRemainingUa: 900,
      acwr: 1.02,
      consecutiveTrainingDays: 0,
    });

    assert.equal(decision.hasCheckinToday, true);
    assert.equal(decision.tier, "green_push");
    assert.ok(decision.readinessScore >= 80);
    assert.ok(decision.whyExplanation.includes("Por quê:"));
  });

  test("Emite Regeneração (red_recover) com justificativa clara quando jogou pesado ontem e dormiu pouco", () => {
    const decision = evaluateDailyDecision({
      checkin: {
        sleepQuality: 2,
        energyLevel: 2,
        muscleFreshness: 2,
        moodLevel: 3,
      },
      yesterdayLoadUa: 560,
      yesterdayLastModalityLabel: "Vôlei de Praia & Areia",
      recoveryBudgetUsagePercent: 95,
      recoveryBudgetRemainingUa: 80,
      acwr: 1.38,
      consecutiveTrainingDays: 3,
    });

    assert.equal(decision.tier, "red_recover");
    assert.ok(decision.whyExplanation.includes("Vôlei de Praia & Areia"));
    assert.ok(decision.whyExplanation.includes("sono"));
    assert.ok(decision.autonomyNote.includes("Autonomia Selye"));
  });

  test("Emite Ritmo Controlado (yellow_modulate) quando ainda não fez check-in mas orçamento semanal está >85%", () => {
    const decision = evaluateDailyDecision({
      checkin: null,
      yesterdayLoadUa: 380,
      yesterdayLastModalityLabel: "Musculação & Força",
      recoveryBudgetUsagePercent: 88,
      recoveryBudgetRemainingUa: 190,
      acwr: 1.18,
      consecutiveTrainingDays: 2,
    });

    assert.equal(decision.hasCheckinToday, false);
    assert.equal(decision.tier, "yellow_modulate");
    assert.ok(decision.whyExplanation.includes("380 EA ontem"));
  });
});
