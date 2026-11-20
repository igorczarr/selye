/**
 * Selye — Fase 0: Contratos de Domínio Científico por Modalidade
 *
 * Define a arquitetura declarativa que integra:
 * 1. Perfil do atleta (modalidades principais, complementares e atividades soltas/casuais)
 * 2. KPIs específicos por modalidade com fórmulas, unidades, faixas por nível e fontes científicas
 * 3. Transferência de fortalecimento (como fichas de musculação servem a cada esporte)
 * 4. Arquétipos de sessão e periodização (substituindo itens genéricos X/Y/Z no calendário)
 * 5. Guard-rails conservadores de segurança e carga interna/externa
 */

import type { ExerciseCategoryId } from "../catalog/exercise-categories";

/** Modalidades Core da v1 com suporte completo de KPIs, periodização e fortalecimento */
export type CoreModalityCode =
  | "strength"
  | "running"
  | "cycling"
  | "beach_volleyball"
  | "swimming"
  | "functional"
  | "futsal"
  | "football"
  | "martial_arts"
  | "calisthenics";

/** Códigos estendidos compatíveis com sports.ts e training-load.ts */
export type ExtendedModalityCode =
  | CoreModalityCode
  | "footvolley"
  | "beach_tennis"
  | "cross_training"
  | "soccer"
  | "combat"
  | "pilates"
  | "mobility"
  | "walking"
  | "other";

export type ModalityCategory =
  | "resistance"
  | "endurance"
  | "sand_court"
  | "team_sport"
  | "hybrid"
  | "combat"
  | "wellness";

export type ExperienceLevel =
  | "beginner"
  | "intermediate"
  | "advanced"
  | "competitive";

/**
 * Papel de uma modalidade ou atividade na vida do atleta.
 * Diferencia modalidades sérias (com meta/KPIs/periodização),
 * suporte estruturado (ex: musculação para corredor) e atividades soltas (cardio/lazer).
 */
export type ActivityClass = "serious" | "complementary" | "casual";

export type AthleteModalityRole = "primary" | "complementary";

export type KpiDirection =
  | "higher_is_better"
  | "lower_is_better"
  | "target_band";

export type KpiCadence = "session" | "weekly" | "mesocycle" | "test";

export type TrainingCapacityCode =
  | "hypertrophy"
  | "maximal_strength"
  | "explosive_power"
  | "plyometric_reactive"
  | "aerobic_base"
  | "lactate_threshold"
  | "vo2_max"
  | "running_economy"
  | "muscular_endurance"
  | "work_capacity"
  | "shoulder_prehab"
  | "joint_durability"
  | "core_transfer"
  | "sand_agility"
  | "change_of_direction"
  | "repeated_sprint_ability"
  | "eccentric_hamstring_protection"
  | "anaerobic_combat_capacity"
  | "grip_isometric_endurance"
  | "relative_strength_skill"
  | "technical_efficiency"
  | "recovery_mobility";

export interface ScientificReference {
  id: string;
  authors: string;
  year: number;
  title: string;
  journalOrBook: string;
  doiOrIsbn?: string;
  keyFindingPt: string;
  evidenceLevel:
    | "meta_analysis"
    | "systematic_review"
    | "consensus_statement"
    | "foundational_model"
    | "original_research";
}

export interface ExperienceBand {
  min: number;
  max: number;
  optimalNotePt: string;
}

export interface ModalityKpiDefinition {
  key: string;
  labelPt: string;
  shortLabelPt: string;
  unit: string;
  direction: KpiDirection;
  cadence: KpiCadence;
  isPrimaryGoalMetric: boolean;
  /** Expressão matemática canônica usada na Fase 3 (KPI Engine) */
  formulaExpression: string;
  formulaDescriptionPt: string;
  /** Campos de entrada exigidos dos logs/sessões/testes */
  requiredInputs: string[];
  /** Faixas de referência conservadoras por nível de experiência */
  experienceRanges: Record<ExperienceLevel, ExperienceBand>;
  /** O que significa evoluir ou regredir neste indicador */
  interpretationPt: string;
  scientificRefIds: string[];
}

export interface IntensityZoneDefinition {
  zone: string; // ex: "Z1", "Z2", ... ou "RIR 3-4"
  labelPt: string;
  anchorMetric: "hr_max_pct" | "pace_threshold_pct" | "ftp_pct" | "css_pct" | "rir_rpe" | "srpe";
  rangeLabel: string;
  physiologicalTargetPt: string;
  recommendedWeeklySharePct?: { min: number; max: number };
}

