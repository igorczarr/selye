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
  distanceKm?: number;
}

export type ACWRStatus = "under_training" | "sweet_spot" | "elevated_risk" | "danger_zone";

export interface ModalityLoadBreakdown {
  modalityCode: string;
  labelPt: string;
  factor: number;
  sessionsCount: number;
  totalMinutes: number;
  totalLoadUa: number;
  sharePercent: number;
}

export interface RecoveryBudgetResult {
  weeklyBudgetTargetUa: number;
  weeklySpentUa: number;
  weeklyRemainingUa: number;
  usagePercent: number;
  budgetStatus: "fresh" | "balanced" | "near_limit" | "exceeded";
  budgetStatusLabel: string;
  guidancePt: string;
  modalitiesBreakdown: ModalityLoadBreakdown[];
}

export interface ModalityProfile {
  code: string;
  labelPt: string;
  /** Fator biomecânico/sistêmico sobre o sRPE base (Foster = 1.00) */
  systemicFactor: number;
}

export const MODALITY_LOAD_PROFILES: Record<string, ModalityProfile> = {
  strength: {
    code: "strength",
    labelPt: "Musculação & Força",
    systemicFactor: 1.0,
  },
  beach_volleyball: {
    code: "beach_volleyball",
    labelPt: "Vôlei de Praia & Areia",
    systemicFactor: 1.15,
  },
  footvolley: {
    code: "footvolley",
    labelPt: "Futevôlei & Areia",
    systemicFactor: 1.15,
  },
  beach_tennis: {
    code: "beach_tennis",
    labelPt: "Beach Tennis",
    systemicFactor: 1.08,
  },
  futsal: {
    code: "futsal",
    labelPt: "Futsal",
    systemicFactor: 1.15,
  },
  football: {
    code: "football",
    labelPt: "Futebol de Campo",
    systemicFactor: 1.12,
  },
  running: {
    code: "running",
    labelPt: "Corrida",
    systemicFactor: 1.12,
  },
  cycling: {
    code: "cycling",
    labelPt: "Ciclismo",
    systemicFactor: 0.95,
  },
  swimming: {
    code: "swimming",
    labelPt: "Natação",
    systemicFactor: 1.0,
  },
  combat: {
    code: "combat",
    labelPt: "Lutas & Artes Marciais",
    systemicFactor: 1.15,
  },
  martial_arts: {
    code: "martial_arts",
    labelPt: "Lutas & Jiu-Jitsu",
    systemicFactor: 1.15,
  },
  calisthenics: {
    code: "calisthenics",
    labelPt: "Calistenia",
    systemicFactor: 1.0,
  },
  functional: {
    code: "functional",
    labelPt: "Funcional & HIIT",
    systemicFactor: 1.05,
  },
  walking: {
    code: "walking",
    labelPt: "Caminhada & Mobilidade",
    systemicFactor: 0.75,
  },
  other: {
    code: "other",
    labelPt: "Esporte & Atividade Livre",
    systemicFactor: 1.0,
  },
};

export function getModalityProfile(modalityCode?: string | null): ModalityProfile {
  if (!modalityCode) return MODALITY_LOAD_PROFILES.strength;
  return (
    MODALITY_LOAD_PROFILES[modalityCode] || {
      code: modalityCode,
      labelPt: "Esporte & Atividade Livre",
      systemicFactor: 1.0,
    }
  );
}

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
 * Calcula a Carga Unificada Multimodal de qualquer sessão (Musculação, Areia, Corrida, Futsal, Pedal, etc.)
 * Combina o sRPE base (minutos × RPE) com o fator sistêmico da modalidade e bônus mecânico opcional
 * (tonelagem na musculação ou distância/ritmo no endurance), mantendo todas as atividades na mesma moeda (UA).
 */
export function calculateUnifiedSessionLoad(input: {
  durationMinutes: number;
  rpe: number;
  modalityCode?: string | null;
  volumeKg?: number | null;
  distanceKm?: number | null;
}): number {
  const baseLoad = calculateSessionLoad(input.durationMinutes, input.rpe);
  if (baseLoad === 0) return 0;

  const profile = getModalityProfile(input.modalityCode);
  let modalityLoad = baseLoad * profile.systemicFactor;

  // Bônus mecânico conservador (até +15%) quando há tonelagem significativa registrada na musculação
  if (input.volumeKg && input.volumeKg > 0) {
    const tonnageBonusRatio = Math.min(0.15, input.volumeKg / 80_000);
    modalityLoad *= 1 + tonnageBonusRatio;
  }

  // Bônus aeróbico conservador (até +15%) quando há distância registrada em corrida/ciclismo
  if (input.distanceKm && input.distanceKm > 0) {
    const distanceBonusRatio = Math.min(0.15, input.distanceKm / 50);
    modalityLoad *= 1 + distanceBonusRatio;
  }

  return Math.round(modalityLoad);
}

/**
 * Agrupa cargas por dia no fuso horário do atleta usando o motor multimodal unificado
 */
export function aggregateDailyLoads(
  sessions: {
    date: string;
    durationMinutes: number;
    rpe: number;
    modalityCode?: string | null;
    modality?: string | null;
    volumeKg?: number | null;
    distanceKm?: number | null;
  }[]
): Map<string, number> {
  const daily = new Map<string, number>();

  for (const s of sessions) {
    const modCode = s.modalityCode ?? s.modality;
    const hasModalityOrExtras =
      Boolean(modCode && modCode !== "strength") ||
      Boolean(s.volumeKg && s.volumeKg > 0) ||
      Boolean(s.distanceKm && s.distanceKm > 0);

    const load = hasModalityOrExtras
      ? calculateUnifiedSessionLoad({
          durationMinutes: s.durationMinutes,
          rpe: s.rpe,
          modalityCode: modCode,
          volumeKg: s.volumeKg,
          distanceKm: s.distanceKm,
        })
      : calculateSessionLoad(s.durationMinutes, s.rpe);

    const current = daily.get(s.date) || 0;
    daily.set(s.date, current + load);
  }

  return daily;
}

