import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  estimateRoutineDurationMinutes,
  countTotalSets,
} from "../../lib/routine-metrics";

describe("Phase 5 - Routine Duration & Sets Estimation", () => {
  it("retorna 0 minutos para ficha vazia", () => {
    assert.equal(estimateRoutineDurationMinutes([]), 0);
    assert.equal(countTotalSets([]), 0);
  });

  it("calcula duração estimada e total de séries de uma rotina multi-exercícios", () => {
    const prescriptions = [
      { targetSets: 4, restSeconds: 120 }, // 180 + 360 + 60 = 600s
      { targetSets: 3, restSeconds: 90 }, // 135 + 180 + 60 = 375s
      { targetSets: 3, restSeconds: 60 }, // 135 + 120 + 60 = 315s
    ];
    // Total = 1290s -> 22 min
    assert.equal(estimateRoutineDurationMinutes(prescriptions), 22);
    assert.equal(countTotalSets(prescriptions), 10);
  });
});
