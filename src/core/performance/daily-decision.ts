/**
 * Motor de Check-in Matinal (10 Segundos) & Decisão do Dia Explicável (§Fase 12)
 * Tese central Selye: "Um corpo. Um orçamento de recuperação. Qualquer esporte."
 *
 * Princípios científicos & éticos (Deci & Ryan SDT; Hooper Index 1995; Impellizzeri 2020):
 * 1. Transparência total: toda decisão explica o "porquê" combinando check-in subjetivo + carga de ontem + orçamento semanal.
 * 2. Sem alarmismo nem promessa de prever lesão: linguagem informativa e fisiológica.
 * 3. Autonomia (Self-Determination Theory): o atleta sempre tem o direito de seguir ou ajustar a sugestão.
 */

export interface MorningCheckinInput {
  /** Qualidade do sono na última noite (1 = Muito ruim / <5h, 5 = Restaurador / 8h+) */
  sleepQuality: number;
  /** Energia e prontidão percebida (1 = Exausto, 5 = Energia máxima) */
  energyLevel: number;
  /** Estado muscular / DOMS (1 = Dor muscular intensa/travado, 5 = Musculatura solta/zero dor) */
  muscleFreshness: number;
  /** Humor e disposição mental (1 = Estressado/sobrecarregado, 5 = Focado/motivado) */
  moodLevel: number;
  /** Data local YYYY-MM-DD */
  localDate?: string;
}

export type DecisionTier = "green_push" | "yellow_modulate" | "red_recover";

export interface DailyDecisionContext {
  checkin: MorningCheckinInput | null;
  yesterdayLoadUa: number;
  yesterdayLastModalityLabel?: string | null;
  recoveryBudgetUsagePercent: number;
  recoveryBudgetRemainingUa: number;
  acwr: number;
  consecutiveTrainingDays: number;
}

export interface DailyDecisionResult {
  hasCheckinToday: boolean;
  /** Índice de Prontidão Combinado (0 a 100) */
  readinessScore: number;
  /** Pontuação subjetiva pura do check-in (0 a 100), ou null se ainda não respondeu hoje */
  subjectiveScore: number | null;
  tier: DecisionTier;
  badgeLabel: string;
  headline: string;
  whyExplanation: string;
  suggestedAction: string;
  autonomyNote: string;
  factors: {
    label: string;
    valueText: string;
    impact: "positive" | "neutral" | "caution";
  }[];
}

function clamp1to5(v: number): number {
  return Math.max(1, Math.min(5, Math.round(v || 3)));
}

/**
 * Converte as 4 dimensões do Check-in Matinal (1..5 cada, onde 5 é sempre o estado ótimo)
 * em um escore subjetivo de 0 a 100 (inspirado no Índice de Bem-Estar de Hooper & Mackinnon, 1995).
 * Pesos: Sono (30%), Energia (25%), Estado Muscular (25%), Humor/Foco (20%).
 */
export function calculateSubjectiveReadinessScore(
  input: MorningCheckinInput
): number {
  const sleep = clamp1to5(input.sleepQuality);
  const energy = clamp1to5(input.energyLevel);
  const muscle = clamp1to5(input.muscleFreshness);
  const mood = clamp1to5(input.moodLevel);

  const weighted1to5 =
    sleep * 0.3 + energy * 0.25 + muscle * 0.25 + mood * 0.2;

  // Mapeia linearmente 1.0 -> 20 pts e 5.0 -> 100 pts
  return Math.round(weighted1to5 * 20);
}

/**
 * Gera a Decisão do Dia explicável combinando:
 * - Check-in matinal subjetivo (se respondido hoje)
 * - Esforço de ontem (UA e modalidade)
 * - Orçamento de recuperação semanal restante (%)
 * - Tendência aguda/crônica (7d/28d)
 */
