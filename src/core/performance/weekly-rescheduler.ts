/**
 * Motor de Reagendamento Inteligente da Semana & Detecção de Interferência (§Fase 13)
 * Tese Selye: "Um corpo. Um orçamento de recuperação. Qualquer esporte."
 *
 * Detecta conflitos reais da rotina de atletas híbridos (Hickson, 1980 — Concurrent Training Interference Effect):
 * 1. Conflito de Membros Inferiores / Potência seguidos (< 24h) de Jogo, Areia, Futsal ou Corrida Forte (e vice-versa).
 * 2. Ficha programada para hoje quando uma atividade livre intensa já foi concluída hoje.
 * 3. Sobreposição de duas fichas intensas no mesmo dia ou orçamento semanal no limite (> 85%).
 *
 * Propõe ações aplicáveis com 1 toque:
 * - "move_day": Mover a ficha para o próximo dia livre da semana (Seg → Dom).
 * - "swap_days": Trocar os dias de duas fichas para afastar o estímulo de pernas do jogo/corrida.
 * - "deload_volume": Aliviar o volume da ficha em ~25% (-1 série nos exercícios principais) para preservar as pernas.
 */

import {
  classifyExerciseCategory,
  type CategorizableExercise,
} from "../catalog/exercise-categories";
import { WEEKDAYS_MONDAY_FIRST, jsDayToMondayIndex } from "../../lib/week";
import { getModalityProfile } from "./training-load";

export type RoutineFocus =
  | "lower_body_strength"
  | "lower_body_power"
  | "sand_or_court_sport"
  | "running_endurance"
  | "upper_body"
  | "full_body_or_mixed";

export interface SchedulableRoutine {
  id: string;
  title: string;
  modalityCode: string;
  /** Dia da semana JS: 0 = Dom, 1 = Seg ... 6 = Sáb (null = flexível) */
  dayOfWeek: number | null;
  exercises: (CategorizableExercise & {
    targetSets?: number | null;
  })[];
}

export interface RecentCompletedActivity {
  id: string;
  title: string;
  modalityCode: string;
  localDate: string; // YYYY-MM-DD
  jsDay: number; // 0..6
  durationMinutes: number;
  rpe: number;
  loadUa: number;
}

export type RescheduleActionType = "move_day" | "swap_days" | "deload_volume";

export interface RescheduleProposal {
  id: string;
  severity: "high" | "medium";
  conflictType:
    | "same_day_free_activity"
    | "consecutive_lower_interference"
    | "budget_tight_deload";
  title: string;
  whyExplanation: string;
  scientificNote: string;
  actionType: RescheduleActionType;
  actionButtonLabel: string;
  targetProgramId: string;
  targetProgramTitle: string;
  fromJsDay: number | null;
  toJsDay?: number;
  swapWithProgramId?: string;
  swapWithProgramTitle?: string;
  deloadFactor?: number;
}

function getDayShortPt(jsDay: number | null | undefined): string {
  if (typeof jsDay !== "number") return "Flexível";
  return (
    WEEKDAYS_MONDAY_FIRST.find((d) => d.jsDay === jsDay)?.shortPt || "Dia"
  );
}

function getDayFullPt(jsDay: number | null | undefined): string {
  if (typeof jsDay !== "number") return "Dia flexível";
  return (
    WEEKDAYS_MONDAY_FIRST.find((d) => d.jsDay === jsDay)?.fullPt || "Dia"
  );
}

/**
 * Classifica o foco biomecânico principal de uma ficha com base na modalidade, título e exercícios prescritos.
 */