/**
 * Calcula o Orçamento de Recuperação Semanal ("Um corpo. Um orçamento de recuperação. Qualquer esporte.")
 * - Se o atleta já possui base crônica consolidada, o orçamento semanal seguro é `Math.max(metaBase, chronicDaily * 7 * 1.15)`.
 * - Caso esteja iniciando, dimensiona pela meta semanal (`targetDaysPerWeek × 350 UA`).
 */
export function calculateWeeklyRecoveryBudget(params: {
  sessionsLast7Days: {
    modalityCode?: string | null;
    durationMinutes: number;
    rpe: number;
    volumeKg?: number | null;
    distanceKm?: number | null;
  }[];
  chronicDailyLoadUa: number;
  targetDaysPerWeek: number;
}): RecoveryBudgetResult {
  const safeTargetDays = Math.max(2, Math.min(7, params.targetDaysPerWeek || 4));
  const baselineBudget = safeTargetDays * 350; // ~350 UA por sessão padrão (50 min × RPE 7)
  const chronicWeeklyCeiling =
    params.chronicDailyLoadUa > 0
      ? Math.round(params.chronicDailyLoadUa * 7 * 1.18)
      : 0;

  const weeklyBudgetTargetUa = Math.max(baselineBudget, chronicWeeklyCeiling);

  const byModality = new Map<
    string,
    {
      profile: ModalityProfile;
      sessionsCount: number;
      totalMinutes: number;
      totalLoadUa: number;
    }
  >();

  let weeklySpentUa = 0;

  for (const s of params.sessionsLast7Days) {
    const profile = getModalityProfile(s.modalityCode);
    const loadUa = calculateUnifiedSessionLoad({
      durationMinutes: s.durationMinutes,
      rpe: s.rpe,
      modalityCode: profile.code,
      volumeKg: s.volumeKg,
      distanceKm: s.distanceKm,
    });

    weeklySpentUa += loadUa;
    const existing = byModality.get(profile.code) || {
      profile,
      sessionsCount: 0,
      totalMinutes: 0,
      totalLoadUa: 0,
    };
    existing.sessionsCount += 1;
    existing.totalMinutes += Math.max(0, s.durationMinutes);
    existing.totalLoadUa += loadUa;
    byModality.set(profile.code, existing);
  }

  const weeklyRemainingUa = Math.max(0, weeklyBudgetTargetUa - weeklySpentUa);
  const usagePercent = Math.round(
    (weeklySpentUa / Math.max(1, weeklyBudgetTargetUa)) * 100
  );

  let budgetStatus: RecoveryBudgetResult["budgetStatus"] = "balanced";
  let budgetStatusLabel = "Orçamento Equilibrado";
  let guidancePt =
    "Seu gasto energético entre modalidades está dentro da reserva ideal da semana.";

  if (usagePercent < 40) {
    budgetStatus = "fresh";
    budgetStatusLabel = "Reserva Alta · Corpo Descansado";
    guidancePt =
      "Ampla margem no orçamento da semana para sessões de força intensa, potência ou jogo.";
  } else if (usagePercent > 105) {
    budgetStatus = "exceeded";
    budgetStatusLabel = "Orçamento Excedido · Regenerar";
    guidancePt =
      "A soma dos seus esportes nos últimos 7 dias ultrapassou o teto semanal. Priorize sono, mobilidade ou folga.";
  } else if (usagePercent >= 85) {
    budgetStatus = "near_limit";
    budgetStatusLabel = "Reserva Final · Dosar Intensidade";
    guidancePt =
      "Você já utilizou a maior parte do orçamento semanal. Se treinar hoje, controle o volume ou reduza o RPE.";
  }

  const modalitiesBreakdown: ModalityLoadBreakdown[] = Array.from(
    byModality.values()
  )
    .sort((a, b) => b.totalLoadUa - a.totalLoadUa)
    .map((item) => ({
      modalityCode: item.profile.code,
      labelPt: item.profile.labelPt,
      factor: item.profile.systemicFactor,
      sessionsCount: item.sessionsCount,
      totalMinutes: item.totalMinutes,
      totalLoadUa: item.totalLoadUa,
      sharePercent:
        weeklySpentUa > 0
          ? Math.round((item.totalLoadUa / weeklySpentUa) * 100)
          : 0,
    }));

  return {
    weeklyBudgetTargetUa,
    weeklySpentUa,
    weeklyRemainingUa,
    usagePercent,
    budgetStatus,
    budgetStatusLabel,
    guidancePt,
    modalitiesBreakdown,
  };
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

  // 5. Categorização de Tendência de Carga Contextual (Não-alarmista, baseada em 7d vs 28d)
  let status: ACWRStatus = "sweet_spot";
  let statusLabel = "Ritmo Estável · Zona Ideal";

  if (acuteSum === 0 && chronicSum === 0) {
    status = "under_training";
    statusLabel = "Início de Ciclo";
  } else if (acwr < 0.8) {
    status = "under_training";
    statusLabel = "Semana Leve · Recuperação";
  } else if (acwr > 1.5) {
    status = "danger_zone";
    statusLabel = "Pico de Esforço · Atenção";
  } else if (acwr > 1.3) {
    status = "elevated_risk";
    statusLabel = "Semana Forte · Progressão";
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