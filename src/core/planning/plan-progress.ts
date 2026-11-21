/**
 * Motor de Reconciliação e Progresso em Tempo Real do Plano Energético (§Fase 18)
 *
 * Cruza o plano calculado (`EnergeticGrowthPlanResult`) com:
 * 1. O EA real atual do atleta (`adaptiveProfile.availableReserveEa` ou `personalCapacityEa`)
 * 2. Os compromissos pessoais / bloqueios / hábitos extras salvos em `calendar_commitments`
 * 3. O checklist diário cumprido em `plan_daily_checkins`
 *
 * Entrega distância exata até a meta, status da trajetória (no ritmo, acima ou precisando de +EA)
 * e adesão acumulada até o dia atual.
 */

import type {
  DailyPlannedCommitment,
  EnergeticGrowthPlanResult,
  PlannedCalendarDay,
} from "./energetic-cycle-planner";

export interface StoredCalendarCommitmentInput {
  id: string;
  localDate: string; // YYYY-MM-DD
  kind: "personal_block" | "custom_habit" | "custom_workout" | "event_milestone" | string;
  title: string;
  notes?: string | null;
  blocksWorkout: boolean;
  eaSignedDelta: number;
}

export interface EnrichedDailyCommitment extends DailyPlannedCommitment {
  isCompleted: boolean;
  isCustom: boolean;
  customCommitmentId?: string;
}

export interface EnrichedCalendarDay extends Omit<PlannedCalendarDay, "commitments"> {
  commitments: EnrichedDailyCommitment[];
  completedCount: number;
  totalCommitmentsCount: number;
  dailyAdherencePercent: number;
  isToday: boolean;
  isPast: boolean;
}

export type PlanTrajectoryStatus = "ahead" | "on_track" | "needs_recharge";

export interface EnergeticPlanLiveProgress {
  todayDateStr: string;
  currentRealEa: number;
  initialEa: number;
  expectedEaToday: number;
  targetEa: number;
  requestedTargetEa: number;
  remainingEaToTarget: number;
  deltaVsExpectedToday: number;
  daysElapsed: number;
  daysRemaining: number;
  eaProgressPercent: number;
  timeProgressPercent: number;
  trajectoryStatus: PlanTrajectoryStatus;
  trajectoryBadgePt: string;
  trajectoryMessagePt: string;
  completedItemsCount: number;
  totalItemsUpToToday: number;
  adherencePercent: number;
  todayDay: EnrichedCalendarDay | null;
  enrichedDays: EnrichedCalendarDay[];
}

function parseIsoUtc(dateStr: string): Date {
  const clean = /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
    ? dateStr
    : new Date().toISOString().split("T")[0];
  return new Date(`${clean}T12:00:00Z`);
}

function diffDaysSigned(fromStr: string, toStr: string): number {
  const a = parseIsoUtc(fromStr).getTime();
  const b = parseIsoUtc(toStr).getTime();
  return Math.round((b - a) / (24 * 3600 * 1000));
}

/**
 * Calcula a evolução estrutural de EA construída no ciclo (ex: 1700 EA base → 1900 EA meta).
 *
 * Diferente da "Bateria Disponível Hoje" (que oscila no curto prazo quando você treina e descansa),
 * a EA do Ciclo no Calendário parte da sua Capacidade Base (`personalCapacityEa`, ex: 1700 EA)
 * e cresce conforme você conclui treinos e hábitos de recuperação rumo à meta (ex: 1900 EA).
 * Assim, treinar NUNCA derruba sua EA-alvo nem sua evolução acumulada no calendário.
 */
