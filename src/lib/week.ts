/**
 * Utilitário único de semana do Selye (Padrão Brasileiro / ISO-8601: Segunda → Domingo).
 * Centraliza rótulos em PT-BR, conversão de Date.getDay() (0=Dom..6=Sáb) para índice
 * iniciado na segunda-feira (0=Seg..6=Dom) e ordenação cronológica de dias/fichas de treino.
 */

export interface WeekdayInfo {
  /** Índice ISO iniciado na segunda-feira (0 = Segunda .. 6 = Domingo) */
  mondayIndex: number;
  /** Índice nativo do JavaScript Date.getDay() (0 = Domingo .. 6 = Sábado) */
  jsDay: number;
  /** Abreviação em PT-BR (Seg, Ter, Qua, Qui, Sex, Sáb, Dom) */
  shortPt: string;
  /** Nome completo em PT-BR */
  fullPt: string;
}

export const WEEKDAYS_MONDAY_FIRST: readonly WeekdayInfo[] = [
  { mondayIndex: 0, jsDay: 1, shortPt: "Seg", fullPt: "Segunda-feira" },
  { mondayIndex: 1, jsDay: 2, shortPt: "Ter", fullPt: "Terça-feira" },
  { mondayIndex: 2, jsDay: 3, shortPt: "Qua", fullPt: "Quarta-feira" },
  { mondayIndex: 3, jsDay: 4, shortPt: "Qui", fullPt: "Quinta-feira" },
  { mondayIndex: 4, jsDay: 5, shortPt: "Sex", fullPt: "Sexta-feira" },
  { mondayIndex: 5, jsDay: 6, shortPt: "Sáb", fullPt: "Sábado" },
  { mondayIndex: 6, jsDay: 0, shortPt: "Dom", fullPt: "Domingo" },
] as const;

/**
 * Converte o dia da semana nativo JS (0=Dom..6=Sáb) para índice iniciado na Segunda (0=Seg..6=Dom).
 */
export function jsDayToMondayIndex(jsDay: number): number {
  const normalized = ((Math.trunc(jsDay) % 7) + 7) % 7;
  return (normalized + 6) % 7;
}

/**
 * Converte índice iniciado na Segunda (0=Seg..6=Dom) para o dia nativo JS (0=Dom..6=Sáb).
 */
export function mondayIndexToJsDay(mondayIndex: number): number {
  const normalized = ((Math.trunc(mondayIndex) % 7) + 7) % 7;
  return (normalized + 1) % 7;
}

/**
 * Retorna o rótulo em PT-BR (curto ou completo) para um Date ou número jsDay (0=Dom..6=Sáb).
 */
export function getWeekdayLabelPt(
  jsDayOrDate: number | Date,
  format: "short" | "full" = "short"
): string {
  const jsDay =
    jsDayOrDate instanceof Date ? jsDayOrDate.getDay() : jsDayOrDate;
  const idx = jsDayToMondayIndex(jsDay);
  const info = WEEKDAYS_MONDAY_FIRST[idx];
  return format === "full" ? info.fullPt : info.shortPt;
}

/**
 * Extrai a ordem sequencial explícita do título de um treino quando presente:
 * - "Dia 1 · ...", "Dia 02 - ..." -> 1, 2
 * - "Treino A", "Rotina B", "Ficha C" -> 1, 2, 3
 */
export function extractRoutineSequenceOrder(title: string): number | null {
  if (!title) return null;

  const dayMatch = title.match(/\b(?:dia|day)\s*0*(\d+)\b/i);
  if (dayMatch?.[1]) {
    return Number.parseInt(dayMatch[1], 10);
  }

  const letterMatch = title.match(/\b(?:treino|rotina|ficha)\s+([A-F])\b/i);
  if (letterMatch?.[1]) {
    return letterMatch[1].toUpperCase().charCodeAt(0) - 64;
  }

  return null;
}

export interface SortableRoutineLike {
  title: string;
  createdAt?: Date | string | null;
  dayOfWeek?: number | null;
  orderIndex?: number | null;
  templates?: {
    dayOfWeek?: number | null;
    orderIndex?: number | null;
  }[];
}

/**
 * Ordena rotinas/dias de treino na ordem progressiva correta (Dia 1 → Dia 2 → ... e Seg → Dom),
 * corrigindo a inversão onde o último treino cadastrado aparecia primeiro.
 */
export function sortRoutinesChronologically<T extends SortableRoutineLike>(
  routines: readonly T[]
): T[] {
  return [...routines].sort((a, b) => {
    // 1. Sequência numérica/alfabética explícita no título ("Dia 1", "Dia 2", "Treino A", "Treino B")
    const seqA = extractRoutineSequenceOrder(a.title);
    const seqB = extractRoutineSequenceOrder(b.title);
    if (seqA !== null && seqB !== null && seqA !== seqB) {
      return seqA - seqB;
    }
    if (seqA !== null && seqB === null) return -1;
    if (seqA === null && seqB !== null) return 1;

    // 2. Dia da semana (Seg = 0 .. Dom = 6) do próprio item ou do primeiro template
    const dayA = a.dayOfWeek ?? a.templates?.[0]?.dayOfWeek ?? null;
    const dayB = b.dayOfWeek ?? b.templates?.[0]?.dayOfWeek ?? null;
    if (
      typeof dayA === "number" &&
      typeof dayB === "number" &&
      dayA !== dayB
    ) {
      return jsDayToMondayIndex(dayA) - jsDayToMondayIndex(dayB);
    }

    // 3. orderIndex crescente
    const ordA = a.orderIndex ?? a.templates?.[0]?.orderIndex ?? null;
    const ordB = b.orderIndex ?? b.templates?.[0]?.orderIndex ?? null;
    if (
      typeof ordA === "number" &&
      typeof ordB === "number" &&
      ordA !== ordB
    ) {
      return ordA - ordB;
    }

    // 4. Ordem cronológica de criação crescente (mais antigo primeiro: A antes de B)
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (timeA !== timeB) {
      return timeA - timeB;
    }

    return a.title.localeCompare(b.title, "pt-BR");
  });
}
