import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  determineUnlockedAchievements,
  type UserMetricsSnapshot,
} from "./achievement-rules";

describe("Phase 2 - Achievement Rules (§13 e §15)", () => {
  test("Desbloqueia primeiro treino ao completar 1 sessão", () => {
    const snapshot: UserMetricsSnapshot = {
      completedWorkoutsCount: 1,
      currentWeeklyStreak: 0,
      distinctFavoriteSportsCount: 1,
      activeTeamsCount: 0,
      hasPersonalRecord: false,
    };

    const unlocks = determineUnlockedAchievements(snapshot, []);
    assert.deepEqual(unlocks, ["first_workout"]);
  });

  test("Não duplica conquistas já desbloqueadas anteriormente", () => {
    const snapshot: UserMetricsSnapshot = {
      completedWorkoutsCount: 5,
      currentWeeklyStreak: 4,
      distinctFavoriteSportsCount: 1,
      activeTeamsCount: 0,
      hasPersonalRecord: false,
    };

    const unlocks = determineUnlockedAchievements(snapshot, ["first_workout", "streak_week_3"]);
    assert.deepEqual(unlocks, []);
  });

  test("Desbloqueia Atleta Multimodal e Espírito de Equipe cumulativamente", () => {
    const snapshot: UserMetricsSnapshot = {
      completedWorkoutsCount: 3,
      currentWeeklyStreak: 2,
      distinctFavoriteSportsCount: 2,
      activeTeamsCount: 1,
      hasPersonalRecord: true,
    };

    const unlocks = determineUnlockedAchievements(snapshot, ["first_workout"]);
    assert.ok(unlocks.includes("multimodal_athlete"));
    assert.ok(unlocks.includes("team_belonging"));
    assert.ok(unlocks.includes("pr_achiever"));
    assert.equal(unlocks.includes("streak_week_3"), false);
  });

  test("Desbloqueia Construção de Hábito ao atingir 10 semanas de consistência", () => {
    const snapshot: UserMetricsSnapshot = {
      completedWorkoutsCount: 40,
      currentWeeklyStreak: 10,
      distinctFavoriteSportsCount: 1,
      activeTeamsCount: 0,
      hasPersonalRecord: false,
    };

    const unlocks = determineUnlockedAchievements(snapshot, ["first_workout", "streak_week_3"]);
    assert.deepEqual(unlocks, ["streak_week_10"]);
  });
});