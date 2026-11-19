/**
 * Coach Diário do Plano Energético & Recálculo Vivo (§Fase 20)
 *
 * Conecta o Calendário Energético Perene (Fases 17-19) ao estado real do usuário hoje:
 * - Reage ao Check-in Matinal (se dormiu mal / prontidão baixa, suaviza automaticamente o passo do dia).
 * - Gera alertas proativos de mudança de fase (início do Polimento/Taper, véspera da competição,
 *   semana de absorção ou desvio da curva de EA) para o Sininho e E-mails (Resend).
 */

import type {
  EnergeticCyclePhase,
  EnergeticGrowthPlanResult,
} from "./energetic-cycle-planner";
import type { EnergeticPlanLiveProgress } from "./plan-progress";

export interface DailyPlanAdaptation {
  isSoftenedToday: boolean;
  badgePt: string;
  headlinePt: string;
  guidancePt: string;
}

export interface ProactivePlanAlert {
  id: string;
  priority: "high" | "normal";
  badgePt: string;
  titlePt: string;
  bodyPt: string;
  ctaLabelPt: string;
  ctaHref: string;
}

export interface DailyPlanCoachResult {
  adaptation: DailyPlanAdaptation;
  proactiveAlert: ProactivePlanAlert | null;
  pendingTodayCount: number;
  completedTodayCount: number;
  totalTodayCount: number;
  allDoneToday: boolean;
}

