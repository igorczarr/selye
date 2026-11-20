/**
 * Selye — Fase 4: Motor de Análise Ficha ↔ Objetivo & Radar de Lacunas Semanais
 *
 * Traduz qualquer ficha de treino (lista de exercícios, séries, repetições, descanso)
 * em efeito fisiológico concreto e mede o alinhamento + lacunas semanais frente à
 * modalidade principal e nível do atleta definidos no Modality Profile Registry.
 */

import {
  CATEGORY_MAP,
  classifyExerciseCategory,
  type ExerciseCategoryId,
} from "../catalog/exercise-categories";
import {
  MODALITY_REGISTRY,
  resolveCoreModalityCode,
  type CoreModalityCode,
  type ExperienceLevel,
  type RoutineTrainingEffectSnapshot,
  type TrainingCapacityCode,
} from "../modalities";
import {
  countTotalSets,
  estimateRoutineDurationMinutes,
} from "../../lib/routine-metrics";
import { calculateUnifiedSessionLoad } from "../performance/training-load";

export interface AnalyzablePrescription {
  exerciseNamePt: string;
  exerciseNameEn?: string | null;
  modalityCode?: string | null;
  secondaryMuscles?: string[] | null;
  targetSets?: number | null;
  targetReps?: string | null;
  restSeconds?: number | null;
  setType?: string | null;
}

export interface AnalyzableRoutine {
  id?: string;
  title: string;
  modalityCode?: string | null;
  dayOfWeek?: number | null;
  prescriptions: AnalyzablePrescription[];
}

export type RoutineAlignmentTier =
  | "high"
  | "moderate"
  | "caution_overload"
  | "general";

export interface RoutineEffectAnalysisResult {
  snapshot: RoutineTrainingEffectSnapshot;
  primaryCapacityLabelPt: string;
  headlinePt: string;
  alignmentTier: RoutineAlignmentTier;
  alignmentBadgePt: string;
  alignmentExplanationPt: string;
  impactedKpiLabelsPt: string[];
  topCategories: {
    categoryId: ExerciseCategoryId;
    labelPt: string;
    sets: number;
  }[];
  hasEccentricPosteriorWork: boolean;
  hasShoulderPrehabWork: boolean;
  hasPowerPlyoWork: boolean;
}

export interface WeeklyRoutineGapItem {
  code: string;
  severity: "high" | "caution" | "info";
  titlePt: string;
  detailPt: string;
  suggestionPt: string;
  scientificRefId: string;
}

export interface WeeklyRoutineCoverageResult {
  primaryModality: CoreModalityCode;
  modalityShortNamePt: string;
  experienceLevel: ExperienceLevel;
  coverageScorePercent: number;
  statusLabelPt: string;
  totalRoutinesAnalyzed: number;
  totalWeeklyEffectiveSets: number;
  weeklyCategorySets: Partial<Record<ExerciseCategoryId, number>>;
  coveredPillarsPt: string[];
  gaps: WeeklyRoutineGapItem[];
}

const CAPACITY_LABELS_PT: Record<TrainingCapacityCode, string> = {
  hypertrophy: "Hipertrofia & Volume Estrutural",
  maximal_strength: "Força Máxima & Neural",
  explosive_power: "Potência Explosiva",
  plyometric_reactive: "Pliometria & Reatividade",
  aerobic_base: "Base Aeróbica",
  lactate_threshold: "Limiar Anaeróbico",
  vo2_max: "VO₂máx",
  running_economy: "Economia de Corrida & Rigidez Tendínea",
  muscular_endurance: "Resistência Muscular Localizada",
  work_capacity: "Capacidade de Trabalho Metabólico",
  shoulder_prehab: "Blindagem de Ombro & Escápula",
  joint_durability: "Durabilidade Articular & Tendínea",
  core_transfer: "Estabilidade & Transferência de Core",
  sand_agility: "Agilidade & Específico na Areia",
  change_of_direction: "Mudança de Direção & Aceleração",
  repeated_sprint_ability: "Sprints Repetidos (RSA)",
  eccentric_hamstring_protection: "Proteção Excêntrica de Posteriores",
  anaerobic_combat_capacity: "Resistência Anaeróbica de Combate",
  grip_isometric_endurance: "Força de Pegada & Puxada",
  relative_strength_skill: "Força Relativa & Controle Corporal",
  technical_efficiency: "Eficiência Técnica",
  recovery_mobility: "Mobilidade & Recuperação Ativa",
};

function parseAverageTargetReps(raw?: string | null): number {
  if (!raw) return 10;
  const nums = raw.match(/\d+/g)?.map(Number).filter((n) => n > 0 && n <= 100);
  if (!nums || nums.length === 0) return 10;
  if (nums.length === 1) return nums[0];
  return (nums[0] + nums[1]) / 2;
}