export function classifyRoutineFocus(routine: SchedulableRoutine): RoutineFocus {
  const mod = (routine.modalityCode || "").toLowerCase();
  const normTitle = (routine.title || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (
    mod === "beach_volleyball" ||
    mod === "footvolley" ||
    mod === "futsal" ||
    mod === "beach_tennis" ||
    /\b(areia|volei|futsal|jogo|quadra)\b/.test(normTitle)
  ) {
    return "sand_or_court_sport";
  }

  if (mod === "running" || /\b(corrida|tiros|endurance)\b/.test(normTitle)) {
    return "running_endurance";
  }

  let lowerCount = 0;
  let plyoCount = 0;
  let upperCount = 0;

  for (const ex of routine.exercises) {
    const cat = classifyExerciseCategory({
      namePt: ex.namePt,
      nameEn: ex.nameEn,
      modalityCode: ex.modalityCode || routine.modalityCode,
      secondaryMuscles: ex.secondaryMuscles,
    });
    if (cat === "areia") return "sand_or_court_sport";
    if (cat === "pliometria") plyoCount++;
    else if (cat === "pernas") lowerCount++;
    else if (cat === "peito" || cat === "costas" || cat === "ombros" || cat === "bracos") {
      upperCount++;
    }
  }

  if (
    plyoCount >= 2 ||
    /\b(salto|pliometria|potencia|explosao|reativ)\b/.test(normTitle)
  ) {
    return "lower_body_power";
  }

  if (
    lowerCount >= 2 ||
    (lowerCount + plyoCount > upperCount && lowerCount + plyoCount > 0) ||
    /\b(forca|agachamento|perna|inferior)\b/.test(normTitle)
  ) {
    return "lower_body_strength";
  }

  if (upperCount >= 2 && lowerCount === 0) {
    return "upper_body";
  }

  return "full_body_or_mixed";
}

function isHighLowerBodyDemand(focus: RoutineFocus): boolean {
  return (
    focus === "lower_body_strength" ||
    focus === "lower_body_power" ||
    focus === "sand_or_court_sport" ||
    focus === "running_endurance"
  );
}

function isHighLowerBodyModality(modalityCode: string): boolean {
  return [
    "running",
    "futsal",
    "beach_volleyball",
    "footvolley",
    "cycling",
    "beach_tennis",
    "functional",
  ].includes((modalityCode || "").toLowerCase());
}

/**
 * Encontra o melhor dia livre (Seg → Dom) na semana que não gere novo conflito consecutivo.
 */
export function findBestAvailableJsDay(
  occupiedJsDays: Set<number>,
  preferredAfterJsDay: number
): number {
  const prefMonIdx = jsDayToMondayIndex(preferredAfterJsDay);

  // 1ª passagem: procura um dia livre após o dia atual que tenha pelo menos 1 dia de intervalo ou seja livre
  for (let offset = 1; offset <= 7; offset++) {
    const candidateMonIdx = (prefMonIdx + offset) % 7;
    const candidateJsDay = WEEKDAYS_MONDAY_FIRST[candidateMonIdx].jsDay;
    if (!occupiedJsDays.has(candidateJsDay)) {
      return candidateJsDay;
    }
  }

  // Se todos os 7 dias estiverem ocupados, sugere Sábado (6) ou Domingo (0)
  return preferredAfterJsDay === 6 ? 0 : 6;
}

/**
 * Analisa a programação semanal do atleta, as atividades recentes e o orçamento de recuperação
 * para sugerir reagendamentos ou ajustes de volume com 1 toque.
 */
export function analyzeWeeklyScheduleInterference(params: {
  routines: SchedulableRoutine[];
  recentActivities: RecentCompletedActivity[];
  todayDateStr: string;
  todayJsDay: number;
  recoveryBudgetUsagePercent: number;
}): RescheduleProposal[] {
  const proposals: RescheduleProposal[] = [];

  const occupiedJsDays = new Set<number>();
  for (const r of params.routines) {
    if (typeof r.dayOfWeek === "number") {
      occupiedJsDays.add(r.dayOfWeek);
    }
  }

  const todayMondayIdx = jsDayToMondayIndex(params.todayJsDay);
  const tomorrowMondayIdx = (todayMondayIdx + 1) % 7;
  const tomorrowJsDay = WEEKDAYS_MONDAY_FIRST[tomorrowMondayIdx].jsDay;

  // 1. Verifica se o atleta já registrou um jogo/corrida/atividade forte HOJE e ainda tem uma ficha programada para HOJE
  const todayIntenseActivity = params.recentActivities.find(
    (a) =>
      a.localDate === params.todayDateStr &&
      (a.loadUa >= 300 || a.rpe >= 7) &&
      isHighLowerBodyModality(a.modalityCode)
  );

  const todayRoutine = params.routines.find(
    (r) => r.dayOfWeek === params.todayJsDay
  );

  if (todayIntenseActivity && todayRoutine) {
    const routineFocus = classifyRoutineFocus(todayRoutine);
    if (isHighLowerBodyDemand(routineFocus)) {
      const targetFreeDay = findBestAvailableJsDay(
        occupiedJsDays,
        params.todayJsDay
      );
      const actModLabel = getModalityProfile(
        todayIntenseActivity.modalityCode
      ).labelPt;

      proposals.push({
        id: `prop_same_day_${todayRoutine.id}`,
        severity: "high",
        conflictType: "same_day_free_activity",
        title: `Você já registrou ${todayIntenseActivity.title} (-${todayIntenseActivity.loadUa} EA) hoje`,
        whyExplanation: `Sua ficha "${todayRoutine.title}" está agendada para hoje (${getDayShortPt(
          params.todayJsDay
        )}), mas você já realizou uma sessão exigente de ${actModLabel}. Acumular força/saltos de membros inferiores no mesmo dia eleva a fadiga neuromuscular periférica.`,
        scientificNote:
          "Efeito de Interferência (Hickson, 1980; Fyfe et al., 2014): separar estímulos intensos de corrida/quadra e força de membros inferiores por ≥24h preserva a taxa de desenvolvimento de força (RFD) e a altura de salto.",
        actionType: "move_day",
        actionButtonLabel: `Mover ficha para ${getDayFullPt(targetFreeDay)}`,
        targetProgramId: todayRoutine.id,
        targetProgramTitle: todayRoutine.title,
        fromJsDay: params.todayJsDay,
        toJsDay: targetFreeDay,
      });
    }
  }

  // 2. Verifica se uma atividade intensa hoje (ou ontem à noite) conflita com uma ficha pesada de pernas/potência AMANHÃ (ou hoje)
  if (todayIntenseActivity) {
    const tomorrowRoutine = params.routines.find(
      (r) => r.dayOfWeek === tomorrowJsDay
    );
    if (tomorrowRoutine) {
      const tomorrowFocus = classifyRoutineFocus(tomorrowRoutine);
      if (
        tomorrowFocus === "lower_body_strength" ||
        tomorrowFocus === "lower_body_power"
      ) {
        proposals.push({
          id: `prop_deload_tomorrow_${tomorrowRoutine.id}`,
          severity: "medium",
          conflictType: "consecutive_lower_interference",
          title: `Pernas exigidas hoje antes de "${tomorrowRoutine.title}" amanhã (${getDayShortPt(
            tomorrowJsDay
          )})`,
          whyExplanation: `Após ${todayIntenseActivity.title} (-${todayIntenseActivity.loadUa} EA), seus membros inferiores entrarão na sessão de amanhã com fadiga residual. Aliviar 1 série por exercício (~25% menos volume) mantém o estímulo neural de força sem sobrecarregar tendões e articulações.`,
          scientificNote:
            "Gestão de Fadiga Residual: reduzir o volume mantendo a intensidade (carga na barra) preserva adaptações neuromusculares com menor custo metabólico.",
          actionType: "deload_volume",
          actionButtonLabel: `Aliviar volume de ${getDayShortPt(tomorrowJsDay)} (-1 série/exercício)`,
          targetProgramId: tomorrowRoutine.id,
          targetProgramTitle: tomorrowRoutine.title,
          fromJsDay: tomorrowJsDay,
          deloadFactor: 0.75,
        });
      }
    }
  }

  // 3. Verifica na grade semanal (Seg → Dom) se há duas fichas consecutivas de alta exigência de pernas vs. areia/corrida
  const scheduledRoutines = params.routines
    .filter((r): r is SchedulableRoutine & { dayOfWeek: number } =>
      typeof r.dayOfWeek === "number"
    )
    .sort(
      (a, b) =>
        jsDayToMondayIndex(a.dayOfWeek) - jsDayToMondayIndex(b.dayOfWeek)
    );

  for (let i = 0; i < scheduledRoutines.length - 1; i++) {
    const current = scheduledRoutines[i];
    const next = scheduledRoutines[i + 1];
    const curMonIdx = jsDayToMondayIndex(current.dayOfWeek);
    const nextMonIdx = jsDayToMondayIndex(next.dayOfWeek);

    if (nextMonIdx - curMonIdx === 1) {
      const curFocus = classifyRoutineFocus(current);
      const nextFocus = classifyRoutineFocus(next);

      const isStrengthThenSandOrRun =
        (curFocus === "lower_body_strength" || curFocus === "lower_body_power") &&
        (nextFocus === "sand_or_court_sport" ||
          nextFocus === "running_endurance");

      const isSandOrRunThenPower =
        (curFocus === "sand_or_court_sport" ||
          curFocus === "running_endurance") &&
        (nextFocus === "lower_body_power" ||
          nextFocus === "lower_body_strength");

      const isBackToBackHeavyLower =
        curFocus === "lower_body_strength" &&
        nextFocus === "lower_body_power";

      if (
        isStrengthThenSandOrRun ||
        isSandOrRunThenPower ||
        isBackToBackHeavyLower
      ) {
        // Verifica se existe uma ficha de superiores ou um dia livre para espaçar
        const upperRoutine = scheduledRoutines.find(
          (r) =>
            r.id !== current.id &&
            r.id !== next.id &&
            (classifyRoutineFocus(r) === "upper_body" ||
              classifyRoutineFocus(r) === "full_body_or_mixed")
        );

        if (upperRoutine) {
          proposals.push({
            id: `prop_swap_${next.id}_${upperRoutine.id}`,
            severity: "medium",
            conflictType: "consecutive_lower_interference",
            title: `Interferência detectada entre ${getDayShortPt(
              current.dayOfWeek
            )} e ${getDayShortPt(next.dayOfWeek)}`,
            whyExplanation: `"${current.title}" (${getDayShortPt(
              current.dayOfWeek
            )}) e "${next.title}" (${getDayShortPt(
              next.dayOfWeek
            )}) estão em dias seguidos exigindo forte cadeia inferior. Trocar "${next.title}" com "${upperRoutine.title}" (${getDayShortPt(
              upperRoutine.dayOfWeek
            )}) cria janela de recuperação muscular.`,
            scientificNote:
              "Periodização Semanal Ondulatória: intercalar sessões de força inferior e pliometria/areia reduz a queda aguda de potência vertical.",
            actionType: "swap_days",
            actionButtonLabel: `Trocar ${getDayShortPt(
              next.dayOfWeek
            )} ↔ ${getDayShortPt(upperRoutine.dayOfWeek)}`,
            targetProgramId: next.id,
            targetProgramTitle: next.title,
            fromJsDay: next.dayOfWeek,
            toJsDay: upperRoutine.dayOfWeek,
            swapWithProgramId: upperRoutine.id,
            swapWithProgramTitle: upperRoutine.title,
          });
          break;
        } else {
          const freeJsDay = findBestAvailableJsDay(
            occupiedJsDays,
            next.dayOfWeek
          );
          if (!occupiedJsDays.has(freeJsDay)) {
            proposals.push({
              id: `prop_move_adj_${next.id}`,
              severity: "medium",
              conflictType: "consecutive_lower_interference",
              title: `Dias seguidos de alta demanda inferior (${getDayShortPt(
                current.dayOfWeek
              )} → ${getDayShortPt(next.dayOfWeek)})`,
              whyExplanation: `"${current.title}" e "${next.title}" estão agendados em sequência direta. Mover "${next.title}" para ${getDayFullPt(
                freeJsDay
              )} adiciona 24h de recuperação para tendões e musculatura.`,
              scientificNote:
                "Supercompensação Neuromuscular: 48h entre estímulos máximos de membros inferiores otimiza a síntese proteica e a potência.",
              actionType: "move_day",
              actionButtonLabel: `Mover ${getDayShortPt(
                next.dayOfWeek
              )} → ${getDayShortPt(freeJsDay)}`,
              targetProgramId: next.id,
              targetProgramTitle: next.title,
              fromJsDay: next.dayOfWeek,
              toJsDay: freeJsDay,
            });
            break;
          }
        }
      }
    }
  }

  // 4. Se o orçamento semanal está acima de 88% e há ficha hoje, oferece ajuste de volume com 1 toque
  if (
    params.recoveryBudgetUsagePercent >= 88 &&
    todayRoutine &&
    !proposals.some((p) => p.targetProgramId === todayRoutine.id)
  ) {
    proposals.push({
      id: `prop_budget_deload_${todayRoutine.id}`,
      severity: "medium",
      conflictType: "budget_tight_deload",
      title: `Orçamento semanal em ${params.recoveryBudgetUsagePercent}% para a ficha de hoje`,
      whyExplanation: `Para concluir "${todayRoutine.title}" hoje sem estourar seu orçamento de recuperação da semana, você pode aplicar uma redução inteligente de volume (-1 série por exercício).`,
      scientificNote:
        "Tapering & Auto-Regulação: manter a carga mecânica reduzindo o número de séries preserva a força máxima com metade da fadiga acumulada.",
      actionType: "deload_volume",
      actionButtonLabel: "Aliviar 1 série por exercício hoje",
      targetProgramId: todayRoutine.id,
      targetProgramTitle: todayRoutine.title,
      fromJsDay: todayRoutine.dayOfWeek,
      deloadFactor: 0.75,
    });
  }

  return proposals.slice(0, 2);
}