export function computeCycleBuiltEa(params: {
  initialEa: number;
  personalCapacityEa: number;
  targetEa: number;
  completedWorkoutsInCycle: number;
  completedRechargeHabitsInCycle: number;
}): number {
  const baseAnchor = Math.max(
    400,
    Math.round(Math.max(params.initialEa || 0, params.personalCapacityEa || 0))
  );
  const safeTarget = Math.max(baseAnchor + 100, Math.round(params.targetEa || baseAnchor + 200));
  const totalSpan = safeTarget - baseAnchor;

  const workoutGain = Math.max(0, params.completedWorkoutsInCycle) * 18;
  const habitGain = Math.max(0, params.completedRechargeHabitsInCycle) * 12;
  const capacityGrowth = Math.max(0, Math.round(params.personalCapacityEa - baseAnchor));

  const builtDelta = Math.min(
    totalSpan + 40,
    workoutGain + habitGain + capacityGrowth
  );

  return Math.round(baseAnchor + builtDelta);
}

export function reconcileEnergeticPlanProgress(input: {
  plan: EnergeticGrowthPlanResult;
  currentRealEa: number;
  todayDateStr: string;
  completedCommitmentKeys: Iterable<string>;
  customCommitments?: StoredCalendarCommitmentInput[];
  finishedSessionDates?: string[];
  historicalCheckins?: Array<{
    localDate: string;
    kind: string;
    commitmentKey: string;
    completed: boolean;
  }>;
}): EnergeticPlanLiveProgress {
  const { plan, todayDateStr } = input;
  const completedSet = new Set(input.completedCommitmentKeys);
  const finishedSessionDatesSet = new Set(input.finishedSessionDates || []);
  const customByDate = new Map<string, StoredCalendarCommitmentInput[]>();

  for (const c of input.customCommitments || []) {
    const list = customByDate.get(c.localDate) || [];
    list.push(c);
    customByDate.set(c.localDate, list);
  }

  let completedItemsUpToToday = 0;
  let totalItemsUpToToday = 0;

  const enrichedDays: EnrichedCalendarDay[] = plan.dailySchedule.map((day) => {
    const isToday = day.dateStr === todayDateStr;
    const isPast = day.dateStr < todayDateStr;
    const hasFinishedSessionOnDay = finishedSessionDatesSet.has(day.dateStr);

    const baseCommitments: EnrichedDailyCommitment[] = day.commitments.map(
      (c) => {
        let isCompleted = completedSet.has(c.id);

        if (!isCompleted && c.kind === "workout" && hasFinishedSessionOnDay) {
          isCompleted = true;
        }

        if (!isCompleted && input.historicalCheckins) {
          const match = input.historicalCheckins.find(
            (h) =>
              h.localDate === day.dateStr &&
              h.completed &&
              (h.commitmentKey === c.id || h.kind === c.kind)
          );
          if (match) {
            isCompleted = true;
          }
        }

        return {
          ...c,
          isCompleted,
          isCustom: false,
        };
      }
    );

    const customsForDay = customByDate.get(day.dateStr) || [];
    const mappedCustoms: EnrichedDailyCommitment[] = customsForDay.map((c) => {
      const key = `custom_${c.id}`;
      const mappedKind: DailyPlannedCommitment["kind"] =
        c.kind === "custom_workout"
          ? "workout"
          : c.kind === "custom_habit"
            ? "recharge_habit"
            : c.kind === "event_milestone"
              ? "competition_day"
              : "rest_protection";

      const eaLabel =
        c.eaSignedDelta > 0
          ? `+${c.eaSignedDelta} EA`
          : c.eaSignedDelta < 0
            ? `${c.eaSignedDelta} EA`
            : c.blocksWorkout
              ? "Agenda Protegida"
              : "Compromisso";

      return {
        id: key,
        kind: mappedKind,
        titlePt: c.title,
        detailPt:
          c.notes?.trim() ||
          (c.blocksWorkout
            ? "Compromisso pessoal bloqueando treino pesado neste dia."
            : "Compromisso adicionado manualmente ao seu calendário."),
        timeSlotLabelPt: c.blocksWorkout ? "Compromisso Fixo" : "Personalizado",
        eaImpactText: eaLabel,
        eaSignedDelta: c.eaSignedDelta,
        isCompleted: completedSet.has(key),
        isCustom: true,
        customCommitmentId: c.id,
      };
    });

    const allCommitments = [...baseCommitments, ...mappedCustoms];
    const completedCount = allCommitments.filter((c) => c.isCompleted).length;
    const totalCommitmentsCount = allCommitments.length;
    const dailyAdherencePercent =
      totalCommitmentsCount > 0
        ? Math.round((completedCount / totalCommitmentsCount) * 100)
        : 0;

    if (isPast || isToday) {
      completedItemsUpToToday += completedCount;
      totalItemsUpToToday += totalCommitmentsCount;
    }

    return {
      ...day,
      commitments: allCommitments,
      completedCount,
      totalCommitmentsCount,
      dailyAdherencePercent,
      isToday,
      isPast,
    };
  });

  const todayDay =
    enrichedDays.find((d) => d.isToday) ||
    (todayDateStr < plan.startDateStr
      ? enrichedDays[0] || null
      : enrichedDays[enrichedDays.length - 1] || null);

  const expectedEaToday = todayDay ? todayDay.projectedEa : plan.currentEa;
  const currentRealEa = Math.max(0, Math.round(input.currentRealEa));
  const targetEa = plan.projectedPeakEa;
  const remainingEaToTarget = Math.max(0, targetEa - currentRealEa);
  const deltaVsExpectedToday = currentRealEa - expectedEaToday;

  const daysElapsed = Math.max(
    0,
    Math.min(plan.totalDays, diffDaysSigned(plan.startDateStr, todayDateStr))
  );
  const daysRemaining = Math.max(
    0,
    diffDaysSigned(todayDateStr, plan.targetDateStr)
  );

  const totalGoalSpan = Math.max(1, targetEa - plan.currentEa);
  const eaProgressPercent = Math.max(
    0,
    Math.min(100, Math.round(((currentRealEa - plan.currentEa) / totalGoalSpan) * 100))
  );
  const timeProgressPercent = Math.max(
    0,
    Math.min(100, Math.round((daysElapsed / Math.max(1, plan.totalDays)) * 100))
  );

  const adherencePercent =
    totalItemsUpToToday > 0
      ? Math.round((completedItemsUpToToday / totalItemsUpToToday) * 100)
      : 0;

  let trajectoryStatus: PlanTrajectoryStatus = "on_track";
  let trajectoryBadgePt = "No Ritmo Ideal";
  let trajectoryMessagePt = `Você está exatamente sobre a curva planejada rumo a ${targetEa} EA. Continue cumprindo seus passos diários.`;

  if (deltaVsExpectedToday >= 40) {
    trajectoryStatus = "ahead";
    trajectoryBadgePt = "Acima da Curva Prevista";
    trajectoryMessagePt = `Seu corpo está +${deltaVsExpectedToday} EA acima do projetado para hoje. Excelente sinal de adaptação e recuperação!`;
  } else if (deltaVsExpectedToday <= -55) {
    trajectoryStatus = "needs_recharge";
    trajectoryBadgePt = "Priorizar Recarga (+EA)";
    trajectoryMessagePt = `Você está ${Math.abs(deltaVsExpectedToday)} EA abaixo da curva de hoje. Cumprir o hábito de sono ou mobilidade (+EA) hoje recoloca seu corpo no trilho da meta.`;
  }

  return {
    todayDateStr,
    currentRealEa,
    initialEa: plan.currentEa,
    expectedEaToday,
    targetEa,
    requestedTargetEa: plan.requestedTargetEa,
    remainingEaToTarget,
    deltaVsExpectedToday,
    daysElapsed,
    daysRemaining,
    eaProgressPercent,
    timeProgressPercent,
    trajectoryStatus,
    trajectoryBadgePt,
    trajectoryMessagePt,
    completedItemsCount: completedItemsUpToToday,
    totalItemsUpToToday,
    adherencePercent,
    todayDay,
    enrichedDays,
  };
}
