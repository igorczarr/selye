import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { planEnergeticGrowthCurve } from "./energetic-cycle-planner";
import {
  computeCycleBuiltEa,
  reconcileEnergeticPlanProgress,
} from "./plan-progress";

describe("Phase 18 - Energetic Plan Live Progress & Daily Checklist Reconciliation", () => {
  it("Calcula progresso real rumo aos 1800 EA, adesão diária e distância restante até a competição", () => {
    const plan = planEnergeticGrowthCurve({
      mode: "competition",
      eventTitle: "Campeonato Estadual",
      modalityLabelPt: "Vôlei de Praia",
      currentEa: 1455,
      targetEa: 1800,
      startDateStr: "2026-11-19",
      targetDateStr: "2026-12-17",
      targetDaysPerWeek: 4,
    });

    const day0 = plan.dailySchedule[0];
    const completedKeys = day0.commitments.map((c) => c.id);

    const progress = reconcileEnergeticPlanProgress({
      plan,
      currentRealEa: 1628,
      todayDateStr: "2026-12-03", // Metade exata (14 dias)
      completedCommitmentKeys: completedKeys,
      customCommitments: [
        {
          id: "c1",
          localDate: "2026-12-03",
          kind: "custom_habit",
          title: "Banho de contraste pós-jogo",
          blocksWorkout: false,
          eaSignedDelta: 60,
        },
      ],
    });

    assert.equal(progress.daysElapsed, 14);
    assert.equal(progress.daysRemaining, 14);
    assert.equal(progress.remainingEaToTarget, 172); // 1800 - 1628
    assert.equal(progress.eaProgressPercent, 50);
    assert.equal(progress.trajectoryStatus, "on_track");
    assert.ok(progress.todayDay);
    assert.ok(
      progress.todayDay.commitments.some(
        (c) => c.isCustom && c.titlePt === "Banho de contraste pós-jogo"
      )
    );
  });

  it("Detecta quando o atleta está abaixo da curva planejada e orienta priorizar hábitos +EA", () => {
    const plan = planEnergeticGrowthCurve({
      mode: "competition",
      currentEa: 1455,
      targetEa: 1800,
      startDateStr: "2026-11-19",
      targetDateStr: "2026-12-17",
    });

    const progress = reconcileEnergeticPlanProgress({
      plan,
      currentRealEa: 1480, // Bem abaixo do esperado na metade do ciclo (~1638)
      todayDateStr: "2026-12-03",
      completedCommitmentKeys: [],
    });

    assert.equal(progress.trajectoryStatus, "needs_recharge");
    assert.ok(progress.trajectoryBadgePt.includes("+EA"));
    assert.ok(progress.deltaVsExpectedToday <= -55);
  });

  it("Garante que a EA do Ciclo parte da EA Base (1700) rumo à meta (1900) e sobe ao treinar, sem cair para 1500", () => {
    const startCycleEa = computeCycleBuiltEa({
      initialEa: 1700,
      personalCapacityEa: 1700,
      targetEa: 1900,
      completedWorkoutsInCycle: 0,
      completedRechargeHabitsInCycle: 0,
    });
    assert.equal(startCycleEa, 1700);

    const afterWorkoutsAndCheckin = computeCycleBuiltEa({
      initialEa: 1700,
      personalCapacityEa: 1700,
      targetEa: 1900,
      completedWorkoutsInCycle: 2,
      completedRechargeHabitsInCycle: 2,
    });
    assert.ok(
      afterWorkoutsAndCheckin > 1700,
      `Concluir treinos e hábitos deve elevar o progresso rumo a 1900 EA (${afterWorkoutsAndCheckin} EA)`
    );
  });
});
