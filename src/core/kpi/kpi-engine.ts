/**
 * Selye — Fase 3: KPI Engine por Modalidade & Indicador "Nos Trilhos?"
 *
 * Calcula deterministicamente todos os KPIs científicos das 10 modalidades Core do Registry
 * a partir de sessões concluídas, séries registradas (`set_logs`) e testes/medições periódicas
 * (`athlete_kpi_measurements`), separando rigorosamente sessões da modalidade séria (`serious`)
 * de atividades soltas (`casual`).
 */

import {
  classifyExerciseCategory,
  type ExerciseCategoryId,
} from "../catalog/exercise-categories";
import {
  MODALITY_REGISTRY,
  evaluateWeeklySafetyGuardrails,
  resolveCoreModalityCode,
  type ActivityClass,
  type CoreModalityCode,
  type ExperienceLevel,
  type GuardrailWarning,
  type ModalityKpiDefinition,
} from "../modalities";
import { calculateUnifiedSessionLoad } from "../performance/training-load";

export type OnTrackStatus =
  | "on_track"
  | "attention"
  | "off_track"
  | "awaiting_data";

export interface KpiSessionSample {
  id: string;
  date: string; // YYYY-MM-DD
  modalityCode: string;
  activityClass?: ActivityClass | string | null;
  durationMinutes: number;
  rpe: number;
  distanceKm?: number | null;
  distanceMeters?: number | null;
  volumeKg?: number | null;
  tss?: number | null;
  jumpCount?: number | null;
  completedCategories?: ExerciseCategoryId[];
}

export interface KpiSetLogSample {
  sessionId: string;
  date: string; // YYYY-MM-DD
  modalityCode: string;
  activityClass?: ActivityClass | string | null;
  exerciseNamePt: string;
  exerciseNameEn?: string | null;
  secondaryMuscles?: string[] | null;
  setType: string; // warmup, effective, failure, drop_set...
  weightKg?: number | null;
  reps?: number | null;
  rpe?: number | null;
  rir?: number | null;
}

export interface KpiMeasurementSample {
  kpiKey: string;
  modalityCode: string;
  valueNumeric: number;
  unit: string;
  measuredAt: string; // ISO string or YYYY-MM-DD
  source?: string;
}

export interface KpiGoalTarget {
  primaryKpiKey: string;
  baselineValue?: number | null;
  targetValue?: number | null;
  startDate?: string | null; // YYYY-MM-DD
  targetDate?: string | null; // YYYY-MM-DD
  eventTitle?: string | null;
}

export interface ComputedKpiCard {
  key: string;
  labelPt: string;
  shortLabelPt: string;
  unit: string;
  direction: ModalityKpiDefinition["direction"];
  cadence: ModalityKpiDefinition["cadence"];
  isPrimaryGoalMetric: boolean;
  currentValue: number | null;
  formattedValue: string;
  previousValue: number | null;
  deltaValue: number | null;
  deltaLabelPt: string | null;
  referenceBand: { min: number; max: number; optimalNotePt: string };
  status: OnTrackStatus;
  statusLabelPt: string;
  interpretationPt: string;
  sourceLabelPt: string;
  canLogManualTest: boolean;
}

export interface OnTrackAssessment {
  status: OnTrackStatus;
  badgePt: string;
  headlinePt: string;
  reasonPt: string;
  nextActionPt: string;
  /** Progresso real (0..100%) quando há baseline e meta definidos */
  actualProgressPercent: number | null;
  /** Progresso esperado na data de hoje (0..100%) quando há data-alvo */
  expectedProgressPercent: number | null;
  primaryKpiKey: string;
  primaryKpiLabelPt: string;
}

export interface ModalityKpiDashboardResult {
  modalityCode: CoreModalityCode;
  modalityNamePt: string;
  modalityShortNamePt: string;
  experienceLevel: ExperienceLevel;
  complementaryModalities: CoreModalityCode[];
  onTrack: OnTrackAssessment;
  kpis: ComputedKpiCard[];
  guardrailWarnings: GuardrailWarning[];
  /** Breakdown semanal de séries efetivas por categoria muscular (útil para força & complementar) */
  weeklySetsByCategory: Partial<Record<ExerciseCategoryId, number>>;
  /** Quantidade de atividades soltas (casual) nos últimos 7 dias — mantidas separadas dos KPIs */
  casualSessionsLast7d: number;
  seriousSessionsLast7d: number;
  complementarySessionsLast7d: number;
}

export interface EvaluateModalityKpiInput {
  primaryModality: CoreModalityCode;
  complementaryModalities?: CoreModalityCode[];
  experienceLevel: ExperienceLevel;
  bodyWeightKg?: number | null;
  sessionsLast42Days: KpiSessionSample[];
  setLogsLast14Days: KpiSetLogSample[];
  measurements: KpiMeasurementSample[];
  goalTarget?: KpiGoalTarget | null;
  weeklyMonotony?: number | null;
  acwr?: number | null;
  todayDateStr: string; // YYYY-MM-DD
}

/**
 * Fórmula de Epley (1985) para estimativa de 1RM submáximo.
 * Para 1 repetição retorna a carga exata; limita reps em 12 para manter acurácia fisiológica.
 */
export function calculateEpley1RM(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) return 0;
  if (reps === 1) return Math.round(weightKg * 10) / 10;
  const clampedReps = Math.min(12, reps);
  return Math.round(weightKg * (1 + clampedReps / 30) * 10) / 10;
}

