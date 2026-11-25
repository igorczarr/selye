import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  HABIT_PRESETS_CATALOG,
  computeHealthyHabitsSnapshot,
} from "./healthy-habits-catalog";

describe("Healthy Habits Catalog & Daily Progress Engine", () => {
  it("contém os 6 hábitos essenciais solicitados (água, sol, mobilidade, respiração, caminhada e refeições limpas)", () => {
    const codes = HABIT_PRESETS_CATALOG.map((p) => p.code);
    assert.ok(codes.includes("water_4l"));
    assert.ok(codes.includes("sun_10m"));
    assert.ok(codes.includes("mobility_stretch"));
    assert.ok(codes.includes("breathing_5m"));
    assert.ok(codes.includes("walk_10m"));
    assert.ok(codes.includes("clean_meals_4"));
  });

  it("calcula progresso diário, bônus de EA, streak e adesão de 7 dias corretamente", () => {
    const habits = [
      {
        id: "h1",
        axisCode: "hydration",
        presetCode: "water_4l",
        title: "4L de água",
        targetLabel: "4L / dia",
        positiveImpactPt: "Hidratação celular plena.",
        eaImpact: 45,
        createdByRole: "athlete",
        isActive: true,
      },
      {
        id: "h2",
        axisCode: "circadian_sleep",
        presetCode: "sun_10m",
        title: "10 min de exposição ao sol diário",
        targetLabel: "10 min",
        positiveImpactPt: "Ritmo circadiano.",
        eaImpact: 40,
        createdByRole: "coach",
        isActive: true,
      },
    ];

    const logs = [
      { habitId: "h1", localDate: "2026-11-25", completed: true },
      { habitId: "h1", localDate: "2026-11-24", completed: true },
      { habitId: "h1", localDate: "2026-11-23", completed: true },
      { habitId: "h2", localDate: "2026-11-25", completed: true },
    ];

    const snap = computeHealthyHabitsSnapshot({
      habits,
      logs,
      todayDateStr: "2026-11-25",
    });

    assert.equal(snap.totalActiveCount, 2);
    assert.equal(snap.completedTodayCount, 2);
    assert.equal(snap.todayCompletionPercent, 100);
    assert.equal(snap.eaBonusToday, 85);
    assert.equal(snap.currentStreakDays, 3);
    assert.equal(snap.habits[0].streakDays, 3);
    assert.equal(snap.habits[1].streakDays, 1);
    assert.equal(snap.strongestAxisLabelPt, "Hidratação");
    assert.ok(snap.impactNarrativePt.includes("+85 EA"));
  });
});
