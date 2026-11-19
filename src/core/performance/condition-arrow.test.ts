import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveConditionArrow } from "./condition-arrow";

describe("Phase 21 - PES/FIFA Physical Condition Arrow (EA Reserve)", () => {
  it("Retorna seta vertical azul-ciano (0°) quando a reserva de EA está no ápice (>= 85%)", () => {
    const res = resolveConditionArrow({
      reservePercent: 92,
      availableReserveEa: 1656,
      personalCapacityEa: 1800,
    });
    assert.equal(res.tier, "peak_up");
    assert.equal(res.rotationDeg, 0);
    assert.equal(res.colorHex, "#00D4FF");
    assert.ok(res.descriptionPt.includes("1656/1800 EA"));
  });

  it("Retorna as 4 demais inclinações (45°, 90°, 135°, 180°) conforme a queda da reserva de EA", () => {
    assert.equal(resolveConditionArrow({ reservePercent: 72 }).rotationDeg, 45);
    assert.equal(resolveConditionArrow({ reservePercent: 54 }).rotationDeg, 90);
    assert.equal(resolveConditionArrow({ reservePercent: 35 }).rotationDeg, 135);
    assert.equal(resolveConditionArrow({ reservePercent: 12 }).rotationDeg, 180);
    assert.equal(resolveConditionArrow({ reservePercent: 12 }).tier, "exhausted_down");
  });
});