/**
 * Calcula CSS (Critical Swim Speed) em segundos por 100 metros (Wakayoshi et al., 1993).
 */
export function calculateCssPacePer100m(
  time400mSec: number,
  time200mSec: number
): number {
  const diff = time400mSec - time200mSec;
  if (diff <= 0) return 0;
  return Math.round((diff / 2) * 10) / 10;
}

/**
 * Formata pace (segundos por km ou por 100m) em mm:ss legível.
 */
export function formatSecondsAsPace(seconds: number, suffix: string): string {
  const safe = Math.max(0, Math.round(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${String(secs).padStart(2, "0")} ${suffix}`;
}

export function formatKpiValue(value: number | null, unit: string): string {
  if (value === null || Number.isNaN(value)) return "—";
  if (unit === "s/km") return formatSecondsAsPace(value, "/km");
  if (unit === "s/100m") return formatSecondsAsPace(value, "/100m");
  if (unit === "%") return `${Math.round(value)}%`;
  if (unit === "kg" && value >= 1000) {
    return `${(value / 1000).toLocaleString("pt-BR", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })} t`;
  }
  if (Number.isInteger(value)) {
    return `${value.toLocaleString("pt-BR")} ${unit}`;
  }
  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  })} ${unit}`;
}

function daysAgo(dateStr: string, todayStr: string): number {
  const a = new Date(`${dateStr.slice(0, 10)}T12:00:00Z`).getTime();
  const b = new Date(`${todayStr.slice(0, 10)}T12:00:00Z`).getTime();
  return Math.round((b - a) / (24 * 3600 * 1000));
}

/**
 * Calcula CTL (42d EWMA), ATL (7d EWMA) e TSB (CTL - ATL) a partir de cargas diárias (Banister / Coggan).
 */
export function calculateCyclingPmc(
  dailyLoadByDate: Map<string, number>,
  todayDateStr: string
): { ctl: number; atl: number; tsb: number } {
  const today = new Date(`${todayDateStr}T12:00:00Z`);
  let ctl = 0;
  let atl = 0;
  const kCtl = 1 / 42;
  const kAtl = 1 / 7;

  for (let i = 41; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() - i);
    const key = d.toISOString().split("T")[0];
    const load = dailyLoadByDate.get(key) || 0;
    ctl = ctl + (load - ctl) * kCtl;
    atl = atl + (load - atl) * kAtl;
  }

  return {
    ctl: Math.round(ctl * 10) / 10,
    atl: Math.round(atl * 10) / 10,
    tsb: Math.round((ctl - atl) * 10) / 10,
  };
}

function isSeriousMatch(
  sessionModalityCode: string,
  activityClass: string | null | undefined,
  targetModality: CoreModalityCode
): boolean {
  if (activityClass === "casual") return false;
  const resolved = resolveCoreModalityCode(sessionModalityCode);
  return resolved === targetModality;
}

function getLatestAndPrevMeasurement(
  measurements: KpiMeasurementSample[],
  kpiKey: string
): { latest: KpiMeasurementSample | null; prev: KpiMeasurementSample | null } {
  const matching = measurements
    .filter((m) => m.kpiKey === kpiKey)
    .sort((a, b) => b.measuredAt.localeCompare(a.measuredAt));
  return {
    latest: matching[0] || null,
    prev: matching[1] || null,
  };
}

function evaluateSingleKpiStatus(
  value: number | null,
  def: ModalityKpiDefinition,
  level: ExperienceLevel
): { status: OnTrackStatus; labelPt: string } {
  if (value === null) {
    return { status: "awaiting_data", labelPt: "Sem registro" };
  }
  const band = def.experienceRanges[level];

  if (def.direction === "target_band") {
    if (value >= band.min && value <= band.max) {
      return { status: "on_track", labelPt: "Na faixa ideal" };
    }
    const span = Math.max(1, band.max - band.min);
    const dist = value < band.min ? band.min - value : value - band.max;
    return dist <= span * 0.35
      ? { status: "attention", labelPt: value < band.min ? "Abaixo da faixa" : "Acima da faixa" }
      : { status: "off_track", labelPt: value < band.min ? "Muito abaixo" : "Acima do teto" };
  }

  if (def.direction === "higher_is_better") {
    if (value >= band.min) {
      return { status: "on_track", labelPt: value >= band.max ? "Acima da referência" : "Nos trilhos" };
    }
    return value >= band.min * 0.75
      ? { status: "attention", labelPt: "Em construção" }
      : { status: "off_track", labelPt: "Abaixo da base" };
  }

  // lower_is_better (ex.: pace s/km, CSS s/100m, sprint s, SWOLF)
  if (value <= band.max) {
    return { status: "on_track", labelPt: value <= band.min ? "Excelente" : "Nos trilhos" };
  }
  return value <= band.max * 1.15
    ? { status: "attention", labelPt: "Em evolução" }
    : { status: "off_track", labelPt: "Acima da referência" };
}

/**
 * Avalia o status global "Nos Trilhos?" combinando:
 * 1) Progresso real vs. curva esperada até a meta (quando baseline + meta existem)
 * 2) Faixa de referência do KPI primário (quando não há data-alvo fechada)
 * 3) Alertas de segurança / guard-rails ativos na semana
 */
