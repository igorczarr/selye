import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  classifyExerciseCategory,
  getExerciseCategoryMeta,
  EXERCISE_CATEGORIES,
} from "./exercise-categories";

describe("Phase 10 - Exercise Categorization Engine", () => {
  test("Classifica corretamente movimentos de Pernas & Glúteos", () => {
    assert.equal(
      classifyExerciseCategory({
        namePt: "Agachamento Livre com Barra",
        secondaryMuscles: ["quadriceps", "glutes"],
      }),
      "pernas"
    );

    assert.equal(
      classifyExerciseCategory({
        namePt: "Levantamento Terra Romeno (RDL)",
        secondaryMuscles: ["hamstrings", "glutes"],
      }),
      "pernas"
    );
  });

  test("Classifica corretamente movimentos de Potência & Pliometria", () => {
    assert.equal(
      classifyExerciseCategory({
        namePt: "Salto na Caixa (Box Jump)",
        secondaryMuscles: ["quadriceps"],
      }),
      "pliometria"
    );

    assert.equal(
      classifyExerciseCategory({
        namePt: "Hang Power Clean",
        secondaryMuscles: ["hamstrings"],
      }),
      "pliometria"
    );
  });

  test("Classifica corretamente movimentos de Vôlei de Praia & Areia", () => {
    assert.equal(
      classifyExerciseCategory({
        namePt: "Salto de Bloqueio e Transição na Areia",
        modalityCode: "beach_volleyball",
      }),
      "areia"
    );
  });

  test("Classifica Peito, Costas, Ombros, Braços e Core sem sobreposição indevida", () => {
    assert.equal(
      classifyExerciseCategory({
        namePt: "Supino Reto com Halteres",
        secondaryMuscles: ["chest"],
      }),
      "peito"
    );

    assert.equal(
      classifyExerciseCategory({
        namePt: "Remada Curvada Pronada",
        secondaryMuscles: ["lats"],
      }),
      "costas"
    );

    assert.equal(
      classifyExerciseCategory({
        namePt: "Desenvolvimento Militar com Barra",
        secondaryMuscles: ["shoulders"],
      }),
      "ombros"
    );

    assert.equal(
      classifyExerciseCategory({
        namePt: "Rosca Direta com Barra EZ",
        secondaryMuscles: ["biceps"],
      }),
      "bracos"
    );

    assert.equal(
      classifyExerciseCategory({
        namePt: "Pallof Press Anti-Rotação",
        secondaryMuscles: ["abdominals"],
      }),
      "core"
    );
  });

  test("Retorna metadados completos em PT-BR para qualquer exercício", () => {
    const meta = getExerciseCategoryMeta({
      namePt: "Supino Inclinado",
      secondaryMuscles: ["chest"],
    });
    assert.equal(meta.id, "peito");
    assert.equal(meta.label, "Peito");
    assert.ok(EXERCISE_CATEGORIES.length >= 8);
  });
});
