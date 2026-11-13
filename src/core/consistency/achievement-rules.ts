/**
 * Regras de Conquistas Esportivas e Gamificação Saudável (§13 e §15)
 * Desbloqueio transparente de marcos sem recompensas viciosas ou foco cosmético tóxico.
 */

export interface UserMetricsSnapshot {
  completedWorkoutsCount: number;
  currentWeeklyStreak: number;
  distinctFavoriteSportsCount: number;
  activeTeamsCount: number;
  hasPersonalRecord: boolean;
}

export function determineUnlockedAchievements(
  snapshot: UserMetricsSnapshot,
  alreadyUnlockedCodes: string[]
): string[] {
  const newUnlocks: string[] = [];
  const current = new Set(alreadyUnlockedCodes);

  if (!current.has("first_workout") && snapshot.completedWorkoutsCount >= 1) {
    newUnlocks.push("first_workout");
  }

  if (!current.has("streak_week_3") && snapshot.currentWeeklyStreak >= 3) {
    newUnlocks.push("streak_week_3");
  }

  if (!current.has("streak_week_10") && snapshot.currentWeeklyStreak >= 10) {
    newUnlocks.push("streak_week_10");
  }

  if (!current.has("multimodal_athlete") && snapshot.distinctFavoriteSportsCount >= 2) {
    newUnlocks.push("multimodal_athlete");
  }

  if (!current.has("team_belonging") && snapshot.activeTeamsCount >= 1) {
    newUnlocks.push("team_belonging");
  }

  if (!current.has("pr_achiever") && snapshot.hasPersonalRecord) {
    newUnlocks.push("pr_achiever");
  }

  return newUnlocks;
}