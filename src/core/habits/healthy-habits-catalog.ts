/**
 * Catálogo Científico & Motor de Progresso de Hábitos Saudáveis Diários do Selye.
 *
 * Permite que alunos e treinadores montem uma rotina diária de hábitos saudáveis
 * organizados por eixo fisiológico, acompanhem consistência (streak / 7d / 30d)
 * e visualizem o impacto positivo real na saúde, energia e qualidade de vida.
 */

export type HabitAxisCode =
  | "hydration"
  | "nutrition"
  | "movement"
  | "mind_recovery"
  | "circadian_sleep"
  | "custom";

export interface HabitAxisDefinition {
  code: HabitAxisCode;
  labelPt: string;
  shortLabelPt: string;
  descriptionPt: string;
  accentColorClass: string;
  badgeBgClass: string;
  defaultImpactPt: string;
}

export interface HabitPresetDefinition {
  code: string;
  axisCode: HabitAxisCode;
  titlePt: string;
  targetLabelPt: string;
  positiveImpactPt: string;
  eaImpact: number;
  featured?: boolean;
}

export const HABIT_AXES: readonly HabitAxisDefinition[] = [
  {
    code: "hydration",
    labelPt: "Hidratação",
    shortLabelPt: "Hidratação",
    descriptionPt: "Volume plasmático, termorregulação, foco cognitivo e função muscular.",
    accentColorClass: "text-sky-400",
    badgeBgClass: "bg-sky-500/15 text-sky-400 border-sky-500/30",
    defaultImpactPt:
      "Sustenta volume sanguíneo, transporte de nutrientes e desempenho cognitivo e físico.",
  },
  {
    code: "circadian_sleep",
    labelPt: "Luz & Ritmo Circadiano",
    shortLabelPt: "Luz & Sono",
    descriptionPt: "Alinhamento do relógio biológico, vitamina D e qualidade do sono profundo.",
    accentColorClass: "text-amber-400",
    badgeBgClass: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    defaultImpactPt:
      "Regula melatonina e cortisol, aprofundando o sono restaurador e a disposição matinal.",
  },
  {
    code: "movement",
    labelPt: "Movimento & Mobilidade",
    shortLabelPt: "Movimento",
    descriptionPt: "Amplitude articular, saúde tendínea, circulação e recuperação ativa.",
    accentColorClass: "text-accent-text",
    badgeBgClass: "bg-lima/15 text-accent-text border-lima/35",
    defaultImpactPt:
      "Preserva articulações, reduz rigidez muscular e acelera a recuperação entre treinos.",
  },
  {
    code: "mind_recovery",
    labelPt: "Mente & Respiração",
    shortLabelPt: "Mente",
    descriptionPt: "Ativação parassimpática, controle do estresse e variabilidade cardíaca (VFC).",
    accentColorClass: "text-violet-400",
    badgeBgClass: "bg-violet-500/15 text-violet-400 border-violet-500/30",
    defaultImpactPt:
      "Reduz carga alostática e estresse mental, elevando foco e recuperação do sistema nervoso.",
  },
  {
    code: "nutrition",
    labelPt: "Nutrição",
    shortLabelPt: "Nutrição",
    descriptionPt: "Energia estável, síntese proteica, saciedade e controle inflamatório.",
    accentColorClass: "text-emerald-400",
    badgeBgClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    defaultImpactPt:
      "Estabiliza glicemia, acelera reconstrução muscular e mantém energia constante ao longo do dia.",
  },
  {
    code: "custom",
    labelPt: "Personalizado",
    shortLabelPt: "Outro",
    descriptionPt: "Hábitos autorais criados sob medida para sua rotina e objetivos pessoais.",
    accentColorClass: "text-foreground",
    badgeBgClass: "bg-foreground/10 text-foreground border-line",
    defaultImpactPt:
      "Constrói disciplina diária e consistência sustentável alinhada ao seu estilo de vida.",
  },
] as const;

export const HABIT_AXIS_MAP: Record<HabitAxisCode, HabitAxisDefinition> =
  HABIT_AXES.reduce(
    (acc, axis) => {
      acc[axis.code] = axis;
      return acc;
    },
    {} as Record<HabitAxisCode, HabitAxisDefinition>
  );

