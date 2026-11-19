import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { planEnergeticGrowthCurve } from "./energetic-cycle-planner";
import { reconcileEnergeticPlanProgress } from "./plan-progress";
import { evaluateDailyPlanCoach } from "./daily-plan-coach";

describe("Phase 20 - Daily Plan Coach, Live Adaptation & Phase Shift Alerts", () => {
  it("Suaviza automaticamente o plano de hoje quando o Check-in Matinal indica cansaço em dia de treino", () => {
    const plan = planEnergeticGrowthCurve({
      mode: "competition",
      eventTitle: "Open de Vôlei",
      currentEa: 1455,
      targetEa: 1800,
      startDateStr: "2026-11-19", // Quinta-feira (dia de treino no padrão Seg,Ter,Qui,Sáb)
      targetDateStr: "2026-12-17",
      targetDaysPerWeek: 4,
    });

    const progress = reconcileEnergeticPlanProgress({
      plan,
      currentRealEa: 1455,
      todayDateStr: "2026-11-19",
      completedCommitmentKeys: [],
    });

    const coach = evaluateDailyPlanCoach({
      plan,
      progress,
      todayReadinessScore: 44,
      todayDecisionTier: "red_recover",
    });

    assert.equal(coach.adaptation.isSoftenedToday, true);
    assert.ok(coach.adaptation.badgePt.includes("Suavizado"));
    assert.ok(coach.pendingTodayCount >= 2);
    assert.ok(coach.proactiveAlert !== null);
  });

  it("Detecta a entrada exata na Fase de Polimento (Taper) emitindo alerta prioritário para o Sininho", () => {
    const plan = planEnergeticGrowthCurve({
      mode: "competition",
      eventTitle: "Maratona Selye",
      currentEa: 1455,
      targetEa: 1800,
      startDateStr: "2026-11-19",
      targetDateStr: "2026-12-17",
      targetDaysPerWeek: 4,
    });

    const firstPeakDay = plan.dailySchedule.find((d) => d.phase === "peak");
    assert.ok(firstPeakDay);

    const progress = reconcileEnergeticPlanProgress({
      plan,
      currentRealEa: firstPeakDay.projectedEa,
      todayDateStr: firstPeakDay.dateStr,
      completedCommitmentKeys: [],
    });

    const coach = evaluateDailyPlanCoach({
      plan,
      progress,
      todayReadinessScore: 84,
      todayDecisionTier: "green_push",
    });

    assert.ok(coach.proactiveAlert);
    assert.equal(coach.proactiveAlert.priority, "high");
    assert.ok(coach.proactiveAlert.titlePt.includes("Polimento"));
  });

  it("Reconhece quando todos os passos do dia foram concluídos (allDoneToday = true)", () => {
    const plan = planEnergeticGrowthCurve({
      mode: "wellness_constancy",
      currentEa: 1455,
      targetEa: 1620,
      startDateStr: "2026-11-19",
      targetDateStr: "2026-12-17",
    });

    const todayKeys = plan.dailySchedule[0].commitments.map((c) => c.id);
    const progress = reconcileEnergeticPlanProgress({
      plan,
      currentRealEa: 1470,
      todayDateStr: "2026-11-19",
      completedCommitmentKeys: todayKeys,
    });

    const coach = evaluateDailyPlanCoach({
      plan,
      progress,
      todayReadinessScore: 82,
      todayDecisionTier: "green_push",
    });

    assert.equal(coach.allDoneToday, true);
    assert.equal(coach.pendingTodayCount, 0);
  });
});
