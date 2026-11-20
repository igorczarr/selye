/**
 * Selye — Fase 2: Calibrador Científico de Energia Adaptativa (EA) no Onboarding
 *
 * Fundamentação Acadêmica:
 * - Selye (1956): Energia Adaptativa (EA) como reserva finita compartilhada entre estressores.
 * - Banister et al. (1975) & Gabbett (2016): Base crônica recente (volume semanal sustentado
 *   nos últimos 3 meses + idade de treino) como âncora #1 do teto seguro de carga inicial.
 * - Walsh et al. (2021, BJSM Consensus): Duração e qualidade habitual do sono modulam a
 *   taxa diária de regeneração e tolerância à carga.
 * - McEwen (1998, NEJM) & Mann et al. (2016, JSCR, OR=1.78): Carga Alostática extra-treino
 *   (estresse psicossocial + demanda física ocupacional) drena a mesma reserva do eixo HPA.
 * - Buchheit (2014): FC de repouso matinal como proxy prático de condicionamento vagal/aeróbico.
 * - Fell & Williams (2008): Ajuste conservador de velocidade de recuperação por faixa etária.
 * - Kellmann et al. (2018): Proteção para retorno de pausa prolongada (>3 sem) ou lesão ativa.
 */

import type { CoreModalityCode, ExperienceLevel } from "../modalities/types";
import { MODALITY_REGISTRY } from "../modalities/registry";

export type RecentWeeklyHoursBand =
  | "under_2h"
  | "2_to_4h"
  | "4_to_7h"
  | "7_to_10h"
  | "over_10h";

export type TrainingAgeBand =
  | "under_3m"
  | "3_to_12m"
  | "1_to_3y"
  | "over_3y";

export type SleepDurationBand =
  | "under_6h"
  | "6_to_7h"
  | "7_to_8h"
  | "over_8h";

export type SleepQualityBand = "poor" | "fair" | "restorative";

export type LifeStressBand = "low" | "moderate" | "high" | "very_high";

export type OccupationalDemandBand =
  | "sedentary"
  | "active_standing"
  | "heavy_manual";

export type TissueStatusBand =
  | "fresh"
  | "normal_training"
  | "returning_detrained"
  | "injury_rehab";

export interface EaOnboardingInput {
  primaryModality: CoreModalityCode;
  complementaryModalities: CoreModalityCode[];
  experienceLevel: ExperienceLevel;
  trainingAge: TrainingAgeBand;
  recentWeeklyHours: RecentWeeklyHoursBand;
  targetDaysPerWeek: number; // 2..7
  preferredWorkoutDays: number[]; // 0..6 (jsDay)
  sleepDuration: SleepDurationBand;
  sleepQuality: SleepQualityBand;
  lifeStress: LifeStressBand;
  occupationalDemand: OccupationalDemandBand;
  tissueStatus: TissueStatusBand;
  /** Campos opcionais que elevam a precisão da estimativa inicial */
  ageYears?: number | null;
  bodyWeightKg?: number | null;
  restingHrBpm?: number | null;
}

export interface EaCalibrationFactorItem {
  code: string;
  labelPt: string;
  multiplier: number;
  deltaPercent: number;
  impact: "positive" | "neutral" | "protective";
  explanationPt: string;
  scientificRefId: string;
}