export function resolveHabitAxis(code?: string | null): HabitAxisDefinition {
  if (code && code in HABIT_AXIS_MAP) {
    return HABIT_AXIS_MAP[code as HabitAxisCode];
  }
  return HABIT_AXIS_MAP.custom;
}

/**
 * Catálogo curado de hábitos saudáveis (com destaque para os 6 pilares essenciais).
 */
export const HABIT_PRESETS_CATALOG: readonly HabitPresetDefinition[] = [
  {
    code: "water_4l",
    axisCode: "hydration",
    titlePt: "4L de água",
    targetLabelPt: "4L / dia",
    positiveImpactPt:
      "Mantém hidratação celular plena, previne queda de foco e protege força e recuperação muscular.",
    eaImpact: 45,
    featured: true,
  },
  {
    code: "sun_10m",
    axisCode: "circadian_sleep",
    titlePt: "10 min de exposição ao sol diário",
    targetLabelPt: "10 min",
    positiveImpactPt:
      "Ancora seu relógio circadiano, estimula síntese de vitamina D e melhora o sono à noite.",
    eaImpact: 40,
    featured: true,
  },
  {
    code: "mobility_stretch",
    axisCode: "movement",
    titlePt: "Mobilidade e alongamento",
    targetLabelPt: "15 min",
    positiveImpactPt:
      "Alivia tensões acumuladas, melhora amplitude articular e reduz risco de dores e lesões.",
    eaImpact: 50,
    featured: true,
  },
  {
    code: "breathing_5m",
    axisCode: "mind_recovery",
    titlePt: "5 min de respiração",
    targetLabelPt: "5 min",
    positiveImpactPt:
      "Ativa o sistema nervoso parassimpático, baixa o cortisol e devolve clareza mental imediata.",
    eaImpact: 40,
    featured: true,
  },
  {
    code: "walk_10m",
    axisCode: "movement",
    titlePt: "10 min de caminhada",
    targetLabelPt: "10 min",
    positiveImpactPt:
      "Estimula circulação, controle glicêmico pós-refeição e recuperação ativa sem gerar fadiga.",
    eaImpact: 45,
    featured: true,
  },
  {
    code: "clean_meals_4",
    axisCode: "nutrition",
    titlePt: "4 refeições limpas",
    targetLabelPt: "4 refeições",
    positiveImpactPt:
      "Fornece energia limpa e proteína distribuída ao longo do dia para saúde metabólica e tônus.",
    eaImpact: 55,
    featured: true,
  },
  // Opções extras por eixo para ampliar escolha rápida
  {
    code: "water_3l",
    axisCode: "hydration",
    titlePt: "3L de água",
    targetLabelPt: "3L / dia",
    positiveImpactPt:
      "Garante boa hidratação basal, digestão eficiente e disposição física constante.",
    eaImpact: 40,
  },
  {
    code: "no_screens_night",
    axisCode: "circadian_sleep",
    titlePt: "Sem telas 45 min antes de dormir",
    targetLabelPt: "45 min",
    positiveImpactPt:
      "Preserva a liberação natural de melatonina e aumenta o tempo de sono profundo e REM.",
    eaImpact: 50,
  },
  {
    code: "sleep_8h",
    axisCode: "circadian_sleep",
    titlePt: "Dormir 7h30–8h",
    targetLabelPt: "8 horas",
    positiveImpactPt:
      "Principal alavanca de regeneração hormonal, memória motora e recarga da Bateria do Corpo.",
    eaImpact: 65,
  },
  {
    code: "protein_all_meals",
    axisCode: "nutrition",
    titlePt: "Proteína em todas as refeições",
    targetLabelPt: "Meta diária",
    positiveImpactPt:
      "Aumenta saciedade, preserva massa magra e otimiza a reconstrução tecidual pós-treino.",
    eaImpact: 45,
  },
  {
    code: "meditation_10m",
    axisCode: "mind_recovery",
    titlePt: "10 min de pausa / leitura sem celular",
    targetLabelPt: "10 min",
    positiveImpactPt:
      "Reduz hiperestimulação dopaminérgica e restaura capacidade de atenção profunda.",
    eaImpact: 35,
  },
] as const;

