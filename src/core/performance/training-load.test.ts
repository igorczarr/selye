import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  calculateSessionLoad,
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

  test("Identifica Sub-treinamento (ACWR < 0.80) em períodos de decréscimo acentuado", () => {
    const dailyLoads = new Map<string, number>();
    const baseDate = new Date("2026-11-13");

    // Histórico crônico robusto (400 UA/dia nos dias anteriores)
    for (let i = 7; i < 28; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() - i);
      dailyLoads.set(d.toISOString().split("T")[0], 400);
    }

    // Última semana com baixíssimo estímulo (50 UA/dia)
    for (let i = 0; i < 7; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() - i);
      dailyLoads.set(d.toISOString().split("T")[0], 50);
    }

    const result = calculateACWR(dailyLoads, "2026-11-13");
    assert.ok(result.acwr < 0.8, `ACWR esperado < 0.8, obtido: ${result.acwr}`);
    assert.equal(result.status, "under_training");
  });
});