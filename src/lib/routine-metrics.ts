/**
 * SELYE — Estimativa de duração e volume de prescrição de fichas (Fase 5).
 */

export interface PrescriptionLike {
  targetSets?: number | null;
  restSeconds?: number | null;
}

/**
 * Estima a duração total em minutos de uma ficha com base em:
 * - 45s médios de execução por série + intervalo de descanso prescrito (padrão 90s)
 * - 60s de transição entre exercícios
 * Mínimo de 10 minutos quando há pelo menos 1 exercício.
 */
export function estimateRoutineDurationMinutes(
  prescriptions: readonly PrescriptionLike[]
): number {
  if (!prescriptions || prescriptions.length === 0) return 0;

  let totalSeconds = 0;
  for (const p of prescriptions) {
    const sets = Math.max(1, p.targetSets ?? 3);
    const rest = Math.max(15, p.restSeconds ?? 90);
    // Execução de todas as séries + descanso entre elas + transição para o próximo movimento
    totalSeconds += sets * 45 + Math.max(0, sets - 1) * rest + 60;
  }

  return Math.max(10, Math.round(totalSeconds / 60));
}

export function countTotalSets(
  prescriptions: readonly PrescriptionLike[]
): number {
  return prescriptions.reduce(
    (sum, p) => sum + Math.max(1, p.targetSets ?? 3),
    0
  );
}
