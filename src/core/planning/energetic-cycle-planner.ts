/**
 * Motor do Calendário Integrado por Modalidade, Fichas Reais & Modulação por EA (§Fase 5)
 *
 * Fundamentação Acadêmica:
 * - Banister et al. (1975) & Busso (2003): Modelo Impulso-Resposta (Fitness-Fatigue).
 * - Issurin (2010): Periodização em Blocos (Base → Construção → Pico → Polimento/Deload).
 * - Mujika & Padilla (2003) & Bosquet et al. (2007): Tapering (−41 a −60% volume nos 7–14 dias finais).
 * - Blagrove et al. (2018), Rønnestad & Mujika (2014), Petersen et al. (2011), Cools et al. (2015),
 *   Schumann et al. (2022): Integração de fortalecimento complementar sem interferência de potência.
 * - Selye (1956) & Kellmann et al. (2018): EA atua como modulador de prontidão e recuperação.
 */

import { WEEKDAYS_MONDAY_FIRST } from "../../lib/week";
import {
  MODALITY_REGISTRY,
  inferCoreModalityFromText,
  type CoreModalityCode,
  type ExperienceLevel,
  type PeriodizationPhaseCode,
  type SessionArchetypeDefinition,
} from "../modalities";
import { calculateUnifiedSessionLoad } from "../performance/training-load";

export type EnergeticCyclePhase =
  | "expansion" // Base / Construção: progredir capacidade específica da modalidade
  | "stabilization" // Consolidação: manter ritmo, volume controlado e precisão técnica
  | "absorption" // Deload / Absorção: assimilar o bloco e dissipar fadiga residual
  | "peak"; // Ápice / Polimento (Taper): fadiga dissipada e prontidão máxima para a data-alvo

export type PlanningGoalMode = "competition" | "wellness_constancy";

export type PlanFeasibilityTier =
  | "optimal"
  | "ambitious"
  | "excessive_adjusted";

export interface LinkedRoutineOption {
  id: string;
  title: string;
  modalityCode: string;
  dayOfWeek: number | null; // 0..6 (jsDay)
  estimatedDurationMin?: number;
  estimatedLoadUa?: number;
  primaryCapacityLabelPt?: string;
}

export interface DailyPlannedCommitment {
  id: string;
  kind: "workout" | "recharge_habit" | "rest_protection" | "competition_day";
  titlePt: string;
  detailPt: string;
  timeSlotLabelPt: string;
  eaImpactText: string;
  eaSignedDelta: number;
  /** Campos integrados da Fase 5: arquétipo real da modalidade + vínculo com ficha real */
  sessionArchetypeCode?: string;
  sessionArchetypeShortPt?: string;
  targetZoneLabelPt?: string;
  activityClass?: "serious" | "complementary" | "recovery";
  linkedRoutineId?: string | null;
  linkedRoutineTitle?: string | null;
}

export interface PlannedCalendarDay {
  dateStr: string; // YYYY-MM-DD
  dayNumberInPlan: number;
  jsDay: number; // 0 (Dom) .. 6 (Sáb)
  weekdayShortPt: string;
  weekdayFullPt: string;
  phase: EnergeticCyclePhase;
  phaseLabelPt: string;
  periodizationBlockCode: PeriodizationPhaseCode;
  energyWaveLabelPt: string;
  projectedEa: number;
  expectedDrainEa: number;
  expectedRechargeEa: number;
  netDailyDeltaEa: number;
  isWorkoutDay: boolean;
  isBlockedByPersonalCommitment: boolean;
  isTargetEventDay: boolean;
  /** Rótulo curto da sessão principal do dia para exibição limpa na grade do calendário */
  primarySessionShortLabelPt: string | null;
  commitments: DailyPlannedCommitment[];
}

export interface PlannedWeeklyMilestone {
  weekNumber: number;
  startDateStr: string;
  endDateStr: string;
  blockNamePt: string;
  periodizationBlockCode: PeriodizationPhaseCode;
  phase: EnergeticCyclePhase;
  phaseLabelPt: string;
  startEa: number;
  targetEndEa: number;
  weeklyDeltaEa: number;
  plannedWorkoutsCount: number;
  targetWeeklyDrainEa: number;
  targetWeeklyRechargeEa: number;
  directivePt: string;
  scientificNotePt: string;
}

export interface WeeklySessionBlueprintSlot {
  jsDay: number;
  weekdayShortPt: string;
  archetypeCode: string;
  titlePt: string;
  shortLabelPt: string;
  targetZone: string;
  activityClass: "serious" | "complementary";
  linkedRoutineId: string | null;
  linkedRoutineTitle: string | null;
  purposePt: string;
}

export interface ModalityCycleBlueprint {
  headlinePt: string;
  subheadlinePt: string;
  primaryModalityCode: CoreModalityCode;
  primaryModalityNamePt: string;
  complementaryModalityCode: CoreModalityCode | null;
  complementaryProtocolSummaryPt: string | null;
  primaryKpiLabelPt: string;
  targetKpiSummaryPt: string | null;
  taperStartDateStr: string;
  taperDaysCount: number;
  eaModulationRulePt: string;
  weeklySlots: WeeklySessionBlueprintSlot[];
}

export interface EnergeticGrowthPlanResult {
  mode: PlanningGoalMode;
  eventTitle: string;
  modalityCode: CoreModalityCode;
  modalityLabelPt: string;
  complementaryModalityCode: CoreModalityCode | null;
  primaryKpiKey: string;
  startDateStr: string;
  targetDateStr: string;
  totalDays: number;
  totalWeeks: number;
  currentEa: number;
  requestedTargetEa: number;
  projectedPeakEa: number;
  totalGainEa: number;
  feasibility: PlanFeasibilityTier;
  feasibilityBadgePt: string;
  feasibilityExplanationPt: string;
  recommendedAlternativeDateStr: string | null;
  todayPhase: EnergeticCyclePhase;
  todayPhaseLabelPt: string;
  todayEnergySummaryPt: string;
  cycleBlueprint: ModalityCycleBlueprint;
  weeklyMilestones: PlannedWeeklyMilestone[];
  dailySchedule: PlannedCalendarDay[];
}