export function evaluateOnTrackAssessment(params: {
  primaryKpiCard: ComputedKpiCard;
  goalTarget?: KpiGoalTarget | null;
  guardrailWarnings: GuardrailWarning[];
  todayDateStr: string;
  modalityShortNamePt: string;
}): OnTrackAssessment {
  const { primaryKpiCard, goalTarget, guardrailWarnings, todayDateStr, modalityShortNamePt } =
    params;

  const highWarnings = guardrailWarnings.filter((w) => w.severity === "high");
  const cautionWarnings = guardrailWarnings.filter((w) => w.severity === "caution");

  if (primaryKpiCard.currentValue === null) {
    return {
      status: "awaiting_data",
      badgePt: "Aguardando 1ª marca",
      headlinePt: `Registre sua primeira sessão ou teste de ${primaryKpiCard.shortLabelPt}`,
      reasonPt: `Ainda não há dados recentes de ${modalityShortNamePt} suficientes para medir sua curva rumo à meta.`,
      nextActionPt: primaryKpiCard.canLogManualTest
        ? `Toque em "Registrar Marca" em ${primaryKpiCard.shortLabelPt} ou conclua um treino de ${modalityShortNamePt}.`
        : `Conclua sua próxima sessão de ${modalityShortNamePt} para destravar o painel "Nos Trilhos?".`,
      actualProgressPercent: null,
      expectedProgressPercent: null,
      primaryKpiKey: primaryKpiCard.key,
      primaryKpiLabelPt: primaryKpiCard.labelPt,
    };
  }

  // Caso 1: Meta numérica com baseline e target definidos
  if (
    goalTarget &&
    typeof goalTarget.targetValue === "number" &&
    typeof goalTarget.baselineValue === "number" &&
    goalTarget.targetValue !== goalTarget.baselineValue
  ) {
    const totalDelta = goalTarget.targetValue - goalTarget.baselineValue;
    const currentDelta = primaryKpiCard.currentValue - goalTarget.baselineValue;
    const rawActualPct = (currentDelta / totalDelta) * 100;
    const actualProgressPercent = Math.round(Math.max(0, Math.min(120, rawActualPct)));

    let expectedProgressPercent: number | null = null;
    if (goalTarget.startDate && goalTarget.targetDate) {
      const totalDays = Math.max(
        1,
        daysAgo(goalTarget.startDate, goalTarget.targetDate)
      );
      const elapsedDays = Math.max(
        0,
        daysAgo(goalTarget.startDate, todayDateStr)
      );
      expectedProgressPercent = Math.round(
        Math.max(5, Math.min(100, (elapsedDays / totalDays) * 100))
      );
    }

    const gap =
      expectedProgressPercent !== null
        ? actualProgressPercent - expectedProgressPercent
        : actualProgressPercent - 50;

    if (highWarnings.length > 0) {
      return {
        status: "off_track",
        badgePt: "Ajustar Carga",
        headlinePt: `Progresso em ${actualProgressPercent}%, mas com alerta crítico de sobrecarga`,
        reasonPt: highWarnings[0].titlePt,
        nextActionPt: highWarnings[0].detailPt,
        actualProgressPercent,
        expectedProgressPercent,
        primaryKpiKey: primaryKpiCard.key,
        primaryKpiLabelPt: primaryKpiCard.labelPt,
      };
    }

    if (gap >= -5 && cautionWarnings.length === 0) {
      return {
        status: "on_track",
        badgePt: "Nos Trilhos",
        headlinePt: `${primaryKpiCard.shortLabelPt} em ${primaryKpiCard.formattedValue} (${actualProgressPercent}% da meta)`,
        reasonPt:
          expectedProgressPercent !== null
            ? `Você está acompanhando ou à frente da curva esperada (${expectedProgressPercent}% esperado hoje) sem alertas de sobrecarga.`
            : `Sua evolução em ${modalityShortNamePt} está consistente rumo à meta de ${formatKpiValue(goalTarget.targetValue, primaryKpiCard.unit)}.`,
        nextActionPt: "Mantenha a consistência planejada e respeite os dias de recarga (+EA).",
        actualProgressPercent,
        expectedProgressPercent,
        primaryKpiKey: primaryKpiCard.key,
        primaryKpiLabelPt: primaryKpiCard.labelPt,
      };
    }

    if (gap >= -20 || cautionWarnings.length > 0) {
      return {
        status: "attention",
        badgePt: "Atenção",
        headlinePt:
          cautionWarnings.length > 0
            ? `${primaryKpiCard.shortLabelPt} em ${primaryKpiCard.formattedValue} · ajuste fino recomendado`
            : `${actualProgressPercent}% da meta (${expectedProgressPercent ?? 50}% esperado)`,
        reasonPt:
          cautionWarnings.length > 0
            ? cautionWarnings[0].titlePt
            : `Pequena distância em relação à curva esperada até ${goalTarget.targetDate || "a meta"}.`,
        nextActionPt:
          cautionWarnings.length > 0
            ? cautionWarnings[0].detailPt
            : "Priorize as sessões-chave da semana sem compensar com saltos bruscos de volume.",
        actualProgressPercent,
        expectedProgressPercent,
        primaryKpiKey: primaryKpiCard.key,
        primaryKpiLabelPt: primaryKpiCard.labelPt,
      };
    }

    return {
      status: "off_track",
      badgePt: "Fora da Curva",
      headlinePt: `${actualProgressPercent}% da meta (${expectedProgressPercent ?? 50}% esperado)`,
      reasonPt: `O ritmo atual em ${primaryKpiCard.shortLabelPt} está mais de 20 pontos abaixo da curva planejada.`,
      nextActionPt:
        "Recalibre a data-alvo ou revise a adesão semanal no calendário para voltar aos trilhos com segurança.",
      actualProgressPercent,
      expectedProgressPercent,
      primaryKpiKey: primaryKpiCard.key,
      primaryKpiLabelPt: primaryKpiCard.labelPt,
    };
  }

  // Caso 2: Sem meta numérica fechada — avalia pela faixa do nível + guard-rails
  if (highWarnings.length > 0) {
    return {
      status: "off_track",
      badgePt: "Ajustar Carga",
      headlinePt: highWarnings[0].titlePt,
      reasonPt: highWarnings[0].detailPt,
      nextActionPt: "Reduza volume/intensidade por 48–72h antes de retomar progressão.",
      actualProgressPercent: null,
      expectedProgressPercent: null,
      primaryKpiKey: primaryKpiCard.key,
      primaryKpiLabelPt: primaryKpiCard.labelPt,
    };
  }

  if (primaryKpiCard.status === "on_track" && cautionWarnings.length === 0) {
    return {
      status: "on_track",
      badgePt: "Nos Trilhos",
      headlinePt: `${primaryKpiCard.shortLabelPt} em ${primaryKpiCard.formattedValue}`,
      reasonPt: `Seu indicador principal de ${modalityShortNamePt} está dentro da faixa esperada para o seu nível, sem alertas de sobrecarga.`,
      nextActionPt: "Continue acumulando consistência semanal e registre novas marcas ao final do bloco.",
      actualProgressPercent: null,
      expectedProgressPercent: null,
      primaryKpiKey: primaryKpiCard.key,
      primaryKpiLabelPt: primaryKpiCard.labelPt,
    };
  }

  return {
    status: cautionWarnings.length > 0 || primaryKpiCard.status === "attention" ? "attention" : "off_track",
    badgePt: cautionWarnings.length > 0 ? "Atenção" : primaryKpiCard.statusLabelPt,
    headlinePt:
      cautionWarnings.length > 0
        ? cautionWarnings[0].titlePt
        : `${primaryKpiCard.shortLabelPt}: ${primaryKpiCard.formattedValue} (${primaryKpiCard.statusLabelPt})`,
    reasonPt:
      cautionWarnings.length > 0
        ? cautionWarnings[0].detailPt
        : primaryKpiCard.referenceBand.optimalNotePt,
    nextActionPt:
      cautionWarnings.length > 0
        ? "Siga o ajuste preventivo para manter evolução contínua sem lesão."
        : "Defina uma meta numérica no Onboarding/Perfil ou ajuste o volume semanal da modalidade.",
    actualProgressPercent: null,
    expectedProgressPercent: null,
    primaryKpiKey: primaryKpiCard.key,
    primaryKpiLabelPt: primaryKpiCard.labelPt,
  };
}

