/**
 * Motor do Calendário Perene de Ciclo Energético & Planejador Inverso de Metas/Competições (§Fase 17)
 *
 * Fundamentação Acadêmica:
 * - Banister et al. (1975) & Busso (2003): Modelo Impulso-Resposta (Fitness-Fatigue) — Capacidade Construída vs. Fadiga Residual.
 * - Issurin (2010): Periodização em Blocos (Acumulação -> Transmutação -> Realização/Polimento).
 * - Mujika & Padilla (2003) & Bosquet et al. (2007): Ciência do Tapering (redução de 40-60% do volume nos 7-14 dias finais
 *   dissipando a fadiga aguda e provocando a supercompensação da Reserva de Energia Adaptativa no dia da competição).
 * - Kellmann (2010) & Meeusen et al. (2013): Equilíbrio Recuperação-Estresse e prevenção de overreaching não-funcional.
 * - Gollwitzer (1999): Intenções de implementação ("Para atingir X em Y, faça A, B e C em tais dias").
 */

import { WEEKDAYS_MONDAY_FIRST } from "../../lib/week";

export type EnergeticCyclePhase =
  | "expansion" // 🟢 Energia em Alta: Acelerar, progredir força e construir capacidade
  | "stabilization" // 🔵 Energia Estável: Manter ritmo, volume controlado e precisão técnica
  | "absorption" // 🟡 Absorção & Recarga: Assimilar o treino, reduzir desgaste e focar em +EA
  | "peak"; // ⚡ Ápice & Polimento: Fadiga dissipada e EA no topo para competição ou marco

export type PlanningGoalMode =
  | "competition" // Rumo ao Ápice: Preparação com data marcada e meta de EA (ex: 1455 -> 1800 EA)
  | "wellness_constancy"; // Ritmo Perene: Constância, saúde, disposição e ondas naturais 3:1 para o dia a dia

export type PlanFeasibilityTier =
  | "optimal"
  | "ambitious"
  | "excessive_adjusted";

export interface DailyPlannedCommitment {
  id: string;
  kind: "workout" | "recharge_habit" | "rest_protection" | "competition_day";
  titlePt: string;
  detailPt: string;
  timeSlotLabelPt: string;
  eaImpactText: string;
  eaSignedDelta: number;
}

export interface PlannedCalendarDay {
  dateStr: string; // YYYY-MM-DD
  dayNumberInPlan: number;
  jsDay: number; // 0 (Dom) .. 6 (Sáb)
  weekdayShortPt: string;
  weekdayFullPt: string;
  phase: EnergeticCyclePhase;
  phaseLabelPt: string;
  energyWaveLabelPt: string;
  projectedEa: number;
  expectedDrainEa: number;
  expectedRechargeEa: number;
  netDailyDeltaEa: number;
  isWorkoutDay: boolean;
  isBlockedByPersonalCommitment: boolean;
  isTargetEventDay: boolean;
  commitments: DailyPlannedCommitment[];
}

export interface PlannedWeeklyMilestone {
  weekNumber: number;
  startDateStr: string;
  endDateStr: string;
  blockNamePt: string;
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

export interface ExecutiveActionPillar {
  code: "stimulus_x" | "recharge_y" | "taper_z";
  badgePt: string;
  titlePt: string;
  actionSummaryPt: string;
  scheduleDaysLabelPt: string;
}

export interface EnergeticGrowthPlanResult {
  mode: PlanningGoalMode;
  eventTitle: string;
  modalityLabelPt: string;
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
  executiveRecipe: {
    headlinePt: string;
    subheadlinePt: string;
    pillars: ExecutiveActionPillar[];
  };
  weeklyMilestones: PlannedWeeklyMilestone[];
  dailySchedule: PlannedCalendarDay[];
}

export interface EnergeticGrowthPlanInput {
  mode?: PlanningGoalMode;
  eventTitle?: string;
  modalityLabelPt?: string;
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
    labelPt: "Fase de Expansão · Acelerar",
    waveHighSchoolPt: "Energia em Alta · Momento de evoluir força e ritmo",
  },
  stabilization: {
    labelPt: "Fase de Estabilização · Ritmo",
    waveHighSchoolPt: "Energia Equilibrada · Constância e execução limpa",
  },
  absorption: {
    labelPt: "Fase de Absorção · Recarga",
    waveHighSchoolPt: "Corpo Assimilando · Reduzir desgaste e somar +EA",
  },
  peak: {
    labelPt: "Fase de Ápice · Polimento",
    waveHighSchoolPt: "Pico de Energia & Frescor · Pronto para o melhor desempenho",
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
 * evitando acúmulo excessivo de fadiga consecutiva (Hickson, 1980).
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
      return [1, 2, 4, 6]; // Seg, Ter, Qui, Sáb (distribuição clássica com pausa Qua e Dom)
    case 5:
      return [1, 2, 4, 5, 6]; // Seg, Ter, Qui, Sex, Sáb
    case 6:
      return [1, 2, 3, 4, 5, 6]; // Seg a Sáb
    default:
      return [1, 2, 3, 4, 5, 6, 0];
  }
}