export interface HealthyHabitItemInput {
  id: string;
  axisCode: string;
  presetCode: string | null;
  title: string;
  targetLabel: string | null;
  positiveImpactPt: string | null;
  eaImpact: number;
  createdByRole: string;
  isActive: boolean;
}

export interface DailyHabitLogInput {
  habitId: string;
  localDate: string; // YYYY-MM-DD
  completed: boolean;
}

export interface EnrichedHealthyHabit extends HealthyHabitItemInput {
  axis: HabitAxisDefinition;
  completedToday: boolean;
  streakDays: number;
  completedLast7Days: number;
  adherence7dPercent: number;
  last7DaysStatus: { dateStr: string; completed: boolean }[];
}

export interface HealthyHabitsSnapshot {
  todayDateStr: string;
  habits: EnrichedHealthyHabit[];
  totalActiveCount: number;
  completedTodayCount: number;
  todayCompletionPercent: number;
  adherence7dPercent: number;
  currentStreakDays: number;
  eaBonusToday: number;
  strongestAxisLabelPt: string | null;
  impactNarrativePt: string;
  coachStatusLabelPt: string;
}

function shiftDateIso(dateStr: string, deltaDays: number): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().split("T")[0];
}

/**
 * Calcula progresso diário, streak, adesão 7 dias e narrativa de impacto positivo do Selye.
 */
