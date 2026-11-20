import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { buildCoachAlerts, groupCoachAlerts } from "./coach-alerts";

const base = {
  modalityShortNamePt: "Corrida",
  onTrack: {
    status: "on_track" as const,
    headlinePt: "Seu ritmo está ótimo",
    reasonPt: "Dentro da curva.",
    nextActionPt: "Continue.",
    primaryKpiLabelPt: "Km por semana",
    actualProgressPercent: 62,
    expectedProgressPercent: 55,
  },
  guardrailWarnings: [],
  casualSessionsLast7d: 0,
  goalTitle: "10 km",
};

describe("Fase 7 - Avisos do Treinador por modalidade e meta", () => {
  test("cita modalidade e progresso quando está nos trilhos", () => {
    const a = buildCoachAlerts(base);
    assert.equal(a.length, 1);
    assert.equal(a[0].priority, "info");
    assert.match(a[0].badgePt, /Corrida/);
    assert.match(a[0].bodyPt, /62%/);
  });

  test("fora dos trilhos e risco alto vêm primeiro (prioridade 'agora')", () => {
    const a = buildCoachAlerts({
      ...base,
      onTrack: { ...base.onTrack, status: "off_track" },
      guardrailWarnings: [
        { code: "weekly_volume_jump", severity: "high", titlePt: "Salto", detailPt: "Reduza." },
      ],
    });
    const g = groupCoachAlerts(a);
    assert.equal(g.now.length, 2);
    assert.match(a[0].titlePt, /Salto|reajustar/);
    assert.match(g.now[1].titlePt, /10 km/);
  });

  test("avisa sobre excesso de atividades soltas sem chamá-las de treino principal", () => {
    const a = buildCoachAlerts({ ...base, casualSessionsLast7d: 4 });
    assert.ok(a.some((x) => x.id === "coach_casual_volume"));
  });

  test("sem dados pede a primeira marca", () => {
    const a = buildCoachAlerts({
      ...base,
      onTrack: { ...base.onTrack, status: "awaiting_data" },
    });
    assert.equal(a[0].id, "coach_ontrack_waiting");
  });
});
