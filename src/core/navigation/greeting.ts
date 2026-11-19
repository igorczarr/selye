/**
 * SELYE — Saudação Contextual do Header (Fase 2)
 * Determina a saudação adequada pelo horário local e formata o primeiro nome do atleta.
 */

export type DayPeriod = "morning" | "afternoon" | "evening";

export interface GreetingResult {
  period: DayPeriod;
  salutation: "Bom dia" | "Boa tarde" | "Boa noite";
  firstName: string;
  fullGreeting: string;
}

export function getDayPeriodFromHour(hour: number): DayPeriod {
  const normalized = ((Math.trunc(hour) % 24) + 24) % 24;
  if (normalized >= 5 && normalized < 12) {
    return "morning";
  }
  if (normalized >= 12 && normalized < 18) {
    return "afternoon";
  }
  return "evening";
}

export function extractFirstName(
  rawName?: string | null,
  fallback: string = "Atleta"
): string {
  if (!rawName || !rawName.trim()) {
    return fallback;
  }
  const clean = rawName.trim().split(/\s+/)[0];
  if (!clean) return fallback;
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

export function buildContextualGreeting(options?: {
  name?: string | null;
  hour?: number;
  now?: Date;
}): GreetingResult {
  const hour =
    typeof options?.hour === "number"
      ? options.hour
      : (options?.now ?? new Date()).getHours();

  const period = getDayPeriodFromHour(hour);
  const salutation =
    period === "morning"
      ? "Bom dia"
      : period === "afternoon"
        ? "Boa tarde"
        : "Boa noite";

  const firstName = extractFirstName(options?.name, "Atleta");

  return {
    period,
    salutation,
    firstName,
    fullGreeting: `${salutation}, ${firstName}`,
  };
}