export function computeHealthyHabitsSnapshot(params: {
  habits: HealthyHabitItemInput[];
  logs: DailyHabitLogInput[];
  todayDateStr: string;
}): HealthyHabitsSnapshot {
  const activeHabits = params.habits.filter((h) => h.isActive);
  const todayDateStr = params.todayDateStr;

  // Mapa: habitId -> Set<YYYY-MM-DD> concluídos
  const completedDatesByHabit = new Map<string, Set<string>>();
  // Mapa: YYYY-MM-DD -> quantidade de hábitos concluídos no dia
  const completedCountByDate = new Map<string, number>();

  for (const log of params.logs) {
    if (!log.completed || !log.localDate) continue;
    const dateNorm = String(log.localDate).slice(0, 10);
    let set = completedDatesByHabit.get(log.habitId);
    if (!set) {
      set = new Set<string>();
      completedDatesByHabit.set(log.habitId, set);
    }
    if (!set.has(dateNorm)) {
      set.add(dateNorm);
      completedCountByDate.set(
        dateNorm,
        (completedCountByDate.get(dateNorm) || 0) + 1
      );
    }
  }

  // Janela dos últimos 7 dias (do mais antigo ao mais recente = hoje)
  const last7Dates: string[] = [];
  for (let i = 6; i >= 0; i--) {
    last7Dates.push(shiftDateIso(todayDateStr, -i));
  }

  const axisHits = new Map<HabitAxisCode, number>();

  const enriched: EnrichedHealthyHabit[] = activeHabits.map((h) => {
    const axis = resolveHabitAxis(h.axisCode);
    const doneDates = completedDatesByHabit.get(h.id) || new Set<string>();
    const completedToday = doneDates.has(todayDateStr);

    // Streak individual do hábito (conta a partir de hoje se feito, ou de ontem se hoje ainda está em aberto)
    let streakDays = 0;
    let cursorOffset = completedToday ? 0 : -1;
    for (let step = 0; step < 365; step++) {
      const checkDate = shiftDateIso(todayDateStr, cursorOffset - step);
      if (doneDates.has(checkDate)) {
        streakDays++;
      } else {
        break;
      }
    }

    const last7DaysStatus = last7Dates.map((d) => ({
      dateStr: d,
      completed: doneDates.has(d),
    }));
    const completedLast7Days = last7DaysStatus.filter((x) => x.completed).length;
    const adherence7dPercent = Math.round((completedLast7Days / 7) * 100);

    axisHits.set(axis.code, (axisHits.get(axis.code) || 0) + completedLast7Days);

    return {
      ...h,
      axis,
      completedToday,
      streakDays,
      completedLast7Days,
      adherence7dPercent,
      last7DaysStatus,
    };
  });

  const totalActiveCount = enriched.length;
  const completedTodayCount = enriched.filter((h) => h.completedToday).length;
  const todayCompletionPercent =
    totalActiveCount > 0
      ? Math.round((completedTodayCount / totalActiveCount) * 100)
      : 0;

  const eaBonusToday = enriched
    .filter((h) => h.completedToday)
    .reduce((sum, h) => sum + (h.eaImpact || 0), 0);

  const totalPossible7d = totalActiveCount * 7;
  const totalDone7d = enriched.reduce((sum, h) => sum + h.completedLast7Days, 0);
  const adherence7dPercent =
    totalPossible7d > 0 ? Math.round((totalDone7d / totalPossible7d) * 100) : 0;

  // Streak geral de rotina (dias consecutivos com pelo menos 1 hábito saudável concluído)
  let currentStreakDays = 0;
  const hasAnyToday = (completedCountByDate.get(todayDateStr) || 0) > 0;
  let globalOffset = hasAnyToday ? 0 : -1;
  for (let step = 0; step < 365; step++) {
    const d = shiftDateIso(todayDateStr, globalOffset - step);
    if ((completedCountByDate.get(d) || 0) > 0) {
      currentStreakDays++;
    } else {
      break;
    }
  }

  // Eixo mais consistente nos últimos 7 dias
  let strongestAxisCode: HabitAxisCode | null = null;
  let maxAxisHits = 0;
  for (const [code, hits] of axisHits.entries()) {
    if (hits > maxAxisHits) {
      maxAxisHits = hits;
      strongestAxisCode = code;
    }
  }
  const strongestAxisLabelPt = strongestAxisCode
    ? HABIT_AXIS_MAP[strongestAxisCode].labelPt
    : null;

  // Narrativa viva do Selye acompanhando a rotina de perto
  let coachStatusLabelPt = "Comece sua rotina";
  let impactNarrativePt =
    "Adicione hábitos saudáveis no seu Perfil para o Selye acompanhar sua constância e o impacto real na sua energia.";

  if (totalActiveCount > 0) {
    if (completedTodayCount === totalActiveCount) {
      coachStatusLabelPt = "Dia 100% blindado";
      impactNarrativePt = `Rotina completa hoje (+${eaBonusToday} EA de suporte). Você fechou todos os ${totalActiveCount} hábitos — isso acelera sua recuperação, clareza mental e qualidade de sono.`;
    } else if (completedTodayCount > 0) {
      const remaining = totalActiveCount - completedTodayCount;
      coachStatusLabelPt = `${completedTodayCount}/${totalActiveCount} concluídos hoje`;
      const focusPart = strongestAxisLabelPt
        ? ` Seu pilar mais forte na semana é ${strongestAxisLabelPt}.`
        : "";
      impactNarrativePt = `Você já somou +${eaBonusToday} EA em hábitos saudáveis hoje. Faltam ${remaining} ${
        remaining === 1 ? "hábito" : "hábitos"
      } para fechar o dia com consistência máxima.${focusPart}`;
    } else if (currentStreakDays >= 2) {
      coachStatusLabelPt = `Sequência de ${currentStreakDays} dias`;
      impactNarrativePt = `Você vem de ${currentStreakDays} dias seguidos cuidando da sua rotina (${adherence7dPercent}% nos últimos 7 dias). Marque seu primeiro hábito de hoje para manter o ritmo vivo.`;
    } else {
      coachStatusLabelPt = "Pronto para iniciar o dia";
      impactNarrativePt =
        "Pequenas escolhas diárias constroem grandes resultados. Marque cada hábito concluído ao longo do dia para acompanhar seu impacto positivo.";
    }
  }

  return {
    todayDateStr,
    habits: enriched,
    totalActiveCount,
    completedTodayCount,
    todayCompletionPercent,
    adherence7dPercent,
    currentStreakDays,
    eaBonusToday,
    strongestAxisLabelPt,
    impactNarrativePt,
    coachStatusLabelPt,
  };
}
