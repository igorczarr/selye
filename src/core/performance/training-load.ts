/**
 * Motor de Gestão de Carga Esportiva & Analytics Avançados (§17 do Briefing)
 * Implementa metodologia científica validada: Foster (sRPE) e Gabbett (ACWR - Acute:Chronic Workload Ratio)
 */

export interface DailyWorkoutLoad {
  date: string; // YYYY-MM-DD
  durationMinutes: number;
  rpe: number; // Escala 1 a 10 (Foster)
  modalityCode?: string;
  volumeKg?: number;
}

export type ACWRStatus = "under_training" | "sweet_spot" | "elevated_risk" | "danger_zone";

export interface ACWRResult {
  acuteLoad: number; // Média diária dos últimos 7 dias
  chronicLoad: number; // Média diária dos últimos 28 dias
  acwr: number; // Razão Aguda:Crônica (Acute / Chronic)
  status: ACWRStatus;
  statusLabel: string;
  sweetSpotMin: number;
  sweetSpotMax: number;
  weeklyLoadTotal: number;
  monotony: number; // Média / Desvio Padrão (risco de falta de variação)
  strain: number; // Carga Semanal × Monotonia
}

/**
 * Calcula a Carga Interna de uma Sessão (Session RPE - Foster)
 */
export function calculateSessionLoad(durationMinutes: number, rpe: number): number {
  const safeDuration = Math.max(0, durationMinutes);
  const safeRpe = Math.min(10, Math.max(1, rpe));
  return Math.round(safeDuration * safeRpe);
}

/**
 * Agrupa cargas por dia no fuso horário do atleta
 */
export function aggregateDailyLoads(
  sessions: { date: string; durationMinutes: number; rpe: number }[]
): Map<string, number> {
  const daily = new Map<string, number>();

  for (const s of sessions) {
    const load = calculateSessionLoad(s.durationMinutes, s.rpe);
    const current = daily.get(s.date) || 0;
    daily.set(s.date, current + load);
  }

  return daily;
}

/**
 * Calcula a Razão de Carga de Treinamento Aguda:Crônica (ACWR) para uma data de referência
 */
export function calculateACWR(
  dailyLoads: Map<string, number>,
  referenceDateStr?: string
): ACWRResult {
  const refDate = referenceDateStr ? new Date(referenceDateStr) : new Date();

  // 1. Janela Aguda: Últimos 7 dias (d-6 até d-0)
  const acuteLoads: number[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(refDate);
    d.setDate(refDate.getDate() - i);
    const dateKey = d.toISOString().split("T")[0];
    acuteLoads.push(dailyLoads.get(dateKey) || 0);
  }

  // 2. Janela Crônica: Últimos 28 dias (d-27 até d-0)
  const chronicLoads: number[] = [];
  for (let i = 0; i < 28; i++) {
    const d = new Date(refDate);
    d.setDate(refDate.getDate() - i);
    const dateKey = d.toISOString().split("T")[0];
    chronicLoads.push(dailyLoads.get(dateKey) || 0);
  }

  const acuteSum = acuteLoads.reduce((a, b) => a + b, 0);
  const acuteMean = acuteSum / 7;

  const chronicSum = chronicLoads.reduce((a, b) => a + b, 0);
  const chronicMean = chronicSum / 28;

  // Evita divisão por zero se o atleta está iniciando
  const effectiveChronicMean = chronicMean === 0 ? Math.max(acuteMean, 1) : chronicMean;
  const rawAcwr = acuteMean / effectiveChronicMean;
  const acwr = Math.round(rawAcwr * 100) / 100;

  // 3. Monotonia dos 7 dias: Média / Desvio Padrão
  const variance =
    acuteLoads.reduce((acc, val) => acc + Math.pow(val - acuteMean, 2), 0) / 7;
  const stdDev = Math.sqrt(variance);
  const rawMonotony = stdDev === 0 ? 1 : acuteMean / stdDev;
  const monotony = Math.round(Math.min(5, rawMonotony) * 100) / 100;

  // 4. Tensão (Strain): Carga Total Semanal × Monotonia
  const strain = Math.round(acuteSum * monotony);

  // 5. Categorização baseada na literatura esportiva (Gabbett Sweet Spot: 0.8 a 1.3)
  let status: ACWRStatus = "sweet_spot";
  let statusLabel = "Zona Ótima (Sweet Spot)";

  if (acwr < 0.8) {
    status = "under_training";
    statusLabel = "Sub-treinamento / Carga Decrescente";
  } else if (acwr > 1.5) {
    status = "danger_zone";
    statusLabel = "Zona de Risco de Sobrecarga (Pico Agudo)";
  } else if (acwr > 1.3) {
    status = "elevated_risk";
    statusLabel = "Carga Acelerada (Atenção à Recuperação)";
  }

  return {
    acuteLoad: Math.round(acuteMean),
    chronicLoad: Math.round(chronicMean),
    acwr,
    status,
    statusLabel,
    sweetSpotMin: 0.8,
    sweetSpotMax: 1.3,
    weeklyLoadTotal: acuteSum,
    monotony,
    strain,
  };
}