export interface EaOnboardingCalibrationResult {
  schemaVersion: "1.0";
  calibratedAt: string;
  /** Input persistido para re-calibração e auditoria */
  inputs: EaOnboardingInput;
  /** Capacidade Adaptativa Semanal Base calibrada (em EA) */
  calibratedCapacityEa: number;
  /** Prior da velocidade de recuperação individual (α_0, 0.72..1.25) */
  recoveryVelocityPrior: number;
  /** Prior da sensibilidade a hábitos regenerativos (β_0, 0.85..1.20) */
  recoveryGainPrior: number;
  /** Estimativa conservadora de confiança inicial do modelo (48%..84%) */
  initialConfidencePercent: number;
  /** Faixa de margem de erro transparente (±EA) devido à ausência de sensores laboratoriais */
  uncertaintyMarginEa: number;
  /** Classificação textual do perfil fisiológico inicial */
  readinessTierLabelPt: string;
  /** Resumo executivo explicando a calibração ao atleta */
  summaryPt: string;
  /** Decomposição explicável (XAI) fator a fator */
  factors: EaCalibrationFactorItem[];
  /** Recomendações imediatas de proteção/otimização baseadas no perfil */
  priorityRecommendationsPt: string[];
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function toDeltaPct(mult: number): number {
  return Math.round((mult - 1) * 100);
}

const CHRONIC_HOURS_BASE_EA: Record<RecentWeeklyHoursBand, number> = {
  under_2h: 920,
  "2_to_4h": 1340,
  "4_to_7h": 1760,
  "7_to_10h": 2220,
  over_10h: 2680,
};

const TRAINING_AGE_MULT: Record<TrainingAgeBand, number> = {
  under_3m: 0.88,
  "3_to_12m": 0.96,
  "1_to_3y": 1.04,
  over_3y: 1.11,
};

const EXPERIENCE_MULT: Record<ExperienceLevel, number> = {
  beginner: 0.92,
  intermediate: 1.0,
  advanced: 1.07,
  competitive: 1.13,
};

const SLEEP_DURATION_MULT: Record<SleepDurationBand, number> = {
  under_6h: 0.84,
  "6_to_7h": 0.93,
  "7_to_8h": 1.02,
  over_8h: 1.08,
};

const SLEEP_QUALITY_MULT: Record<SleepQualityBand, number> = {
  poor: 0.92,
  fair: 0.98,
  restorative: 1.04,
};

const LIFE_STRESS_MULT: Record<LifeStressBand, number> = {
  low: 1.04,
  moderate: 1.0,
  high: 0.91,
  very_high: 0.82,
};

const OCCUPATIONAL_MULT: Record<OccupationalDemandBand, number> = {
  sedentary: 1.0,
  active_standing: 0.96,
  heavy_manual: 0.88,
};

const TISSUE_STATUS_MULT: Record<TissueStatusBand, number> = {
  fresh: 1.02,
  normal_training: 1.0,
  returning_detrained: 0.84,
  injury_rehab: 0.78,
};

/**
 * Calibra a Reserva de Energia Adaptativa (EA) inicial do atleta de forma
 * cientificamente embasada, conservadora e totalmente explicável.
 */
export function calibrateInitialEaFromOnboarding(
  rawInput: EaOnboardingInput
): EaOnboardingCalibrationResult {
  const safeDays = clamp(Math.round(rawInput.targetDaysPerWeek || 4), 2, 7);
  const input: EaOnboardingInput = {
    ...rawInput,
    targetDaysPerWeek: safeDays,
    complementaryModalities: Array.from(
      new Set(
        (rawInput.complementaryModalities || []).filter(
          (c) => c !== rawInput.primaryModality
        )
      )
    ),
  };

  const factors: EaCalibrationFactorItem[] = [];
  const recommendations: string[] = [];

  // 1. Âncora Crônica (Volume Recente × Idade de Treino × Nível)
  const chronicAnchorEa = CHRONIC_HOURS_BASE_EA[input.recentWeeklyHours];
  const trainingAgeMult = TRAINING_AGE_MULT[input.trainingAge];
  const experienceMult = EXPERIENCE_MULT[input.experienceLevel];
  const chronicCompositeMult = trainingAgeMult * experienceMult;

  // Ajuste moderado pela meta de dias/semana, limitado para não saltar longe da base crônica (Gabbett, 2016)
  const daysDeltaMult = clamp(1 + (safeDays - 4) * 0.04, 0.9, 1.12);
  let capacityEa = chronicAnchorEa * chronicCompositeMult * daysDeltaMult;

  factors.push({
    code: "chronic_training_base",
    labelPt: "Base Crônica & Idade de Treino",
    multiplier: Math.round(chronicCompositeMult * 100) / 100,
    deltaPercent: toDeltaPct(chronicCompositeMult),
    impact:
      chronicCompositeMult >= 1.02
        ? "positive"
        : chronicCompositeMult <= 0.94
          ? "protective"
          : "neutral",
    explanationPt:
      "Ancora sua capacidade semanal no volume que seu corpo já sustenta nos últimos 3 meses, protegendo contra saltos bruscos de carga.",
    scientificRefId: "gabbett_2016",
  });

  // 2. Sono Habitual (Duração × Qualidade — Walsh et al., 2021)
  const sleepMult =
    SLEEP_DURATION_MULT[input.sleepDuration] *
    SLEEP_QUALITY_MULT[input.sleepQuality];
  capacityEa *= sleepMult;

  factors.push({
    code: "habitual_sleep",
    labelPt: "Arquitetura & Duração do Sono",
    multiplier: Math.round(sleepMult * 100) / 100,
    deltaPercent: toDeltaPct(sleepMult),
    impact:
      sleepMult >= 1.02
        ? "positive"
        : sleepMult <= 0.94
          ? "protective"
          : "neutral",
    explanationPt:
      sleepMult < 0.94
        ? "Sono abaixo de 7h ou fragmentado reduz a taxa diária de reparo neuromuscular e imunológico; a EA inicial foi calibrada com margem protetora."
        : "Sono regular sustenta síntese proteica, consolidação neural e alta taxa de recarga (+EA).",
    scientificRefId: "walsh_2021",
  });

  if (input.sleepDuration === "under_6h" || input.sleepQuality === "poor") {
    recommendations.push(
      "Prioridade #1 de EA: ganhar +45–60 min de sono ou melhorar regularidade noturna terá maior retorno sobre sua performance do que adicionar volume de treino (Walsh et al., 2021)."
    );
  }

  // 3. Carga Alostática Extra-Treino (Estresse Psicossocial + Demanda Ocupacional — McEwen, 1998; Mann et al., 2016)
  const allostaticMult =
    LIFE_STRESS_MULT[input.lifeStress] *
    OCCUPATIONAL_MULT[input.occupationalDemand];
  capacityEa *= allostaticMult;

  factors.push({
    code: "allostatic_load",
    labelPt: "Carga Alostática Extra-Treino",
    multiplier: Math.round(allostaticMult * 100) / 100,
    deltaPercent: toDeltaPct(allostaticMult),
    impact:
      allostaticMult >= 1.02
        ? "positive"
        : allostaticMult <= 0.94
          ? "protective"
          : "neutral",
    explanationPt:
      allostaticMult < 0.95
        ? "Estresse mental intenso e/ou rotina física pesada consomem a mesma reserva fisiológica (eixo HPA) dos seus treinos."
        : "Baixa carga alostática fora dos treinos libera maior fatia da sua EA para adaptação esportiva.",
    scientificRefId: input.lifeStress === "high" || input.lifeStress === "very_high" ? "mann_2016" : "mcewen_1998",
  });

  if (input.lifeStress === "high" || input.lifeStress === "very_high") {
    recommendations.push(
      "Como o estresse fora do treino está elevado, o Selye protegeu seu teto de EA: evite sessões até a falha absoluta em dias de alta pressão mental (Mann et al., 2016)."
    );
  }

  // 4. Estado Tecidual & Retorno (Kellmann et al., 2018)
  const tissueMult = TISSUE_STATUS_MULT[input.tissueStatus];
  capacityEa *= tissueMult;
  if (tissueMult !== 1.0) {
    factors.push({
      code: "tissue_status",
      labelPt: "Prontidão Tecidual & Retorno",
      multiplier: tissueMult,
      deltaPercent: toDeltaPct(tissueMult),
      impact: tissueMult > 1 ? "positive" : "protective",
      explanationPt:
        input.tissueStatus === "injury_rehab"
          ? "Modo protetor de retorno de lesão ativo: teto reduzido em 22% para progressão tecidual segura."
          : input.tissueStatus === "returning_detrained"
            ? "Retorno após pausa prolongada (>3 sem): rampa protetora inicial para readaptação de tendões e músculos."
            : "Sem restrições articulares ou dores limitantes no início do ciclo.",
      scientificRefId: "kellmann_2018",
    });
  }

  if (input.tissueStatus === "injury_rehab" || input.tissueStatus === "returning_detrained") {
    recommendations.push(
      "Mantenha progressão conservadora nas primeiras 3 semanas; conforme você registrar sessões sem dor, o motor adaptativo elevará sua EA automaticamente."
    );
  }

  // 5. Biometria & Autonômico (Opcionais — elevam precisão e ajustam recuperação)
  let optionalSignalsCount = 0;
  let ageRecoveryAdj = 1.0;

  if (typeof input.ageYears === "number" && input.ageYears >= 14 && input.ageYears <= 95) {
    optionalSignalsCount++;
    if (input.ageYears < 30) ageRecoveryAdj = 1.03;
    else if (input.ageYears < 40) ageRecoveryAdj = 1.0;
    else if (input.ageYears < 50) ageRecoveryAdj = 0.95;
    else if (input.ageYears < 60) ageRecoveryAdj = 0.9;
    else ageRecoveryAdj = 0.85;

    capacityEa *= ageRecoveryAdj;
    factors.push({
      code: "age_recovery_curve",
      labelPt: `Curva Etária de Recuperação (${input.ageYears} anos)`,
      multiplier: ageRecoveryAdj,
      deltaPercent: toDeltaPct(ageRecoveryAdj),
      impact: ageRecoveryAdj > 1 ? "positive" : ageRecoveryAdj < 1 ? "protective" : "neutral",
      explanationPt:
        ageRecoveryAdj < 1
          ? "Ajuste conservador de recuperação muscular e tendínea conforme literatura de atletas masters (Fell & Williams, 2008)."
          : "Taxa metabólica de reparo tecidual na faixa de referência padrão.",
      scientificRefId: "fell_williams_2008",
    });
  }

  let rhrAdj = 1.0;
  if (
    typeof input.restingHrBpm === "number" &&
    input.restingHrBpm >= 35 &&
    input.restingHrBpm <= 105
  ) {
    optionalSignalsCount++;
    if (input.restingHrBpm <= 52) rhrAdj = 1.08;
    else if (input.restingHrBpm <= 60) rhrAdj = 1.04;
    else if (input.restingHrBpm <= 70) rhrAdj = 1.0;
    else if (input.restingHrBpm <= 80) rhrAdj = 0.95;
    else rhrAdj = 0.9;

    capacityEa *= rhrAdj;
    factors.push({
      code: "resting_hr_autonomic",
      labelPt: `Tônus Autonômico (FC Repouso ${input.restingHrBpm} bpm)`,
      multiplier: rhrAdj,
      deltaPercent: toDeltaPct(rhrAdj),
      impact: rhrAdj > 1 ? "positive" : rhrAdj < 1 ? "protective" : "neutral",
      explanationPt:
        rhrAdj > 1
          ? "Bradicardia de repouso indica alta eficiência cardiovascular e melhor recuperação parassimpática entre esforços (Buchheit, 2014)."
          : rhrAdj < 1
            ? "FC de repouso mais alta sugere margem de evolução aeróbica ou maior tônus simpático basal."
            : "FC de repouso dentro da faixa fisiológica intermediária.",
      scientificRefId: "buchheit_2014",
    });
  }

  if (typeof input.bodyWeightKg === "number" && input.bodyWeightKg >= 35 && input.bodyWeightKg <= 200) {
    optionalSignalsCount++;
  }

  // Clamp fisiológico final seguro
  const calibratedCapacityEa = Math.round(clamp(capacityEa, 650, 3600));

  // Priors individuais de velocidade de recuperação (α_0) e sensibilidade a hábitos (β_0)
  const recoveryVelocityPrior =
    Math.round(
      clamp(
        1.0 *
          Math.pow(sleepMult, 0.7) *
          Math.pow(allostaticMult, 0.55) *
          ageRecoveryAdj *
          Math.pow(rhrAdj, 0.5) *
          Math.pow(tissueMult, 0.6),
        0.74,
        1.24
      ) * 100
    ) / 100;

  const recoveryGainPrior =
    Math.round(
      clamp(
        1.0 +
          (input.sleepDuration === "under_6h" || input.sleepQuality === "poor"
            ? 0.08
            : 0.02) +
          (input.lifeStress === "high" || input.lifeStress === "very_high"
            ? 0.07
            : 0),
        0.9,
        1.2
      ) * 100
    ) / 100;

  // Confiança inicial realista e honesta (sem prometer precisão de laboratório no dia 1!)
  // Base completa de questionário estruturado = 64%; cada sinal biométrico real soma +6..7% (máx 82% no dia 1)
  const initialConfidencePercent = clamp(
    64 + optionalSignalsCount * 6,
    60,
    82
  );
  const uncertaintyRatio = (100 - initialConfidencePercent) / 260; // ~±7% a ±14%
  const uncertaintyMarginEa = Math.round(
    clamp(calibratedCapacityEa * uncertaintyRatio, 85, 290)
  );

  const modalitySpec = MODALITY_REGISTRY[input.primaryModality];
  if (
    input.primaryModality !== "strength" &&
    !input.complementaryModalities.includes("strength")
  ) {
    recommendations.push(
      `Sugestão científica para ${modalitySpec.shortNamePt}: incluir ${modalitySpec.complementaryStrength.recommendedFrequencyPerWeek[input.experienceLevel].min}–${modalitySpec.complementaryStrength.recommendedFrequencyPerWeek[input.experienceLevel].max}×/sem de musculação complementar potencializa seus KPIs e reduz lesões.`
    );
  }

  let readinessTierLabelPt = "Capacidade Adaptativa Equilibrada";
  if (input.tissueStatus === "injury_rehab" || input.tissueStatus === "returning_detrained") {
    readinessTierLabelPt = "Rampa Protetora de Readaptação";
  } else if (calibratedCapacityEa >= 2150 && recoveryVelocityPrior >= 1.03) {
    readinessTierLabelPt = "Alta Reserva & Tolerância à Carga";
  } else if (recoveryVelocityPrior < 0.9) {
    readinessTierLabelPt = "Reserva Sensível · Priorizar Recuperação";
  }

  const summaryPt = `Sua Energia Adaptativa semanal inicial foi calibrada em ${calibratedCapacityEa} EA (±${uncertaintyMarginEa} EA) para ${modalitySpec.shortNamePt}, com velocidade de recuperação ${recoveryVelocityPrior.toFixed(2)}× e confiança inicial de ${initialConfidencePercent}% (refinada continuamente a cada treino e check-in).`;

  return {
    schemaVersion: "1.0",
    calibratedAt: new Date().toISOString(),
    inputs: input,
    calibratedCapacityEa,
    recoveryVelocityPrior,
    recoveryGainPrior,
    initialConfidencePercent,
    uncertaintyMarginEa,
    readinessTierLabelPt,
    summaryPt,
    factors,
    priorityRecommendationsPt: recommendations,
  };
}
