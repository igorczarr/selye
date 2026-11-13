import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  generatePerformanceRecommendations,
  type AthleteContext,
} from "./recommendations-engine";
import { type ACWRResult } from "./training-load";

describe("Phase 3 - Explainable Performance Recommendations Engine (§21)", () => {
  test("Gera recomendação de alerta para ACWR acima de 1.5 com justificativa Gabbett", () => {
    const acwrResult: ACWRResult = {
      acuteLoad: 600,
      chronicLoad: 350,
      acwr: 1.71,
      status: "danger_zone",
      statusLabel: "Zona de Risco de Sobrecarga",
      sweetSpotMin: 0.8,
      sweetSpotMax: 1.3,
      weeklyLoadTotal: 4200,
      monotony: 2.1,
      strain: 8820,
    };

    const ctx: AthleteContext = {
      acwrResult,
      consecutiveTrainingDays: 2,
      averageRpeLast7Days: 7,
      weeklyGoalTarget: 4,
      completedDaysThisWeek: 3,
    };

    const recs = generatePerformanceRecommendations(ctx);
    const dangerRec = recs.find((r) => r.id === "rec_danger_zone_acwr");
    assert.ok(dangerRec, "Deveria emitir recomendação para ACWR perigoso");
    assert.equal(dangerRec?.urgency, "alert");
    assert.ok(dangerRec?.scientificRationale.includes("Gabbett"));
    assert.ok(dangerRec?.scientificRationale.includes("1.71"));
  });

  test("Gera recomendação de regeneração biológica quando há 4+ dias seguidos com RPE alto", () => {
    const acwrResult: ACWRResult = {
      acuteLoad: 400,
      chronicLoad: 380,
      acwr: 1.05,
      status: "sweet_spot",
      statusLabel: "Zona Ótima",
      sweetSpotMin: 0.8,
      sweetSpotMax: 1.3,
      weeklyLoadTotal: 2800,
      monotony: 1.4,
      strain: 3920,
    };

    const ctx: AthleteContext = {
      acwrResult,
      consecutiveTrainingDays: 5,
      averageRpeLast7Days: 8.2,
      weeklyGoalTarget: 4,
      completedDaysThisWeek: 4,
    };

    const recs = generatePerformanceRecommendations(ctx);
    const intensityRec = recs.find((r) => r.id === "rec_high_consecutive_intensity");
    assert.ok(intensityRec, "Deveria identificar estresse agudo consecutivo");
    assert.ok(intensityRec?.scientificRationale.includes("supercompensação"));
  });

  test("Enaltece constância equilibrada quando atleta opera no Sweet Spot", () => {
    const acwrResult: ACWRResult = {
      acuteLoad: 320,
      chronicLoad: 310,
      acwr: 1.03,
      status: "sweet_spot",
      statusLabel: "Zona Ótima",
      sweetSpotMin: 0.8,
      sweetSpotMax: 1.3,
      weeklyLoadTotal: 2240,
      monotony: 1.2,
      strain: 2688,
    };

    const ctx: AthleteContext = {
      acwrResult,
      consecutiveTrainingDays: 1,
      averageRpeLast7Days: 6.5,
      weeklyGoalTarget: 4,
      completedDaysThisWeek: 3,
    };

    const recs = generatePerformanceRecommendations(ctx);
    const sweetRec = recs.find((r) => r.id === "rec_sweet_spot_consistency");
    assert.ok(sweetRec, "Deveria validar o Sweet Spot");
    assert.equal(sweetRec?.urgency, "info");
    assert.ok(sweetRec?.scientificRationale.includes("Sweet Spot"));
  });
});