function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Analisa uma ficha individual e traduz seus exercícios em efeito fisiológico
 * e contribuição concreta para a modalidade principal do atleta.
 */
export function analyzeRoutineEffect(params: {
  routine: AnalyzableRoutine;
  athletePrimaryModality: CoreModalityCode;
  experienceLevel?: ExperienceLevel;
}): RoutineEffectAnalysisResult {
  const { routine, athletePrimaryModality } = params;
  const spec = MODALITY_REGISTRY[athletePrimaryModality];
  const prescriptions = routine.prescriptions || [];

  const categorySets: Partial<Record<ExerciseCategoryId, number>> = {};
  let effectiveSetsTotal = 0;
  let weightedRepsSum = 0;
  let weightedRepsSets = 0;
  let hasEccentricPosteriorWork = false;
  let hasShoulderPrehabWork = false;
  let hasPowerPlyoWork = false;

  for (const p of prescriptions) {
    if (p.setType === "warmup") continue;
    const sets = Math.max(1, p.targetSets ?? 3);
    const avgReps = parseAverageTargetReps(p.targetReps);
    const cat = classifyExerciseCategory({
      namePt: p.exerciseNamePt,
      nameEn: p.exerciseNameEn,
      modalityCode: p.modalityCode || routine.modalityCode,
      secondaryMuscles: p.secondaryMuscles,
    });

    categorySets[cat] = (categorySets[cat] || 0) + sets;
    effectiveSetsTotal += sets;

    // Exercícios isométricos/tempo (ex.: Prancha 45s) não devem distorcer a média de repetições de carga
    const isTimedIsometric =
      /(\d+\s*s(eg)?\b|isometr|prancha|plank|hollow|hold)/i.test(
        `${p.exerciseNamePt} ${p.targetReps || ""}`
      ) && avgReps >= 20;
    if (!isTimedIsometric && cat !== "mobilidade") {
      weightedRepsSum += avgReps * sets;
      weightedRepsSets += sets;
    }

    const norm = normalizeText(`${p.exerciseNamePt} ${p.exerciseNameEn || ""}`);
    if (
      /(nordic|nordica|stiff|romeno|rdl|flexora|isquiotib|posterior|copenhagen|adutor)/.test(
        norm
      )
    ) {
      hasEccentricPosteriorWork = true;
    }
    if (
      /(manguito|rotacao externa|face pull|y-t-w|escapul|serrate|serratil|crucifixo inverso|band pull)/.test(
        norm
      )
    ) {
      hasShoulderPrehabWork = true;
    }
    if (cat === "pliometria" || cat === "areia") {
      hasPowerPlyoWork = true;
    }
  }

  const avgReps = weightedRepsSets > 0 ? weightedRepsSum / weightedRepsSets : 10;
  const topCategories = (
    Object.entries(categorySets) as [ExerciseCategoryId, number][]
  )
    .filter(([, sets]) => sets > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([categoryId, sets]) => ({
      categoryId,
      labelPt: CATEGORY_MAP[categoryId]?.shortLabel || categoryId,
      sets,
    }));

  // 1. Determinar capacidade primária e secundárias
  const secondaryCapacities: TrainingCapacityCode[] = [];
  let primaryCapacity: TrainingCapacityCode = "hypertrophy";

  const plyoSets = categorySets.pliometria || 0;
  const sandSets = categorySets.areia || 0;
  const mobilitySets = categorySets.mobilidade || 0;
  const legSets = categorySets.pernas || 0;
  const shoulderSets = categorySets.ombros || 0;
  const coreSets = categorySets.core || 0;
  const backSets = categorySets.costas || 0;

  if (sandSets >= Math.max(3, effectiveSetsTotal * 0.35)) {
    primaryCapacity = "sand_agility";
    if (plyoSets > 0) secondaryCapacities.push("explosive_power");
  } else if (mobilitySets >= Math.max(3, effectiveSetsTotal * 0.5)) {
    primaryCapacity = "recovery_mobility";
  } else if (plyoSets >= Math.max(3, effectiveSetsTotal * 0.3)) {
    primaryCapacity = "explosive_power";
    secondaryCapacities.push("plyometric_reactive");
    if (legSets > 0) secondaryCapacities.push("maximal_strength");
  } else if (hasShoulderPrehabWork && shoulderSets + coreSets >= effectiveSetsTotal * 0.45) {
    primaryCapacity = "shoulder_prehab";
    if (coreSets > 0) secondaryCapacities.push("core_transfer");
  } else if (avgReps <= 6.2 && effectiveSetsTotal > 0) {
    primaryCapacity = "maximal_strength";
    if (hasEccentricPosteriorWork) secondaryCapacities.push("eccentric_hamstring_protection");
    if (coreSets > 0) secondaryCapacities.push("core_transfer");
  } else if (avgReps >= 15 && effectiveSetsTotal > 0) {
    primaryCapacity = "muscular_endurance";
    if (coreSets > 0) secondaryCapacities.push("core_transfer");
  } else {
    primaryCapacity = "hypertrophy";
    if (avgReps <= 8.5) secondaryCapacities.push("maximal_strength");
    if (hasEccentricPosteriorWork) secondaryCapacities.push("eccentric_hamstring_protection");
    if (hasShoulderPrehabWork) secondaryCapacities.push("shoulder_prehab");
    if (hasPowerPlyoWork) secondaryCapacities.push("explosive_power");
    if (coreSets >= 2) secondaryCapacities.push("core_transfer");
  }

  // Adaptação contextual de rótulo quando serve a esporte específico
  if (
    athletePrimaryModality === "running" &&
    legSets >= 4 &&
    avgReps <= 9
  ) {
    secondaryCapacities.unshift("running_economy");
  }
  if (
    (athletePrimaryModality === "football" || athletePrimaryModality === "futsal") &&
    hasEccentricPosteriorWork &&
    !secondaryCapacities.includes("eccentric_hamstring_protection")
  ) {
    secondaryCapacities.unshift("eccentric_hamstring_protection");
  }
  if (
    athletePrimaryModality === "martial_arts" &&
    backSets >= 4 &&
    !secondaryCapacities.includes("grip_isometric_endurance")
  ) {
    secondaryCapacities.push("grip_isometric_endurance");
  }

  const uniqueSecondary = Array.from(
    new Set(secondaryCapacities.filter((c) => c !== primaryCapacity))
  ).slice(0, 3);

  // 2. Duração e Carga EA estimada
  const estimatedDurationMin = estimateRoutineDurationMinutes(prescriptions);
  const estimatedTotalSets = countTotalSets(prescriptions);
  const impliedRpe =
    primaryCapacity === "recovery_mobility"
      ? 4
      : primaryCapacity === "maximal_strength" || primaryCapacity === "explosive_power"
        ? 8
        : 7.5;
  const estimatedLoadUa =
    estimatedDurationMin > 0
      ? calculateUnifiedSessionLoad({
          durationMinutes: estimatedDurationMin,
          rpe: impliedRpe,
          modalityCode: routine.modalityCode || "strength",
        })
      : 0;

  // 3. Alinhamento com a Modalidade Principal do Atleta
  const priorityCats = new Set(spec.complementaryStrength.priorityExerciseCategories);
  const prioritySets = topCategories
    .filter((c) => priorityCats.has(c.categoryId))
    .reduce((acc, c) => acc + c.sets, 0);
  const priorityShare =
    effectiveSetsTotal > 0 ? prioritySets / effectiveSetsTotal : 0;

  const routineCoreMod = resolveCoreModalityCode(routine.modalityCode);
  let alignmentTier: RoutineAlignmentTier = "moderate";
  let alignmentBadgePt = "Suporte Geral";
  let alignmentExplanationPt = "";
  const impactedKpiLabelsPt: string[] = [];

  if (effectiveSetsTotal === 0) {
    alignmentTier = "general";
    alignmentBadgePt = "Ficha Vazia";
    alignmentExplanationPt =
      "Adicione exercícios para o Selye traduzir o efeito fisiológico e o impacto na sua modalidade.";
  } else if (athletePrimaryModality === "strength") {
    if (effectiveSetsTotal > 28) {
      alignmentTier = "caution_overload";
      alignmentBadgePt = "Volume Alto na Sessão";
      alignmentExplanationPt = `Com ${effectiveSetsTotal} séries efetivas em uma única sessão, a fadiga residual tende a reduzir a qualidade das séries finais (Schoenfeld et al., 2017). Considere dividir ou enxugar para 14–22 séries.`;
    } else {
      alignmentTier = "high";
      alignmentBadgePt = "Alinhamento Alto · Musculação";
      alignmentExplanationPt = `Entrega ${topCategories
        .slice(0, 3)
        .map((c) => `${c.sets} séries de ${c.labelPt}`)
        .join(", ")} em zona de ${CAPACITY_LABELS_PT[primaryCapacity].toLowerCase()}, alimentando diretamente séries efetivas/semana e e1RM.`;
    }
    impactedKpiLabelsPt.push("Séries Efetivas/Grupo", "e1RM");
  } else if (
    // Alerta científico: corredor/ciclista/vôlei/futebol com ficha de perna ultra-volumosa estilo bodybuilding
    ["running", "cycling", "beach_volleyball", "football", "futsal"].includes(
      athletePrimaryModality
    ) &&
    legSets >= 16 &&
    avgReps >= 9
  ) {
    alignmentTier = "caution_overload";
    alignmentBadgePt = `Atenção · Volume de Pernas (${spec.shortNamePt})`;
    alignmentExplanationPt = `Esta ficha soma ${legSets} séries de pernas em faixa moderada-alta (~${Math.round(
      avgReps
    )} reps), o que pode gerar dor tardia (DOMS) e prejudicar suas sessões-chave de ${
      spec.shortNamePt
    }. A literatura recomenda 6–12 séries mais densas (4–8 reps, RIR 2) longe de treinos intensos.`;
    impactedKpiLabelsPt.push(
      ...spec.complementaryStrength.expectedKpiImpacts.map(
        (imp) =>
          spec.kpis.find((k) => k.key === imp.kpiKey)?.shortLabelPt || imp.kpiKey
      )
    );
  } else if (priorityShare >= 0.55 || routineCoreMod === athletePrimaryModality) {
    alignmentTier = "high";
    alignmentBadgePt = `Alta Transferência → ${spec.shortNamePt}`;
    const kpiImpacts = spec.complementaryStrength.expectedKpiImpacts
      .map((imp) => {
        const k = spec.kpis.find((d) => d.key === imp.kpiKey);
        if (k) impactedKpiLabelsPt.push(k.shortLabelPt);
        return imp.expectedMechanismPt;
      })
      .slice(0, 1);

    alignmentExplanationPt =
      kpiImpacts[0] ||
      `Cobre categorias prioritárias de ${spec.shortNamePt} (${topCategories
        .slice(0, 3)
        .map((c) => c.labelPt)
        .join(", ")}).`;
  } else {
    alignmentTier = "moderate";
    alignmentBadgePt = `Complemento Geral`;
    alignmentExplanationPt = `Trabalha ${topCategories
      .slice(0, 2)
      .map((c) => c.labelPt)
      .join(" e ")} com suporte indireto à sua modalidade principal (${spec.shortNamePt}).`;
  }

  const topCatsText =
    topCategories.length > 0
      ? topCategories
          .slice(0, 3)
          .map((c) => `${c.labelPt} (${c.sets}s)`)
          .join(" · ")
      : "Sem exercícios efetivos";

  const headlinePt =
    effectiveSetsTotal === 0
      ? "Sem exercícios prescritos"
      : `${CAPACITY_LABELS_PT[primaryCapacity]} · ${topCatsText}`;

  const targetModalities: CoreModalityCode[] = Array.from(
    new Set([
      athletePrimaryModality,
      ...(routineCoreMod ? [routineCoreMod] : []),
    ])
  );

  const snapshot: RoutineTrainingEffectSnapshot = {
    schemaVersion: "1.0",
    primaryCapacity,
    secondaryCapacities: uniqueSecondary,
    muscleCategorySets: categorySets,
    estimatedTotalSets,
    estimatedDurationMin,
    estimatedLoadUa,
    targetModalities,
    summaryPt: `${headlinePt}. ${alignmentExplanationPt}`,
    computedAt: new Date().toISOString(),
  };

  return {
    snapshot,
    primaryCapacityLabelPt: CAPACITY_LABELS_PT[primaryCapacity],
    headlinePt,
    alignmentTier,
    alignmentBadgePt,
    alignmentExplanationPt,
    impactedKpiLabelsPt: Array.from(new Set(impactedKpiLabelsPt)),
    topCategories,
    hasEccentricPosteriorWork,
    hasShoulderPrehabWork,
    hasPowerPlyoWork,
  };
}