export interface ComplementaryStrengthProtocol {
  /** Se a modalidade já é musculação, o papel é "self" */
  role: "self" | "complementary_support";
  objectiveHeadlinePt: string;
  physiologicalTransferPt: string;
  recommendedFrequencyPerWeek: Record<ExperienceLevel, { min: number; max: number }>;
  targetCapacities: TrainingCapacityCode[];
  priorityExerciseCategories: ExerciseCategoryId[];
  intensityPrescriptionPt: string;
  volumePrescriptionPt: string;
  /** Separação mínima recomendada da sessão principal (Schumann et al., 2022) */
  minSeparationHoursFromMainModality: number;
  separationRationalePt: string;
  /** O que evitar para não gerar interferência negativa ou sobrecarga articular */
  avoidanceRulesPt: string[];
  /** Como a ficha de fortalecimento move os KPIs da modalidade principal */
  expectedKpiImpacts: {
    kpiKey: string;
    expectedMechanismPt: string;
  }[];
  scientificRefIds: string[];
}

export interface SessionArchetypeDefinition {
  code: string;
  labelPt: string;
  shortLabelPt: string;
  primaryCapacity: TrainingCapacityCode;
  targetZone: string;
  typicalDurationMin: { min: number; max: number };
  typicalRpe: { min: number; max: number };
  /** Quais fases da periodização utilizam este arquétipo */
  applicablePhases: PeriodizationPhaseCode[];
  /** Explica ao usuário por que esta sessão existe no calendário */
  purposePt: string;
  /** Se a sessão pode ser preenchida por uma ficha de musculação/exercícios do Selye */
  usesStructuredRoutine: boolean;
}

export type PeriodizationPhaseCode =
  | "base"
  | "build"
  | "peak"
  | "taper"
  | "deload"
  | "constancy";

export interface PeriodizationPhaseRule {
  phase: PeriodizationPhaseCode;
  labelPt: string;
  shareOfMacrocyclePct: number;
  volumeMultiplier: number; // relativo à linha de base (1.0 = padrão)
  intensityFocusPt: string;
  directivePt: string;
}

export interface SafetyGuardrails {
  maxWeeklyVolumeJumpPct: number;
  maxWeeklyMonotony: number;
  acwrAdvisoryRange: { min: number; max: number };
  acwrCautionNotePt: string;
  deloadFrequencyWeeks: number;
  modalitySpecificAlertsPt: string[];
  scientificRefIds: string[];
}

export interface ModalityProfileSpec {
  code: CoreModalityCode;
  namePt: string;
  shortNamePt: string;
  category: ModalityCategory;
  /** Fator biomecânico/sistêmico alinhado a training-load.ts */
  systemicLoadFactor: number;
  summaryPt: string;
  primaryCapacities: TrainingCapacityCode[];
  goalExamplesPt: string[];
  /** Como atividades desta modalidade se comportam quando marcadas como soltas (casual) */
  casualActivityPolicyPt: string;
  intensityZones: IntensityZoneDefinition[];
  kpis: ModalityKpiDefinition[];
  complementaryStrength: ComplementaryStrengthProtocol;
  sessionArchetypes: SessionArchetypeDefinition[];
  periodizationPhases: PeriodizationPhaseRule[];
  safetyGuardrails: SafetyGuardrails;
  scientificRefIds: string[];
}

export interface AthleteModalityProfile {
  primaryModality: CoreModalityCode;
  complementaryModalities: CoreModalityCode[];
  experienceLevel: ExperienceLevel;
}

export interface ActivityClassificationResult {
  activityClass: ActivityClass;
  resolvedCoreModality: CoreModalityCode | null;
  countsTowardPrimaryKpis: boolean;
  countsTowardSystemicLoadAndEa: boolean;
  countsTowardConsistencyStreak: boolean;
  rationalePt: string;
}

export interface GuardrailEvaluationInput {
  modalityCode: CoreModalityCode;
  previousWeekVolume?: number;
  currentWeekVolume?: number;
  weeklyMonotony?: number;
  acwr?: number;
  sameSessionEnduranceAndPower?: boolean;
  weeklyJumpContacts?: number;
  weeklyHighIntensitySharePct?: number;
  weeklyHardSparringSessions?: number;
  weeklyEccentricPrehabSessions?: number;
  weeklyMatchesCount?: number;
  experienceLevel?: ExperienceLevel;
}

export interface GuardrailWarning {
  code: string;
  severity: "info" | "caution" | "high";
  titlePt: string;
  detailPt: string;
  scientificRefIds: string[];
}
