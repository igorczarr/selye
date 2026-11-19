import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  calculateSessionLoad,
  calculateUnifiedSessionLoad,
  calculateWeeklyRecoveryBudget,
  aggregateDailyLoads,
  calculateACWR,
} from "./training-load";

describe("Phase 3 - Training Load & ACWR Engine (§17)", () => {
  test("Calcula carga interna de sessão (Foster: minutos × RPE)", () => {
    // 60 min com RPE 7 = 420 UA (Unidades Arbitrárias)
    const load = calculateSessionLoad(60, 7);
    assert.equal(load, 420);

    // Limites de segurança (RPE entre 1 e 10)
    assert.equal(calculateSessionLoad(45, 12), 450);
    assert.equal(calculateSessionLoad(30, 0), 30);
  });

  test("Agrupa sessões do mesmo dia somando cargas", () => {
    const sessions = [
      { date: "2026-11-10", durationMinutes: 45, rpe: 6 }, // 270
      { date: "2026-11-10", durationMinutes: 30, rpe: 8 }, // 240
      { date: "2026-11-11", durationMinutes: 60, rpe: 5 }, // 300
    ];

    const aggregated = aggregateDailyLoads(sessions);
    assert.equal(aggregated.get("2026-11-10"), 510);
    assert.equal(aggregated.get("2026-11-11"), 300);
  });

  test("Identifica Sweet Spot (0.80 <= ACWR <= 1.30) com progressão equilibrada", () => {
    const dailyLoads = new Map<string, number>();
    const baseDate = new Date("2026-11-13");

    // Preenche 28 dias com carga diária constante de 300 UA
    for (let i = 0; i < 28; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() - i);
      dailyLoads.set(d.toISOString().split("T")[0], 300);
    }

    const result = calculateACWR(dailyLoads, "2026-11-13");
    assert.equal(result.acwr, 1.0);
    assert.equal(result.status, "sweet_spot");
    assert.ok(result.acwr >= result.sweetSpotMin && result.acwr <= result.sweetSpotMax);
  });

  test("Identifica Zona de Risco de Sobrecarga (ACWR > 1.50) em picos agudos", () => {
    const dailyLoads = new Map<string, number>();
    const baseDate = new Date("2026-11-13");

    // Histórico de 28 dias com carga leve (100 UA/dia)
    for (let i = 7; i < 28; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() - i);
      dailyLoads.set(d.toISOString().split("T")[0], 100);
    }

    // Pico repentino nos últimos 7 dias (600 UA/dia)
    for (let i = 0; i < 7; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() - i);
      dailyLoads.set(d.toISOString().split("T")[0], 600);
    }

    const result = calculateACWR(dailyLoads, "2026-11-13");
    assert.ok(result.acwr > 1.5, `ACWR esperado > 1.5, obtido: ${result.acwr}`);
    assert.equal(result.status, "danger_zone");
  });

  test("Identifica Semana Leve · Recuperação (ACWR < 0.80) ou Início de Ciclo sem rótulos punitivos", () => {
    const dailyLoads = new Map<string, number>();
    const baseDate = new Date("2026-11-13");

    // Histórico crônico robusto (400 UA/dia nos dias anteriores)
    for (let i = 7; i < 28; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() - i);
      dailyLoads.set(d.toISOString().split("T")[0], 400);
    }

    // Última semana com estímulo reduzido (50 UA/dia)
    for (let i = 0; i < 7; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() - i);
      dailyLoads.set(d.toISOString().split("T")[0], 50);
    }

    const result = calculateACWR(dailyLoads, "2026-11-13");
    assert.ok(result.acwr < 0.8, `ACWR esperado < 0.8, obtido: ${result.acwr}`);
    assert.equal(result.status, "under_training");
    assert.equal(result.statusLabel, "Semana Leve · Recuperação");

    // Sem histórico algum -> Início de Ciclo
    const emptyResult = calculateACWR(new Map(), "2026-11-13");
    assert.equal(emptyResult.statusLabel, "Início de Ciclo");
  });

  test("Phase 11 — Calcula carga multimodal unificada (Musculação vs Vôlei de Praia vs Corrida vs Caminhada)", () => {
    // 60 min RPE 8 na musculação pura (fator 1.0) = 480 UA
    const strengthLoad = calculateUnifiedSessionLoad({
      durationMinutes: 60,
      rpe: 8,
      modalityCode: "strength",
    });
    assert.equal(strengthLoad, 480);

    // 60 min RPE 8 no Vôlei de Praia (fator 1.15 pela exigência excêntrica/térmica na areia) = 552 UA
    const sandLoad = calculateUnifiedSessionLoad({
      durationMinutes: 60,
      rpe: 8,
      modalityCode: "beach_volleyball",
    });
    assert.equal(sandLoad, 552);

    // 60 min RPE 8 na musculação com 16.000 kg de tonelagem (+3% bônus mecânico) > 480 UA
    const heavyStrengthLoad = calculateUnifiedSessionLoad({
      durationMinutes: 60,
      rpe: 8,
      modalityCode: "strength",
      volumeKg: 16000,
    });
    assert.ok(heavyStrengthLoad > strengthLoad);

    // Caminhada regenerativa (fator 0.75) gera custo menor no orçamento
    const walkLoad = calculateUnifiedSessionLoad({
      durationMinutes: 40,
      rpe: 4,
      modalityCode: "walking",
    });
    assert.equal(walkLoad, 120);
  });

  test("Phase 11 — Calcula Orçamento de Recuperação Semanal e distribuição por esporte", () => {
    const budget = calculateWeeklyRecoveryBudget({
      targetDaysPerWeek: 4, // base = 1400 UA
      chronicDailyLoadUa: 200, // teto crônico = 200 * 7 * 1.18 = 1652 UA
      sessionsLast7Days: [
        { modalityCode: "strength", durationMinutes: 50, rpe: 8, volumeKg: 8000 },
        { modalityCode: "beach_volleyball", durationMinutes: 60, rpe: 8 },
        { modalityCode: "running", durationMinutes: 30, rpe: 7, distanceKm: 5 },
      ],
    });

    assert.equal(budget.weeklyBudgetTargetUa, 1652);
    assert.ok(budget.weeklySpentUa > 1000);
    assert.equal(
      budget.weeklyRemainingUa,
      budget.weeklyBudgetTargetUa - budget.weeklySpentUa
    );
    assert.equal(budget.modalitiesBreakdown.length, 3);
    assert.equal(budget.modalitiesBreakdown[0].modalityCode, "beach_volleyball");
    const sumShares = budget.modalitiesBreakdown.reduce(
      (acc, m) => acc + m.sharePercent,
      0
    );
    assert.ok(sumShares >= 99 && sumShares <= 101);
  });
});