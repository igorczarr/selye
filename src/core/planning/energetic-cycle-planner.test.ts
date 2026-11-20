import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { planEnergeticGrowthCurve } from "./energetic-cycle-planner";

describe("Phase 5 - Modality-Integrated Calendar Planner & EA Modulation", () => {
  it("gera sessões reais de Corrida + Fortalecimento Complementar vinculado à ficha do atleta (sem itens genéricos X/Y/Z)", () => {
    const plan = planEnergeticGrowthCurve({
      mode: "competition",
      eventTitle: "10 km Sub-50",
      modalityCode: "running",
      complementaryModalityCode: "strength",
      experienceLevel: "intermediate",
      primaryKpiKey: "threshold_pace_sec_per_km",
      targetKpiValue: 300,
      kpiUnit: "s/km",
      currentEa: 1455,
      targetEa: 1800,
      startDateStr: "2026-11-19",
      targetDateStr: "2026-12-17", // 28 dias
      targetDaysPerWeek: 4,
      preferredWorkoutJsDays: [1, 2, 4, 6], // Seg, Ter, Qui, Sáb
      userRoutines: [
        {
          id: "rut-forca-corrida",
          title: "Força Pernas & Core Corrida",
          modalityCode: "strength",
          dayOfWeek: 2, // Terça
          estimatedDurationMin: 40,
          estimatedLoadUa: 280,
        },
      ],
    });

    assert.equal(plan.modalityCode, "running");
    assert.equal(plan.currentEa, 1455);
    assert.equal(plan.projectedPeakEa, 1800);
    assert.equal(plan.feasibility, "optimal");
    assert.equal(plan.cycleBlueprint.weeklySlots.length, 4);

    // Deve ter vinculado a ficha real na Terça-feira
    const tuesdaySlot = plan.cycleBlueprint.weeklySlots.find((s) => s.jsDay === 2);
    assert.ok(tuesdaySlot);
    assert.equal(tuesdaySlot.linkedRoutineId, "rut-forca-corrida");
    assert.equal(tuesdaySlot.activityClass, "complementary");

    // Deve prescrever Longão no último dia de treino da semana (Sábado)
    const satSlot = plan.cycleBlueprint.weeklySlots.find((s) => s.jsDay === 6);
    assert.ok(satSlot);
    assert.equal(satSlot.archetypeCode, "run_long");

    // Garante que os compromissos no calendário carregam sessionArchetypeCode e NÃO contêm "PASSO X/Y/Z"
    const serialized = JSON.stringify(plan);
    assert.equal(serialized.includes("PASSO X"), false);
    assert.equal(serialized.includes("PASSO Y"), false);
    assert.equal(serialized.includes("PASSO Z"), false);

    const workoutDay = plan.dailySchedule.find((d) => d.isWorkoutDay);
    assert.ok(workoutDay);
    const wkCommitment = workoutDay.commitments.find((c) => c.kind === "workout");
    assert.ok(wkCommitment?.sessionArchetypeCode);

    const lastDay = plan.dailySchedule[plan.dailySchedule.length - 1];
    assert.equal(lastDay.phase, "peak");
    assert.equal(lastDay.isTargetEventDay, true);
  });

  it("gera arquitetura distinta para Vôlei de Praia e Futebol com sessões específicas de cada modalidade", () => {
    const bvPlan = planEnergeticGrowthCurve({
      mode: "competition",
      eventTitle: "Open de Vôlei de Praia",
      modalityCode: "beach_volleyball",
      complementaryModalityCode: "strength",
      currentEa: 1500,
      targetEa: 1750,
      startDateStr: "2026-11-19",
      targetDateStr: "2026-12-17",
      targetDaysPerWeek: 4,
    });

    const bvCodes = bvPlan.cycleBlueprint.weeklySlots.map((s) => s.archetypeCode);
    assert.ok(bvCodes.some((c) => c.startsWith("bv_")));
    assert.ok(bvPlan.cycleBlueprint.complementaryProtocolSummaryPt?.includes("Ombro"));

    const footballPlan = planEnergeticGrowthCurve({
      mode: "wellness_constancy",
      modalityCode: "football",
      complementaryModalityCode: "strength",
      currentEa: 1600,
      startDateStr: "2026-11-19",
      targetDateStr: "2026-12-17",
      targetDaysPerWeek: 3,
    });
    const fbCodes = footballPlan.cycleBlueprint.weeklySlots.map((s) => s.archetypeCode);
    assert.ok(fbCodes.some((c) => c.startsWith("football_")));
  });

  it("ativa guarda-corpo fisiológico quando a meta exige salto irreal em poucos dias, sugerindo data segura", () => {
    const plan = planEnergeticGrowthCurve({
      mode: "competition",
      modalityCode: "cycling",
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

  it("protege dias com compromissos pessoais (blockedDates) transformando-os em janelas de absorção", () => {
    const blockedDate = "2026-11-23";
    const plan = planEnergeticGrowthCurve({
      mode: "wellness_constancy",
      modalityCode: "strength",
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
