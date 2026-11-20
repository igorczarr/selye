import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  classifyImportedOrFreeActivity,
  classifyExternalActivityBatch,
  getActivityClassPresentation,
} from "./activity-classifier";

describe("Phase 6 - Activity Classifier (Casual vs Serious vs Complementary)", () => {
  test("Atleta de musculação registrando corrida avulsa classifica automaticamente como atividade solta (casual)", () => {
    const res = classifyImportedOrFreeActivity({
      activityModalityCode: "running",
      athleteProfile: {
        primaryModality: "strength",
        complementaryModalities: [],
      },
      explicitClass: "auto",
    });

    assert.equal(res.activityClass, "casual");
    assert.equal(res.countsTowardPrimaryKpis, false);
    assert.equal(res.countsTowardSystemicLoadAndEa, true);
    assert.equal(res.countsTowardConsistencyStreak, true);
    assert.equal(res.presentation.badgePt, "Solta");
    assert.equal(res.wasExplicitOverride, false);
  });

  test("Corredor importando musculação complementar classifica como complementary e corrida como serious", () => {
    const batch = classifyExternalActivityBatch({
      activities: [
        { modalityCode: "running", localDate: "2026-11-18" },
        { modalityCode: "strength", localDate: "2026-11-19" },
        { modalityCode: "cycling", localDate: "2026-11-20" },
      ],
      athleteProfile: {
        primaryModality: "running",
        complementaryModalities: ["strength"],
      },
      plannedDatesSet: new Set(["2026-11-19"]),
    });

    assert.equal(batch[0].classification.activityClass, "serious");
    assert.equal(batch[0].classification.countsTowardPrimaryKpis, true);
    assert.equal(batch[1].classification.activityClass, "complementary");
    assert.equal(batch[1].classification.countsTowardPrimaryKpis, false);
    assert.equal(batch[2].classification.activityClass, "casual");
    assert.equal(batch[2].classification.countsTowardSystemicLoadAndEa, true);
  });

  test("Usuário pode forçar explicitamente 'casual' mesmo em atividade da modalidade principal (ex: trote regenerativo solto)", () => {
    const res = classifyImportedOrFreeActivity({
      activityModalityCode: "running",
      athleteProfile: {
        primaryModality: "running",
        complementaryModalities: ["strength"],
      },
      explicitClass: "casual",
    });

    assert.equal(res.activityClass, "casual");
    assert.equal(res.countsTowardPrimaryKpis, false);
    assert.equal(res.wasExplicitOverride, true);
  });

  test("Usuário pode forçar explicitamente 'complementary' mesmo quando outra modalidade está selecionada", () => {
    const res = classifyImportedOrFreeActivity({
      activityModalityCode: "calisthenics",
      athleteProfile: {
        primaryModality: "martial_arts",
        complementaryModalities: ["strength"],
      },
      explicitClass: "complementary",
    });

    assert.equal(res.activityClass, "complementary");
    assert.equal(res.presentation.badgePt, "Suporte");
    assert.equal(res.wasExplicitOverride, true);
  });

  test("getActivityClassPresentation devolve metadados corretos para os 3 tipos", () => {
    assert.equal(getActivityClassPresentation("serious").badgePt, "Modalidade");
    assert.equal(
      getActivityClassPresentation("complementary").badgePt,
      "Suporte"
    );
    assert.equal(getActivityClassPresentation("casual").badgePt, "Solta");
    assert.equal(getActivityClassPresentation(null).badgePt, "Solta");
  });
});
