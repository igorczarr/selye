/**
 * Utilitário de Data & Horário Local do Selye.
 * Garante que cálculos de dia corrente ("hoje"), recargas de EA e notificações matinais
 * utilizem sempre o fuso horário local correto (padrão America/Sao_Paulo), evitando que
 * após as 21h o UTC avance para o dia seguinte e recalibre a bateria prematuramente.
 */

export const DEFAULT_APP_TIMEZONE = "America/Sao_Paulo";

/**
 * Retorna a data no formato ISO YYYY-MM-DD respeitando o fuso local (ex: America/Sao_Paulo).
 */
export function getLocalTodayDateStr(
  date: Date = new Date(),
  timeZone: string = DEFAULT_APP_TIMEZONE
): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    return date.toISOString().split("T")[0];
  }
}

/**
 * Retorna a hora cheia (0..23) no fuso local.
 */
export function getLocalHour(
  date: Date = new Date(),
  timeZone: string = DEFAULT_APP_TIMEZONE
): number {
  try {
    const str = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      hourCycle: "h23",
    }).format(date);
    return Number(str) || 0;
  } catch {
    return date.getHours();
  }
}

/**
 * Retorna o dia da semana nativo JS (0 = Domingo .. 6 = Sábado) no fuso local.
 */
export function getLocalJsDay(
  date: Date = new Date(),
  timeZone: string = DEFAULT_APP_TIMEZONE
): number {
  try {
    const weekdayStr = new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
    }).format(date);
    const map: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };
    return map[weekdayStr] ?? date.getDay();
  } catch {
    return date.getDay();
  }
}
