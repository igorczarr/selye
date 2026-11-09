import { describe, it } from "node:test";
import assert from "node:assert";
import {
  calculateDailyStreak,
  calculateWeeklyStreak,
  getIsoWeekStart,
} from "./streak-calculator";

describe("Consistency & Streak Engine (Briefing §13 e §28)", () => {
  it("deve agrupar corretamente semanas ISO iniciando na segunda-feira", () => {
    // 2026-11-09 é uma segunda-feira
    assert.strictEqual(getIsoWeekStart("2026-11-09"), "2026-11-09");
    // 2026-11-15 é um domingo da mesma semana
    assert.strictEqual(getIsoWeekStart("2026-11-15"), "2026-11-09");
    // 2026-11-16 é a segunda-feira seguinte
    assert.strictEqual(getIsoWeekStart("2026-11-16"), "2026-11-16");
  });

  it("deve calcular streak diário consecutivo e melhor streak", () => {
    const dates = ["2026-11-09", "2026-11-08", "2026-11-07", "2026-11-05", "2026-11-04"];
    const today = "2026-11-09";

    const result = calculateDailyStreak(dates, today);
    // 09, 08, 07 são 3 dias consecutivos
    assert.strictEqual(result.current, 3);
    assert.strictEqual(result.best, 3);
  });

  it("deve manter o streak ativo se o usuário treinou ontem e hoje ainda não treinou", () => {
    const dates = ["2026-11-08", "2026-11-07", "2026-11-06"];
    const today = "2026-11-09"; // Usuário abriu o app de manhã

    const result = calculateDailyStreak(dates, today);
    // 08, 07, 06 = 3 dias, ainda válido pois hoje está em curso
    assert.strictEqual(result.current, 3);
  });

  it("deve zerar o streak atual se houver gap de mais de 1 dia de inatividade", () => {
    const dates = ["2026-11-06", "2026-11-05", "2026-11-04"];
    const today = "2026-11-09"; // Gap nos dias 07 e 08

    const result = calculateDailyStreak(dates, today);
    assert.strictEqual(result.current, 0);
    assert.strictEqual(result.best, 3);
  });

  it("deve calcular streak semanal respeitando o exemplo exato do Briefing §13.2", () => {
    // Exemplo do briefing:
    // Meta = 3 dias por semana
    // Semana 1: 3 treinos (atingida)
    // Semana 2: 4 treinos (atingida)
    // Semana 3: 3 treinos (atingida)
    // Semana 4: 2 treinos (NÃO atingida)
    // Semana 5: 4 treinos (atingida - reinicia novo streak)
    const dates = [
      // Semana 1: 2026-10-05 a 2026-10-11 (3 dias)
      "2026-10-05", "2026-10-07", "2026-10-09",
      // Semana 2: 2026-10-12 a 2026-10-18 (4 dias)
      "2026-10-12", "2026-10-14", "2026-10-16", "2026-10-17",
      // Semana 3: 2026-10-19 a 2026-10-25 (3 dias)
      "2026-10-19", "2026-10-21", "2026-10-23",
      // Semana 4: 2026-10-26 a 2026-11-01 (2 dias - quebrou!)
      "2026-10-26", "2026-10-28",
      // Semana 5: 2026-11-02 a 2026-11-08 (4 dias - nova sequência)
      "2026-11-02", "2026-11-04", "2026-11-06", "2026-11-07",
    ];

    const today = "2026-11-09"; // Início da semana 6
    const result = calculateWeeklyStreak(dates, 3, today);

    // Na semana 5 atingiu a meta, então o streak atual é 1 semana
    assert.strictEqual(result.current, 1);
    // Melhor sequência histórica foi de 3 semanas (semanas 1, 2 e 3)
    assert.strictEqual(result.best, 3);
  });
});
