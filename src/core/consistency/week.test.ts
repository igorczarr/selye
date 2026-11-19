import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  WEEKDAYS_MONDAY_FIRST,
  jsDayToMondayIndex,
  mondayIndexToJsDay,
  getWeekdayLabelPt,
  extractRoutineSequenceOrder,
  sortRoutinesChronologically,
} from "../../lib/week";

describe("Week & Routine Ordering Utility (Fase 0 — Seg→Dom)", () => {
  it("deve manter a semana iniciando na Segunda-feira (Seg=0 .. Dom=6)", () => {
    assert.equal(WEEKDAYS_MONDAY_FIRST[0].shortPt, "Seg");
    assert.equal(WEEKDAYS_MONDAY_FIRST[6].shortPt, "Dom");
    assert.equal(jsDayToMondayIndex(1), 0); // Segunda
    assert.equal(jsDayToMondayIndex(0), 6); // Domingo no fim
    assert.equal(mondayIndexToJsDay(0), 1);
    assert.equal(mondayIndexToJsDay(6), 0);
  });

  it("deve retornar rótulos em PT-BR curtos e completos corretamente", () => {
    assert.equal(getWeekdayLabelPt(1, "short"), "Seg");
    assert.equal(getWeekdayLabelPt(0, "full"), "Domingo");
    assert.equal(getWeekdayLabelPt(6, "short"), "Sáb");
  });

  it("deve extrair a sequência de títulos 'Dia 1..5' e 'Treino A..C'", () => {
    assert.equal(
      extractRoutineSequenceOrder("Dia 1 · Força + Tripla Extensão"),
      1
    );
    assert.equal(
      extractRoutineSequenceOrder("Dia 5 · Vôlei de Praia"),
      5
    );
    assert.equal(extractRoutineSequenceOrder("Treino B - Dorsal"), 2);
  });

  it("deve ordenar os dias de treino na ordem progressiva correta (Dia 1 → Dia 5)", () => {
    const reversedFromDb = [
      { title: "Dia 5 · Vôlei de Praia: Jogo", templates: [{ dayOfWeek: 6 }] },
      { title: "Dia 4 · Vôlei de Praia: Areia", templates: [{ dayOfWeek: 2 }] },
      { title: "Dia 3 · Força Unilateral", templates: [{ dayOfWeek: 5 }] },
      { title: "Dia 2 · Potência + Pliometria", templates: [{ dayOfWeek: 3 }] },
      { title: "Dia 1 · Força + Tripla Extensão", templates: [{ dayOfWeek: 1 }] },
    ];

    const sorted = sortRoutinesChronologically(reversedFromDb);
    assert.deepEqual(
      sorted.map((r) => r.title),
      [
        "Dia 1 · Força + Tripla Extensão",
        "Dia 2 · Potência + Pliometria",
        "Dia 3 · Força Unilateral",
        "Dia 4 · Vôlei de Praia: Areia",
        "Dia 5 · Vôlei de Praia: Jogo",
      ]
    );
  });

  it("deve ordenar por dia da semana Seg→Dom quando o título não tiver número de dia", () => {
    const unordered = [
      { title: "Longão de Domingo", dayOfWeek: 0 },
      { title: "Superiores de Quarta", dayOfWeek: 3 },
      { title: "Inferiores de Segunda", dayOfWeek: 1 },
    ];

    const sorted = sortRoutinesChronologically(unordered);
    assert.deepEqual(
      sorted.map((r) => r.title),
      ["Inferiores de Segunda", "Superiores de Quarta", "Longão de Domingo"]
    );
  });
});