export interface EnergeticGrowthPlanInput {
  mode?: PlanningGoalMode;
  eventTitle?: string;
  modalityCode?: CoreModalityCode | string | null;
  modalityLabelPt?: string;
  complementaryModalityCode?: CoreModalityCode | null;
  experienceLevel?: ExperienceLevel;
  primaryKpiKey?: string | null;
  targetKpiValue?: number | null;
  kpiUnit?: string | null;
  userRoutines?: LinkedRoutineOption[];
  currentEa: number;
  targetEa?: number;
  startDateStr: string; // YYYY-MM-DD
  targetDateStr?: string; // YYYY-MM-DD
  targetDaysPerWeek?: number; // 2..7
  preferredWorkoutJsDays?: number[];
  blockedDates?: string[]; // YYYY-MM-DD
  strengthRecordsCount?: number;
  monthlyVolumeKg?: number;
}

const PHASE_META: Record<
  EnergeticCyclePhase,
  {
    labelPt: string;
    waveHighSchoolPt: string;
  }
> = {
  expansion: {
    labelPt: "Bloco de Construção · Progressão",
    waveHighSchoolPt: "Momento de evoluir estímulo específico com controle",
  },
  stabilization: {
    labelPt: "Bloco de Base · Consolidação",
    waveHighSchoolPt: "Ritmo constante, execução limpa e acúmulo seguro",
  },
  absorption: {
    labelPt: "Deload · Absorção & Supercompensação",
    waveHighSchoolPt: "Volume reduzido para consolidar ganhos e recarregar EA",
  },
  peak: {
    labelPt: "Polimento (Taper) · Ápice",
    waveHighSchoolPt: "Fadiga dissipada e prontidão máxima para o dia-alvo",
  },
};

function parseIsoDateUtc(dateStr: string): Date {
  const clean = /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
    ? dateStr
    : new Date().toISOString().split("T")[0];
  return new Date(`${clean}T12:00:00Z`);
}

function formatIsoDateUtc(d: Date): string {
  return d.toISOString().split("T")[0];
}

