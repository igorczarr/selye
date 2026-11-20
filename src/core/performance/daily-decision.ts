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
  /** Modalidade principal do atleta (ex: "Corrida", "Vôlei de Praia") */
  modalityShortNamePt?: string | null;
  /** Nome da meta/objetivo ativo no calendário (ex: "Meia Maratona 21 km") */
  activeGoalTitle?: string | null;
  /** Status atual da curva rumo à meta */
  onTrackStatus?: "on_track" | "attention" | "off_track" | "awaiting_data" | null;
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
  /** Rótulo curto contextual da modalidade e meta (ex: "Corrida · Meia Maratona") */
  modalityContextBadge?: string | null;
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
    label: "Bateria do Corpo",
    valueText: `${ctx.recoveryBudgetRemainingUa} EA livres (${100 - Math.min(100, ctx.recoveryBudgetUsagePercent)}%)`,
    impact:
      ctx.recoveryBudgetUsagePercent > 90
        ? "caution"
        : ctx.recoveryBudgetUsagePercent < 70
          ? "positive"
          : "neutral",
  });

  const modName = ctx.modalityShortNamePt?.trim() || null;
  const goalTitle = ctx.activeGoalTitle?.trim() || null;
  const modalityContextBadge = modName
    ? goalTitle
      ? `${modName} · ${goalTitle}`
      : modName
    : null;

  // Determinação do Tier e Explicação Contextual Transparente e Amigável
  let tier: DecisionTier = "green_push";
  let badgeLabel = "Sinal Verde · Dia de Avançar";
  let headline = modName
    ? `Corpo pronto para seu treino de ${modName}`
    : "Corpo pronto para treinar com força total";
  let whyExplanation = "";
  let suggestedAction = modName
    ? goalTitle
      ? `Siga o treino planejado de ${modName} hoje para manter sua evolução rumo a "${goalTitle}".`
      : `Siga sua ficha ou sessão de ${modName} com progressão normal.`
    : "Faça o treino planejado do dia mantendo sua evolução normal de carga ou ritmo.";

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
    badgeLabel = "Dia Leve · Recuperar";
    headline = modName
      ? `Dia de recuperar o corpo para voltar mais forte em ${modName}`
      : "Priorize descanso ativo, mobilidade ou treino bem leve";

    const reasons: string[] = [];
    if (ctx.checkin && clamp1to5(ctx.checkin.sleepQuality) <= 2) {
      reasons.push("seu sono relatado hoje foi curto ou pouco restaurador");
    }
    if (ctx.checkin && clamp1to5(ctx.checkin.muscleFreshness) <= 2) {
      reasons.push("você sinalizou dor ou cansaço muscular mais forte");
    }
    if (ctx.yesterdayLoadUa >= 400) {
      reasons.push(
        `ontem o treino exigiu bastante do corpo (-${ctx.yesterdayLoadUa} EA${
          ctx.yesterdayLastModalityLabel
            ? ` em ${ctx.yesterdayLastModalityLabel}`
            : ""
        })`
      );
    }
    if (ctx.recoveryBudgetUsagePercent > 100) {
      reasons.push(
        `sua bateria semanal chegou a ${ctx.recoveryBudgetUsagePercent}% de uso`
      );
    }

    whyExplanation =
      reasons.length > 0
        ? `Por quê: ${reasons.join(" e ")}. Hábitos leves hoje (+EA: sono, mobilidade, água) ajudam seu corpo a absorver o treino e evoluir.`
        : "Por quê: o cansaço acumulado nos últimos dias pede um treino leve ou descanso ativo para recarregar sua energia (+EA).";

    suggestedAction = modName
      ? `Troque o treino pesado de ${modName} por 20–30 min de mobilidade (+75 EA), caminhada leve (+60 EA) ou reduza cerca de 30% do volume hoje.`
      : "Troque séries até o limite por 20–30 min de mobilidade (+75 EA), caminhada leve (+60 EA) ou reduza cerca de 30% do volume hoje.";
  } else if (
    readinessScore < 74 ||
    lowSleepOrMuscle ||
    ctx.yesterdayLoadUa >= 480 ||
    ctx.recoveryBudgetUsagePercent >= 85
  ) {
    tier = "yellow_modulate";
    badgeLabel = "Ritmo Controlado · Dosar";
    headline = modName
      ? `Treine ${modName} com foco na técnica, sem ir ao limite`
      : "Treine com foco na técnica e sem ir até a exaustão";

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
      reasons.push(`seu check-in matinal mostrou disposição moderada (${subjectiveScore}/100)`);
    }
    if (ctx.recoveryBudgetUsagePercent >= 85) {
      reasons.push(
        `você ainda tem ${ctx.recoveryBudgetRemainingUa} EA livres na semana`
      );
    }

    whyExplanation =
      reasons.length > 0
        ? `Por quê: ${reasons.join(" e ")}. Manter boa técnica e hábitos de recuperação (+EA) protege sua evolução na semana.`
        : "Por quê: sua energia está em faixa moderada; treinar em esforço controlado (7–8 de 10) gera resultado sem sobrecarregar.";

    suggestedAction = modName
      ? `Faça sua sessão de ${modName} terminando com folga (esforço 7–8 de 10, sem ir até a falha) e recarregue com água e bom sono.`
      : "Mantenha o treino de hoje terminando cada série com 1 a 2 repetições de folga (esforço 7–8 de 10) e capriche na hidratação e no sono.";
  } else {
    const reasons: string[] = [];
    if (ctx.checkin && subjectiveScore !== null) {
      reasons.push(
        `seu check-in matinal apontou ótima disposição (${subjectiveScore}/100)`
      );
    }
    if (ctx.yesterdayLoadUa === 0) {
      reasons.push("você vem de um dia de descanso e recarga (+EA)");
    }
    reasons.push(
      `você tem ${ctx.recoveryBudgetRemainingUa} EA livres na sua bateria semanal`
    );

    const goalTail = goalTitle
      ? ` Bom momento para avançar rumo a "${goalTitle}".`
      : " Ótimo momento para treinos de força, velocidade ou intensidade.";

    whyExplanation = `Por quê: ${reasons.join(" e ")}.${goalTail}`;
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
    modalityContextBadge,
    autonomyNote:
      "Autonomia Selye: esta é uma sugestão baseada nos seus dados. Você decide se mantém o treino completo, reduz o ritmo ou faz outra atividade.",
    factors,
  };
}
