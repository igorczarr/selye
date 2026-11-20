import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  analyzeRoutineEffect,
  analyzeWeeklyRoutineGaps,
  type AnalyzableRoutine,
} from "./index";

describe("Phase 4 - Routine ↔ Goal Effect Analyzer & Weekly Gap Radar", () => {
  it("traduz ficha de força pesada de pernas + core como alta transferência para Corrida", () => {
    const routine: AnalyzableRoutine = {
      title: "Fortalecimento Corrida A",
      modalityCode: "strength",
      prescriptions: [
        { exerciseNamePt: "Agachamento Livre", targetSets: 4, targetReps: "5-6", restSeconds: 150, setType: "effective" },
        { exerciseNamePt: "Levantamento Terra Romeno (RDL)", targetSets: 3, targetReps: "6", restSeconds: 120, setType: "effective" },
        { exerciseNamePt: "Panturrilha em Pé", targetSets: 3, targetReps: "8", restSeconds: 90, setType: "effective" },
        { exerciseNamePt: "Prancha Abdominal", targetSets: 3, targetReps: "45", restSeconds: 60, setType: "effective" },
      ],
    };

    const res = analyzeRoutineEffect({
      routine,
      athletePrimaryModality: "running",
      experienceLevel: "intermediate",
    });

    assert.equal(res.alignmentTier, "high");
    assert.ok(res.snapshot.primaryCapacity === "maximal_strength" || res.snapshot.secondaryCapacities.includes("running_economy"));
    assert.equal(res.snapshot.muscleCategorySets.pernas, 10);
    assert.equal(res.snapshot.muscleCategorySets.core, 3);
    assert.ok(res.snapshot.estimatedLoadUa > 0);
  });

  it("emite alerta de volume excessivo quando corredor cria ficha de pernas estilo bodybuilding (18+ séries em 12 reps)", () => {
    const heavyVolumeLegs: AnalyzableRoutine = {
      title: "Leg Day Exaustão",
      modalityCode: "strength",
      prescriptions: [
        { exerciseNamePt: "Agachamento Livre", targetSets: 5, targetReps: "12", restSeconds: 90 },
        { exerciseNamePt: "Leg Press 45", targetSets: 5, targetReps: "12-15", restSeconds: 90 },
        { exerciseNamePt: "Cadeira Extensora", targetSets: 4, targetReps: "15", restSeconds: 60 },
        { exerciseNamePt: "Cadeira Flexora", targetSets: 4, targetReps: "12", restSeconds: 60 },
      ],
    };

    const res = analyzeRoutineEffect({
      routine: heavyVolumeLegs,
      athletePrimaryModality: "running",
    });

    assert.equal(res.alignmentTier, "caution_overload");
    assert.ok(res.alignmentExplanationPt.includes("DOMS"));
  });

  it("detecta lacunas específicas no Vôlei de Praia (falta de potência/pliometria e blindagem de ombro)", () => {
    const routines: AnalyzableRoutine[] = [
      {
        title: "Pernas Base",
        modalityCode: "strength",
        prescriptions: [
          { exerciseNamePt: "Agachamento Búlgaro", targetSets: 4, targetReps: "6" },
          { exerciseNamePt: "Leg Press", targetSets: 4, targetReps: "8" },
        ],
      },
    ];

    const coverage = analyzeWeeklyRoutineGaps({
      routines,
      athletePrimaryModality: "beach_volleyball",
      experienceLevel: "intermediate",
    });

    assert.ok(coverage.gaps.some((g) => g.code === "bv_missing_power"));
    assert.ok(coverage.gaps.some((g) => g.code === "bv_missing_shoulder"));
    assert.ok(coverage.coverageScorePercent < 60);
  });

  it("reconhece cobertura completa em Futebol quando há Nordic Hamstring + pernas + core", () => {
    const routines: AnalyzableRoutine[] = [
      {
        title: "Força & Pré-Hab MD-3",
        modalityCode: "strength",
        prescriptions: [
          { exerciseNamePt: "Agachamento Búlgaro", targetSets: 4, targetReps: "6" },
          { exerciseNamePt: "Flexão Nórdica (Nordic Hamstring)", targetSets: 3, targetReps: "6" },
          { exerciseNamePt: "Prancha Lateral Copenhagen", targetSets: 3, targetReps: "30" },
        ],
      },
    ];

    const coverage = analyzeWeeklyRoutineGaps({
      routines,
      athletePrimaryModality: "football",
      experienceLevel: "intermediate",
    });

    assert.equal(coverage.coverageScorePercent, 100);
    assert.equal(coverage.gaps.length, 0);
  });
});