function addDaysIso(dateStr: string, days: number): string {
  const d = parseIsoDateUtc(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return formatIsoDateUtc(d);
}

function diffDaysIso(startStr: string, endStr: string): number {
  const a = parseIsoDateUtc(startStr).getTime();
  const b = parseIsoDateUtc(endStr).getTime();
  return Math.max(1, Math.round((b - a) / (24 * 3600 * 1000)));
}

function getWeekdayMeta(jsDay: number) {
  return (
    WEEKDAYS_MONDAY_FIRST.find((w) => w.jsDay === jsDay) ||
    WEEKDAYS_MONDAY_FIRST[0]
  );
}

/**
 * Seleciona os melhores dias da semana (Seg -> Dom) para distribuir os treinos
 * evitando acúmulo excessivo de fadiga consecutiva.
 */
export function selectOptimalWorkoutJsDays(
  targetDaysPerWeek: number,
  preferred?: number[]
): number[] {
  if (preferred && preferred.length > 0) {
    return Array.from(new Set(preferred)).slice(0, 7);
  }
  const clamped = Math.max(2, Math.min(7, Math.round(targetDaysPerWeek || 4)));
  switch (clamped) {
    case 2:
      return [2, 5]; // Ter, Sex
    case 3:
      return [1, 3, 5]; // Seg, Qua, Sex
    case 4:
      return [1, 2, 4, 6]; // Seg, Ter, Qui, Sáb
    case 5:
      return [1, 2, 4, 5, 6]; // Seg, Ter, Qui, Sex, Sáb
    case 6:
      return [1, 2, 3, 4, 5, 6]; // Seg a Sáb
    default:
      return [1, 2, 3, 4, 5, 6, 0];
  }
}

/**
 * Monta o mapa semanal de sessões reais da modalidade principal + fortalecimento complementar,
 * respeitando a ordem cronológica Seg → Dom e evitando conflito entre força pesada e sessões-chave
 * (ex.: longão/tiros na corrida, jogo na areia/campo).
 */
function buildWeeklySessionDistribution(params: {
  modalityCode: CoreModalityCode;
  complementaryModalityCode: CoreModalityCode | null;
  workoutJsDays: number[];
  userRoutines: LinkedRoutineOption[];
}): WeeklySessionBlueprintSlot[] {
  const { modalityCode, complementaryModalityCode, workoutJsDays, userRoutines } =
    params;
  const spec = MODALITY_REGISTRY[modalityCode];
  const archetypes = spec.sessionArchetypes;

  // Ordena dias escolhidos na ordem Seg -> Dom
  const mondayOrder = WEEKDAYS_MONDAY_FIRST.map((w) => w.jsDay);
  const sortedDays = [...workoutJsDays].sort(
    (a, b) => mondayOrder.indexOf(a) - mondayOrder.indexOf(b)
  );

  // Separa arquétipos estruturados (fichas/fortalecimento) dos arquétipos de prática da modalidade
  const strengthArchetypes = archetypes.filter((a) => a.usesStructuredRoutine);
  const mainSportArchetypes = archetypes.filter((a) => !a.usesStructuredRoutine);
  const includeComplementaryStrength =
    modalityCode !== "strength" &&
    (complementaryModalityCode === "strength" ||
      (complementaryModalityCode === null &&
        userRoutines.some((r) => r.modalityCode === "strength")));

  // Define sequência de arquétipos conforme nº de dias disponíveis
  const chosenArchetypes: SessionArchetypeDefinition[] = [];
  const totalSlots = sortedDays.length;

  if (modalityCode === "strength" || mainSportArchetypes.length === 0) {
    // Modalidades baseadas em fichas estruturadas (Musculação, Calistenia, Funcional)
    const activeSet = archetypes.filter(
      (a) => !a.applicablePhases.every((p) => p === "deload" || p === "taper")
    );
    const pool = activeSet.length > 0 ? activeSet : archetypes;
    for (let i = 0; i < totalSlots; i++) {
      chosenArchetypes.push(pool[i % pool.length]);
    }
  } else {
    // Modalidades de endurance / quadra / areia / combate / campo
    // Aloca 1 ou 2 slots de fortalecimento complementar (se habilitado) intercalados com a modalidade
    const compSlotsTarget = includeComplementaryStrength
      ? totalSlots >= 4
        ? Math.min(2, strengthArchetypes.length > 1 ? 2 : 1)
        : totalSlots >= 3
          ? 1
          : 0
      : 0;

    // Índices onde colocar fortalecimento (evitando o último dia da semana, que costuma ser longão/jogo)
    const compSlotIndexes = new Set<number>();
    if (compSlotsTarget === 1 && totalSlots >= 3) {
      compSlotIndexes.add(1); // ex.: 2º dia de treino
    } else if (compSlotsTarget >= 2 && totalSlots >= 4) {
      compSlotIndexes.add(1);
      compSlotIndexes.add(Math.max(2, totalSlots - 2));
    }

    let mainCursor = 0;
    let compCursor = 0;
    for (let i = 0; i < totalSlots; i++) {
      if (compSlotIndexes.has(i) && strengthArchetypes.length > 0) {
        chosenArchetypes.push(
          strengthArchetypes[compCursor % strengthArchetypes.length]
        );
        compCursor++;
      } else {
        // Se for o último dia de treino e houver "longão" ou "jogo/competitivo", prioriza nele
        const isLastSlot = i === totalSlots - 1;
        const weekendAnchor = isLastSlot
          ? mainSportArchetypes.find((a) =>
              /(long|competitive|match|sparring)/i.test(a.code)
            )
          : undefined;
        if (weekendAnchor && totalSlots >= 3) {
          chosenArchetypes.push(weekendAnchor);
        } else {
          chosenArchetypes.push(
            mainSportArchetypes[mainCursor % mainSportArchetypes.length]
          );
          mainCursor++;
        }
      }
    }
  }

  // Vincula fichas reais do usuário aos slots (primeiro por `dayOfWeek` exato, depois por compatibilidade)
  const usedRoutineIds = new Set<string>();
  const routinesByDay = new Map<number, LinkedRoutineOption>();
  for (const r of userRoutines) {
    if (typeof r.dayOfWeek === "number" && !routinesByDay.has(r.dayOfWeek)) {
      routinesByDay.set(r.dayOfWeek, r);
    }
  }

  const strengthRoutinesPool = userRoutines.filter(
    (r) =>
      r.modalityCode === "strength" ||
      r.modalityCode === modalityCode ||
      r.modalityCode === "functional" ||
      r.modalityCode === "calisthenics"
  );

  return sortedDays.map((jsDay, idx) => {
    const archetype = chosenArchetypes[idx] || archetypes[0];
    const wMeta = getWeekdayMeta(jsDay);
    const isComplementary =
      modalityCode !== "strength" && archetype.usesStructuredRoutine;

    let matchedRoutine: LinkedRoutineOption | null = null;
    const exactDayRoutine = routinesByDay.get(jsDay);

    if (exactDayRoutine && (archetype.usesStructuredRoutine || exactDayRoutine.modalityCode === modalityCode)) {
      matchedRoutine = exactDayRoutine;
      usedRoutineIds.add(exactDayRoutine.id);
    } else if (archetype.usesStructuredRoutine && strengthRoutinesPool.length > 0) {
      const nextUnused =
        strengthRoutinesPool.find((r) => !usedRoutineIds.has(r.id)) ||
        strengthRoutinesPool[idx % strengthRoutinesPool.length];
      matchedRoutine = nextUnused;
      usedRoutineIds.add(nextUnused.id);
    }

    return {
      jsDay,
      weekdayShortPt: wMeta.shortPt,
      archetypeCode: archetype.code,
      titlePt: matchedRoutine
        ? `${archetype.labelPt} · ${matchedRoutine.title}`
        : archetype.labelPt,
      shortLabelPt: matchedRoutine
        ? matchedRoutine.title.slice(0, 14)
        : archetype.shortLabelPt,
      targetZone: archetype.targetZone,
      activityClass: isComplementary ? "complementary" : "serious",
      linkedRoutineId: matchedRoutine?.id ?? null,
      linkedRoutineTitle: matchedRoutine?.title ?? null,
      purposePt: archetype.purposePt,
    };
  });
}

/**
 * Gera compromissos e hábitos reais, científicos e não-mecânicos, alinhados à modalidade,
 * ao KPI visado, à fase do ciclo e ao estímulo específico de cada dia.
 * Supera protocolos genéricos (como "beber água e dormir todos os dias"),
 * trazendo prehab articular, termorregulação de sódio, descompressão axial,
 * stiffness tendíneo e modulação autonômica do SNC.
 */
function generateTargetedDailyHabits(params: {
  dateStr: string;
  dayIdx: number;
  jsDay: number;
  modalityCode: CoreModalityCode;
  complementaryModalityCode: CoreModalityCode | null;
  phase: EnergeticCyclePhase;
  isWorkoutDay: boolean;
  isEventDay: boolean;
  isBlocked: boolean;
  archetypeCode?: string;
  shortNamePt: string;
}): DailyPlannedCommitment[] {
  const {
    dateStr,
    dayIdx,
    modalityCode,
    phase,
    isWorkoutDay,
    isEventDay,
    isBlocked,
    archetypeCode,
    shortNamePt,
  } = params;

  if (isEventDay) {
    return [
      {
        id: `hab_comp_prime_${dateStr}`,
        kind: "recharge_habit",
        titlePt: "Ativação Neural & Timing de Carboidrato Pré-Competição",
        detailPt:
          "Ingestão de 30–45g de carboidratos de rápida absorção 45 min antes e ativação com mobilidade articular dinâmica para pico de prontidão neuromuscular.",
        timeSlotLabelPt: "Pré-Prova",
        eaImpactText: "+80 EA",
        eaSignedDelta: 80,
        activityClass: "recovery",
      },
    ];
  }

  if (isBlocked) {
    return [
      {
        id: `hab_block_absorb_${dateStr}`,
        kind: "recharge_habit",
        titlePt: "Downtime Neural & Hidratação de Base (Janela Livre)",
        detailPt:
          "Aproveite a pausa na rotina para descompressão mental e restauração do tônus vagal parassimpático.",
        timeSlotLabelPt: "Absorção",
        eaImpactText: "+90 EA",
        eaSignedDelta: 90,
        activityClass: "recovery",
      },
    ];
  }

  // Se estiver na fase de polimento (peak) antes do dia-alvo:
  if (phase === "peak") {
    const peakHabits: DailyPlannedCommitment[] = [
      {
        id: `hab_peak_carb_${dateStr}`,
        kind: "recharge_habit",
        titlePt: "Supercompensação de Glicogênio & Hidratação Celular",
        detailPt:
          "Aporte gradual de carboidratos limpos e água eletrolítica para maximizar as reservas intramusculares sem sensação de peso gástrico.",
        timeSlotLabelPt: "Estratégico",
        eaImpactText: "+110 EA",
        eaSignedDelta: 110,
        activityClass: "recovery",
      },
      {
        id: `hab_peak_mind_${dateStr}`,
        kind: "recharge_habit",
        titlePt: "Ancoragem Cognitiva & Visualização de Ritmo (12 min)",
        detailPt:
          "Visualização dos momentos críticos da prova/partida e ancoragem de calma para modular a adrenalina antecipatória.",
        timeSlotLabelPt: "Foco Mental",
        eaImpactText: "+75 EA",
        eaSignedDelta: 75,
        activityClass: "recovery",
      },
    ];
    return [peakHabits[dayIdx % peakHabits.length]];
  }

  // Catálogo de compromissos específicos por modalidade e contexto do dia:
  if (modalityCode === "beach_volleyball") {
    if (isWorkoutDay) {
      const isPowerDay = archetypeCode === "bv_lower_power";
      const isShoulderDay = archetypeCode === "bv_shoulder_core";

      if (isPowerDay) {
        return [
          {
            id: `hab_bv_tendon_${dateStr}`,
            kind: "recharge_habit",
            titlePt: "Blindagem de Tendão Patelar & Isometria (Spanish Squat 3×45s)",
            detailPt:
              "Estimula a síntese de colágeno no polo inferior da patela e eleva a tolerância à desaceleração em aterrissagens profundas na areia (Rio et al., 2015).",
            timeSlotLabelPt: "Pré/Pós Salto",
            eaImpactText: "+85 EA",
            eaSignedDelta: 85,
            activityClass: "recovery",
          },
        ];
      }
      if (isShoulderDay || dayIdx % 2 === 0) {
        return [
          {
            id: `hab_bv_shoulder_${dateStr}`,
            kind: "recharge_habit",
            titlePt: "Blindagem de Manguito Rotador & Estabilidade Escapular (Y-T-W)",
            detailPt:
              "Fortalecimento excêntrico de rotadores externos e trapézio inferior para absorver a desaceleração de saques e ataques na areia (Cools et al., 2015).",
            timeSlotLabelPt: "Ativação",
            eaImpactText: "+80 EA",
            eaSignedDelta: 80,
            activityClass: "recovery",
          },
        ];
      }
      // Dia de jogo ou ralis na areia:
      return [
        {
          id: `hab_bv_electrolytes_${dateStr}`,
          kind: "recharge_habit",
          titlePt: "Reposição Eletrolítica de Sódio em Areia/Calor (500–700mg Na+)",
          detailPt:
            "Hidratação isotônica para termorregulação e manutenção da velocidade de condução neural, evitando câimbras e queda de impulsão no 3º set.",
          timeSlotLabelPt: "Intra/Pós Areia",
          eaImpactText: "+75 EA",
          eaSignedDelta: 75,
          activityClass: "recovery",
        },
      ];
    } else {
      // Dia de descanso / absorção no Vôlei de Praia
      const restHabits: DailyPlannedCommitment[] = [
        {
          id: `hab_bv_foot_mob_${dateStr}`,
          kind: "recharge_habit",
          titlePt: "Mobilidade de Tornozelo & Soltura da Fáscia Plantar / Sóleo",
          detailPt:
            "Liberação dos estabilizadores do tornozelo e dedos do pé para neutralizar o estresse mecânico acumulado na areia instável.",
          timeSlotLabelPt: "Recuperação",
          eaImpactText: "+90 EA",
          eaSignedDelta: 90,
          activityClass: "recovery",
        },
        {
          id: `hab_bv_neural_${dateStr}`,
          kind: "recharge_habit",
          titlePt: "Downtime Neural do SNC: Respiração Diafragmática 4-7-8 (10 min)",
          detailPt:
            "Desativação parassimpática para dissipar a fadiga central acumulada após treinos de explosão e potência de salto.",
          timeSlotLabelPt: "Noite",
          eaImpactText: "+110 EA",
          eaSignedDelta: 110,
          activityClass: "recovery",
        },
      ];
      return [restHabits[dayIdx % restHabits.length]];
    }
  }

  if (modalityCode === "running") {
    if (isWorkoutDay) {
      const isLong = archetypeCode === "run_long";
      if (isLong) {
        return [
          {
            id: `hab_run_glycogen_${dateStr}`,
            kind: "recharge_habit",
            titlePt: "Janela de Glicogênio & Carboidrato Pós-Longão (1.0–1.2g/kg)",
            detailPt:
              "Reposição imediata de glicogênio muscular e eletrólitos nas primeiras 2h para proteger o sistema imunológico e manter prontidão semanal.",
            timeSlotLabelPt: "Pós-Longão",
            eaImpactText: "+85 EA",
            eaSignedDelta: 85,
            activityClass: "recovery",
          },
        ];
      }
      return [
        {
          id: `hab_run_achilles_${dateStr}`,
          kind: "recharge_habit",
          titlePt: "Fortalecimento Isométrico de Tendão de Aquiles & Sóleo (3×40s)",
          detailPt:
            "Aumenta o stiffness elástico do tendão de Aquiles, aprimorando diretamente a economia de corrida (Running Economy) (Blagrove et al., 2018).",
          timeSlotLabelPt: "Biomecânica",
          eaImpactText: "+80 EA",
          eaSignedDelta: 80,
          activityClass: "recovery",
        },
      ];
    } else {
      const restHabits: DailyPlannedCommitment[] = [
        {
          id: `hab_run_flush_${dateStr}`,
          kind: "recharge_habit",
          titlePt: "Drenagem Metabólica de Pernas (Banho de Contraste ou Elevação 15 min)",
          detailPt:
            "Estimula o retorno venoso e a remoção de metabólitos intramusculares após dias de impacto contínuo.",
          timeSlotLabelPt: "Recuperação",
          eaImpactText: "+95 EA",
          eaSignedDelta: 95,
          activityClass: "recovery",
        },
        {
          id: `hab_run_itb_mob_${dateStr}`,
          kind: "recharge_habit",
          titlePt: "Estabilidade Pélvica com Miniband & Soltura do Trato Iliotibial",
          detailPt:
            "Prevenção do valgo dinâmico e atrito da banda iliotibial (ITB) no côndilo femoral lateral.",
          timeSlotLabelPt: "Prehab",
          eaImpactText: "+85 EA",
          eaSignedDelta: 85,
          activityClass: "recovery",
        },
      ];
      return [restHabits[dayIdx % restHabits.length]];
    }
  }

  if (modalityCode === "strength" || modalityCode === "calisthenics" || modalityCode === "functional") {
    if (isWorkoutDay) {
      if (dayIdx % 2 === 0) {
        return [
          {
            id: `hab_str_spine_${dateStr}`,
            kind: "recharge_habit",
            titlePt: "Descompressão Axial de Coluna em Barra Fixa (Dead Hang 2×60s)",
            detailPt:
              "Alivia a pressão discal intervertebral acumulada sob carga axial e reidrata os discos lombares pós-agachamento/terra.",
            timeSlotLabelPt: "Pós-Treino",
            eaImpactText: "+80 EA",
            eaSignedDelta: 80,
            activityClass: "recovery",
          },
        ];
      }
      return [
        {
          id: `hab_str_protein_${dateStr}`,
          kind: "recharge_habit",
          titlePt: "Distribuição Proteica em Pulsos de 0.4g/kg com Leucina",
          detailPt:
            "Estimula a via mTOR em intervalos de 3–4h para taxa ótima de síntese proteica miofibrilar e adaptação estrutural (Morton et al., 2018).",
          timeSlotLabelPt: "Nutrição",
          eaImpactText: "+85 EA",
          eaSignedDelta: 85,
          activityClass: "recovery",
        },
      ];
    } else {
      const restHabits: DailyPlannedCommitment[] = [
        {
          id: `hab_str_hip_mob_${dateStr}`,
          kind: "recharge_habit",
          titlePt: "Mobilidade de Quadril 90/90 & Soltura de Psoas / Cadeia Posterior",
          detailPt:
            "Restaura a rotação interna/externa de quadril e previne retroversão pélvica sob agachamento pesado.",
          timeSlotLabelPt: "Recuperação",
          eaImpactText: "+90 EA",
          eaSignedDelta: 90,
          activityClass: "recovery",
        },
        {
          id: `hab_str_cns_down_${dateStr}`,
          kind: "recharge_habit",
          titlePt: "Downtime Neural do SNC & Sono com Higiene Circadiana (8h)",
          detailPt:
            "Potencializa os picos noturnos de GH e testosterona, regenerando o sistema neuromuscular pós-cargas elevadas.",
          timeSlotLabelPt: "Noite",
          eaImpactText: "+110 EA",
          eaSignedDelta: 110,
          activityClass: "recovery",
        },
      ];
      return [restHabits[dayIdx % restHabits.length]];
    }
  }

  // Modalidades gerais (ciclismo, futebol, lutas, etc.):
  if (isWorkoutDay) {
    return [
      {
        id: `hab_spec_prehab_${dateStr}`,
        kind: "recharge_habit",
        titlePt: `Ativação Articular Específica para ${shortNamePt} (10–12 min)`,
        detailPt:
          "Prepara as cadeias biomecânicas mais exigidas pela modalidade, aumentando prontidão e reduzindo o risco de sobrecarga pontual.",
        timeSlotLabelPt: "Pré-Treino",
        eaImpactText: "+80 EA",
        eaSignedDelta: 80,
        activityClass: "recovery",
      },
    ];
  } else {
    return [
      {
        id: `hab_spec_rest_${dateStr}`,
        kind: "recharge_habit",
        titlePt: `Recuperação Ativa & Modulação Autonômica para ${shortNamePt}`,
        detailPt:
          "Soltura miofascial e caminhada leve com respiração cadenciada para drenagem de fadiga e assimilação do bloco de treino.",
        timeSlotLabelPt: "Recuperação",
        eaImpactText: "+95 EA",
        eaSignedDelta: 95,
        activityClass: "recovery",
      },
    ];
  }
}
export function planEnergeticGrowthCurve(
  input: EnergeticGrowthPlanInput
): EnergeticGrowthPlanResult {
  const mode: PlanningGoalMode = input.mode || "competition";
  const modalityCode: CoreModalityCode = inferCoreModalityFromText(
    input.modalityCode || input.modalityLabelPt,
    "strength"
  );
  const spec = MODALITY_REGISTRY[modalityCode];
  const experienceLevel: ExperienceLevel = input.experienceLevel || "intermediate";

  const startDateStr = input.startDateStr;
  const defaultTargetDate = addDaysIso(startDateStr, 28);
  const rawTargetDate = input.targetDateStr || defaultTargetDate;

  const totalDays = Math.max(
    7,
    Math.min(180, diffDaysIso(startDateStr, rawTargetDate))
  );
  const targetDateStr = addDaysIso(startDateStr, totalDays);
  const totalWeeks = Math.max(1, Math.ceil(totalDays / 7));

  const currentEa = Math.max(400, Math.round(input.currentEa || 1455));
  const defaultTargetEa =
    mode === "competition"
      ? Math.round(currentEa * 1.18)
      : Math.round(currentEa * 1.1);
  const requestedTargetEa = Math.max(
    currentEa + 50,
    Math.round(input.targetEa || defaultTargetEa)
  );
  const requestedDeltaEa = requestedTargetEa - currentEa;

  const targetDaysPerWeek = Math.max(
    2,
    Math.min(6, Math.round(input.targetDaysPerWeek || 4))
  );
  const workoutJsDays = selectOptimalWorkoutJsDays(
    targetDaysPerWeek,
    input.preferredWorkoutJsDays
  );
  const workoutJsSet = new Set(workoutJsDays);
  const blockedSet = new Set(input.blockedDates || []);

  const modalityLabelPt = input.modalityLabelPt?.trim() || spec.shortNamePt;
  const eventTitle =
    input.eventTitle?.trim() ||
    (mode === "competition"
      ? `Ciclo de Performance · ${spec.shortNamePt}`
      : `Constância & Evolução · ${spec.shortNamePt}`);

  const complementaryModalityCode =
    input.complementaryModalityCode !== undefined
      ? input.complementaryModalityCode
      : modalityCode !== "strength"
        ? "strength"
        : null;

  const primaryKpiDef =
    spec.kpis.find((k) => k.key === input.primaryKpiKey) ||
    spec.kpis.find((k) => k.isPrimaryGoalMetric) ||
    spec.kpis[0];

  const weeklySlots = buildWeeklySessionDistribution({
    modalityCode,
    complementaryModalityCode,
    workoutJsDays,
    userRoutines: input.userRoutines || [],
  });
  const slotByJsDay = new Map(weeklySlots.map((s) => [s.jsDay, s]));

  // 1. Avaliação Científica de Viabilidade (Banister 1975; Gabbett 2016; Bosquet 2007)
  const maxSafeGainPerDay = 15.5;
  const taperSupercompensationBonus = mode === "competition" ? 115 : 60;
  const maxSafeTotalGainEa = Math.round(
    totalDays * maxSafeGainPerDay + taperSupercompensationBonus
  );

  let feasibility: PlanFeasibilityTier = "optimal";
  let feasibilityBadgePt = "Progressão Fisiológica Segura";
  let feasibilityExplanationPt = `Ciclo estruturado para ${spec.shortNamePt} respeitando blocos de carga, recuperação e supercompensação.`;
  let recommendedAlternativeDateStr: string | null = null;

  const requiredDailyRate = requestedDeltaEa / totalDays;
  if (requestedDeltaEa > maxSafeTotalGainEa * 1.18) {
    feasibility = "excessive_adjusted";
    feasibilityBadgePt = "Prazo Curto · Curva Protegida";
    const idealDaysNeeded = Math.ceil(
      Math.max(
        14,
        (requestedDeltaEa - taperSupercompensationBonus) / maxSafeGainPerDay
      )
    );
    recommendedAlternativeDateStr = addDaysIso(startDateStr, idealDaysNeeded);
    feasibilityExplanationPt = `A meta solicitada (+${requestedDeltaEa} EA em ${totalDays} dias) excede o teto seguro de adaptação. Ajustamos o ritmo ao limite fisiológico e sugerimos ${new Date(
      `${recommendedAlternativeDateStr}T12:00:00Z`
    ).toLocaleDateString("pt-BR")} como data ideal.`;
  } else if (requiredDailyRate > 13.5) {
    feasibility = "ambitious";
    feasibilityBadgePt = "Ciclo Desafiador · Exige Disciplina em Recuperação";
    feasibilityExplanationPt = `Meta viável para ${spec.shortNamePt}, exigindo aderência rigorosa ao sono e à janela de polimento final.`;
  }

  const effectiveTotalGainEa =
    feasibility === "excessive_adjusted" ? maxSafeTotalGainEa : requestedDeltaEa;
  const projectedPeakEa = currentEa + effectiveTotalGainEa;

  // 2. Mapeamento dos Blocos de Periodização da Modalidade (Base → Construção → Pico → Polimento/Deload)
  const taperDaysCount =
    mode === "competition"
      ? totalDays >= 21
        ? 7
        : Math.max(3, Math.round(totalDays * 0.25))
      : 3;

  const deloadFreq = spec.safetyGuardrails.deloadFrequencyWeeks || 4;
  const dailySchedule: PlannedCalendarDay[] = [];

  for (let dayIdx = 0; dayIdx <= totalDays; dayIdx++) {
    const dateStr = addDaysIso(startDateStr, dayIdx);
    const d = parseIsoDateUtc(dateStr);
    const jsDay = d.getUTCDay();
    const wMeta = getWeekdayMeta(jsDay);
    const isEventDay = dayIdx === totalDays;
    const isBlocked = blockedSet.has(dateStr);
    const daysRemaining = totalDays - dayIdx;
    const weekIndexZero = Math.floor(dayIdx / 7);
    const progressFraction = dayIdx / Math.max(1, totalDays);

    let phase: EnergeticCyclePhase = "expansion";
    let periodizationBlockCode: PeriodizationPhaseCode = "build";

    if (isEventDay || daysRemaining < taperDaysCount) {
      phase = "peak";
      periodizationBlockCode = mode === "competition" ? "taper" : "peak";
    } else if (
      (totalWeeks >= deloadFreq && weekIndexZero % deloadFreq === deloadFreq - 1) ||
      (!workoutJsSet.has(jsDay) && jsDay === 0)
    ) {
      phase = "absorption";
      periodizationBlockCode = "deload";
    } else if (progressFraction < 0.35) {
      phase = "stabilization";
      periodizationBlockCode = "base";
    } else if (progressFraction < 0.82) {
      phase = "expansion";
      periodizationBlockCode = "build";
    } else {
      phase = "expansion";
      periodizationBlockCode = "peak";
    }

    const pMeta = PHASE_META[phase];
    const isWorkoutDay = !isEventDay && !isBlocked && workoutJsSet.has(jsDay);

    const curvedEa =
      dayIdx === 0
        ? currentEa
        : dayIdx === totalDays
          ? projectedPeakEa
          : Math.round(
              currentEa +
                effectiveTotalGainEa * Math.pow(progressFraction, 0.92)
            );
    const prevEa =
      dayIdx === 0 ? currentEa : dailySchedule[dayIdx - 1].projectedEa;
    const netDailyDeltaEa = curvedEa - prevEa;

    let expectedDrainEa = 0;
    let expectedRechargeEa = 115;
    let primarySessionShortLabelPt: string | null = null;
    const commitments: DailyPlannedCommitment[] = [];

    if (isEventDay) {
      expectedDrainEa = 0;
      expectedRechargeEa = 140;
      primarySessionShortLabelPt = "DIA-ALVO";
      commitments.push({
        id: `evt_${dateStr}`,
        kind: "competition_day",
        titlePt:
          mode === "competition"
            ? `Dia-Alvo: ${eventTitle}`
            : `Avaliação do Ciclo: ${eventTitle}`,
        detailPt: `Prontidão projetada em ${curvedEa} EA para ${spec.shortNamePt}. Faça ativação articular leve (10 min), hidratação e registre sua nova marca em ${primaryKpiDef.shortLabelPt}.`,
        timeSlotLabelPt: "Dia Principal",
        eaImpactText: `Prontidão: ${curvedEa} EA`,
        eaSignedDelta: netDailyDeltaEa,
        activityClass: "serious",
      });
    } else if (isBlocked) {
      expectedDrainEa = 0;
      expectedRechargeEa = 120;
      primarySessionShortLabelPt = "Agenda";
      commitments.push({
        id: `blk_${dateStr}`,
        kind: "rest_protection",
        titlePt: "Compromisso Pessoal · Janela de Absorção",
        detailPt:
          "Dia protegido pelo Selye: a carga semanal foi redistribuída para que seu compromisso funcione como recuperação biológica.",
        timeSlotLabelPt: "Protegido",
        eaImpactText: "+120 EA (Absorção)",
        eaSignedDelta: 120,
        activityClass: "recovery",
      });
    } else if (isWorkoutDay) {
      const slot = slotByJsDay.get(jsDay) || weeklySlots[dayIdx % weeklySlots.length];
      const archetype =
        spec.sessionArchetypes.find((a) => a.code === slot.archetypeCode) ||
        spec.sessionArchetypes[0];

      // Volume e carga modulados pela fase de periodização (Base / Construção / Deload / Taper)
      const phaseScale =
        phase === "peak" ? 0.55 : phase === "absorption" ? 0.68 : phase === "stabilization" ? 0.92 : 1.05;

      const avgDur = Math.round(
        ((archetype.typicalDurationMin.min + archetype.typicalDurationMin.max) / 2) *
          phaseScale
      );
      const avgRpe =
        phase === "peak"
          ? Math.max(5.5, archetype.typicalRpe.min)
          : phase === "absorption"
            ? Math.max(5, archetype.typicalRpe.min - 0.5)
            : (archetype.typicalRpe.min + archetype.typicalRpe.max) / 2;

      const baseDrain =
        slot.linkedRoutineId && input.userRoutines
          ? input.userRoutines.find((r) => r.id === slot.linkedRoutineId)
              ?.estimatedLoadUa ||
            calculateUnifiedSessionLoad({
              durationMinutes: avgDur,
              rpe: avgRpe,
              modalityCode: slot.activityClass === "complementary" ? "strength" : modalityCode,
            })
          : calculateUnifiedSessionLoad({
              durationMinutes: avgDur,
              rpe: avgRpe,
              modalityCode: slot.activityClass === "complementary" ? "strength" : modalityCode,
            });

      expectedDrainEa = Math.round(Math.max(110, Math.min(480, baseDrain * (phase === "peak" ? 0.6 : phase === "absorption" ? 0.72 : 1))));
      expectedRechargeEa = phase === "peak" ? 185 : 195;

      const phasePrefix =
        phase === "peak"
          ? "Polimento (-45% vol.) · "
          : phase === "absorption"
            ? "Deload (-30% vol.) · "
            : "";

      primarySessionShortLabelPt =
        phase === "peak"
          ? `Taper · ${slot.shortLabelPt.slice(0, 8)}`
          : slot.shortLabelPt;

      commitments.push({
        id: `wk_${dateStr}`,
        kind: "workout",
        titlePt: `${phasePrefix}${slot.titlePt}`,
        detailPt: `${slot.purposePt} Alvo: ${slot.targetZone} (~${Math.max(
          20,
          avgDur
        )} min · RPE ${avgRpe.toFixed(1)}).${
          slot.linkedRoutineTitle
            ? ` Ficha vinculada: "${slot.linkedRoutineTitle}".`
            : ""
        }`,
        timeSlotLabelPt:
          slot.activityClass === "complementary"
            ? "Fortalecimento"
            : spec.shortNamePt,
        eaImpactText: `-${expectedDrainEa} EA`,
        eaSignedDelta: -expectedDrainEa,
        sessionArchetypeCode: slot.archetypeCode,
        sessionArchetypeShortPt: slot.shortLabelPt,
        targetZoneLabelPt: slot.targetZone,
        activityClass: slot.activityClass,
        linkedRoutineId: slot.linkedRoutineId,
        linkedRoutineTitle: slot.linkedRoutineTitle,
      });
    } else {
      expectedDrainEa = 0;
      expectedRechargeEa = 145;
      primarySessionShortLabelPt = "Recarga";
      commitments.push({
        id: `rest_${dateStr}`,
        kind: "rest_protection",
        titlePt: `Recuperação & Supercompensação (${spec.shortNamePt})`,
        detailPt:
          "Dia sem estímulo de desgaste para converter as sessões da semana em adaptação neural e tecidual (+EA).",
        timeSlotLabelPt: "Descanso Ativo",
        eaImpactText: "+65 EA",
        eaSignedDelta: 65,
        activityClass: "recovery",
      });
    }

    // Protocolos direcionados de recuperação, prehab, eletrólitos & downtime neural alinhados à modalidade e ao KPI
    const targetedHabits = generateTargetedDailyHabits({
      dateStr,
      dayIdx,
      jsDay,
      modalityCode,
      complementaryModalityCode: input.complementaryModalityCode || null,
      phase,
      isWorkoutDay,
      isEventDay,
      isBlocked,
      archetypeCode: isWorkoutDay
        ? (slotByJsDay.get(jsDay) || weeklySlots[dayIdx % weeklySlots.length])?.archetypeCode
        : undefined,
      shortNamePt: spec.shortNamePt,
    });
    commitments.push(...targetedHabits);

    dailySchedule.push({
      dateStr,
      dayNumberInPlan: dayIdx + 1,
      jsDay,
      weekdayShortPt: wMeta.shortPt,
      weekdayFullPt: wMeta.fullPt,
      phase,
      phaseLabelPt: pMeta.labelPt,
      periodizationBlockCode,
      energyWaveLabelPt: pMeta.waveHighSchoolPt,
      projectedEa: curvedEa,
      expectedDrainEa,
      expectedRechargeEa,
      netDailyDeltaEa,
      isWorkoutDay,
      isBlockedByPersonalCommitment: isBlocked,
      isTargetEventDay: isEventDay,
      primarySessionShortLabelPt,
      commitments,
    });
  }

  // 3. Marcos Semanais baseados nos blocos reais da modalidade (`spec.periodizationPhases`)
  const weeklyMilestones: PlannedWeeklyMilestone[] = [];
  for (let w = 0; w < totalWeeks; w++) {
    const slice = dailySchedule.slice(w * 7, (w + 1) * 7);
    if (slice.length === 0) continue;

    const firstDay = slice[0];
    const lastDay = slice[slice.length - 1];
    const isLastWeek = w === totalWeeks - 1;
    const isDeloadWeek = !isLastWeek && totalWeeks >= deloadFreq && w % deloadFreq === deloadFreq - 1;

    const blockCode: PeriodizationPhaseCode =
      isLastWeek && mode === "competition"
        ? "taper"
        : isDeloadWeek
          ? "deload"
          : w < Math.max(1, Math.floor(totalWeeks * 0.35))
            ? "base"
            : w >= totalWeeks - 2 && totalWeeks >= 4
              ? "peak"
              : "build";

    const modPhaseRule =
      spec.periodizationPhases.find((p) => p.phase === blockCode) ||
      spec.periodizationPhases[0];

    const phase: EnergeticCyclePhase =
      blockCode === "taper"
        ? "peak"
        : blockCode === "deload"
          ? "absorption"
          : blockCode === "base"
            ? "stabilization"
            : "expansion";

    const startEa =
      w === 0
        ? currentEa
        : weeklyMilestones[w - 1]?.targetEndEa ?? firstDay.projectedEa;
    const targetEndEa = lastDay.projectedEa;

    weeklyMilestones.push({
      weekNumber: w + 1,
      startDateStr: firstDay.dateStr,
      endDateStr: lastDay.dateStr,
      blockNamePt: `Semana ${w + 1} · ${modPhaseRule.labelPt}`,
      periodizationBlockCode: blockCode,
      phase,
      phaseLabelPt: PHASE_META[phase].labelPt,
      startEa,
      targetEndEa,
      weeklyDeltaEa: targetEndEa - startEa,
      plannedWorkoutsCount: slice.filter((d) => d.isWorkoutDay).length,
      targetWeeklyDrainEa: slice.reduce((acc, d) => acc + d.expectedDrainEa, 0),
      targetWeeklyRechargeEa: slice.reduce(
        (acc, d) => acc + d.expectedRechargeEa,
        0
      ),
      directivePt: modPhaseRule.directivePt,
      scientificNotePt: `Foco: ${modPhaseRule.intensityFocusPt} (${spec.shortNamePt}).`,
    });
  }

  // 4. Arquitetura Integrada do Ciclo (substitui definitivamente a antiga receita X/Y/Z)
  const taperStartDateStr = addDaysIso(targetDateStr, -taperDaysCount);
  const targetDateFormatted = new Date(
    `${targetDateStr}T12:00:00Z`
  ).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

  const targetKpiSummaryPt =
    typeof input.targetKpiValue === "number" && !Number.isNaN(input.targetKpiValue)
      ? `${primaryKpiDef.shortLabelPt} → ${input.targetKpiValue} ${input.kpiUnit || primaryKpiDef.unit}`
      : null;

  const compFreq =
    spec.complementaryStrength.recommendedFrequencyPerWeek[experienceLevel];

  const cycleBlueprint: ModalityCycleBlueprint = {
    headlinePt: `Plano de ${spec.shortNamePt} (${totalWeeks} sem até ${targetDateFormatted})${
      targetKpiSummaryPt ? ` · Meta: ${targetKpiSummaryPt}` : ""
    }`,
    subheadlinePt:
      complementaryModalityCode === "strength" && modalityCode !== "strength"
        ? `Integra sessões específicas de ${spec.shortNamePt} + fortalecimento complementar (${compFreq.min}–${compFreq.max}×/sem) com a EA modulando sua prontidão diária.`
        : `Sessões estruturadas de ${spec.shortNamePt} distribuídas nos seus ${targetDaysPerWeek} dias disponíveis, com a EA modulando volume e recuperação.`,
    primaryModalityCode: modalityCode,
    primaryModalityNamePt: spec.namePt,
    complementaryModalityCode,
    complementaryProtocolSummaryPt:
      complementaryModalityCode === "strength" && modalityCode !== "strength"
        ? spec.complementaryStrength.objectiveHeadlinePt
        : null,
    primaryKpiLabelPt: primaryKpiDef.labelPt,
    targetKpiSummaryPt,
    taperStartDateStr,
    taperDaysCount,
    eaModulationRulePt:
      "Em dias de EA/prontidão baixa no Check-in Matinal, o Selye suaviza automaticamente o volume previsto para proteger sua curva até a data-alvo.",
    weeklySlots,
  };

  const todayEntry = dailySchedule[0];

  return {
    mode,
    eventTitle,
    modalityCode,
    modalityLabelPt,
    complementaryModalityCode,
    primaryKpiKey: primaryKpiDef.key,
    startDateStr,
    targetDateStr,
    totalDays,
    totalWeeks,
    currentEa,
    requestedTargetEa,
    projectedPeakEa,
    totalGainEa: effectiveTotalGainEa,
    feasibility,
    feasibilityBadgePt,
    feasibilityExplanationPt,
    recommendedAlternativeDateStr,
    todayPhase: todayEntry.phase,
    todayPhaseLabelPt: todayEntry.phaseLabelPt,
    todayEnergySummaryPt: todayEntry.energyWaveLabelPt,
    cycleBlueprint,
    weeklyMilestones,
    dailySchedule,
  };
}