export function evaluateDailyDecision(
  ctx: DailyDecisionContext
): DailyDecisionResult {
  const subjectiveScore = ctx.checkin
    ? calculateSubjectiveReadinessScore(ctx.checkin)
    : null;

  // Penalidades/bônus objetivos do histórico recente
  let objectiveBase = 82;

  if (ctx.yesterdayLoadUa >= 550) {
    objectiveBase -= 18;
  } else if (ctx.yesterdayLoadUa >= 350) {
    objectiveBase -= 9;
  }

  if (ctx.recoveryBudgetUsagePercent > 105) {
    objectiveBase -= 20;
  } else if (ctx.recoveryBudgetUsagePercent >= 85) {
    objectiveBase -= 10;
  } else if (ctx.recoveryBudgetUsagePercent < 45) {
    objectiveBase += 6;
  }

  if (ctx.consecutiveTrainingDays >= 4) {
    objectiveBase -= 10;
  }

  const clampedObjective = Math.max(25, Math.min(98, objectiveBase));

  const readinessScore =
    subjectiveScore !== null
      ? Math.round(subjectiveScore * 0.65 + clampedObjective * 0.35)
      : clampedObjective;

  const factors: DailyDecisionResult["factors"] = [];

  if (ctx.checkin) {
    const sleep = clamp1to5(ctx.checkin.sleepQuality);
    const muscle = clamp1to5(ctx.checkin.muscleFreshness);
    factors.push({
      label: "Sono & Energia",
      valueText: `${sleep}/5 · ${clamp1to5(ctx.checkin.energyLevel)}/5`,
      impact: sleep >= 4 ? "positive" : sleep === 3 ? "neutral" : "caution",
    });
    factors.push({
      label: "Musculatura",
      valueText:
        muscle >= 4
          ? "Solta / Recuperada"
          : muscle === 3
            ? "Fadiga leve"
            : "Dolorida / Pesada",
      impact: muscle >= 4 ? "positive" : muscle === 3 ? "neutral" : "caution",
    });
  }

  factors.push({
    label: "Esforço Ontem",
    valueText:
      ctx.yesterdayLoadUa > 0
        ? `-${ctx.yesterdayLoadUa} EA${
            ctx.yesterdayLastModalityLabel
              ? ` (${ctx.yesterdayLastModalityLabel})`
              : ""
          }`
        : "Descanso (+EA)",
    impact:
      ctx.yesterdayLoadUa >= 500
        ? "caution"
        : ctx.yesterdayLoadUa > 0
          ? "neutral"
          : "positive",
  });

  factors.push({
    label: "Reserva Adaptativa",
    valueText: `${ctx.recoveryBudgetRemainingUa} EA livres (${100 - Math.min(100, ctx.recoveryBudgetUsagePercent)}%)`,
    impact:
      ctx.recoveryBudgetUsagePercent > 90
        ? "caution"
        : ctx.recoveryBudgetUsagePercent < 70
          ? "positive"
          : "neutral",
  });

  // Determinação do Tier e Explicação Contextual Transparente
  let tier: DecisionTier = "green_push";
  let badgeLabel = "Sinal Verde · Treino Pleno";
  let headline = "Corpo pronto para carga total ou potência";
  let whyExplanation = "";
  let suggestedAction =
    "Execute a ficha prescrita do dia ou partida competitiva mantendo progressão normal de cargas.";

  const lowSleepOrMuscle =
    ctx.checkin &&
    (clamp1to5(ctx.checkin.sleepQuality) <= 2 ||
      clamp1to5(ctx.checkin.muscleFreshness) <= 2);

  if (
    readinessScore < 55 ||
    (lowSleepOrMuscle && ctx.yesterdayLoadUa >= 400) ||
    ctx.recoveryBudgetUsagePercent > 110
  ) {
    tier = "red_recover";
    badgeLabel = "Regeneração · Poupar Sistema";
    headline = "Priorize recuperação ativa, mobilidade ou treino leve";

    const reasons: string[] = [];
    if (ctx.checkin && clamp1to5(ctx.checkin.sleepQuality) <= 2) {
      reasons.push("seu sono relatado hoje foi curto ou pouco restaurador");
    }
    if (ctx.checkin && clamp1to5(ctx.checkin.muscleFreshness) <= 2) {
      reasons.push("você sinalizou dor ou rigidez muscular acentuada");
    }
    if (ctx.yesterdayLoadUa >= 400) {
      reasons.push(
        `ontem houve alta demanda física (-${ctx.yesterdayLoadUa} EA${
          ctx.yesterdayLastModalityLabel
            ? ` em ${ctx.yesterdayLastModalityLabel}`
            : ""
        })`
      );
    }
    if (ctx.recoveryBudgetUsagePercent > 100) {
      reasons.push(
        `sua Reserva Adaptativa semanal atingiu ${ctx.recoveryBudgetUsagePercent}% de consumo líquido`
      );
    }

    whyExplanation =
      reasons.length > 0
        ? `Por quê: ${reasons.join(" e ")}. Atitudes regenerativas hoje (+EA: sono, mobilidade, hidratação) aceleram a supercompensação.`
        : "Por quê: a combinação entre carga acumulada recente e prontidão de hoje pede um dia regenerativo para recarregar sua Energia Adaptativa (+EA).";

    suggestedAction =
      "Substitua séries até a falha por 20–30 min de mobilidade (+75 EA), caminhada leve (+60 EA) ou reduza o volume da ficha em ~30%.";
  } else if (
    readinessScore < 74 ||
    lowSleepOrMuscle ||
    ctx.yesterdayLoadUa >= 480 ||
    ctx.recoveryBudgetUsagePercent >= 85
  ) {
    tier = "yellow_modulate";
    badgeLabel = "Ritmo Controlado · Dosar Volume";
    headline = "Treine com foco técnico e margem de reserva (RIR 2)";

    const reasons: string[] = [];
    if (ctx.yesterdayLoadUa >= 350) {
      reasons.push(
        `você consumiu ${ctx.yesterdayLoadUa} EA ontem${
          ctx.yesterdayLastModalityLabel
            ? ` (${ctx.yesterdayLastModalityLabel})`
            : ""
        }`
      );
    }
    if (ctx.checkin && subjectiveScore !== null && subjectiveScore < 75) {
      reasons.push(`seu check-in matinal indicou prontidão moderada (${subjectiveScore}/100)`);
    }
    if (ctx.recoveryBudgetUsagePercent >= 85) {
      reasons.push(
        `sua reserva líquida atual é de ${ctx.recoveryBudgetRemainingUa} EA`
      );
    }

    whyExplanation =
      reasons.length > 0
        ? `Por quê: ${reasons.join(" e ")}. Manter qualidade técnica e registrar hábitos regenerativos (+EA) preserva sua evolução semanal.`
        : "Por quê: sua Reserva Adaptativa está em faixa intermediária; manter RPE 7–8 garante estímulo eficiente sem sobrecarga.";

    suggestedAction =
      "Mantenha a sessão planejada encerrando cada série com 1 a 2 repetições em reserva (RPE 7–8) e recarregue +EA com hidratação e sono.";
  } else {
    const reasons: string[] = [];
    if (ctx.checkin && subjectiveScore !== null) {
      reasons.push(
        `seu check-in matinal apontou ótima recuperação (${subjectiveScore}/100)`
      );
    }
    if (ctx.yesterdayLoadUa === 0) {
      reasons.push("você vem de um dia de supercompensação (+EA)");
    }
    reasons.push(
      `seu perfil dispõe de ${ctx.recoveryBudgetRemainingUa} EA de Reserva Adaptativa livre`
    );

    whyExplanation = `Por quê: ${reasons.join(" e ")}. Excelente janela fisiológica para estímulos de força, potência ou jogo intenso.`;
  }

  return {
    hasCheckinToday: Boolean(ctx.checkin),
    readinessScore,
    subjectiveScore,
    tier,
    badgeLabel,
    headline,
    whyExplanation,
    suggestedAction,
    autonomyNote:
      "Autonomia Selye: esta é uma recomendação baseada nos seus dados. Você decide se mantém a ficha completa, adapta o volume ou registra outra modalidade.",
    factors,
  };
}
