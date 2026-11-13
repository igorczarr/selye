import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  isDuplicateActivity,
  type ExistingActivity,
  type IncomingExternalActivity,
} from "./dedupe";

describe("Phase 3 - External Activity Deduplication Engine (§16.2)", () => {
  const existingActivities: ExistingActivity[] = [
    {
      id: "act-1",
      externalActivityId: "strava-998877",
      source: "strava",
      startedAt: "2026-11-13T07:00:00Z",
      durationMinutes: 45,
      sportCode: "running",
    },
    {
      id: "act-2",
      externalActivityId: null,
      source: "app_workout",
      startedAt: "2026-11-12T18:30:00Z",
      durationMinutes: 60,
      sportCode: "strength",
    },
  ];

  test("Identifica duplicata exata pela chave externa (Strava id)", () => {
    const incoming: IncomingExternalActivity = {
      externalActivityId: "strava-998877",
      source: "strava",
      startedAt: "2026-11-13T07:00:00Z",
      durationMinutes: 45,
      sportCode: "running",
    };

    const result = isDuplicateActivity(incoming, existingActivities);
    assert.equal(result.isDuplicate, true);
    assert.equal(result.matchedExistingId, "act-1");
  });

  test("Identifica concorrência de Apple Health sincronizando a mesma corrida gravada no Strava", () => {
    // Apple Health enviando 5 minutos de offset para a mesma corrida matinal
    const incomingFromAppleHealth: IncomingExternalActivity = {
      externalActivityId: "apple-health-xyz-123",
      source: "apple_health",
      startedAt: "2026-11-13T07:04:00Z",
      durationMinutes: 44,
      sportCode: "running",
    };

    const result = isDuplicateActivity(incomingFromAppleHealth, existingActivities);
    assert.equal(result.isDuplicate, true);
    assert.equal(result.matchedExistingId, "act-1");
    assert.ok(result.reason?.includes("Apple Health") || result.reason?.includes("strava"));
  });

  test("Permite atividade legítima em horário diferente", () => {
    const eveningRun: IncomingExternalActivity = {
      externalActivityId: "strava-evening-4455",
      source: "strava",
      startedAt: "2026-11-13T19:00:00Z",
      durationMinutes: 30,
      sportCode: "running",
    };

    const result = isDuplicateActivity(eveningRun, existingActivities);
    assert.equal(result.isDuplicate, false);
  });
});