/**
 * Analisa o conjunto completo de fichas semanais do atleta frente às necessidades
 * científicas da sua modalidade principal e detecta lacunas acionáveis.
 */
export function analyzeWeeklyRoutineGaps(params: {
  routines: AnalyzableRoutine[];
  athletePrimaryModality: CoreModalityCode;
  experienceLevel?: ExperienceLevel;
}): WeeklyRoutineCoverageResult {
  const { routines, athletePrimaryModality } = params;
  const level: ExperienceLevel = params.experienceLevel || "intermediate";
  const spec = MODALITY_REGISTRY[athletePrimaryModality];

  const weeklyCategorySets: Partial<Record<ExerciseCategoryId, number>> = {};
  let totalWeeklyEffectiveSets = 0;
  let anyEccentricPosterior = false;
  let anyShoulderPrehab = false;
  let anyPowerPlyo = false;

  for (const r of routines) {
    const analyzed = analyzeRoutineEffect({
      routine: r,
      athletePrimaryModality,
      experienceLevel: level,
    });
    if (analyzed.hasEccentricPosteriorWork) anyEccentricPosterior = true;
    if (analyzed.hasShoulderPrehabWork) anyShoulderPrehab = true;
    if (analyzed.hasPowerPlyoWork) anyPowerPlyo = true;

    for (const [cat, sets] of Object.entries(
      analyzed.snapshot.muscleCategorySets
    ) as [ExerciseCategoryId, number][]) {
      weeklyCategorySets[cat] = (weeklyCategorySets[cat] || 0) + sets;
      totalWeeklyEffectiveSets += sets;
    }
  }

  const legSets = weeklyCategorySets.pernas || 0;
  const chestSets = weeklyCategorySets.peito || 0;
  const backSets = weeklyCategorySets.costas || 0;
  const shoulderSets = weeklyCategorySets.ombros || 0;
  const coreSets = weeklyCategorySets.core || 0;
  const plyoSets = weeklyCategorySets.pliometria || 0;
  const mobilitySets = weeklyCategorySets.mobilidade || 0;

  const gaps: WeeklyRoutineGapItem[] = [];
  const coveredPillarsPt: string[] = [];

  if (routines.length === 0 || totalWeeklyEffectiveSets === 0) {
    return {
      primaryModality: athletePrimaryModality,
      modalityShortNamePt: spec.shortNamePt,
      experienceLevel: level,
      coverageScorePercent: 0,
      statusLabelPt: "Sem fichas estruturadas na semana",
      totalRoutinesAnalyzed: routines.length,
      totalWeeklyEffectiveSets: 0,
      weeklyCategorySets,
      coveredPillarsPt: [],
      gaps: [
        {
          code: "no_routines",
          severity: "info",
          titlePt: `Nenhuma ficha estruturada para apoiar ${spec.shortNamePt}`,
          detailPt: spec.complementaryStrength.objectiveHeadlinePt,
          suggestionPt: `Crie sua primeira ficha focada em ${spec.complementaryStrength.priorityExerciseCategories
            .slice(0, 3)
            .map((c) => CATEGORY_MAP[c].shortLabel)
            .join(", ")}.`,
          scientificRefId: spec.complementaryStrength.scientificRefIds[0] || "acsm_2009",
        },
      ],
    };
  }

  let checksPassed = 0;
  let totalChecks = 0;
  const check = (
    passed: boolean,
    pillarLabel: string,
    gap: WeeklyRoutineGapItem
  ) => {
    totalChecks++;
    if (passed) {
      checksPassed++;
      coveredPillarsPt.push(pillarLabel);
    } else {
      gaps.push(gap);
    }
  };

  switch (athletePrimaryModality) {
    case "strength": {
      const targetBand =
        spec.kpis.find((k) => k.key === "weekly_effective_sets_per_group")
          ?.experienceRanges[level] || { min: 10, max: 16 };

      check(legSets >= Math.round(targetBand.min * 0.7), `Pernas (${legSets} séries)`, {
        code: "strength_low_legs",
        severity: "caution",
        titlePt: `Volume semanal de Pernas baixo (${legSets} séries)`,
        detailPt: `Para hipertrofia/força em nível ${level}, a faixa dose-resposta fica em ${targetBand.min}–${targetBand.max} séries efetivas/semana (Schoenfeld et al., 2017).`,
        suggestionPt: "Inclua 1 sessão ou +4–6 séries de agachamento, leg press ou terra romeno.",
        scientificRefId: "schoenfeld_2017",
      });
      check(backSets >= Math.round(targetBand.min * 0.7), `Costas & Puxada (${backSets} séries)`, {
        code: "strength_low_back",
        severity: "caution",
        titlePt: `Volume semanal de Costas baixo (${backSets} séries)`,
        detailPt: "Costas fortes protegem ombros e equilibram o volume de empurrar.",
        suggestionPt: "Adicione remadas ou puxadas para aproximar da faixa semanal do seu nível.",
        scientificRefId: "schoenfeld_2017",
      });
      check(chestSets >= Math.round(targetBand.min * 0.6), `Peito & Empurrar (${chestSets} séries)`, {
        code: "strength_low_chest",
        severity: "info",
        titlePt: `Volume semanal de Peito discreto (${chestSets} séries)`,
        detailPt: `Considere elevar para ${targetBand.min}+ séries se superiores forem prioridade do bloco.`,
        suggestionPt: "Inclua variações de supino ou paralelas em RIR 2.",
        scientificRefId: "schoenfeld_2017",
      });
      check(
        backSets >= chestSets * 0.7 || chestSets === 0,
        "Equilíbrio Empurrar × Puxar",
        {
          code: "push_pull_imbalance",
          severity: "caution",
          titlePt: `Desequilíbrio Empurrar (${chestSets}s) vs. Puxar (${backSets}s)`,
          detailPt: "Excesso de empurrar em relação a puxar favorece anteriorização de ombro e sobrecarga escapular.",
          suggestionPt: "Equilibre adicionando remadas horizontais ou face pull.",
          scientificRefId: "cools_2015",
        }
      );
      break;
    }

    case "running": {
      check(legSets >= 6, `Força de Membros Inferiores (${legSets} séries)`, {
        code: "run_missing_lower_strength",
        severity: "high",
        titlePt: "Falta fortalecimento estruturado de pernas para Corrida",
        detailPt: "Força pesada de membros inferiores (2×/sem) melhora economia de corrida em 2–8% e protege tendões (Blagrove et al., 2018).",
        suggestionPt: "Inclua agachamento/búlgaro, terra romeno e panturrilha (sóleo/gastrocnêmio) em 4–8 reps RIR 2.",
        scientificRefId: "blagrove_2018",
      });
      check(coreSets >= 3, `Estabilidade de Core & Pelve (${coreSets} séries)`, {
        code: "run_missing_core",
        severity: "caution",
        titlePt: "Sem estímulo semanal dedicado de Core/Estabilidade Pélvica",
        detailPt: "Core estável evita queda de quadril na fase final de corridas longas.",
        suggestionPt: "Adicione 3–6 séries/sem de prancha, dead bug ou Pallof press.",
        scientificRefId: "blagrove_2018",
      });
      check(anyPowerPlyo || mobilitySets >= 2, "Rigidez Tendínea (Plio/Mobilidade)", {
        code: "run_missing_plyo",
        severity: "info",
        titlePt: "Oportunidade: baixa dose de pliometria reativa para economia de passada",
        detailPt: "Pequenos blocos de saltos reativos (20–40 contatos) melhoram retorno elástico do tendão de Aquiles.",
        suggestionPt: "Adicione saltitos bilaterais ou pogo jumps leves no aquecimento da força.",
        scientificRefId: "blagrove_2018",
      });
      break;
    }

    case "cycling": {
      check(legSets >= 6, `Força Pesada de Pernas (${legSets} séries)`, {
        code: "cycle_missing_legs",
        severity: "high",
        titlePt: "Falta força pesada de pernas para potência sustentada no pedal",
        detailPt: "Força máxima (4–8 RM) melhora economia de pedalada e sprint final (Rønnestad & Mujika, 2014).",
        suggestionPt: "Inclua meio-agachamento, leg press unilateral ou step-up pesado 1–2×/sem.",
        scientificRefId: "ronnestad_mujika_2014",
      });
      check(coreSets + backSets >= 4, `Postura Aero: Core & Costas (${coreSets + backSets} séries)`, {
        code: "cycle_missing_trunk",
        severity: "caution",
        titlePt: "Pouco suporte de Core & Lombar/Costas para posição no selim",
        detailPt: "Tronco forte transfere potência para o pedal e evita dor lombar em pedais >2h.",
        suggestionPt: "Adicione pranchas, remadas e extensões lombares controladas.",
        scientificRefId: "ronnestad_mujika_2014",
      });
      break;
    }

    case "beach_volleyball": {
      check(anyPowerPlyo || plyoSets >= 3, `Potência de Salto / Pliometria (${plyoSets} séries)`, {
        code: "bv_missing_power",
        severity: "high",
        titlePt: "Sua semana não tem estímulo estruturado de potência de salto (CMJ)",
        detailPt: "A areia absorve energia elástica; força explosiva e pliometria de baixa dose elevam a altura de salto (Markovic, 2007).",
        suggestionPt: "Inclua 3–6 séries de saltos verticais/box jump ou arremessos explosivos longe do dia de jogo.",
        scientificRefId: "markovic_2007",
      });
      check(anyShoulderPrehab || shoulderSets >= 4, `Blindagem de Ombro & Escápula`, {
        code: "bv_missing_shoulder",
        severity: "high",
        titlePt: "Sem blindagem preventiva de ombro/manguito na semana",
        detailPt: "Lesões de ombro geram os maiores afastamentos no vôlei; 2×/sem de rotadores externos e escápula reduzem drasticamente o risco (Cools et al., 2015).",
        suggestionPt: "Inclua rotação externa com elástico/polia, face pull e Y-T-W 2×/semana.",
        scientificRefId: "cools_2015",
      });
      check(legSets >= 6, `Força-Base de Pernas (${legSets} séries)`, {
        code: "bv_missing_legs",
        severity: "caution",
        titlePt: "Base de força de membros inferiores abaixo do ideal para areia",
        detailPt: "Força concêntrica pesada (4–6 reps) é o alicerce para saltar mais alto na areia fofa.",
        suggestionPt: "Adicione agachamento, búlgaro ou terra romeno em RIR 2 (sem ir à falha).",
        scientificRefId: "claudino_2017",
      });
      check(coreSets >= 3, `Core Rotacional (${coreSets} séries)`, {
        code: "bv_missing_core",
        severity: "info",
        titlePt: "Pouco trabalho de Core rotacional para transferência de ataque",
        detailPt: "A força do ataque nasce na areia e passa pelo tronco antes de chegar ao ombro.",
        suggestionPt: "Inclua Pallof press ou woodchop/lenhador.",
        scientificRefId: "cools_2015",
      });
      break;
    }

    case "football":
    case "futsal": {
      check(anyEccentricPosterior, "Blindagem Excêntrica de Posteriores (Nordic/RDL)", {
        code: "foot_missing_eccentric",
        severity: "high",
        titlePt: `Sem estímulo excêntrico de posteriores na semana para ${spec.shortNamePt}`,
        detailPt: "Protocolos excêntricos (Nordic Hamstring / RDL) reduzem em até 71% lesões agudas de isquiotibiais (Petersen et al., 2011).",
        suggestionPt: "Inclua Flexão Nórdica (Nordic), Stiff/RDL e adutores longe da véspera do jogo.",
        scientificRefId: "petersen_2011",
      });
      check(legSets >= 6, `Força Unilateral de Aceleração (${legSets} séries)`, {
        code: "foot_missing_legs",
        severity: "caution",
        titlePt: `Volume de força de pernas baixo para ${spec.shortNamePt}`,
        detailPt: "Força unilateral sustenta aceleração nos primeiros 10m e frenagens seguras.",
        suggestionPt: "Inclua búlgaro, afundo ou step-up pesado em MD-4/MD-3.",
        scientificRefId: athletePrimaryModality === "futsal" ? "naser_2017" : "stolen_2005",
      });
      check(coreSets >= 3, `Estabilidade de Core & Quadril (${coreSets} séries)`, {
        code: "foot_missing_core",
        severity: "info",
        titlePt: "Falta suporte semanal de Core/Pelve para cortes e disputas",
        detailPt: "Reduz sobrecarga em região pubiana e melhora estabilidade em mudanças de direção.",
        suggestionPt: "Adicione prancha lateral/Copenhagen e anti-rotação.",
        scientificRefId: "petersen_2011",
      });
      break;
    }

    case "martial_arts": {
      check(backSets >= 6, `Força de Puxada & Pegada (${backSets} séries)`, {
        code: "combat_missing_pull",
        severity: "high",
        titlePt: "Baixo volume de puxada/dorsal para lutas (clinch/pegada)",
        detailPt: "Força relativa de puxada e resistência de pegada diferenciam atletas em grappling e clinch (Franchini et al., 2011; James et al., 2016).",
        suggestionPt: "Inclua barra fixa, remadas pesadas e exercícios de pegada.",
        scientificRefId: "franchini_2011",
      });
      check(legSets >= 6, `Base & Quadril (${legSets} séries)`, {
        code: "combat_missing_legs",
        severity: "caution",
        titlePt: "Falta fortalecimento de quadril/pernas para quedas e potência de golpe",
        detailPt: "Potência de membros inferiores gera base no tatame e torque nos golpes.",
        suggestionPt: "Inclua levantamento terra/trap bar, agachamento ou búlgaro (3–6 reps RIR 2).",
        scientificRefId: "james_2016",
      });
      check(coreSets + plyoSets >= 4, "Potência Rotacional & Core", {
        code: "combat_missing_rotational",
        severity: "info",
        titlePt: "Oportunidade: adicionar potência rotacional e core anti-rotação",
        detailPt: "Transfere força do solo para golpes e defesas de queda.",
        suggestionPt: "Adicione arremessos de medicine ball, kettlebell swing ou woodchop.",
        scientificRefId: "james_2016",
      });
      break;
    }

    case "swimming": {
      check(backSets >= 6, `Propulsão de Dorsal (${backSets} séries)`, {
        code: "swim_missing_pull",
        severity: "high",
        titlePt: "Baixo estímulo seco de dorsal/puxada para Natação",
        detailPt: "Força de grande dorsal sustenta distância por braçada e ritmo CSS.",
        suggestionPt: "Inclua puxadas, barra fixa e pullover com controle escapular.",
        scientificRefId: "wakayoshi_1993",
      });
      check(anyShoulderPrehab || shoulderSets >= 3, "Blindagem de Ombro do Nadador", {
        code: "swim_missing_shoulder",
        severity: "high",
        titlePt: "Sem pré-hab de manguito e escápula na semana",
        detailPt: "Essencial para prevenir impacto subacromial com alto volume de braçadas (Cools et al., 2015).",
        suggestionPt: "Adicione rotação externa, face pull e estabilidade escapular 2×/sem.",
        scientificRefId: "cools_2015",
      });
      check(coreSets >= 4, `Linha Hidrodinâmica / Core (${coreSets} séries)`, {
        code: "swim_missing_core",
        severity: "caution",
        titlePt: "Pouco trabalho de Core para alinhamento corporal na água",
        detailPt: "Core rígido reduz arrasto de quadril e melhora SWOLF.",
        suggestionPt: "Inclua hollow body hold, prancha e dead bug.",
        scientificRefId: "wakayoshi_1993",
      });
      break;
    }

    case "calisthenics": {
      check(backSets >= 6 && chestSets >= 6, "Equilíbrio Puxar × Empurrar nos Básicos", {
        code: "calis_push_pull",
        severity: "caution",
        titlePt: `Equilíbrio Puxar (${backSets}s) × Empurrar (${chestSets}s) incompleto`,
        detailPt: "Calistenia sustentável exige razão próxima de 1:1 entre puxadas e empurradas para proteger ombros e cotovelos.",
        suggestionPt: "Equilibre séries de barra fixa/remada com paralelas/flexões progressivas.",
        scientificRefId: "kotarsky_2018",
      });
      check(legSets >= 6, `Membros Inferiores (${legSets} séries)`, {
        code: "calis_missing_legs",
        severity: "caution",
        titlePt: "Lacuna comum da Calistenia: pouco estímulo de pernas",
        detailPt: "Peso corporal puro tem teto baixo para pernas; combinar unilaterais ou carga externa mantém simetria atlética.",
        suggestionPt: "Inclua pistol/búlgaro ou agachamento/RDL 1–2×/semana.",
        scientificRefId: "kotarsky_2018",
      });
      check(coreSets >= 4, `Core & Linha Corporal (${coreSets} séries)`, {
        code: "calis_missing_core",
        severity: "info",
        titlePt: "Pouco trabalho de Core para skills isométricas",
        detailPt: "Hollow body e compressão abdominal sustentam handstand, L-sit e front lever.",
        suggestionPt: "Adicione hollow hold, elevação de pernas na barra ou L-sit.",
        scientificRefId: "kotarsky_2018",
      });
      break;
    }

    case "functional":
    default: {
      check(legSets >= 6 && backSets >= 4, "Base de Força Estruturada (Pernas + Costas)", {
        code: "func_missing_base_strength",
        severity: "caution",
        titlePt: "Falta base de força estruturada nas fichas da semana",
        detailPt: "Blocos limpos de força (RIR 2) aumentam sua margem para todos os WODs metabólicos.",
        suggestionPt: "Reserve 1–2 fichas focadas em compostos de pernas e puxadas com descanso completo.",
        scientificRefId: "schumann_2022",
      });
      check(coreSets + mobilitySets >= 3, "Core & Mobilidade Articular", {
        code: "func_missing_core_mob",
        severity: "info",
        titlePt: "Inclua rotina curta de mobilidade/core para sustentar densidade semanal",
        detailPt: "Previne perda de postura sob fadiga cardíaca alta.",
        suggestionPt: "Adicione 10 min de mobilidade torácica/quadril + pranchas.",
        scientificRefId: "kellmann_2018",
      });
      break;
    }
  }

  const coverageScorePercent =
    totalChecks > 0 ? Math.round((checksPassed / totalChecks) * 100) : 100;

  const statusLabelPt =
    coverageScorePercent >= 85
      ? "Cobertura Excelente para sua Modalidade"
      : coverageScorePercent >= 50
        ? "Boa Base · Lacunas Pontuais Detectadas"
        : "Cobertura Incompleta · Ajustar Fichas";

  return {
    primaryModality: athletePrimaryModality,
    modalityShortNamePt: spec.shortNamePt,
    experienceLevel: level,
    coverageScorePercent,
    statusLabelPt,
    totalRoutinesAnalyzed: routines.length,
    totalWeeklyEffectiveSets,
    weeklyCategorySets,
    coveredPillarsPt,
    gaps,
  };
}
