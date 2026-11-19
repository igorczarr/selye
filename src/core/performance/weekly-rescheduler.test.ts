import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  classifyRoutineFocus,
  analyzeWeeklyScheduleInterference,
  type SchedulableRoutine,
} from "./weekly-rescheduler";

describe("Phase 13 - Smart Weekly Rescheduler & Interference Detection Engine", () => {
  const sampleRoutines: SchedulableRoutine[] = [
    {
      id: "prog-mon-leg",
      title: "Dia 1 · Força Máxima de Membros Inferiores",
      modalityCode: "strength",
      dayOfWeek: 1, // Segunda
      exercises: [
        { namePt: "Agachamento Livre com Barra", secondaryMuscles: ["quadriceps"] },
        { namePt: "Levantamento Terra Romeno (RDL)", secondaryMuscles: ["hamstrings"] },
      ],
    },
    {
      id: "prog-tue-plyo",
      title: "Dia 2 · Pliometria Reativa e Salto Vertical",
      modalityCode: "strength",
      dayOfWeek: 2, // Terça
      exercises: [
        { namePt: "Box Jump (Salto na Caixa)", secondaryMuscles: ["quadriceps"] },
        { namePt: "Drop Jump + Salto Vertical Reativo", secondaryMuscles: ["calves"] },
      ],
    },
    {
      id: "prog-thu-upper",
      title: "Dia 3 · Superiores e Estabilidade Escapular",
      modalityCode: "strength",
      dayOfWeek: 4, // Quinta
      exercises: [
        { namePt: "Supino Reto com Barra", secondaryMuscles: ["chest"] },
        { namePt: "Remada Curvada Pronada", secondaryMuscles: ["lats"] },
        { namePt: "Desenvolvimento Militar", secondaryMuscles: ["shoulders"] },
      ],
    },
  ];

  test("Classifica corretamente o foco biomecânico das fichas (Força Inferior, Potência, Areia, Superiores)", () => {
    assert.equal(classifyRoutineFocus(sampleRoutines[0]), "lower_body_strength");
    assert.equal(classifyRoutineFocus(sampleRoutines[1]), "lower_body_power");
    assert.equal(classifyRoutineFocus(sampleRoutines[2]), "upper_body");
  });

  test("Propõe mover a ficha do dia quando o atleta registra um jogo de Futsal ou Vôlei de Praia no mesmo dia", () => {
    const proposals = analyzeWeeklyScheduleInterference({
      routines: sampleRoutines,
      recentActivities: [
        {
          id: "act-1",
          title: "Futsal Competitivo",
          modalityCode: "futsal",
          localDate: "2026-11-16", // Segunda
          jsDay: 1,
          durationMinutes: 60,
          rpe: 8,
          loadUa: 552,
        },
      ],
      todayDateStr: "2026-11-16",
      todayJsDay: 1,
      recoveryBudgetUsagePercent: 60,
    });

    const sameDayProp = proposals.find(
      (p) => p.conflictType === "same_day_free_activity"
    );
    assert.ok(sameDayProp, "Deve detectar conflito no mesmo dia após Futsal");
    assert.equal(sameDayProp?.actionType, "move_day");
    assert.equal(sameDayProp?.targetProgramId, "prog-mon-leg");
    assert.equal(sameDayProp?.toJsDay, 3); // Quarta-feira está livre!
  });

  test("Detecta interferência entre dias consecutivos de perna pesada (Seg) e pliometria (Ter) propondo troca com Superiores", () => {
    const proposals = analyzeWeeklyScheduleInterference({
      routines: sampleRoutines,
      recentActivities: [],
      todayDateStr: "2026-11-16",
      todayJsDay: 1,
      recoveryBudgetUsagePercent: 40,
    });

    const swapProp = proposals.find((p) => p.actionType === "swap_days");
    assert.ok(
      swapProp,
      "Deve propor trocar Terça (Pliometria) com Quinta (Superiores)"
    );
    assert.equal(swapProp?.targetProgramId, "prog-tue-plyo");
    assert.equal(swapProp?.swapWithProgramId, "prog-thu-upper");
  });
});
