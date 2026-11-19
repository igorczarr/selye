/**
 * SELYE Streak & Consistency Engine
 * Conforme Briefing §13 e §28 (Teste crítico 5: fuso horário e virada de meia-noite)
 * Regra: O streak semanal é a métrica principal (evita incentivar overtraining).
 */

export interface ActivityRecord {
  id: string;
  localDate: string; // YYYY-MM-DD no fuso do usuário
  countsForStreak: boolean;
}

export interface StreakResult {
  currentDailyStreak: number;
  bestDailyStreak: number;
  currentWeeklyStreak: number;
  bestWeeklyStreak: number;
  activeDaysCount: number;
  weeklyAdherenceRate: number; // 0 a 100%
}

/** Retorna a segunda-feira da semana de uma data YYYY-MM-DD */
export function getIsoWeekStart(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00Z");
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1); // ajusta para segunda-feira
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff));
  return monday.toISOString().split("T")[0];
}

/** Calcula dias consecutivos a partir de um conjunto de datas YYYY-MM-DD */
export function calculateDailyStreak(uniqueDatesSortedDesc: string[], todayLocalDate: string): { current: number; best: number } {
  if (uniqueDatesSortedDesc.length === 0) {
    return { current: 0, best: 0 };
  }

  const dateSet = new Set(uniqueDatesSortedDesc);

  // Verifica se o usuário treinou hoje ou ontem para manter o streak ativo
  let checkDate = new Date(todayLocalDate + "T12:00:00Z");
  const todayStr = checkDate.toISOString().split("T")[0];

  checkDate.setUTCDate(checkDate.getUTCDate() - 1);
  const yesterdayStr = checkDate.toISOString().split("T")[0];

  let current = 0;
  let cursor = dateSet.has(todayStr) ? new Date(todayStr + "T12:00:00Z") : (dateSet.has(yesterdayStr) ? new Date(yesterdayStr + "T12:00:00Z") : null);

  if (cursor) {
    while (true) {
      const dStr = cursor.toISOString().split("T")[0];
      if (dateSet.has(dStr)) {
        current++;
        cursor.setUTCDate(cursor.getUTCDate() - 1);
      } else {
        break;
      }
    }
  }

  // Melhor streak histórico
  let best = 0;
  let running = 0;
  let prevDate: Date | null = null;

  // Percorre da data mais antiga para a mais recente
  const sortedAsc = [...uniqueDatesSortedDesc].sort();
  for (const dStr of sortedAsc) {
    const cur = new Date(dStr + "T12:00:00Z");
    if (!prevDate) {
      running = 1;
    } else {
      const diffDays = Math.round((cur.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        running++;
      } else if (diffDays > 1) {
        running = 1;
      }
    }
    if (running > best) best = running;
    prevDate = cur;
  }

  return { current, best: Math.max(best, current) };
}

/** Calcula semanas consecutivas cumprindo a meta de frequência semanal ou protegidas por Semana Regenerativa (§13.2 & Fase 14) */
export function calculateWeeklyStreak(
  uniqueDates: string[],
  targetDaysPerWeek: number,
  todayLocalDate: string,
  shieldedWeekStarts: string[] = []
): { current: number; best: number; weeklyBreakdown: Record<string, number> } {
  const weeksMap: Record<string, number> = {};
  const shieldedSet = new Set(shieldedWeekStarts.map((d) => getIsoWeekStart(d)));

  for (const d of uniqueDates) {
    const weekStart = getIsoWeekStart(d);
    weeksMap[weekStart] = (weeksMap[weekStart] || 0) + 1;
  }
  for (const sw of shieldedSet) {
    if (!(sw in weeksMap)) {
      weeksMap[sw] = 0;
    }
  }

  const currentWeekStart = getIsoWeekStart(todayLocalDate);
  const sortedWeeks = Object.keys(weeksMap).sort();

  let best = 0;
  let running = 0;

  for (const w of sortedWeeks) {
    const daysInWeek = weeksMap[w];
    const isShielded = shieldedSet.has(w);
    if (daysInWeek >= targetDaysPerWeek || isShielded) {
      running++;
      if (running > best) best = running;
    } else {
      running = 0;
    }
  }

  // Streak atual: retrocede a partir da semana atual ou anterior
  let currentStreak = 0;
  let cursorWeek = new Date(currentWeekStart + "T12:00:00Z");

  // Se na semana atual ainda não atingiu a meta, ela ainda está em aberto
  const currentWeekDays = weeksMap[currentWeekStart] || 0;
  if (
    currentWeekDays >= targetDaysPerWeek ||
    shieldedSet.has(currentWeekStart)
  ) {
    currentStreak++;
    cursorWeek.setUTCDate(cursorWeek.getUTCDate() - 7);
  } else {
    // Verifica a semana passada
    cursorWeek.setUTCDate(cursorWeek.getUTCDate() - 7);
  }

  while (true) {
    const wStr = cursorWeek.toISOString().split("T")[0];
    const days = weeksMap[wStr] || 0;
    if (days >= targetDaysPerWeek || shieldedSet.has(wStr)) {
      currentStreak++;
      cursorWeek.setUTCDate(cursorWeek.getUTCDate() - 7);
    } else {
      break;
    }
  }

  return {
    current: currentStreak,
    best: Math.max(best, currentStreak),
    weeklyBreakdown: weeksMap,
  };
}
