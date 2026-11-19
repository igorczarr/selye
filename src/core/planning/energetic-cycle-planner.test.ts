import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { planEnergeticGrowthCurve } from "./energetic-cycle-planner";

describe("Phase 17 - Perennial Energetic Cycle Calendar & Inverse Goal Planner", () => {
  it("Planeja com precisão a curva de crescimento de 1455 EA para 1800 EA até a competição com receita X, Y, Z e Polimento (Taper)", () => {
    const plan = planEnergeticGrowthCurve({
      mode: "competition",
      eventTitle: "Open de Vôlei de Praia",
      modalityLabelPt: "Vôlei de Praia & Força",
      currentEa: 1455,
      targetEa: 1800,
      startDateStr: "2026-11-19",
      targetDateStr: "2026-12-17", // 28 dias (4 semanas)
      targetDaysPerWeek: 4,
      strengthRecordsCount: 6,
    });

    assert.equal(plan.currentEa, 1455);
    assert.equal(plan.projectedPeakEa, 1800);
    assert.equal(plan.totalGainEa, 345);
    assert.equal(plan.feasibility, "optimal");
    assert.equal(plan.executiveRecipe.pillars.length, 3);
    assert.ok(plan.executiveRecipe.headlinePt.includes("1455 EA"));
    assert.ok(plan.executiveRecipe.headlinePt.includes("1800 EA"));

    // Primeiro dia começa em 1455 EA e último dia (dia da competição) atinge 1800 EA na fase de Ápice (Peak)
    const firstDay = plan.dailySchedule[0];
    const lastDay = plan.dailySchedule[plan.dailySchedule.length - 1];
    assert.equal(firstDay.projectedEa, 1455);
    assert.equal(lastDay.projectedEa, 1800);
    assert.equal(lastDay.phase, "peak");
    assert.equal(lastDay.isTargetEventDay, true);

    // Todos os dias possuem compromissos claros (treino/recuperação + hábito +EA)
    for (const day of plan.dailySchedule) {
      assert.ok(day.commitments.length >= 2);
    }
  });

  it("Ativa guarda-corpo fisiológico quando a meta exige salto irreal em poucos dias, sugerindo data segura", () => {
    const plan = planEnergeticGrowthCurve({
      mode: "competition",
      currentEa: 1455,
      targetEa: 2500, // +1045 EA em apenas 10 dias
      startDateStr: "2026-11-19",
      targetDateStr: "2026-11-29",
      targetDaysPerWeek: 4,
    });

    assert.equal(plan.feasibility, "excessive_adjusted");
    assert.ok(plan.projectedPeakEa < 2500);
    assert.ok(plan.projectedPeakEa > 1455);
    assert.ok(plan.recommendedAlternativeDateStr !== null);
  });

  it("Protege dias com compromissos pessoais (blockedDates) transformando-os em janelas de absorção", () => {
    const blockedDate = "2026-11-23"; // Segunda-feira (normalmente dia de treino)
    const plan = planEnergeticGrowthCurve({
      mode: "wellness_constancy",
      currentEa: 1455,
      targetEa: 1620,
      startDateStr: "2026-11-19",
      targetDateStr: "2026-12-10",
      targetDaysPerWeek: 4,
      blockedDates: [blockedDate],
    });

    const dayEntry = plan.dailySchedule.find((d) => d.dateStr === blockedDate);
    assert.ok(dayEntry);
    assert.equal(dayEntry.isBlockedByPersonalCommitment, true);
    assert.equal(dayEntry.isWorkoutDay, false);
    assert.equal(dayEntry.expectedDrainEa, 0);
  });
});