/**
 * Motor Principal da Fase 3:
 * Computa todos os KPIs da modalidade principal do atleta, aplica guard-rails científicos
 * e devolve o status "Nos Trilhos?".
 */
export function evaluateModalityKpiDashboard(
  input: EvaluateModalityKpiInput
): ModalityKpiDashboardResult {
  const spec = MODALITY_REGISTRY[input.primaryModality];
  const level = input.experienceLevel || "intermediate";
  const today = input.todayDateStr;

  // Filtragem temporal (7d atual vs 7d anterior)
  const sessions7d = input.sessionsLast42Days.filter((s) => {
    const d = daysAgo(s.date, today);
    return d >= 0 && d < 7;
  });
  const sessionsPrev7d = input.sessionsLast42Days.filter((s) => {
    const d = daysAgo(s.date, today);
    return d >= 7 && d < 14;
  });

  // Contagem de classes nos últimos 7d (atividades soltas separadas!)
  let casualSessionsLast7d = 0;
  let seriousSessionsLast7d = 0;
  let complementarySessionsLast7d = 0;
  const compSet = new Set(input.complementaryModalities || []);

  for (const s of sessions7d) {
    const resolved = resolveCoreModalityCode(s.modalityCode);
    if (s.activityClass === "casual") {
      casualSessionsLast7d++;
    } else if (resolved === input.primaryModality) {
      seriousSessionsLast7d++;
    } else if (
      s.activityClass === "complementary" ||
      (resolved !== null && compSet.has(resolved))
    ) {
      complementarySessionsLast7d++;
    } else {
      casualSessionsLast7d++;
    }
  }

  // Sessões sérias da modalidade principal (excluindo atividades soltas!)
  const primary7d = sessions7d.filter((s) =>
    isSeriousMatch(s.modalityCode, s.activityClass, input.primaryModality)
  );
  const primaryPrev7d = sessionsPrev7d.filter((s) =>
    isSeriousMatch(s.modalityCode, s.activityClass, input.primaryModality)
  );

  // Séries efetivas dos últimos 7d por categoria muscular
  const setLogs7d = input.setLogsLast14Days.filter((sl) => {
    const d = daysAgo(sl.date, today);
    return d >= 0 && d < 7 && sl.activityClass !== "casual";
  });
  const setLogsPrev7d = input.setLogsLast14Days.filter((sl) => {
    const d = daysAgo(sl.date, today);
    return d >= 7 && d < 14 && sl.activityClass !== "casual";
  });

  const weeklySetsByCategory: Partial<Record<ExerciseCategoryId, number>> = {};
  let effectiveTonnage7d = 0;
  let effectiveTonnagePrev7d = 0;
  const rirValues7d: number[] = [];
  let bestE1rm7d = 0;
  let bestE1rmPrev7d = 0;
  let maxStrictCalisReps = 0;

  for (const sl of setLogs7d) {
    if (sl.setType === "warmup") continue;
    const isEffective =
      sl.rpe == null && sl.rir == null
        ? true
        : (sl.rpe != null && sl.rpe >= 6.5) || (sl.rir != null && sl.rir <= 3.5);
    if (!isEffective) continue;

    const cat = classifyExerciseCategory({
      namePt: sl.exerciseNamePt,
      nameEn: sl.exerciseNameEn,
      modalityCode: sl.modalityCode,
      secondaryMuscles: sl.secondaryMuscles,
    });
    weeklySetsByCategory[cat] = (weeklySetsByCategory[cat] || 0) + 1;

    if (sl.weightKg && sl.reps) {
      effectiveTonnage7d += sl.weightKg * sl.reps;
      const e1rm = calculateEpley1RM(sl.weightKg, sl.reps);
      if (e1rm > bestE1rm7d) bestE1rm7d = e1rm;
    }
    if (sl.rir != null) {
      rirValues7d.push(sl.rir);
    } else if (sl.rpe != null) {
      rirValues7d.push(Math.max(0, 10 - sl.rpe));
    }
    if (
      sl.reps &&
      /(barra fixa|pull-?up|chin-?up|paralela|mergulho|dip)/i.test(
        `${sl.exerciseNamePt} ${sl.exerciseNameEn || ""}`
      )
    ) {
      if (sl.reps > maxStrictCalisReps) maxStrictCalisReps = sl.reps;
    }
  }

  for (const sl of setLogsPrev7d) {
    if (sl.setType === "warmup") continue;
    if (sl.weightKg && sl.reps) {
      effectiveTonnagePrev7d += sl.weightKg * sl.reps;
      const e1rm = calculateEpley1RM(sl.weightKg, sl.reps);
      if (e1rm > bestE1rmPrev7d) bestE1rmPrev7d = e1rm;
    }
  }

  // Função auxiliar que resolve cada KPI do Registry
  const computeKpiValue = (
    def: ModalityKpiDefinition
  ): {
    current: number | null;
    previous: number | null;
    sourceLabelPt: string;
    canLogManualTest: boolean;
  } => {
    const manual = getLatestAndPrevMeasurement(input.measurements, def.key);
    const manualCurrent = manual.latest ? manual.latest.valueNumeric : null;
    const manualPrev = manual.prev ? manual.prev.valueNumeric : null;

    switch (def.key) {
      // --- MUSCULAÇÃO ---
      case "weekly_effective_sets_per_group": {
        const vals = Object.values(weeklySetsByCategory).filter(
          (v): v is number => typeof v === "number" && v > 0
        );
        if (vals.length === 0) {
          return {
            current: manualCurrent,
            previous: manualPrev,
            sourceLabelPt: manualCurrent !== null ? "Registro manual" : "Derivado das séries (7d)",
            canLogManualTest: false,
          };
        }
        const avgSets = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
        return {
          current: avgSets,
          previous: null,
          sourceLabelPt: `Média em ${vals.length} grupos (7d)`,
          canLogManualTest: false,
        };
      }
      case "key_lift_e1rm_kg": {
        const cur = bestE1rm7d > 0 ? bestE1rm7d : manualCurrent;
        const prev = bestE1rmPrev7d > 0 ? bestE1rmPrev7d : manualPrev;
        return {
          current: cur,
          previous: prev,
          sourceLabelPt: bestE1rm7d > 0 ? "Epley das séries (7d)" : "Teste / Registro",
          canLogManualTest: true,
        };
      }
      case "avg_effective_rir": {
        if (rirValues7d.length === 0) {
          return {
            current: manualCurrent,
            previous: manualPrev,
            sourceLabelPt: "Derivado das séries (7d)",
            canLogManualTest: false,
          };
        }
        const avg =
          Math.round(
            (rirValues7d.reduce((a, b) => a + b, 0) / rirValues7d.length) * 10
          ) / 10;
        return {
          current: avg,
          previous: null,
          sourceLabelPt: `${rirValues7d.length} séries efetivas (7d)`,
          canLogManualTest: false,
        };
      }
      case "weekly_tonnage_kg": {
        return {
          current: effectiveTonnage7d > 0 ? Math.round(effectiveTonnage7d) : manualCurrent,
          previous: effectiveTonnagePrev7d > 0 ? Math.round(effectiveTonnagePrev7d) : manualPrev,
          sourceLabelPt: "Soma carga × reps (7d)",
          canLogManualTest: false,
        };
      }

      // --- CORRIDA ---
      case "weekly_distance_km": {
        const sumKm = (arr: KpiSessionSample[]) =>
          Math.round(
            arr.reduce(
              (acc, s) =>
                acc +
                (s.distanceKm ??
                  (s.distanceMeters ? s.distanceMeters / 1000 : 0)),
              0
            ) * 10
          ) / 10;
        const cur = sumKm(primary7d);
        const prev = sumKm(primaryPrev7d);
        return {
          current: cur > 0 ? cur : manualCurrent,
          previous: prev > 0 ? prev : manualPrev,
          sourceLabelPt: cur > 0 ? `${primary7d.length} corridas (7d)` : "Registro / GPX",
          canLogManualTest: true,
        };
      }
      case "threshold_pace_sec_per_km": {
        const fastRuns = primary7d.filter(
          (s) => s.rpe >= 7 && (s.distanceKm || (s.distanceMeters ?? 0) > 0) && s.durationMinutes > 0
        );
        if (fastRuns.length > 0) {
          const paces = fastRuns.map((s) => {
            const km = s.distanceKm ?? (s.distanceMeters || 0) / 1000;
            return (s.durationMinutes * 60) / Math.max(0.5, km);
          });
          const bestPace = Math.round(Math.min(...paces));
          return {
            current: bestPace,
            previous: manualPrev,
            sourceLabelPt: "Sessões Z4/Z5 (7d)",
            canLogManualTest: true,
          };
        }
        return {
          current: manualCurrent,
          previous: manualPrev,
          sourceLabelPt: "Teste de limiar / 5–10 km",
          canLogManualTest: true,
        };
      }
      case "polarized_low_intensity_pct": {
        const totalMin = primary7d.reduce((a, s) => a + s.durationMinutes, 0);
        if (totalMin === 0) {
          return {
            current: manualCurrent,
            previous: manualPrev,
            sourceLabelPt: "Distribuição Z1–Z2 (7d)",
            canLogManualTest: false,
          };
        }
        const lowMin = primary7d
          .filter((s) => s.rpe <= 4.5)
          .reduce((a, s) => a + s.durationMinutes, 0);
        return {
          current: Math.round((lowMin / totalMin) * 100),
          previous: null,
          sourceLabelPt: "Seiler 80/20 (7d)",
          canLogManualTest: false,
        };
      }
      case "long_run_share_pct": {
        const kms = primary7d
          .map((s) => s.distanceKm ?? (s.distanceMeters ? s.distanceMeters / 1000 : 0))
          .filter((k) => k > 0);
        const total = kms.reduce((a, b) => a + b, 0);
        if (total <= 0) {
          return {
            current: null,
            previous: null,
            sourceLabelPt: "Maior corrida / semana",
            canLogManualTest: false,
          };
        }
        return {
          current: Math.round((Math.max(...kms) / total) * 100),
          previous: null,
          sourceLabelPt: "Controle ortopédico (7d)",
          canLogManualTest: false,
        };
      }

      // --- CICLISMO ---
      case "ftp_watts_per_kg": {
        return {
          current: manualCurrent,
          previous: manualPrev,
          sourceLabelPt: "Teste FTP / 20 min",
          canLogManualTest: true,
        };
      }
      case "weekly_tss_or_srpe": {
        const calcLoad = (arr: KpiSessionSample[]) =>
          Math.round(
            arr.reduce(
              (acc, s) =>
                acc +
                (s.tss ??
                  calculateUnifiedSessionLoad({
                    durationMinutes: s.durationMinutes,
                    rpe: s.rpe,
                    modalityCode: "cycling",
                  })),
              0
            )
          );
        const cur = calcLoad(primary7d);
        const prev = calcLoad(primaryPrev7d);
        return {
          current: cur > 0 ? cur : manualCurrent,
          previous: prev > 0 ? prev : manualPrev,
          sourceLabelPt: "TSS / sRPE ciclismo (7d)",
          canLogManualTest: false,
        };
      }
      case "tsb_form_balance": {
        const cycle42 = input.sessionsLast42Days.filter((s) =>
          isSeriousMatch(s.modalityCode, s.activityClass, "cycling")
        );
        if (cycle42.length === 0) {
          return {
            current: manualCurrent,
            previous: manualPrev,
            sourceLabelPt: "PMC (CTL 42d − ATL 7d)",
            canLogManualTest: false,
          };
        }
        const dailyMap = new Map<string, number>();
        for (const s of cycle42) {
          const load =
            s.tss ??
            calculateUnifiedSessionLoad({
              durationMinutes: s.durationMinutes,
              rpe: s.rpe,
              modalityCode: "cycling",
            });
          dailyMap.set(s.date, (dailyMap.get(s.date) || 0) + load);
        }
        const pmc = calculateCyclingPmc(dailyMap, today);
        return {
          current: pmc.tsb,
          previous: null,
          sourceLabelPt: `CTL ${pmc.ctl} − ATL ${pmc.atl}`,
          canLogManualTest: false,
        };
      }
      case "weekly_hours_and_elevation": {
        const hrs = (arr: KpiSessionSample[]) =>
          Math.round((arr.reduce((a, s) => a + s.durationMinutes, 0) / 60) * 10) / 10;
        const cur = hrs(primary7d);
        const prev = hrs(primaryPrev7d);
        return {
          current: cur > 0 ? cur : manualCurrent,
          previous: prev > 0 ? prev : manualPrev,
          sourceLabelPt: `${primary7d.length} pedais (7d)`,
          canLogManualTest: false,
        };
      }

      // --- VÔLEI DE PRAIA ---
      case "cmj_height_cm":
        return {
          current: manualCurrent,
          previous: manualPrev,
          sourceLabelPt: "Teste Salto Vertical (CMJ)",
          canLogManualTest: true,
        };
      case "weekly_sand_load_ua":
      case "weekly_futsal_load_ua":
      case "weekly_football_load_ua":
      case "weekly_mat_load_ua": {
        const sumUa = (arr: KpiSessionSample[]) =>
          arr.reduce(
            (acc, s) =>
              acc +
              calculateUnifiedSessionLoad({
                durationMinutes: s.durationMinutes,
                rpe: s.rpe,
                modalityCode: input.primaryModality,
              }),
            0
          );
        const cur = sumUa(primary7d);
        const prev = sumUa(primaryPrev7d);
        return {
          current: cur > 0 ? cur : manualCurrent,
          previous: prev > 0 ? prev : manualPrev,
          sourceLabelPt: `${primary7d.length} sessões (7d)`,
          canLogManualTest: false,
        };
      }
      case "weekly_jump_contacts": {
        const fromSessions = primary7d.reduce((a, s) => a + (s.jumpCount || 0), 0);
        return {
          current: fromSessions > 0 ? fromSessions : manualCurrent,
          previous: manualPrev,
          sourceLabelPt: fromSessions > 0 ? "Soma de sessões (7d)" : "Registro manual semanal",
          canLogManualTest: true,
        };
      }
      case "shoulder_prehab_adherence_pct": {
        const shoulderSets = (weeklySetsByCategory.ombros || 0) + (weeklySetsByCategory.core || 0);
        const completedFromCats = sessions7d.filter((s) =>
          s.completedCategories?.includes("ombros")
        ).length;
        const sessionsEst = Math.max(completedFromCats, shoulderSets >= 4 ? 2 : shoulderSets >= 2 ? 1 : 0);
        if (sessions7d.length === 0 && manualCurrent === null) {
          return {
            current: null,
            previous: null,
            sourceLabelPt: "Meta: 2×/sem ombro + core",
            canLogManualTest: false,
          };
        }
        return {
          current: Math.min(100, Math.round((sessionsEst / 2) * 100)),
          previous: null,
          sourceLabelPt: `${sessionsEst}/2 sessões na semana`,
          canLogManualTest: false,
        };
      }

      // --- NATAÇÃO ---
      case "css_pace_sec_per_100m":
      case "swolf_score":
        return {
          current: manualCurrent,
          previous: manualPrev,
          sourceLabelPt: "Teste de piscina",
          canLogManualTest: true,
        };
      case "weekly_swim_distance_m": {
        const sumM = (arr: KpiSessionSample[]) =>
          Math.round(
            arr.reduce(
              (acc, s) =>
                acc +
                (s.distanceMeters ?? (s.distanceKm ? s.distanceKm * 1000 : 0)),
              0
            )
          );
        const cur = sumM(primary7d);
        const prev = sumM(primaryPrev7d);
        return {
          current: cur > 0 ? cur : manualCurrent,
          previous: prev > 0 ? prev : manualPrev,
          sourceLabelPt: `${primary7d.length} treinos na água (7d)`,
          canLogManualTest: true,
        };
      }

      // --- FUNCIONAL ---
      case "high_rpe_session_share_pct": {
        if (primary7d.length === 0) {
          return {
            current: null,
            previous: null,
            sourceLabelPt: "Controle anti-burnout (7d)",
            canLogManualTest: false,
          };
        }
        const hard = primary7d.filter((s) => s.rpe >= 8).length;
        return {
          current: Math.round((hard / primary7d.length) * 100),
          previous: null,
          sourceLabelPt: `${hard}/${primary7d.length} sessões RPE ≥ 8`,
          canLogManualTest: false,
        };
      }

      // --- FUTSAL / FUTEBOL ---
      case "eccentric_prehab_adherence_pct":
      case "hamstring_eccentric_prehab_pct": {
        const legSets = weeklySetsByCategory.pernas || 0;
        const sessionsEst = legSets >= 6 ? 2 : legSets >= 2 ? 1 : 0;
        if (sessions7d.length === 0 && manualCurrent === null) {
          return {
            current: null,
            previous: null,
            sourceLabelPt: "Meta: 1–2×/sem Nordic/RDL",
            canLogManualTest: false,
          };
        }
        return {
          current: Math.min(100, Math.round((sessionsEst / 2) * 100)),
          previous: null,
          sourceLabelPt: `${sessionsEst}/2 estímulos na semana`,
          canLogManualTest: false,
        };
      }

      // --- LUTAS ---
      case "weekly_hard_sparring_sessions": {
        if (primary7d.length === 0 && manualCurrent === null) {
          return {
            current: null,
            previous: null,
            sourceLabelPt: "Sessões RPE ≥ 8,5 (7d)",
            canLogManualTest: false,
          };
        }
        const hardSpar = primary7d.filter((s) => s.rpe >= 8.5).length;
        return {
          current: primary7d.length > 0 ? hardSpar : manualCurrent,
          previous: null,
          sourceLabelPt: `Teto seguro: ≤3/sem`,
          canLogManualTest: false,
        };
      }
      case "relative_pull_hinge_strength": {
        if (bestE1rm7d > 0 && input.bodyWeightKg && input.bodyWeightKg > 35) {
          const ratio = Math.round((bestE1rm7d / input.bodyWeightKg) * 100) / 100;
          return {
            current: ratio,
            previous: manualPrev,
            sourceLabelPt: `e1RM ${bestE1rm7d}kg / ${input.bodyWeightKg}kg`,
            canLogManualTest: true,
          };
        }
        return {
          current: manualCurrent,
          previous: manualPrev,
          sourceLabelPt: "Teste de força relativa",
          canLogManualTest: true,
        };
      }

      // --- CALISTENIA ---
      case "anchor_strict_reps_pull_push": {
        const cur = maxStrictCalisReps > 0 ? maxStrictCalisReps : manualCurrent;
        return {
          current: cur,
          previous: manualPrev,
          sourceLabelPt: maxStrictCalisReps > 0 ? "Melhor série registrada (7d)" : "Teste barra/dip",
          canLogManualTest: true,
        };
      }
      case "weekly_pattern_effective_sets": {
        const patternSum =
          (weeklySetsByCategory.costas || 0) +
          (weeklySetsByCategory.peito || 0) +
          (weeklySetsByCategory.pernas || 0) +
          (weeklySetsByCategory.core || 0);
        if (patternSum === 0) {
          return {
            current: manualCurrent,
            previous: manualPrev,
            sourceLabelPt: "Séries por padrão (7d)",
            canLogManualTest: false,
          };
        }
        const activePatterns = [
          weeklySetsByCategory.costas,
          weeklySetsByCategory.peito,
          weeklySetsByCategory.pernas,
          weeklySetsByCategory.core,
        ].filter((v) => (v || 0) > 0).length;
        return {
          current: Math.round((patternSum / Math.max(1, activePatterns)) * 10) / 10,
          previous: null,
          sourceLabelPt: `Média em ${activePatterns} padrões (7d)`,
          canLogManualTest: false,
        };
      }

      // --- TESTES / BENCHMARKS GENÉRICOS ---
      default:
        return {
          current: manualCurrent,
          previous: manualPrev,
          sourceLabelPt: "Teste / Marca registrada",
          canLogManualTest: true,
        };
    }
  };

  const kpiCards: ComputedKpiCard[] = spec.kpis.map((def) => {
    const computed = computeKpiValue(def);
    const evaluated = evaluateSingleKpiStatus(computed.current, def, level);

    let deltaValue: number | null = null;
    let deltaLabelPt: string | null = null;
    if (computed.current !== null && computed.previous !== null) {
      deltaValue = Math.round((computed.current - computed.previous) * 100) / 100;
      const sign = deltaValue > 0 ? "+" : "";
      deltaLabelPt = `${sign}${deltaValue} ${def.unit}`;
    }

    return {
      key: def.key,
      labelPt: def.labelPt,
      shortLabelPt: def.shortLabelPt,
      unit: def.unit,
      direction: def.direction,
      cadence: def.cadence,
      isPrimaryGoalMetric: def.isPrimaryGoalMetric,
      currentValue: computed.current,
      formattedValue: formatKpiValue(computed.current, def.unit),
      previousValue: computed.previous,
      deltaValue,
      deltaLabelPt,
      referenceBand: def.experienceRanges[level],
      status: evaluated.status,
      statusLabelPt: evaluated.labelPt,
      interpretationPt: def.interpretationPt,
      sourceLabelPt: computed.sourceLabelPt,
      canLogManualTest: computed.canLogManualTest,
    };
  });

  // Guard-rails semanais da modalidade
  const sumDuration = (arr: KpiSessionSample[]) =>
    arr.reduce((a, s) => a + s.durationMinutes, 0);
  const hardSparringCount = primary7d.filter((s) => s.rpe >= 8.5).length;
  const highRpePct =
    primary7d.length > 0
      ? (primary7d.filter((s) => s.rpe >= 8).length / primary7d.length) * 100
      : undefined;
  const jumpCard = kpiCards.find((k) => k.key === "weekly_jump_contacts");
  const legSets = weeklySetsByCategory.pernas || 0;

  const guardrailWarnings = evaluateWeeklySafetyGuardrails({
    modalityCode: input.primaryModality,
    experienceLevel: level,
    previousWeekVolume: sumDuration(primaryPrev7d) || undefined,
    currentWeekVolume: sumDuration(primary7d) || undefined,
    weeklyMonotony: input.weeklyMonotony ?? undefined,
    acwr: input.acwr ?? undefined,
    weeklyJumpContacts: jumpCard?.currentValue ?? undefined,
    weeklyHighIntensitySharePct: highRpePct,
    weeklyHardSparringSessions:
      input.primaryModality === "martial_arts" ? hardSparringCount : undefined,
    weeklyMatchesCount:
      input.primaryModality === "football" || input.primaryModality === "futsal"
        ? primary7d.filter((s) => s.rpe >= 8).length
        : undefined,
    weeklyEccentricPrehabSessions:
      input.primaryModality === "football" || input.primaryModality === "futsal"
        ? legSets >= 2
          ? 1
          : 0
        : undefined,
  });

  const primaryKpiCard =
    kpiCards.find((k) => k.key === input.goalTarget?.primaryKpiKey) ||
    kpiCards.find((k) => k.isPrimaryGoalMetric) ||
    kpiCards[0];

  const onTrack = evaluateOnTrackAssessment({
    primaryKpiCard,
    goalTarget: input.goalTarget,
    guardrailWarnings,
    todayDateStr: today,
    modalityShortNamePt: spec.shortNamePt,
  });

  return {
    modalityCode: input.primaryModality,
    modalityNamePt: spec.namePt,
    modalityShortNamePt: spec.shortNamePt,
    experienceLevel: level,
    complementaryModalities: input.complementaryModalities || [],
    onTrack,
    kpis: kpiCards,
    guardrailWarnings,
    weeklySetsByCategory,
    casualSessionsLast7d,
    seriousSessionsLast7d,
    complementarySessionsLast7d,
  };
}