export function evaluateDailyPlanCoach(input: {
  plan: EnergeticGrowthPlanResult;
  progress: EnergeticPlanLiveProgress;
  todayReadinessScore?: number | null;
  todayDecisionTier?: "green_push" | "yellow_modulate" | "red_recover";
}): DailyPlanCoachResult {
  const { plan, progress, todayReadinessScore, todayDecisionTier } = input;
  const todayDay = progress.todayDay;

  const todayCommitments = todayDay?.commitments || [];
  const totalTodayCount = todayCommitments.length;
  const completedTodayCount = todayCommitments.filter((c) => c.isCompleted).length;
  const pendingTodayCount = Math.max(0, totalTodayCount - completedTodayCount);
  const allDoneToday = totalTodayCount > 0 && pendingTodayCount === 0;

  const phase: EnergeticCyclePhase = todayDay?.phase || plan.todayPhase;
  const isWorkoutPlannedToday = Boolean(todayDay?.isWorkoutDay);
  const lowReadiness =
    todayDecisionTier === "red_recover" ||
    (typeof todayReadinessScore === "number" && todayReadinessScore < 55);

  // 1. Recálculo Vivo conforme o Check-in Matinal & Decisão do Dia
  let adaptation: DailyPlanAdaptation;

  if (todayDay?.isTargetEventDay) {
    adaptation = {
      isSoftenedToday: false,
      badgePt: "Grande Dia · Ápice",
      headlinePt: `Hoje é o dia de ${plan.eventTitle}!`,
      guidancePt: `Você chegou com ${progress.currentRealEa} EA. Faça um aquecimento articular leve de 10 minutos, confie na base construída e aproveite o momento.`,
    };
  } else if (lowReadiness && isWorkoutPlannedToday) {
    adaptation = {
      isSoftenedToday: true,
      badgePt: "Plano Suavizado Hoje",
      headlinePt:
        "Ajustamos o passo de hoje ao sinal de cansaço do seu corpo",
      guidancePt:
        "Reduza 30–40% do volume previsto hoje ou troque por técnica leve + hábito de recarga (+EA). Isso protege sua curva até a data-alvo sem risco de fadiga acumulada.",
    };
  } else if (phase === "peak") {
    adaptation = {
      isSoftenedToday: false,
      badgePt: "Polimento (Taper)",
      headlinePt: "Reta final: menos volume, máximo frescor",
      guidancePt:
        "Mantenha movimentos curtos e rápidos sem cansar as pernas. Priorize sono e hidratação para seu EA saltar até o pico.",
    };
  } else if (phase === "absorption") {
    adaptation = {
      isSoftenedToday: false,
      badgePt: "Absorção & Recarga",
      headlinePt: "Seu corpo está consolidando os ganhos recentes",
      guidancePt:
        "Hoje o maior ganho vem do descanso e dos hábitos +EA. Evite desgaste extra para supercompensar na próxima onda.",
    };
  } else if (
    phase === "expansion" &&
    (todayDecisionTier === "green_push" ||
      (typeof todayReadinessScore === "number" && todayReadinessScore >= 75))
  ) {
    adaptation = {
      isSoftenedToday: false,
      badgePt: "Janela de Evolução",
      headlinePt: "Corpo descansado + Fase de Expansão",
      guidancePt:
        "Excelente momento para executar sua sessão chave com foco e progredir sua base física rumo à meta.",
    };
  } else {
    adaptation = {
      isSoftenedToday: false,
      badgePt: "Ritmo Consistente",
      headlinePt: "Um passo de cada vez constrói sua curva de EA",
      guidancePt:
        "Cumpra os compromissos listados abaixo no seu ritmo para manter sua trajetória previsível e saudável.",
    };
  }

  // 2. Alerta Proativo para o Sininho (Mudança de Fase / Contagem Regressiva / Ajuste de Rota)
  let proactiveAlert: ProactivePlanAlert | null = null;
  const todayIdx = progress.enrichedDays.findIndex(
    (d) => d.dateStr === progress.todayDateStr
  );
  const yesterdayDay =
    todayIdx > 0 ? progress.enrichedDays[todayIdx - 1] : null;
  const justEnteredPeak =
    phase === "peak" && yesterdayDay && yesterdayDay.phase !== "peak";

  if (todayDay?.isTargetEventDay) {
    proactiveAlert = {
      id: `plan_event_day_${progress.todayDateStr}`,
      priority: "high",
      badgePt: "Dia da Meta",
      titlePt: `Chegou o dia: ${plan.eventTitle}`,
      bodyPt: `Seu corpo está na fase de Ápice (${progress.currentRealEa} EA). Hidrate-se bem, faça ativação leve e dê o seu melhor!`,
      ctaLabelPt: "Ver roteiro do dia",
      ctaHref: "/calendario",
    };
  } else if (progress.daysRemaining === 1 && plan.mode === "competition") {
    proactiveAlert = {
      id: `plan_eve_${progress.todayDateStr}`,
      priority: "high",
      badgePt: "Falta 1 Dia",
      titlePt: `Amanhã é ${plan.eventTitle} — preserve sua energia`,
      bodyPt: `Última noite antes da competição: foque em hidratação, alimentação leve e 8h de sono (+120 EA) para acordar no ápice.`,
      ctaLabelPt: "Abrir checklist final",
      ctaHref: "/calendario",
    };
  } else if (justEnteredPeak && plan.mode === "competition") {
    proactiveAlert = {
      id: `plan_taper_start_${progress.todayDateStr}`,
      priority: "high",
      badgePt: "Fase de Polimento",
      titlePt: `Seu Polimento (Taper) rumo a ${plan.projectedPeakEa} EA começou hoje`,
      bodyPt: `Faltam ${progress.daysRemaining} dias para ${plan.eventTitle}. O volume cai pela metade para zerar o cansaço e disparar sua reserva de energia.`,
      ctaLabelPt: "Ver semana de polimento",
      ctaHref: "/calendario",
    };
  } else if (progress.trajectoryStatus === "needs_recharge" && pendingTodayCount > 0) {
    proactiveAlert = {
      id: `plan_recharge_${progress.todayDateStr}`,
      priority: "high",
      badgePt: "Ajuste de Rota",
      titlePt: `Recarregue +EA hoje para manter a curva de ${plan.projectedPeakEa} EA`,
      bodyPt: progress.trajectoryMessagePt,
      ctaLabelPt: "Cumprir passo de hoje",
      ctaHref: "/calendario",
    };
  } else if (pendingTodayCount > 0) {
    proactiveAlert = {
      id: `plan_daily_${progress.todayDateStr}`,
      priority: "normal",
      badgePt: todayDay?.phaseLabelPt || "Plano do Dia",
      titlePt: `${pendingTodayCount} ${
        pendingTodayCount === 1 ? "passo pendente" : "passos pendentes"
      } hoje em "${plan.eventTitle}"`,
      bodyPt: `Você está em ${progress.currentRealEa} EA (meta: ${plan.projectedPeakEa} EA). Marque seus compromissos de hoje para manter a constância.`,
      ctaLabelPt: "Ver passos no calendário",
      ctaHref: "/calendario",
    };
  }

  return {
    adaptation,
    proactiveAlert,
    pendingTodayCount,
    completedTodayCount,
    totalTodayCount,
    allDoneToday,
  };
}