/**
 * Calcula e estrutura o Calendário Energético Perene e o Plano Dia a Dia para sair de
 * `currentEa` (ex: 1455 EA) e chegar a `targetEa` (ex: 1800 EA) na data `targetDateStr`.
 */
export function planEnergeticGrowthCurve(
  input: EnergeticGrowthPlanInput
): EnergeticGrowthPlanResult {
  const mode: PlanningGoalMode = input.mode || "competition";
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
      ? Math.round(currentEa * 1.22)
      : Math.round(currentEa * 1.12);
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

  const eventTitle =
    input.eventTitle?.trim() ||
    (mode === "competition"
      ? "Competição & Pico de Performance"
      : "Ciclo de Vitalidade & Constância");
  const modalityLabelPt = input.modalityLabelPt?.trim() || "Multimodal & Força";

  // 1. Avaliação Científica de Viabilidade (Banister 1975; Gabbett 2016; Mujika 2003)
  // Capacidade segura de expansão líquida de EA: ~75 a 110 EA por semana + ~110 EA de supercompensação no Polimento (Taper)
  const maxSafeGainPerDay = 15.5;
  const taperSupercompensationBonus = mode === "competition" ? 115 : 60;
  const maxSafeTotalGainEa = Math.round(
    totalDays * maxSafeGainPerDay + taperSupercompensationBonus
  );

  let feasibility: PlanFeasibilityTier = "optimal";
  let feasibilityBadgePt = "Curva Fisiológica Sustentável";
  let feasibilityExplanationPt =
    "O prazo e a evolução desejada respeitam o ritmo natural de adaptação muscular e supercompensação do seu corpo.";
  let recommendedAlternativeDateStr: string | null = null;

  const requiredDailyRate = requestedDeltaEa / totalDays;

  if (requestedDeltaEa > maxSafeTotalGainEa * 1.18) {
    feasibility = "excessive_adjusted";
    feasibilityBadgePt = "Meta Alta p/ o Prazo · Ritmo Ajustado c/ Segurança";
    const idealDaysNeeded = Math.ceil(
      Math.max(
        14,
        (requestedDeltaEa - taperSupercompensationBonus) / maxSafeGainPerDay
      )
    );
    recommendedAlternativeDateStr = addDaysIso(startDateStr, idealDaysNeeded);
    feasibilityExplanationPt = `Ganhar +${requestedDeltaEa} EA em ${totalDays} dias exigiria um salto acima do limite seguro de recuperação. Ajustamos a curva para o teto fisiológico seguro neste prazo e indicamos ${new Date(
      `${recommendedAlternativeDateStr}T12:00:00Z`
    ).toLocaleDateString("pt-BR")} caso queira atingir 100% da meta sem risco de esgotamento.`;
  } else if (requiredDailyRate > 13.5) {
    feasibility = "ambitious";
    feasibilityBadgePt = "Meta Desafiadora · Exige Disciplina em +EA";
    feasibilityExplanationPt = `Atingir ${requestedTargetEa} EA em ${totalDays} dias é viável, mas exige cumprir rigorosamente os hábitos diários de sono e recarga (+EA) além da semana final de polimento.`;
  }

  const effectiveTotalGainEa =
    feasibility === "excessive_adjusted"
      ? maxSafeTotalGainEa
      : requestedDeltaEa;
  const projectedPeakEa = currentEa + effectiveTotalGainEa;

  // 2. Definição das Fases Energéticas por Dia (Ondas Biológicas + Tapering de Mujika & Padilla, 2003)
  const taperDaysCount =
    mode === "competition"
      ? totalDays >= 21
        ? 7
        : Math.max(3, Math.round(totalDays * 0.25))
      : 3;

  const dailySchedule: PlannedCalendarDay[] = [];
  let runningEa = currentEa;

  // Calcula pesos diários de evolução de EA para que a curva suba de forma orgânica
  // (sobe na Expansão/Estabilização, consolida na Absorção e acelera a reserva livre no Polimento/Taper)
  const rawDayWeights: {
    dateStr: string;
    jsDay: number;
    phase: EnergeticCyclePhase;
    isWorkoutDay: boolean;
    isBlocked: boolean;
    isEventDay: boolean;
    weight: number;
  }[] = [];

  for (let dayIdx = 0; dayIdx <= totalDays; dayIdx++) {
    const dateStr = addDaysIso(startDateStr, dayIdx);
    const d = parseIsoDateUtc(dateStr);
    const jsDay = d.getUTCDay();
    const isEventDay = dayIdx === totalDays;
    const isBlocked = blockedSet.has(dateStr);
    const daysRemaining = totalDays - dayIdx;
    const weekIndexZero = Math.floor(dayIdx / 7);

    let phase: EnergeticCyclePhase = "expansion";

    if (isEventDay || daysRemaining < taperDaysCount) {
      phase = "peak";
    } else if (
      // A cada 4ª semana (índice 3, 7...) ou nos últimos 2 dias antes do polimento, faz onda de Absorção/Recarga
      (totalWeeks >= 4 && weekIndexZero % 4 === 3) ||
      jsDay === 0
    ) {
      phase = "absorption";
    } else if (weekIndexZero % 2 === 1 && (jsDay === 3 || jsDay === 6)) {
      phase = "stabilization";
    } else {
      phase = "expansion";
    }

    const isWorkoutDay =
      !isEventDay && !isBlocked && workoutJsSet.has(jsDay);

    // Peso de crescimento líquido da reserva/capacidade EA naquele dia
    let weight = 1.0;
    if (phase === "peak") {
      // Durante o polimento (Mujika 2003), a fadiga cai drasticamente e o EA disponível sobe mais rápido
      weight = 1.65;
    } else if (phase === "absorption") {
      // Supercompensação durante dias regenerativos
      weight = 1.25;
    } else if (phase === "expansion") {
      weight = 0.95;
    } else {
      weight = 0.85;
    }

    rawDayWeights.push({
      dateStr,
      jsDay,
      phase,
      isWorkoutDay,
      isBlocked,
      isEventDay,
      weight: dayIdx === 0 ? 0 : weight,
    });
  }

  const totalWeightSum = Math.max(
    0.001,
    rawDayWeights.reduce((acc, item) => acc + item.weight, 0)
  );

  // Contextualiza com os índices de força do atleta no Selye
  const strengthBonusNote =
    (input.strengthRecordsCount || 0) > 0
      ? `calibrado pelos seus ${input.strengthRecordsCount} recordes de força mapeados`
      : "calibrado para evolução progressiva de força e estabilidade";

  for (let i = 0; i < rawDayWeights.length; i++) {
    const item = rawDayWeights[i];
    const wMeta = getWeekdayMeta(item.jsDay);
    const pMeta = PHASE_META[item.phase];

    const stepGain =
      i === 0
        ? 0
        : (item.weight / totalWeightSum) * effectiveTotalGainEa;
    runningEa =
      i === rawDayWeights.length - 1
        ? projectedPeakEa
        : Math.round(currentEa + stepGain + (runningEa - currentEa));

    // Garante monotonicidade suave até projectedPeakEa
    const progressFraction = i / Math.max(1, rawDayWeights.length - 1);
    const curvedEa =
      i === 0
        ? currentEa
        : i === rawDayWeights.length - 1
          ? projectedPeakEa
          : Math.round(
              currentEa +
                effectiveTotalGainEa *
                  Math.pow(progressFraction, 0.92)
            );

    const prevEa =
      i === 0 ? currentEa : dailySchedule[i - 1].projectedEa;
    const netDailyDeltaEa = curvedEa - prevEa;

    // Prescrição de Consumo (-EA) e Recarga (+EA) do dia
    let expectedDrainEa = 0;
    let expectedRechargeEa = 115;
    const commitments: DailyPlannedCommitment[] = [];

    if (item.isEventDay) {
      expectedDrainEa = 0;
      expectedRechargeEa = 140;
      commitments.push({
        id: `evt_${item.dateStr}`,
        kind: "competition_day",
        titlePt:
          mode === "competition"
            ? `Dia do Ápice: ${eventTitle}`
            : `Marco do Ciclo: ${eventTitle}`,
        detailPt: `Seu corpo atingiu ${curvedEa} EA com fadiga residual mínima. Faça ativação articular leve de 10 min e hidratação com eletrólitos.`,
        timeSlotLabelPt: "Dia Principal",
        eaImpactText: `Ápice: ${curvedEa} EA`,
        eaSignedDelta: netDailyDeltaEa,
      });
    } else if (item.isBlocked) {
      expectedDrainEa = 0;
      expectedRechargeEa = 120;
      commitments.push({
        id: `blk_${item.dateStr}`,
        kind: "rest_protection",
        titlePt: "Agenda Pessoal Protegida · Descanso Programado",
        detailPt:
          "O Selye redistribuiu o estímulo da semana para que seu compromisso pessoal funcione como janela de absorção biológica.",
        timeSlotLabelPt: "Dia Livre",
        eaImpactText: "+120 EA (Absorção)",
        eaSignedDelta: 120,
      });
    } else if (item.isWorkoutDay) {
      if (item.phase === "peak") {
        // Treino de Polimento (Taper — Mujika & Padilla 2003: -50% volume, mantém potência)
        expectedDrainEa = 150;
        expectedRechargeEa = 185;
        commitments.push({
          id: `wk_${item.dateStr}`,
          kind: "workout",
          titlePt: `Sessão de Polimento (Taper) · ${modalityLabelPt}`,
          detailPt: `Reduza o volume de séries pela metade (30 min · Esforço 6/10), mantendo movimentos rápidos e técnicos (${strengthBonusNote}).`,
          timeSlotLabelPt: "Treino Curto",
          eaImpactText: "-150 EA (Polimento)",
          eaSignedDelta: -150,
        });
      } else if (item.phase === "absorption") {
        expectedDrainEa = 180;
        expectedRechargeEa = 195;
        commitments.push({
          id: `wk_${item.dateStr}`,
          kind: "workout",
          titlePt: `Treino Regenerativo & Estabilidade · ${modalityLabelPt}`,
          detailPt:
            "Sessão fluida com foco em amplitude de movimento e controle (40 min · Esforço 6/10), sem ir até a falha muscular.",
          timeSlotLabelPt: "Ritmo Controlado",
          eaImpactText: "-180 EA",
          eaSignedDelta: -180,
        });
      } else if (item.phase === "expansion") {
        expectedDrainEa = 285;
        expectedRechargeEa = 210;
        commitments.push({
          id: `wk_${item.dateStr}`,
          kind: "workout",
          titlePt: `Sessão Chave de Evolução (Força & Ritmo) · ${modalityLabelPt}`,
          detailPt: `Aproveite a onda de energia alta para progredir carga ou intensidade com técnica sólida (50–60 min · Esforço 8/10, ${strengthBonusNote}).`,
          timeSlotLabelPt: "Dia de Acelerar",
          eaImpactText: "-285 EA (Estímulo Forte)",
          eaSignedDelta: -285,
        });
      } else {
        expectedDrainEa = 235;
        expectedRechargeEa = 195;
        commitments.push({
          id: `wk_${item.dateStr}`,
          kind: "workout",
          titlePt: `Sessão de Consistência & Técnica · ${modalityLabelPt}`,
          detailPt:
            "Mantenha suas cargas habituais com foco na qualidade de execução e intervalos completos (45–50 min · Esforço 7/10).",
          timeSlotLabelPt: "Treino Base",
          eaImpactText: "-235 EA",
          eaSignedDelta: -235,
        });
      }
    } else {
      // Dia sem treino de desgaste -> Foco em supercompensação
      expectedDrainEa = 0;
      expectedRechargeEa = 145;
      commitments.push({
        id: `rest_${item.dateStr}`,
        kind: "rest_protection",
        titlePt: "Dia de Supercompensação & Síntese Muscular",
        detailPt:
          "É nos dias sem desgaste pesado que suas fibras musculares e seu sistema nervoso convertem o treino anterior em nova capacidade (+EA).",
        timeSlotLabelPt: "Recuperação",
        eaImpactText: "+65 EA (Supercompensação)",
        eaSignedDelta: 65,
      });
    }

    // Hábito Regenerativo Diário Obrigatório (+EA) para garantir a subida da curva
    const habitCycle = i % 3;
    if (habitCycle === 0) {
      commitments.push({
        id: `hab_sleep_${item.dateStr}`,
        kind: "recharge_habit",
        titlePt: "Protocolo de Sono Reparador (7h30 a 8h+)",
        detailPt:
          "Desligar telas 30 min antes de deitar e manter quarto escuro para maximizar a liberação hormonal noturna.",
        timeSlotLabelPt: "Noite",
        eaImpactText: "+120 EA",
        eaSignedDelta: 120,
      });
    } else if (habitCycle === 1) {
      commitments.push({
        id: `hab_mob_${item.dateStr}`,
        kind: "recharge_habit",
        titlePt: "Mobilidade Articular & Liberação Miofascial (15 min)",
        detailPt:
          "Soltar quadril, coluna torácica e tornozelos com respiração nasal lenta para acelerar a remoção de fadiga residual.",
        timeSlotLabelPt: "Pós-treino ou Noite",
        eaImpactText: "+85 EA",
        eaSignedDelta: 85,
      });
    } else {
      commitments.push({
        id: `hab_hyd_${item.dateStr}`,
        kind: "recharge_habit",
        titlePt: "Hidratação Estruturada (35ml/kg) + Descompressão Vagal",
        detailPt:
          "Atingir a meta hídrica do dia e fazer 5 minutos de respiração 4s-6s para elevar a prontidão autonômica de amanhã.",
        timeSlotLabelPt: "Ao longo do dia",
        eaImpactText: "+75 EA",
        eaSignedDelta: 75,
      });
    }

    dailySchedule.push({
      dateStr: item.dateStr,
      dayNumberInPlan: i + 1,
      jsDay: item.jsDay,
      weekdayShortPt: wMeta.shortPt,
      weekdayFullPt: wMeta.fullPt,
      phase: item.phase,
      phaseLabelPt: pMeta.labelPt,
      energyWaveLabelPt: pMeta.waveHighSchoolPt,
      projectedEa: curvedEa,
      expectedDrainEa,
      expectedRechargeEa,
      netDailyDeltaEa,
      isWorkoutDay: item.isWorkoutDay,
      isBlockedByPersonalCommitment: item.isBlocked,
      isTargetEventDay: item.isEventDay,
      commitments,
    });
  }

  // 3. Agrupamento em Marcos Semanais (Periodização em Blocos de Issurin, 2010)
  const weeklyMilestones: PlannedWeeklyMilestone[] = [];
  for (let w = 0; w < totalWeeks; w++) {
    const slice = dailySchedule.slice(w * 7, (w + 1) * 7);
    if (slice.length === 0) continue;

    const firstDay = slice[0];
    const lastDay = slice[slice.length - 1];
    const isLastWeek = w === totalWeeks - 1;
    const isDeloadWeek = !isLastWeek && totalWeeks >= 4 && w % 4 === 3;

    let blockNamePt = "Bloco 1 · Construção de Base Energética";
    let phase: EnergeticCyclePhase = "expansion";
    let directivePt =
      "Construa consistência nos treinos prescritos e não falhe no protocolo noturno de sono (+EA).";
    let scientificNotePt =
      "Fase de Acumulação (Issurin, 2010): expande a tolerância ao esforço e a base aeróbia/força.";

    if (isLastWeek && mode === "competition") {
      blockNamePt = `Semana Final · Polimento (Taper) & Ápice`;
      phase = "peak";
      directivePt =
        "Reduza o volume dos treinos em ~45%, mantenha a velocidade dos movimentos e dobre o cuidado com sono e hidratação para disparar sua reserva até o pico.";
      scientificNotePt =
        "Efeito Tapering (Mujika & Padilla, 2003): dissipa a fadiga residual mantendo os ganhos neuromusculares, gerando o pico de EA.";
    } else if (isDeloadWeek) {
      blockNamePt = `Semana ${w + 1} · Absorção & Supercompensação`;
      phase = "absorption";
      directivePt =
        "Semana regenerativa estratégica: reduza 1 série por exercício e priorize mobilidade para o corpo absorver o crescimento das semanas anteriores.";
      scientificNotePt =
        "Supercompensação (Kellmann, 2010): a adaptação física se concretiza durante a janela de alívio programado.";
    } else if (w >= Math.floor(totalWeeks / 2) && totalWeeks >= 3) {
      blockNamePt = `Semana ${w + 1} · Intensificação & Força Específica`;
      phase = "expansion";
      directivePt =
        "Priorize alta qualidade técnica nos movimentos principais e cumpra os hábitos regenerativos pós-sessão.";
      scientificNotePt =
        "Fase de Transmutação (Issurin, 2010): converte a base construída em potência e eficiência específica.";
    } else if (w % 2 === 1) {
      blockNamePt = `Semana ${w + 1} · Estabilização & Ritmo`;
      phase = "stabilization";
    }

    const startEa =
      w === 0
        ? currentEa
        : weeklyMilestones[w - 1]?.targetEndEa ?? firstDay.projectedEa;
    const targetEndEa = lastDay.projectedEa;

    weeklyMilestones.push({
      weekNumber: w + 1,
      startDateStr: firstDay.dateStr,
      endDateStr: lastDay.dateStr,
      blockNamePt,
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
      directivePt,
      scientificNotePt,
    });
  }

  // 4. Receita Executiva Literal ("Para atingir X em Y, faça X, Y, Z em tais dias")
  const workoutDayNamesPt = workoutJsDays
    .map((jsD) => getWeekdayMeta(jsD).shortPt)
    .join(", ");
  const restDayNamesPt = WEEKDAYS_MONDAY_FIRST.filter(
    (w) => !workoutJsSet.has(w.jsDay)
  )
    .map((w) => w.shortPt)
    .join(", ");

  const taperStartStr = addDaysIso(targetDateStr, -taperDaysCount);
  const taperStartFormatted = new Date(
    `${taperStartStr}T12:00:00Z`
  ).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  const targetDateFormatted = new Date(
    `${targetDateStr}T12:00:00Z`
  ).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

  const executiveRecipe = {
    headlinePt: `Para sair de ${currentEa} EA e atingir ${projectedPeakEa} EA (+${effectiveTotalGainEa} EA) em ${targetDateFormatted}:`,
    subheadlinePt:
      "Siga estes 3 compromissos coordenados no seu calendário — o Selye lembrará você a cada dia:",
    pillars: [
      {
        code: "stimulus_x" as const,
        badgePt: "PASSO X · ESTÍMULO & FORÇA",
        titlePt: `${targetDaysPerWeek} Sessões Estruturadas por Semana`,
        actionSummaryPt: `Treinar ${modalityLabelPt} às ${workoutDayNamesPt}, progredindo cargas nas semanas de Expansão e respeitando o esforço recomendado de cada dia.`,
        scheduleDaysLabelPt: `Dias de treino: ${workoutDayNamesPt}`,
      },
      {
        code: "recharge_y" as const,
        badgePt: "PASSO Y · RECARGA DIÁRIA (+EA)",
        titlePt: `Somar +85 a +120 EA/dia em Hábitos Regenerativos`,
        actionSummaryPt: `Proteger suas janelas de absorção (${
          restDayNamesPt || "Dom"
        }) e cumprir 1 protocolo diário de recarga (Sono 7h30+, Mobilidade 15 min ou Hidratação) para expandir sua bateria corporal.`,
        scheduleDaysLabelPt: `Recuperação prioritária: ${
          restDayNamesPt || "Dom"
        }`,
      },
      {
        code: "taper_z" as const,
        badgePt: "PASSO Z · POLIMENTO & SUPERCOMPENSAÇÃO",
        titlePt: `Ativar o Polimento (Taper) a partir de ${taperStartFormatted}`,
        actionSummaryPt: `Nos últimos ${taperDaysCount} dias antes de ${targetDateFormatted}, reduzir o volume dos treinos em 45% mantendo os hábitos +EA. Isso zera a fadiga acumulada e faz seu corpo saltar para ${projectedPeakEa} EA no dia-alvo.`,
        scheduleDaysLabelPt: `Janela de Ápice: ${taperStartFormatted} a ${targetDateFormatted}`,
      },
    ],
  };

  const todayEntry = dailySchedule[0];

  return {
    mode,
    eventTitle,
    modalityLabelPt,
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
    executiveRecipe,
    weeklyMilestones,
    dailySchedule,
  };
}
