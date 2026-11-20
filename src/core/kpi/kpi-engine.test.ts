import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateCssPacePer100m,
  calculateCyclingPmc,
  calculateEpley1RM,
  evaluateModalityKpiDashboard,
  formatKpiValue,
} from "./index";

describe("Phase 3 - Modality KPI Engine & On-Track Assessment", () => {
  it("calcula fórmulas científicas puras com exatidão (Epley e1RM, CSS /100m, PMC CTL/ATL/TSB)", () => {
    assert.equal(calculateEpley1RM(100, 1), 100);
    assert.equal(calculateEpley1RM(100, 6), 120); // 100 * (1 + 6/30) = 120
    assert.equal(calculateCssPacePer100m(380, 180), 100); // (380-180)/2 = 100 s/100m
    assert.equal(formatKpiValue(305, "s/km"), "5:05 /km");
    assert.equal(formatKpiValue(95, "s/100m"), "1:35 /100m");

    // PMC com 14 dias de carga diária alta → ATL > CTL → TSB negativo (fase de carga)
    const dailyMap = new Map<string, number>();
    for (let i = 0; i < 14; i++) {
      const d = new Date("2026-11-19T12:00:00Z");
      d.setUTCDate(d.getUTCDate() - i);
      dailyMap.set(d.toISOString().split("T")[0], 80);
    }
    const pmc = calculateCyclingPmc(dailyMap, "2026-11-19");
    assert.ok(pmc.atl > pmc.ctl, `Esperado ATL (${pmc.atl}) > CTL (${pmc.ctl})`);
    assert.ok(pmc.tsb < 0, `Esperado TSB negativo em bloco de carga (${pmc.tsb})`);
  });

  it("calcula KPIs de Corrida ignorando corridas casuais e avalia polarização 80/20 + 'Nos Trilhos?'", () => {
    const res = evaluateModalityKpiDashboard({
      primaryModality: "running",
      complementaryModalities: ["strength"],
      experienceLevel: "intermediate",
      todayDateStr: "2026-11-19",
      sessionsLast42Days: [
        { id: "r1", date: "2026-11-18", modalityCode: "running", activityClass: "serious", durationMinutes: 50, rpe: 4, distanceKm: 8 },
        { id: "r2", date: "2026-11-16", modalityCode: "running", activityClass: "serious", durationMinutes: 40, rpe: 7.5, distanceKm: 8 },
        { id: "r3", date: "2026-11-14", modalityCode: "running", activityClass: "serious", durationMinutes: 90, rpe: 4, distanceKm: 14 },
        // Corrida marcada explicitamente como solta (casual) — NÃO deve inflar km/sem sérios!
        { id: "c1", date: "2026-11-15", modalityCode: "running", activityClass: "casual", durationMinutes: 25, rpe: 3, distanceKm: 4 },
        // Musculação complementar
        { id: "s1", date: "2026-11-17", modalityCode: "strength", activityClass: "complementary", durationMinutes: 45, rpe: 7 },
      ],
      setLogsLast14Days: [],
      measurements: [],
      goalTarget: {
        primaryKpiKey: "weekly_distance_km",
        baselineValue: 20,
        targetValue: 35,
        startDate: "2026-10-20",
        targetDate: "2026-12-20",
      },
    });

    const kmKpi = res.kpis.find((k) => k.key === "weekly_distance_km")!;
    const polKpi = res.kpis.find((k) => k.key === "polarized_low_intensity_pct")!;

    assert.equal(kmKpi.currentValue, 30, "Deve somar 8+8+14 = 30 km e excluir os 4 km casuais");
    assert.equal(polKpi.currentValue, 78, "140/180 min em RPE <= 4.5 = 78% polarizado");
    assert.equal(res.casualSessionsLast7d, 1);
    assert.equal(res.seriousSessionsLast7d, 3);
    assert.equal(res.complementarySessionsLast7d, 1);
    assert.equal(res.onTrack.status, "on_track");
    assert.ok((res.onTrack.actualProgressPercent ?? 0) >= 60);
  });

  it("calcula KPIs de Musculação (séries efetivas/grupo, e1RM Epley, RIR médio e tonelagem)", () => {
    const res = evaluateModalityKpiDashboard({
      primaryModality: "strength",
      experienceLevel: "intermediate",
      todayDateStr: "2026-11-19",
      sessionsLast42Days: [
        { id: "w1", date: "2026-11-18", modalityCode: "strength", activityClass: "serious", durationMinutes: 60, rpe: 8 },
      ],
      setLogsLast14Days: [
        // Aquecimento deve ser ignorado
        { sessionId: "w1", date: "2026-11-18", modalityCode: "strength", exerciseNamePt: "Agachamento Livre", setType: "warmup", weightKg: 40, reps: 10, rpe: 4 },
        // Séries efetivas de pernas
        { sessionId: "w1", date: "2026-11-18", modalityCode: "strength", exerciseNamePt: "Agachamento Livre", setType: "effective", weightKg: 100, reps: 6, rpe: 8, rir: 2 },
        { sessionId: "w1", date: "2026-11-18", modalityCode: "strength", exerciseNamePt: "Agachamento Livre", setType: "effective", weightKg: 100, reps: 6, rpe: 8, rir: 2 },
        { sessionId: "w1", date: "2026-11-18", modalityCode: "strength", exerciseNamePt: "Supino Reto", setType: "effective", weightKg: 80, reps: 8, rpe: 8, rir: 2 },
      ],
      measurements: [],
    });

    const e1rm = res.kpis.find((k) => k.key === "key_lift_e1rm_kg")!;
    const rir = res.kpis.find((k) => k.key === "avg_effective_rir")!;
    const tonnage = res.kpis.find((k) => k.key === "weekly_tonnage_kg")!;

    assert.equal(e1rm.currentValue, 120);
    assert.equal(rir.currentValue, 2);
    assert.equal(tonnage.currentValue, 100 * 6 * 2 + 80 * 8);
    assert.equal(res.weeklySetsByCategory.pernas, 2);
    assert.equal(res.weeklySetsByCategory.peito, 1);
  });

  it("avalia Vôlei de Praia (CMJ manual + carga areia + pré-hab ombro) e Lutas (alerta de sparring duro)", () => {
    const bv = evaluateModalityKpiDashboard({
      primaryModality: "beach_volleyball",
      complementaryModalities: ["strength"],
      experienceLevel: "intermediate",
      todayDateStr: "2026-11-19",
      sessionsLast42Days: [
        { id: "b1", date: "2026-11-18", modalityCode: "beach_volleyball", durationMinutes: 90, rpe: 8, jumpCount: 120 },
      ],
      setLogsLast14Days: [],
      measurements: [
        { kpiKey: "cmj_height_cm", modalityCode: "beach_volleyball", valueNumeric: 46.5, unit: "cm", measuredAt: "2026-11-15" },
        { kpiKey: "cmj_height_cm", modalityCode: "beach_volleyball", valueNumeric: 43, unit: "cm", measuredAt: "2026-10-15" },
      ],
      goalTarget: {
        primaryKpiKey: "cmj_height_cm",
        baselineValue: 43,
        targetValue: 49,
        startDate: "2026-10-15",
        targetDate: "2026-12-15",
      },
    });

    const cmj = bv.kpis.find((k) => k.key === "cmj_height_cm")!;
    assert.equal(cmj.currentValue, 46.5);
    assert.equal(cmj.deltaValue, 3.5);
    assert.equal(bv.onTrack.status, "on_track");

    // Lutas com 4 sparrings duros na semana → dispara alerta e muda status para attention
    const combat = evaluateModalityKpiDashboard({
      primaryModality: "martial_arts",
      experienceLevel: "advanced",
      todayDateStr: "2026-11-19",
      sessionsLast42Days: [
        { id: "m1", date: "2026-11-18", modalityCode: "martial_arts", durationMinutes: 75, rpe: 9 },
        { id: "m2", date: "2026-11-17", modalityCode: "martial_arts", durationMinutes: 75, rpe: 9 },
        { id: "m3", date: "2026-11-15", modalityCode: "martial_arts", durationMinutes: 75, rpe: 8.5 },
        { id: "m4", date: "2026-11-14", modalityCode: "martial_arts", durationMinutes: 75, rpe: 9 },
      ],
      setLogsLast14Days: [],
      measurements: [],
    });

    assert.ok(combat.guardrailWarnings.some((w) => w.code === "excessive_hard_sparring"));
    assert.equal(combat.onTrack.status, "attention");
  });
});
