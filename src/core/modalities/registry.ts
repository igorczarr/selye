/**
 * Selye — Fase 0: Modality Profile Registry v1
 *
 * Fonte única de verdade científica e declarativa para todas as modalidades da v1.
 * Alimenta diretamente:
 * - Fase 1 (seeds de sports e sport_metrics)
 * - Fase 2 (onboarding e perfil multimodal do atleta)
 * - Fase 3 (KPI Engine e indicador "nos trilhos?")
 * - Fase 4 (tradução Ficha -> Efeito Fisiológico -> Meta da Modalidade)
 * - Fase 5 (Planner integrado do calendário, substituindo X/Y/Z por sessões reais)
 * - Fase 6 (diferenciação entre modalidade séria, suporte complementar e atividade solta)
 */

import type {
  ActivityClassificationResult,
  ActivityClass,
  AthleteModalityProfile,
  ComplementaryStrengthProtocol,
  CoreModalityCode,
  ExperienceLevel,
  GuardrailEvaluationInput,
  GuardrailWarning,
  ModalityProfileSpec,
} from "./types";

export const CORE_MODALITY_CODES: readonly CoreModalityCode[] = [
  "strength",
  "running",
  "cycling",
  "beach_volleyball",
  "swimming",
  "functional",
  "futsal",
  "football",
  "martial_arts",
  "calisthenics",
] as const;

/**
 * Mapeamento de códigos estendidos/legados (sports.ts e training-load.ts) para o perfil core
 * mais próximo, permitindo retrocompatibilidade sem duplicar regras científicas.
 */
export const MODALITY_ALIAS_MAP: Record<string, CoreModalityCode | null> = {
  strength: "strength",
  running: "running",
  cycling: "cycling",
  beach_volleyball: "beach_volleyball",
  footvolley: "beach_volleyball",
  beach_tennis: "beach_volleyball",
  swimming: "swimming",
  functional: "functional",
  cross_training: "functional",
  futsal: "futsal",
  football: "football",
  soccer: "football",
  martial_arts: "martial_arts",
  combat: "martial_arts",
  bjj: "martial_arts",
  jiu_jitsu: "martial_arts",
  boxing: "martial_arts",
  muay_thai: "martial_arts",
  mma: "martial_arts",
  judo: "martial_arts",
  calisthenics: "calisthenics",
  // Atividades tipicamente recreativas/regenerativas ou sem perfil core na v1:
  walking: null,
  mobility: null,
  pilates: null,
  other: null,
};

export const MODALITY_REGISTRY: Record<CoreModalityCode, ModalityProfileSpec> = {
  // =========================================================================
  // 1. MUSCULAÇÃO (HIPERTROFIA & FORÇA)
  // =========================================================================
  strength: {
    code: "strength",
    namePt: "Musculação (Hipertrofia & Força)",
    shortNamePt: "Musculação",
    category: "resistance",
    systemicLoadFactor: 1.0,
    summaryPt:
      "Desenvolvimento estruturado de força máxima, massa muscular e resistência estrutural via sobrecarga progressiva, volume semanal por grupo muscular e autorregulação por RIR/RPE.",
    primaryCapacities: [
      "hypertrophy",
      "maximal_strength",
      "joint_durability",
      "core_transfer",
    ],
    goalExamplesPt: [
      "Aumentar e1RM nos movimentos-chave (ex.: +10 kg no Agachamento ou Supino em 12 semanas)",
      "Sustentar 12–16 séries efetivas/semana por grupo muscular prioritário com progressão dupla",
      "Manter constância de 3–5 sessões/semana preservando RIR 1–3 e recuperação articular",
    ],
    casualActivityPolicyPt:
      "Sessão avulsa de musculação de quem não a usa como foco nem complemento estruturado soma carga sistêmica (sRPE/EA) e consistência, sem gerar metas de progressão de 1RM.",
    intensityZones: [
      {
        zone: "RIR 4+ (RPE ≤6)",
        labelPt: "Aquecimento / Técnica / Deload",
        anchorMetric: "rir_rpe",
        rangeLabel: "50–65% 1RM · RIR 4+",
        physiologicalTargetPt:
          "Ativação neuromuscular, controle motor e manutenção de padrão técnico com baixo custo de fadiga.",
      },
      {
        zone: "RIR 2–3 (RPE 7–8)",
        labelPt: "Zona Ótima de Hipertrofia & Base de Força",
        anchorMetric: "rir_rpe",
        rangeLabel: "67–82% 1RM · RIR 2–3",
        physiologicalTargetPt:
          "Alto recrutamento de unidades motoras com relação estímulo-fadiga sustentável ao longo do mesociclo.",
        recommendedWeeklySharePct: { min: 65, max: 80 },
      },
      {
        zone: "RIR 1 (RPE 9)",
        labelPt: "Sobrecarga Alta / Intensificação",
        anchorMetric: "rir_rpe",
        rangeLabel: "82–90% 1RM · RIR 1",
        physiologicalTargetPt:
          "Estímulo máximo de tensão mecânica e força neural nas séries finais ou semanas de pico.",
        recommendedWeeklySharePct: { min: 15, max: 25 },
      },
      {
        zone: "RIR 0 (RPE 10)",
        labelPt: "Falha Concêntrica / Teste Máximo",
        anchorMetric: "rir_rpe",
        rangeLabel: "90–100% 1RM · RIR 0",
        physiologicalTargetPt:
          "Uso pontual em exercícios isolados ou tomadas de marca; evitar uso crônico em compostos pesados.",
        recommendedWeeklySharePct: { min: 0, max: 10 },
      },
    ],
    kpis: [
      {
        key: "weekly_effective_sets_per_group",
        labelPt: "Séries Efetivas Semanais por Grupo",
        shortLabelPt: "Séries/Grupo",
        unit: "séries/sem",
        direction: "target_band",
        cadence: "weekly",
        isPrimaryGoalMetric: true,
        formulaExpression: "SUM(sets WHERE setType != 'warmup' AND (rpe >= 6.5 OR rir <= 3.5)) GROUP BY muscle_group",
        formulaDescriptionPt:
          "Total de séries efetivas (RIR ≤ 3 ou RPE ≥ 6,5) acumuladas em 7 dias para cada grupo muscular prioritário.",
        requiredInputs: ["set_logs.setType", "set_logs.rpe", "set_logs.rir", "exercise.category"],
        experienceRanges: {
          beginner: { min: 6, max: 10, optimalNotePt: "6–10 séries/grupo/sem já maximizam adaptação inicial" },
          intermediate: { min: 10, max: 16, optimalNotePt: "10–16 séries/grupo/sem equilibram hipertrofia e recuperação" },
          advanced: { min: 12, max: 20, optimalNotePt: "12–20 séries/grupo/sem em grupos prioritários (especialização)" },
          competitive: { min: 14, max: 22, optimalNotePt: "Periodizado por blocos; picos >20 exigem deload planejado" },
        },
        interpretationPt:
          "Abaixo do mínimo há subestímulo; acima do teto por várias semanas sem deload aumenta fadiga residual e estagnação.",
        scientificRefIds: ["schoenfeld_2017", "helms_2016", "acsm_2009"],
      },
      {
        key: "key_lift_e1rm_kg",
        labelPt: "Força Estimada (e1RM) nos Movimentos-Chave",
        shortLabelPt: "e1RM",
        unit: "kg",
        direction: "higher_is_better",
        cadence: "session",
        isPrimaryGoalMetric: true,
        formulaExpression: "weight_kg * (1 + reps / 30)  [para 1 <= reps <= 12]",
        formulaDescriptionPt:
          "Equação de Epley aplicada à melhor série efetiva de cada exercício âncora (ex.: agachamento, supino, levantamento terra/remada).",
        requiredInputs: ["set_logs.weightKg", "set_logs.reps", "exercise.id"],
        experienceRanges: {
          beginner: { min: 2.0, max: 5.0, optimalNotePt: "Ganho mensal esperado de ~2–5% no e1RM nos primeiros meses" },
          intermediate: { min: 1.0, max: 2.5, optimalNotePt: "Evolução sustentável de ~1–2,5%/mês" },
          advanced: { min: 0.5, max: 1.5, optimalNotePt: "Microprogressões de ~0,5–1,5%/mês" },
          competitive: { min: 0.25, max: 1.0, optimalNotePt: "Progressão concentrada ao fim de blocos de realização" },
        },
        interpretationPt:
          "Tendência ascendente confirma que o protocolo está convertendo volume em ganho real de força/tensão mecânica.",
        scientificRefIds: ["epley_1985", "acsm_2009"],
      },
      {
        key: "avg_effective_rir",
        labelPt: "RIR Médio das Séries Efetivas",
        shortLabelPt: "RIR Médio",
        unit: "RIR",
        direction: "target_band",
        cadence: "weekly",
        isPrimaryGoalMetric: false,
        formulaExpression: "AVG(rir OR (10 - rpe)) WHERE setType != 'warmup'",
        formulaDescriptionPt:
          "Média das repetições em reserva nas séries de trabalho da semana para monitorar proximidade da falha.",
        requiredInputs: ["set_logs.rir", "set_logs.rpe", "set_logs.setType"],
        experienceRanges: {
          beginner: { min: 2.0, max: 3.5, optimalNotePt: "Priorizar técnica limpa com 2–3 RIR" },
          intermediate: { min: 1.5, max: 3.0, optimalNotePt: "Maior parte do mesociclo entre 1,5 e 3 RIR" },
          advanced: { min: 1.0, max: 2.5, optimalNotePt: "Progresso de RIR 3→1 ao longo das semanas do bloco" },
          competitive: { min: 1.0, max: 2.5, optimalNotePt: "Controle fino conforme bloco (acumulação vs. pico)" },
        },
        interpretationPt:
          "RIR médio muito alto (>4) indica carga subestimada; RIR médio <1 por semanas seguidas eleva fadiga do SNC.",
        scientificRefIds: ["helms_2016"],
      },
      {
        key: "weekly_tonnage_kg",
        labelPt: "Volume-Carga Total (Tonelagem)",
        shortLabelPt: "Tonelagem",
        unit: "kg",
        direction: "higher_is_better",
        cadence: "weekly",
        isPrimaryGoalMetric: false,
        formulaExpression: "SUM(weight_kg * reps) WHERE setType != 'warmup'",
        formulaDescriptionPt:
          "Soma de carga × repetições das séries efetivas na semana; útil para comparar evolução dentro da mesma ficha/bloco.",
        requiredInputs: ["set_logs.weightKg", "set_logs.reps", "set_logs.setType"],
        experienceRanges: {
          beginner: { min: 8000, max: 22000, optimalNotePt: "Referência relativa ao próprio histórico do atleta" },
          intermediate: { min: 18000, max: 45000, optimalNotePt: "Progressão gradual de 2–6% por semana de acúmulo" },
          advanced: { min: 35000, max: 80000, optimalNotePt: "Ondular entre semanas de sobrecarga e deload" },
          competitive: { min: 50000, max: 110000, optimalNotePt: "Monitorar junto a e1RM e EA para evitar fadiga crônica" },
        },
        interpretationPt:
          "Sobe nas semanas de acúmulo e cai intencionalmente em semanas de pico de força pura ou deload.",
        scientificRefIds: ["schoenfeld_2017", "acsm_2009"],
      },
    ],
    complementaryStrength: {
      role: "self",
      objectiveHeadlinePt: "Musculação como modalidade principal",
      physiologicalTransferPt:
        "Todo o plano já é centrado em tensão mecânica, volume semanal por grupo muscular e sobrecarga progressiva; cardio solto entra apenas como suporte metabólico e de saúde.",
      recommendedFrequencyPerWeek: {
        beginner: { min: 2, max: 4 },
        intermediate: { min: 3, max: 5 },
        advanced: { min: 4, max: 6 },
        competitive: { min: 4, max: 6 },
      },
      targetCapacities: ["hypertrophy", "maximal_strength", "joint_durability"],
      priorityExerciseCategories: ["pernas", "peito", "costas", "ombros", "bracos", "core"],
      intensityPrescriptionPt: "Maioria das séries entre 6–15 reps com RIR 1–3 (força máxima em 3–6 reps, RIR 1–2).",
      volumePrescriptionPt: "10–20 séries efetivas por grupo muscular/semana conforme nível e prioridade.",
      minSeparationHoursFromMainModality: 0,
      separationRationalePt:
        "Se o praticante fizer cardio casual no mesmo dia, separar >=3h ou alocar após a musculação evita fadiga aguda nos compostos pesados (Schumann et al., 2022).",
      avoidanceRulesPt: [
        "Evitar falha concêntrica (RIR 0) em todas as séries de agachamentos e levantamento terra",
        "Não elevar volume semanal acima de +15–20% de uma semana para outra sem bloco de adaptação",
      ],
      expectedKpiImpacts: [
        {
          kpiKey: "key_lift_e1rm_kg",
          expectedMechanismPt: "Aumento progressivo de força neural e hipertrofia miofibrilar",
        },
        {
          kpiKey: "weekly_effective_sets_per_group",
          expectedMechanismPt: "Cumprimento consistente da faixa dose-resposta de hipertrofia",
        },
      ],
      scientificRefIds: ["schoenfeld_2017", "helms_2016", "schumann_2022"],
    },
    sessionArchetypes: [
      {
        code: "strength_hypertrophy",
        labelPt: "Hipertrofia & Volume Estruturado",
        shortLabelPt: "Hipertrofia",
        primaryCapacity: "hypertrophy",
        targetZone: "RIR 2–3 (RPE 7–8)",
        typicalDurationMin: { min: 45, max: 75 },
        typicalRpe: { min: 7, max: 8.5 },
        applicablePhases: ["base", "build", "constancy"],
        purposePt: "Acumular séries efetivas nos grupos-alvo com controle excêntrico e progressão dupla.",
        usesStructuredRoutine: true,
      },
      {
        code: "strength_maximal",
        labelPt: "Força Máxima & Compostos Pesados",
        shortLabelPt: "Força Máx.",
        primaryCapacity: "maximal_strength",
        targetZone: "RIR 1 (RPE 9)",
        typicalDurationMin: { min: 50, max: 80 },
        typicalRpe: { min: 8, max: 9 },
        applicablePhases: ["build", "peak"],
        purposePt: "Elevar o teto de força neural (e1RM) com descanso longo (2–4 min) e técnica impecável.",
        usesStructuredRoutine: true,
      },
      {
        code: "strength_deload",
        labelPt: "Deload Técnico & Dissipação de Fadiga",
        shortLabelPt: "Deload",
        primaryCapacity: "recovery_mobility",
        targetZone: "RIR 4+ (RPE ≤6)",
        typicalDurationMin: { min: 30, max: 45 },
        typicalRpe: { min: 5, max: 6.5 },
        applicablePhases: ["deload", "taper"],
        purposePt: "Reduzir volume em ~40–50% mantendo padrão motor para supercompensação articular e neural.",
        usesStructuredRoutine: true,
      },
    ],
    periodizationPhases: [
      {
        phase: "base",
        labelPt: "Acumulação & Técnica",
        shareOfMacrocyclePct: 35,
        volumeMultiplier: 0.95,
        intensityFocusPt: "RIR 2–3 · 8–15 reps",
        directivePt: "Construir tolerância a volume semanal e estabilidade articular nos padrões básicos.",
      },
      {
        phase: "build",
        labelPt: "Progressão & Sobrecarga",
        shareOfMacrocyclePct: 40,
        volumeMultiplier: 1.1,
        intensityFocusPt: "RIR 1–2 · 5–12 reps",
        directivePt: "Aumentar carga ou repetições semana a semana mantendo execução limpa.",
      },
      {
        phase: "peak",
        labelPt: "Intensificação / Tomada de Marca",
        shareOfMacrocyclePct: 15,
        volumeMultiplier: 0.8,
        intensityFocusPt: "RIR 1 · 3–6 reps",
        directivePt: "Reduzir acessórios para consolidar novos patamares de e1RM.",
      },
      {
        phase: "deload",
        labelPt: "Deload & Supercompensação",
        shareOfMacrocyclePct: 10,
        volumeMultiplier: 0.55,
        intensityFocusPt: "RIR 3–4",
        directivePt: "Dissipar fadiga acumulada para iniciar o próximo mesociclo mais forte.",
      },
    ],
    safetyGuardrails: {
      maxWeeklyVolumeJumpPct: 20,
      maxWeeklyMonotony: 2.0,
      acwrAdvisoryRange: { min: 0.8, max: 1.3 },
      acwrCautionNotePt:
        "ACWR é usado apenas como indicador auxiliar de salto de carga, sempre cruzado com RIR, EA e prontidão (Impellizzeri et al., 2020).",
      deloadFrequencyWeeks: 5,
      modalitySpecificAlertsPt: [
        "Mais de 20 séries efetivas/grupo/semana sem deload recente eleva risco de dor articular e estagnação",
        "Evitar falha concêntrica consecutiva em compostos axiais pesados",
      ],
      scientificRefIds: ["schoenfeld_2017", "foster_1998", "impellizzeri_2020", "acsm_2009"],
    },
    scientificRefIds: ["schoenfeld_2017", "helms_2016", "epley_1985", "acsm_2009", "schumann_2022"],
  },

  // =========================================================================
  // 2. CORRIDA (RUA & RESISTÊNCIA)
  // =========================================================================
  running: {
    code: "running",
    namePt: "Corrida (Rua & Resistência)",
    shortNamePt: "Corrida",
    category: "endurance",
    systemicLoadFactor: 1.12,
    summaryPt:
      "Evolução de economia de corrida, limiar de lactato e resistência aeróbica via distribuição polarizada (80/20), progressão gradual de quilometragem e fortalecimento de força pesada/pliometria.",
    primaryCapacities: [
      "aerobic_base",
      "running_economy",
      "lactate_threshold",
      "vo2_max",
    ],
    goalExamplesPt: [
      "Completar 10 km abaixo de 50 min (pace médio 5:00/km)",
      "Evoluir volume semanal seguro de 20 km para 35 km para Meia Maratona",
      "Melhorar ritmo no limiar (Z4) sem elevar incidência de dor em joelho/canela",
    ],
    casualActivityPolicyPt:
      "Uma corrida solta de quem tem outra modalidade principal (ex.: musculação) entra como atividade casual: soma sRPE/EA e consistência, mas NÃO altera KPIs de corrida nem cria bloco de maratona.",
    intensityZones: [
      {
        zone: "Z1",
        labelPt: "Regenerativo",
        anchorMetric: "hr_max_pct",
        rangeLabel: "55–68% FCmáx · RPE 2–3",
        physiologicalTargetPt: "Recuperação ativa e capilarização sem estresse mecânico relevante.",
        recommendedWeeklySharePct: { min: 10, max: 20 },
      },
      {
        zone: "Z2",
        labelPt: "Base Aeróbica (Abaixo de VT1)",
        anchorMetric: "hr_max_pct",
        rangeLabel: "68–78% FCmáx · RPE 3–4 (ritmo conversacional)",
        physiologicalTargetPt:
          "Biogênese mitocondrial, oxidação lipídica e adaptação tendínea com baixo custo autonômico.",
        recommendedWeeklySharePct: { min: 60, max: 70 },
      },
      {
        zone: "Z3",
        labelPt: "Tempo / Ritmo de Maratona (Zona Cinzenta se excessiva)",
        anchorMetric: "hr_max_pct",
        rangeLabel: "78–84% FCmáx · RPE 5–6",
        physiologicalTargetPt:
          "Específico para ritmo de prova longa; limitar uso para não gerar fadiga sem ganho proporcional.",
        recommendedWeeklySharePct: { min: 0, max: 10 },
      },
      {
        zone: "Z4",
        labelPt: "Limiar de Lactato (Threshold)",
        anchorMetric: "hr_max_pct",
        rangeLabel: "84–90% FCmáx · RPE 7–8",
        physiologicalTargetPt: "Elevar velocidade sustentável antes do acúmulo exponencial de lactato.",
        recommendedWeeklySharePct: { min: 8, max: 15 },
      },
      {
        zone: "Z5",
        labelPt: "VO₂máx & Velocidade (Intervalados)",
        anchorMetric: "hr_max_pct",
        rangeLabel: "90–100% FCmáx · RPE 9",
        physiologicalTargetPt: "Expandir teto aeróbico (VO₂máx) e recrutamento neuromuscular em alta velocidade.",
        recommendedWeeklySharePct: { min: 4, max: 10 },
      },
    ],
    kpis: [
      {
        key: "weekly_distance_km",
        labelPt: "Volume Semanal de Corrida",
        shortLabelPt: "Km/Sem",
        unit: "km/sem",
        direction: "higher_is_better",
        cadence: "weekly",
        isPrimaryGoalMetric: true,
        formulaExpression: "SUM(distance_meters / 1000) OVER last_7_days WHERE modality = 'running'",
        formulaDescriptionPt:
          "Quilometragem total percorrida em 7 dias nas sessões planejadas de corrida.",
        requiredInputs: ["session.distanceKm"],
        experienceRanges: {
          beginner: { min: 10, max: 25, optimalNotePt: "Construir base sem ultrapassar +10%/sem" },
          intermediate: { min: 25, max: 50, optimalNotePt: "Suporta ciclos de 10 km a 21 km com segurança" },
          advanced: { min: 50, max: 85, optimalNotePt: "Exige controle rigoroso de polarização e sono" },
          competitive: { min: 80, max: 130, optimalNotePt: "Blocos específicos com semanas de descarga 3:1" },
        },
        interpretationPt:
          "Principal motor de adaptação aeróbica quando progride de forma gradual (≤10%/semana) sem dor articular.",
        scientificRefIds: ["seiler_2010", "daniels_2014", "gabbett_2016"],
      },
      {
        key: "threshold_pace_sec_per_km",
        labelPt: "Pace de Limiar (Z4) / Ritmo de Referência",
        shortLabelPt: "Pace Limiar",
        unit: "s/km",
        direction: "lower_is_better",
        cadence: "mesocycle",
        isPrimaryGoalMetric: true,
        formulaExpression: "AVG(duration_seconds / distance_km) IN threshold_or_time_trial_sessions",
        formulaDescriptionPt:
          "Tempo médio por quilômetro (em segundos/km) em blocos de limiar (20–40 min) ou tomada de tempo de 5–10 km.",
        requiredInputs: ["session.distanceKm", "session.durationSeconds", "session.rpe"],
        experienceRanges: {
          beginner: { min: 360, max: 450, optimalNotePt: "6:00 a 7:30 min/km — foco em consistência" },
          intermediate: { min: 285, max: 360, optimalNotePt: "4:45 a 6:00 min/km" },
          advanced: { min: 235, max: 285, optimalNotePt: "3:55 a 4:45 min/km" },
          competitive: { min: 190, max: 235, optimalNotePt: "3:10 a 3:55 min/km" },
        },
        interpretationPt:
          "Queda consistente em s/km para o mesmo esforço percebido/FC indica melhora real de limiar e economia.",
        scientificRefIds: ["daniels_2014", "blagrove_2018"],
      },
      {
        key: "polarized_low_intensity_pct",
        labelPt: "Índice de Polarização (% em Z1–Z2)",
        shortLabelPt: "% Base Z1–Z2",
        unit: "%",
        direction: "target_band",
        cadence: "weekly",
        isPrimaryGoalMetric: false,
        formulaExpression: "(duration_in_Z1_Z2 / total_running_duration) * 100",
        formulaDescriptionPt:
          "Percentual do volume semanal de corrida realizado em intensidade leve/conversacional (RPE ≤ 4 ou ≤ 78% FCmáx).",
        requiredInputs: ["session.durationMinutes", "session.rpe", "session.avgHrBpm"],
        experienceRanges: {
          beginner: { min: 75, max: 90, optimalNotePt: "Quase todo o volume inicial deve ser leve" },
          intermediate: { min: 75, max: 85, optimalNotePt: "Regra 80/20 de Seiler para evoluir sem lesão" },
          advanced: { min: 75, max: 85, optimalNotePt: "Evitar cair na zona cinzenta (Z3 excessiva)" },
          competitive: { min: 78, max: 85, optimalNotePt: "Sessões fortes muito bem separadas por dias fáceis" },
        },
        interpretationPt:
          "Abaixo de 70% em Z1–Z2 indica excesso de treinos moderados/pesados ('zona cinzenta'), elevando risco de platô e fadiga.",
        scientificRefIds: ["seiler_2010"],
      },
      {
        key: "long_run_share_pct",
        labelPt: "Proporção do Longão no Volume Semanal",
        shortLabelPt: "% Longão",
        unit: "%",
        direction: "target_band",
        cadence: "weekly",
        isPrimaryGoalMetric: false,
        formulaExpression: "(max_single_run_km / weekly_distance_km) * 100",
        formulaDescriptionPt:
          "Fração da quilometragem da semana concentrada na corrida mais longa (controle de risco ortopédico).",
        requiredInputs: ["session.distanceKm"],
        experienceRanges: {
          beginner: { min: 25, max: 35, optimalNotePt: "Evitar que 1 único treino concentre >35–40% da semana" },
          intermediate: { min: 25, max: 35, optimalNotePt: "Faixa segura: 25–35% do volume semanal" },
          advanced: { min: 22, max: 33, optimalNotePt: "Ideal para sustentar longões sem sobrecarga tibial" },
          competitive: { min: 20, max: 30, optimalNotePt: "Alto volume semanal dilui o impacto do longão" },
        },
        interpretationPt:
          "Longão acima de 40% da semana sugere volume semanal pouco distribuído e maior estresse musculotendíneo.",
        scientificRefIds: ["daniels_2014", "gabbett_2016"],
      },
    ],
    complementaryStrength: {
      role: "complementary_support",
      objectiveHeadlinePt:
        "Fortalecimento para Economia de Corrida, Rigidez Tendínea e Prevenção de Lesões",
      physiologicalTransferPt:
        "Força máxima de membros inferiores (4–8 reps com alta intenção concêntrica) somada a baixa dose de pliometria melhora a economia de corrida em 2–8% e protege tendão patelar, Aquiles e quadril sem gerar hipertrofia indesejada (Blagrove et al., 2018; Rønnestad & Mujika, 2014).",
      recommendedFrequencyPerWeek: {
        beginner: { min: 2, max: 2 },
        intermediate: { min: 2, max: 2 },
        advanced: { min: 1, max: 2 },
        competitive: { min: 1, max: 2 },
      },
      targetCapacities: ["maximal_strength", "plyometric_reactive", "running_economy", "joint_durability"],
      priorityExerciseCategories: ["pernas", "pliometria", "core", "mobilidade"],
      intensityPrescriptionPt:
        "Compostos pesados (agachamento, terra romeno, búlgaro, panturrilha sóleo/gastrocnêmio): 3–4 séries de 4–8 reps em RIR 2 (sem falha) + 20–40 contatos pliométricos leves.",
      volumePrescriptionPt:
        "Sessões enxutas de 35–45 min (6–10 séries totais de pernas/sessão) para estimular rigidez tendínea sem DOMS limitante.",
      minSeparationHoursFromMainModality: 6,
      separationRationalePt:
        "Separar >=6h (ou dias distintos) de tiros/limiar evita interferência na taxa de desenvolvimento de força e protege a qualidade da mecânica de corrida (Schumann et al., 2022).",
      avoidanceRulesPt: [
        "Evitar fichas de hipertrofia de altíssimo volume (>16 séries de pernas) com falha muscular na véspera do longão ou treino de tiros",
        "Reduzir volume de força em ~50% nas 2 semanas de polimento (taper) pré-prova mantendo cargas moderadas-altas",
      ],
      expectedKpiImpacts: [
        {
          kpiKey: "threshold_pace_sec_per_km",
          expectedMechanismPt:
            "Melhora de 2–8% na economia de corrida reduz custo energético no mesmo pace (Blagrove et al., 2018)",
        },
        {
          kpiKey: "weekly_distance_km",
          expectedMechanismPt:
            "Maior tolerância mecânica de tendão de Aquiles, quadríceps e glúteo médio sustenta progressão semanal sem dor",
        },
      ],
      scientificRefIds: ["blagrove_2018", "ronnestad_mujika_2014", "schumann_2022"],
    },
    sessionArchetypes: [
      {
        code: "run_easy_base",
        labelPt: "Rodagem Aeróbica Leve (Z2)",
        shortLabelPt: "Rodagem Z2",
        primaryCapacity: "aerobic_base",
        targetZone: "Z2",
        typicalDurationMin: { min: 30, max: 60 },
        typicalRpe: { min: 3, max: 4.5 },
        applicablePhases: ["base", "build", "peak", "taper", "deload", "constancy"],
        purposePt: "Construir densidade mitocondrial e volume aeróbico mantendo o sistema nervoso fresco.",
        usesStructuredRoutine: false,
      },
      {
        code: "run_threshold",
        labelPt: "Tempo Run / Limiar (Z4)",
        shortLabelPt: "Limiar Z4",
        primaryCapacity: "lactate_threshold",
        targetZone: "Z4",
        typicalDurationMin: { min: 35, max: 60 },
        typicalRpe: { min: 7, max: 8 },
        applicablePhases: ["build", "peak", "constancy"],
        purposePt: "Sustentar ritmos mais rápidos antes da acidose, movendo diretamente o KPI de Pace de Limiar.",
        usesStructuredRoutine: false,
      },
      {
        code: "run_vo2_intervals",
        labelPt: "Intervalados de VO₂máx (Z5)",
        shortLabelPt: "Tiros Z5",
        primaryCapacity: "vo2_max",
        targetZone: "Z5",
        typicalDurationMin: { min: 35, max: 55 },
        typicalRpe: { min: 8.5, max: 9.5 },
        applicablePhases: ["build", "peak"],
        purposePt: "Expandir teto aeróbico e mecânica de corrida em alta velocidade (ex.: 4–6 × 800m–1000m).",
        usesStructuredRoutine: false,
      },
      {
        code: "run_long",
        labelPt: "Longão Progressivo / Resistência (Z2)",
        shortLabelPt: "Longão",
        primaryCapacity: "aerobic_base",
        targetZone: "Z2",
        typicalDurationMin: { min: 60, max: 135 },
        typicalRpe: { min: 4, max: 6 },
        applicablePhases: ["base", "build", "peak", "constancy"],
        purposePt: "Desenvolver resistência muscular, economia sob fadiga e metabolismo aeróbico de longa duração.",
        usesStructuredRoutine: false,
      },
      {
        code: "run_complementary_strength",
        labelPt: "Fortalecimento para Corrida (Força + Core)",
        shortLabelPt: "Força Corrida",
        primaryCapacity: "running_economy",
        targetZone: "RIR 2–3 (RPE 7–8)",
        typicalDurationMin: { min: 35, max: 45 },
        typicalRpe: { min: 6.5, max: 7.5 },
        applicablePhases: ["base", "build", "constancy"],
        purposePt: "Aumentar rigidez tendínea, estabilidade pélvica e economia de passada (Blagrove et al., 2018).",
        usesStructuredRoutine: true,
      },
    ],
    periodizationPhases: [
      {
        phase: "base",
        labelPt: "Base Aeróbica & Estrutura",
        shareOfMacrocyclePct: 35,
        volumeMultiplier: 0.9,
        intensityFocusPt: "85% Z1–Z2 + 2× força complementar",
        directivePt: "Consolidar rodagens leves e rigidez tendínea antes de introduzir tiros fortes.",
      },
      {
        phase: "build",
        labelPt: "Construção & Limiar",
        shareOfMacrocyclePct: 40,
        volumeMultiplier: 1.1,
        intensityFocusPt: "80% Z1–Z2 / 20% Z4–Z5",
        directivePt: "Aumentar gradualmente o longão e inserir sessões semanais de limiar/intervalados.",
      },
      {
        phase: "peak",
        labelPt: "Especificidade de Prova",
        shareOfMacrocyclePct: 13,
        volumeMultiplier: 1.0,
        intensityFocusPt: "Ritmo específico de meta",
        directivePt: "Simular ritmo-alvo e calibrar estratégia de prova com força em manutenção.",
      },
      {
        phase: "taper",
        labelPt: "Polimento (Taper)",
        shareOfMacrocyclePct: 12,
        volumeMultiplier: 0.55,
        intensityFocusPt: "Volume -45%, toques curtos no ritmo-alvo",
        directivePt: "Dissipar fadiga acumulada para chegar ao dia-alvo com supercompensação (Bosquet et al., 2007).",
      },
    ],
    safetyGuardrails: {
      maxWeeklyVolumeJumpPct: 12,
      maxWeeklyMonotony: 2.0,
      acwrAdvisoryRange: { min: 0.8, max: 1.3 },
      acwrCautionNotePt:
        "Limitar aumentos bruscos de quilometragem semanal (~10–12%) e monitorar sinais tendíneos (Aquiles/canela/joelho); ACWR atua apenas como alerta complementar.",
      deloadFrequencyWeeks: 4,
      modalitySpecificAlertsPt: [
        "Evitar mais de 2 sessões de intensidade (Z4/Z5) na mesma semana para corredores amadores",
        "Não concentrar >38% da quilometragem semanal em um único longão",
        "Separar força pesada de pernas e tiros/limiar por >=6h ou dias distintos",
      ],
      scientificRefIds: ["seiler_2010", "blagrove_2018", "bosquet_2007", "impellizzeri_2020"],
    },
    scientificRefIds: ["seiler_2010", "daniels_2014", "blagrove_2018", "ronnestad_mujika_2014", "bosquet_2007"],
  },

  // =========================================================================
  // 3. CICLISMO (ESTRADA, MTB & INDOOR)
  // =========================================================================
  cycling: {
    code: "cycling",
    namePt: "Ciclismo (Estrada, MTB & Indoor)",
    shortNamePt: "Ciclismo",
    category: "endurance",
    systemicLoadFactor: 0.95,
    summaryPt:
      "Desenvolvimento de potência sustentada no limiar (FTP / W/kg), resistência aeróbica e gerenciamento de carga crônica (TSS / CTL-ATL-TSB), potencializados por força pesada de membros inferiores.",
    primaryCapacities: [
      "lactate_threshold",
      "aerobic_base",
      "vo2_max",
      "muscular_endurance",
    ],
    goalExamplesPt: [
      "Elevar FTP em +10% (ex.: de 220 W para 242 W) em 12 semanas",
      "Completar Gran Fondo de 100 km mantendo potência sustentável nas subidas finais",
      "Aumentar W/kg preservando equilíbrio CTL/TSB sem fadiga crônica",
    ],
    casualActivityPolicyPt:
      "Pedal recreativo ou deslocamento de quem foca em outra modalidade entra como atividade casual: soma sRPE/EA e consistência, sem exigir FTP nem criar blocos de ciclismo.",
    intensityZones: [
      {
        zone: "Z1",
        labelPt: "Recuperação Ativa",
        anchorMetric: "ftp_pct",
        rangeLabel: "<55% FTP · RPE 1–2",
        physiologicalTargetPt: "Giro leve de alta cadência para recuperação sem estresse metabólico.",
        recommendedWeeklySharePct: { min: 10, max: 15 },
      },
      {
        zone: "Z2",
        labelPt: "Endurance Aeróbico",
        anchorMetric: "ftp_pct",
        rangeLabel: "56–75% FTP · RPE 3–4",
        physiologicalTargetPt: "Base mitocondrial, economia de pedalada e resistência de longa duração.",
        recommendedWeeklySharePct: { min: 60, max: 70 },
      },
      {
        zone: "Z3 / Sweet Spot",
        labelPt: "Tempo / Sweet Spot",
        anchorMetric: "ftp_pct",
        rangeLabel: "76–93% FTP · RPE 5–7",
        physiologicalTargetPt: "Alto retorno aeróbico para ciclistas com tempo semanal limitado (5–8h/sem).",
        recommendedWeeklySharePct: { min: 5, max: 15 },
      },
      {
        zone: "Z4",
        labelPt: "Limiar Funcional (FTP)",
        anchorMetric: "ftp_pct",
        rangeLabel: "94–105% FTP · RPE 7–8",
        physiologicalTargetPt: "Aumentar potência sustentável por 40–60 min e depuração de lactato.",
        recommendedWeeklySharePct: { min: 8, max: 15 },
      },
      {
        zone: "Z5+",
        labelPt: "VO₂máx & Anaeróbico",
        anchorMetric: "ftp_pct",
        rangeLabel: ">105% FTP · RPE 9–10",
        physiologicalTargetPt: "Potência aeróbica máxima e capacidade de responder a ataques/subidas curtas.",
        recommendedWeeklySharePct: { min: 4, max: 8 },
      },
    ],
    kpis: [
      {
        key: "ftp_watts_per_kg",
        labelPt: "Potência Relativa no Limiar (FTP W/kg)",
        shortLabelPt: "W/kg",
        unit: "W/kg",
        direction: "higher_is_better",
        cadence: "mesocycle",
        isPrimaryGoalMetric: true,
        formulaExpression: "(avg_20min_power_watts * 0.95) / body_weight_kg",
        formulaDescriptionPt:
          "FTP estimado (95% da potência média de 20 min ou rampa) dividido pela massa corporal em kg.",
        requiredInputs: ["test.ftpWatts", "athlete.bodyWeightKg"],
        experienceRanges: {
          beginner: { min: 1.8, max: 2.6, optimalNotePt: "Construção inicial de base aeróbica e cadência" },
          intermediate: { min: 2.6, max: 3.5, optimalNotePt: "Faixa típica de amadores consistentes" },
          advanced: { min: 3.5, max: 4.3, optimalNotePt: "Alto desempenho amador / pelotões fortes" },
          competitive: { min: 4.3, max: 5.8, optimalNotePt: "Nível competitivo regional/elite" },
        },
        interpretationPt:
          "Métrica-ouro de desempenho em subidas e provas; reflete simultaneamente motor aeróbico e composição corporal.",
        scientificRefIds: ["allen_coggan_2019", "ronnestad_mujika_2014"],
      },
      {
        key: "weekly_tss_or_srpe",
        labelPt: "Carga Semanal de Ciclismo (TSS / sRPE)",
        shortLabelPt: "TSS/Sem",
        unit: "TSS",
        direction: "target_band",
        cadence: "weekly",
        isPrimaryGoalMetric: true,
        formulaExpression: "((duration_sec * NP * IF) / (FTP * 3600)) * 100  [fallback sem potenciômetro: duration_min * rpe * 0.95]",
        formulaDescriptionPt:
          "Training Stress Score acumulado em 7 dias (usa potenciômetro quando disponível; fallback validado por sRPE/FC).",
        requiredInputs: ["session.durationSeconds", "session.normalizedPowerWatts", "test.ftpWatts", "session.rpe"],
        experienceRanges: {
          beginner: { min: 150, max: 300, optimalNotePt: "3–5h/semana com foco em Z2" },
          intermediate: { min: 300, max: 500, optimalNotePt: "6–9h/semana com 1–2 sessões estruturadas" },
          advanced: { min: 500, max: 750, optimalNotePt: "9–13h/semana exigindo semanas de descarga 3:1" },
          competitive: { min: 700, max: 1100, optimalNotePt: "Monitorar CTL/TSB e sono diariamente" },
        },
        interpretationPt:
          "Quantifica o estresse total de pedalada; deve progredir gradualmente (+5–8 CTL/semana no máximo).",
        scientificRefIds: ["allen_coggan_2019", "foster_2001"],
      },
      {
        key: "tsb_form_balance",
        labelPt: "Equilíbrio Forma × Fadiga (TSB = CTL − ATL)",
        shortLabelPt: "TSB",
        unit: "pts",
        direction: "target_band",
        cadence: "weekly",
        isPrimaryGoalMetric: false,
        formulaExpression: "CTL_42d_ewma - ATL_7d_ewma",
        formulaDescriptionPt:
          "Diferença entre aptidão crônica (média exponencial de 42 dias) e fadiga aguda (7 dias) baseada em Banister/Coggan.",
        requiredInputs: ["daily_tss_series_42d"],
        experienceRanges: {
          beginner: { min: -15, max: 10, optimalNotePt: "Evitar mergulhos abaixo de -20" },
          intermediate: { min: -25, max: 15, optimalNotePt: "-10 a -25 em blocos de construção; +5 a +15 no dia-alvo" },
          advanced: { min: -30, max: 20, optimalNotePt: "Atenção redobrada abaixo de -30 por >5 dias" },
          competitive: { min: -35, max: 25, optimalNotePt: "Polimento busca TSB entre +10 e +20 na prova" },
        },
        interpretationPt:
          "TSB negativo moderado (-10 a -25) indica carga produtiva; TSB positivo (+5 a +20) sinaliza frescor de polimento.",
        scientificRefIds: ["banister_1975", "allen_coggan_2019", "bosquet_2007"],
      },
      {
        key: "weekly_hours_and_elevation",
        labelPt: "Horas Semanais no Selim",
        shortLabelPt: "Horas/Sem",
        unit: "h/sem",
        direction: "higher_is_better",
        cadence: "weekly",
        isPrimaryGoalMetric: false,
        formulaExpression: "SUM(duration_minutes / 60) OVER last_7_days WHERE modality = 'cycling'",
        formulaDescriptionPt:
          "Tempo total pedalado em 7 dias (melhor indicador de volume do que km isolado devido a vento e altimetria).",
        requiredInputs: ["session.durationMinutes"],
        experienceRanges: {
          beginner: { min: 3, max: 5, optimalNotePt: "Consistência semanal antes de longões >3h" },
          intermediate: { min: 5, max: 9, optimalNotePt: "Ótimo custo-benefício com 80/20 ou Sweet Spot" },
          advanced: { min: 9, max: 14, optimalNotePt: "Permite polarização clássica de alto volume" },
          competitive: { min: 14, max: 22, optimalNotePt: "Exige nutrição intra-treino rigorosa" },
        },
        interpretationPt:
          "Horas no selim normalizam diferença entre terreno plano, montanha e rolo indoor.",
        scientificRefIds: ["seiler_2010", "allen_coggan_2019"],
      },
    ],
    complementaryStrength: {
      role: "complementary_support",
      objectiveHeadlinePt:
        "Força Pesada de Membros Inferiores para Potência Sustentada e Resistência à Fadiga Final",
      physiologicalTransferPt:
        "No ciclismo, força máxima pesada (4–8 RM com intenção explosiva na fase concêntrica, sem falha crônica) reduz a proporção de força máxima usada a cada pedalada, atrasa o recrutamento de fibras tipo IIx e melhora potência média e sprint final após horas no selim (Rønnestad & Mujika, 2014).",
      recommendedFrequencyPerWeek: {
        beginner: { min: 2, max: 2 },
        intermediate: { min: 2, max: 2 },
        advanced: { min: 1, max: 2 },
        competitive: { min: 1, max: 2 },
      },
      targetCapacities: ["maximal_strength", "muscular_endurance", "core_transfer"],
      priorityExerciseCategories: ["pernas", "core", "costas", "mobilidade"],
      intensityPrescriptionPt:
        "Meio-agachamento, leg press unilateral, step-up pesado e flexão de quadril: 3–4 séries × 4–8 reps (RIR 2, fase concêntrica rápida) + estabilidade de core/lombar para postura aero.",
      volumePrescriptionPt:
        "2×/sem na fase de Base/Construção (40 min); 1×/sem na fase competitiva apenas para manutenção neural.",
      minSeparationHoursFromMainModality: 6,
      separationRationalePt:
        "Evitar treino pesado de pernas imediatamente antes de intervalos de FTP/VO₂máx; preferir dias distintos ou >=6h de intervalo (Schumann et al., 2022).",
      avoidanceRulesPt: [
        "Evitar circuitos metabólicos de perna com altíssimas repetições até a falha (geram fadiga local sem ganho superior de força máxima)",
        "Não negligenciar fortalecimento lombar/escapular para sustentar horas em posição inclinada",
      ],
      expectedKpiImpacts: [
        {
          kpiKey: "ftp_watts_per_kg",
          expectedMechanismPt:
            "Maior força máxima diminui esforço relativo por pedalada e melhora economia e potência sustentada (Rønnestad & Mujika, 2014)",
        },
        {
          kpiKey: "weekly_tss_or_srpe",
          expectedMechanismPt:
            "Maior resistência à fadiga muscular na hora final de pedais longos",
        },
      ],
      scientificRefIds: ["ronnestad_mujika_2014", "schumann_2022"],
    },
    sessionArchetypes: [
      {
        code: "cycle_endurance_z2",
        labelPt: "Pedal de Base Aeróbica (Z2)",
        shortLabelPt: "Base Z2",
        primaryCapacity: "aerobic_base",
        targetZone: "Z2",
        typicalDurationMin: { min: 60, max: 180 },
        typicalRpe: { min: 3, max: 4.5 },
        applicablePhases: ["base", "build", "peak", "taper", "deload", "constancy"],
        purposePt: "Expandir motor aeróbico e eficiência de pedalada sem drenar o TSB.",
        usesStructuredRoutine: false,
      },
      {
        code: "cycle_threshold_ss",
        labelPt: "Blocos de Limiar / Sweet Spot (Z3–Z4)",
        shortLabelPt: "Limiar / SS",
        primaryCapacity: "lactate_threshold",
        targetZone: "Z4",
        typicalDurationMin: { min: 50, max: 90 },
        typicalRpe: { min: 7, max: 8 },
        applicablePhases: ["build", "peak", "constancy"],
        purposePt: "Elevar diretamente o FTP (ex.: 2–3 × 15–20 min a 88–100% FTP).",
        usesStructuredRoutine: false,
      },
      {
        code: "cycle_vo2_intervals",
        labelPt: "Intervalados de VO₂máx / Subidas (Z5)",
        shortLabelPt: "VO₂ / Subidas",
        primaryCapacity: "vo2_max",
        targetZone: "Z5+",
        typicalDurationMin: { min: 45, max: 75 },
        typicalRpe: { min: 8.5, max: 9.5 },
        applicablePhases: ["build", "peak"],
        purposePt: "Aumentar teto de potência aeróbica (ex.: 4–6 × 3–5 min a 108–120% FTP).",
        usesStructuredRoutine: false,
      },
      {
        code: "cycle_complementary_strength",
        labelPt: "Força Pesada de Pernas & Core para Pedal",
        shortLabelPt: "Força Pedal",
        primaryCapacity: "maximal_strength",
        targetZone: "RIR 2 (4–8 reps)",
        typicalDurationMin: { min: 35, max: 50 },
        typicalRpe: { min: 7, max: 8 },
        applicablePhases: ["base", "build", "constancy"],
        purposePt: "Transferir força máxima de quadríceps/glúteo para economia e potência final (Rønnestad & Mujika, 2014).",
        usesStructuredRoutine: true,
      },
    ],
    periodizationPhases: [
      {
        phase: "base",
        labelPt: "Base Aeróbica & Força Pesada",
        shareOfMacrocyclePct: 35,
        volumeMultiplier: 0.95,
        intensityFocusPt: "Z2 + 2× força pesada/sem",
        directivePt: "Aumentar horas em Z2 e consolidar força máxima de membros inferiores.",
      },
      {
        phase: "build",
        labelPt: "Construção de FTP & VO₂",
        shareOfMacrocyclePct: 40,
        volumeMultiplier: 1.1,
        intensityFocusPt: "Z2 + 2 sessões de limiar/VO₂",
        directivePt: "Elevar CTL com segurança (+4–7 pts/sem) sem ultrapassar TSB -30.",
      },
      {
        phase: "peak",
        labelPt: "Especificidade & Ritmo de Prova",
        shareOfMacrocyclePct: 15,
        volumeMultiplier: 0.95,
        intensityFocusPt: "Esforços no perfil da prova",
        directivePt: "Ajustar ritmo de subida/plano e reduzir força para 1× manutenção.",
      },
      {
        phase: "taper",
        labelPt: "Polimento (Taper)",
        shareOfMacrocyclePct: 10,
        volumeMultiplier: 0.55,
        intensityFocusPt: "Volume -45%, abridores curtos em Z4–Z5",
        directivePt: "Elevar TSB para +5 a +15 mantendo pernas ativadas.",
      },
    ],
    safetyGuardrails: {
      maxWeeklyVolumeJumpPct: 15,
      maxWeeklyMonotony: 2.0,
      acwrAdvisoryRange: { min: 0.8, max: 1.3 },
      acwrCautionNotePt:
        "Controlar taxa de subida do CTL (máx. +5–8/sem) e combinar com prontidão matinal/EA; ACWR é auxiliar.",
      deloadFrequencyWeeks: 4,
      modalitySpecificAlertsPt: [
        "TSB abaixo de -30 por múltiplos dias exige semana de descarga",
        "Pedais acima de 90 min exigem reposição de carboidratos/eletrólitos para não drenar EA",
      ],
      scientificRefIds: ["allen_coggan_2019", "ronnestad_mujika_2014", "bosquet_2007", "kellmann_2018"],
    },
    scientificRefIds: ["allen_coggan_2019", "seiler_2010", "ronnestad_mujika_2014", "banister_1975", "bosquet_2007"],
  },

  // =========================================================================
  // 4. VÔLEI DE PRAIA (AREIA & POTÊNCIA)
  // =========================================================================
  beach_volleyball: {
    code: "beach_volleyball",
    namePt: "Vôlei de Praia (Areia & Potência)",
    shortNamePt: "Vôlei de Praia",
    category: "sand_court",
    systemicLoadFactor: 1.15,
    summaryPt:
      "Esporte intermitente de altíssima demanda neuromuscular na areia fofa: combina potência de salto vertical (CMJ), agilidade em superfície instável, resistência a jogos repetidos e blindagem do ombro (overhead) e joelho.",
    primaryCapacities: [
      "explosive_power",
      "plyometric_reactive",
      "sand_agility",
      "shoulder_prehab",
      "core_transfer",
    ],
    goalExamplesPt: [
      "Aumentar altura do salto vertical (CMJ) em +4 cm para bloqueio e ataque",
      "Chegar ao torneio com alta reserva neuromuscular (EA no pico) e ombro sem dor",
      "Sustentar 3–4 jogos no mesmo fim de semana sem queda de explosão na areia",
    ],
    casualActivityPolicyPt:
      "Racha recreativo na areia de quem foca em musculação ou corrida entra como atividade casual: contabiliza alto custo biomecânico na carga/EA (fator 1,15) para proteger pernas e ombro, sem exigir testes de CMJ.",
    intensityZones: [
      {
        zone: "Técnico / Baixo Impacto",
        labelPt: "Fundamentos, Controle de Bola & Mobilidade",
        anchorMetric: "srpe",
        rangeLabel: "RPE 3–5 · Poucos saltos máximos",
        physiologicalTargetPt: "Refino de recepção, levantamento e leitura de jogo preservando tendão patelar e ombro.",
      },
      {
        zone: "Tático / Jogo Controlado",
        labelPt: "Situações de Jogo & Transição na Areia",
        anchorMetric: "srpe",
        rangeLabel: "RPE 6–7,5 · Volume moderado de saltos",
        physiologicalTargetPt: "Agilidade na areia, deslocamentos curtos e tomada de decisão sob fadiga moderada.",
      },
      {
        zone: "Competitivo / Alta Intensidade",
        labelPt: "Sets Competitivos, Ataque & Bloqueio Máximos",
        anchorMetric: "srpe",
        rangeLabel: "RPE 8–9,5 · Alta densidade de saltos máximos",
        physiologicalTargetPt: "Replicar demandas de torneio com máxima intenção de salto e velocidade de braço.",
      },
    ],
    kpis: [
      {
        key: "cmj_height_cm",
        labelPt: "Altura do Salto Vertical (CMJ)",
        shortLabelPt: "Salto CMJ",
        unit: "cm",
        direction: "higher_is_better",
        cadence: "mesocycle",
        isPrimaryGoalMetric: true,
        formulaExpression: "cmj_cm  [ou via tempo de voo: (9.81 * flight_time_s^2) / 8 * 100]",
        formulaDescriptionPt:
          "Altura de salto com contramovimento (teste de alcance/app/plataforma); serve simultaneamente como KPI de potência e radar de fadiga neuromuscular.",
        requiredInputs: ["test.cmjHeightCm"],
        experienceRanges: {
          beginner: { min: 25, max: 38, optimalNotePt: "Referência unissex ampla; comparar sempre com baseline individual" },
          intermediate: { min: 35, max: 50, optimalNotePt: "Ganhos esperados de 4–8% em ciclos de força + pliometria" },
          advanced: { min: 45, max: 62, optimalNotePt: "Queda aguda >8–10% do baseline sinaliza fadiga neuromuscular" },
          competitive: { min: 52, max: 72, optimalNotePt: "Monitoramento semanal orienta ajuste de volume na areia" },
        },
        interpretationPt:
          "Subida ao longo dos meses comprova transferência de força para explosão; queda súbita numa semana indica necessidade de descarga.",
        scientificRefIds: ["claudino_2017", "markovic_2007"],
      },
      {
        key: "weekly_sand_load_ua",
        labelPt: "Carga Semanal de Areia & Jogos (sRPE)",
        shortLabelPt: "Carga Areia",
        unit: "UA/sem",
        direction: "target_band",
        cadence: "weekly",
        isPrimaryGoalMetric: true,
        formulaExpression: "SUM(duration_min * rpe * 1.15) OVER last_7_days WHERE modality = 'beach_volleyball'",
        formulaDescriptionPt:
          "Carga interna ponderada pelo fator da areia (1,15) devido à dissipação de energia elástica na superfície instável.",
        requiredInputs: ["session.durationMinutes", "session.rpe"],
        experienceRanges: {
          beginner: { min: 500, max: 1100, optimalNotePt: "2–3 sessões/sem adaptando panturrilha, joelho e ombro" },
          intermediate: { min: 1000, max: 1900, optimalNotePt: "3–4 sessões/sem alternando técnica e jogo" },
          advanced: { min: 1700, max: 2800, optimalNotePt: "Exige controle de saltos e pré-hab de ombro 2×/sem" },
          competitive: { min: 2400, max: 3800, optimalNotePt: "Periodizar picos pré-torneio com taper de 7–10 dias" },
        },
        interpretationPt:
          "Areia fofa aumenta custo concêntrico sem retorno elástico da quadra; picos bruscos disparam tendinopatia patelar e fadiga lombar.",
        scientificRefIds: ["foster_2001", "gabbett_2016"],
      },
      {
        key: "weekly_jump_contacts",
        labelPt: "Volume Semanal de Saltos (Areia + Pliometria)",
        shortLabelPt: "Saltos/Sem",
        unit: "saltos/sem",
        direction: "target_band",
        cadence: "weekly",
        isPrimaryGoalMetric: false,
        formulaExpression: "SUM(estimated_or_counted_jumps) OVER last_7_days",
        formulaDescriptionPt:
          "Contagem ou estimativa de saltos máximos (ataque, bloqueio, saque em salto e contatos pliométricos na academia).",
        requiredInputs: ["session.jumpCount"],
        experienceRanges: {
          beginner: { min: 80, max: 180, optimalNotePt: "Progresso gradual para proteção do tendão patelar" },
          intermediate: { min: 160, max: 320, optimalNotePt: "Incluir no máximo ~40 contatos pliométricos/sessão fora da areia" },
          advanced: { min: 280, max: 480, optimalNotePt: "Evitar dias consecutivos de alto volume de saltos + perna pesada" },
          competitive: { min: 400, max: 650, optimalNotePt: "Reduzir 40–50% na semana do torneio" },
        },
        interpretationPt:
          "Permite dosar a soma de saltos na areia com a pliometria da musculação para evitar sobrecarga no joelho.",
        scientificRefIds: ["markovic_2007", "claudino_2017"],
      },
      {
        key: "shoulder_prehab_adherence_pct",
        labelPt: "Adesão à Blindagem de Ombro & Core",
        shortLabelPt: "Blindagem Ombro",
        unit: "%",
        direction: "higher_is_better",
        cadence: "weekly",
        isPrimaryGoalMetric: false,
        formulaExpression: "(completed_shoulder_prehab_sessions / target_2_per_week) * 100",
        formulaDescriptionPt:
          "Percentual de cumprimento das 2 sessões semanais de manguito rotador (rotação externa excêntrica), estabilidade escapular e core rotacional.",
        requiredInputs: ["session.categoriesCompleted"],
        experienceRanges: {
          beginner: { min: 80, max: 100, optimalNotePt: "2×/sem de 10–15 min já gera proteção mensurável" },
          intermediate: { min: 85, max: 100, optimalNotePt: "Obrigatório quando há ≥3 treinos de ataque/semana" },
          advanced: { min: 90, max: 100, optimalNotePt: "Integrado ao aquecimento e às fichas de superiores" },
          competitive: { min: 95, max: 100, optimalNotePt: "Essencial para prevenir lesões de maior afastamento no vôlei" },
        },
        interpretationPt:
          "Baixa adesão combinada com aumento de jogos de ataque é o principal fator de risco de dor no ombro em atletas overhead.",
        scientificRefIds: ["cools_2015"],
      },
    ],
    complementaryStrength: {
      role: "complementary_support",
      objectiveHeadlinePt:
        "Força-Potência de Membros Inferiores, Pliometria de Baixo Volume e Blindagem de Ombro/Core",
      physiologicalTransferPt:
        "A areia absorve energia do ciclo alongamento-encurtamento; portanto, o atleta depende de alta produção de força concêntrica (agachamento, terra romeno, búlgaro), potência (saltos/arremessos com ~40 contatos/sessão) e cadeia cinética core→escápula→manguito para atacar forte sem lesionar o ombro (Markovic, 2007; Cools et al., 2015).",
      recommendedFrequencyPerWeek: {
        beginner: { min: 2, max: 2 },
        intermediate: { min: 2, max: 3 },
        advanced: { min: 2, max: 3 },
        competitive: { min: 2, max: 3 },
      },
      targetCapacities: [
        "maximal_strength",
        "explosive_power",
        "plyometric_reactive",
        "shoulder_prehab",
        "core_transfer",
      ],
      priorityExerciseCategories: ["pernas", "pliometria", "ombros", "core", "costas"],
      intensityPrescriptionPt:
        "Força-base (3–4×4–6 reps, RIR 2, subida explosiva) + Pliometria baixa dose (30–40 contatos/sessão, descanso total) + Rotadores externos, serrátil, trapézio inferior e core anti-rotação.",
      volumePrescriptionPt:
        "Priorizar qualidade de velocidade sobre exaustão; cortar séries de perna quando a velocidade cair ou em semana de torneio.",
      minSeparationHoursFromMainModality: 24,
      separationRationalePt:
        "Treino de perna pesada ou pliometria no mesmo dia/sessão de areia competitiva atenua ganhos de força explosiva (Schumann et al., 2022) e eleva risco de sobrecarga patelar.",
      avoidanceRulesPt: [
        "Nunca fazer pernas até a falha muscular (RIR 0) nas 24–48h que antecedem jogos intensos na areia",
        "Evitar excesso de empurrar acima da cabeça (desenvolvimento pesado em fadiga) sem equilíbrio de puxadas e manguito rotador",
        "Evitar alto volume pliométrico (>60 contatos) em semanas com ≥3 treinos pesados de areia",
      ],
      expectedKpiImpacts: [
        {
          kpiKey: "cmj_height_cm",
          expectedMechanismPt:
            "Força máxima + pliometria de baixa dose elevam impulso concêntrico e altura de salto (Markovic, 2007)",
        },
        {
          kpiKey: "shoulder_prehab_adherence_pct",
          expectedMechanismPt:
            "Fortalecimento excêntrico de manguito e controle escapular absorvem a desaceleração do ataque (Cools et al., 2015)",
        },
      ],
      scientificRefIds: ["markovic_2007", "claudino_2017", "cools_2015", "schumann_2022"],
    },
    sessionArchetypes: [
      {
        code: "bv_sand_technical",
        labelPt: "Treino Técnico na Areia (Controle & Fundamentos)",
        shortLabelPt: "Areia Técnico",
        primaryCapacity: "technical_efficiency",
        targetZone: "Técnico / Baixo Impacto",
        typicalDurationMin: { min: 60, max: 90 },
        typicalRpe: { min: 4, max: 6 },
        applicablePhases: ["base", "build", "peak", "taper", "constancy"],
        purposePt: "Refinar passe, levantamento e leitura sem sobrecarregar saltos máximos.",
        usesStructuredRoutine: false,
      },
      {
        code: "bv_sand_competitive",
        labelPt: "Jogo & Transição Competitiva na Areia",
        shortLabelPt: "Areia Jogo",
        primaryCapacity: "sand_agility",
        targetZone: "Competitivo / Alta Intensidade",
        typicalDurationMin: { min: 75, max: 120 },
        typicalRpe: { min: 7.5, max: 9.5 },
        applicablePhases: ["build", "peak", "constancy"],
        purposePt: "Desenvolver tolerância a ralis intensos, agilidade na areia e ritmo de torneio.",
        usesStructuredRoutine: false,
      },
      {
        code: "bv_lower_power",
        labelPt: "Força & Potência de Salto (Pernas + Plio)",
        shortLabelPt: "Potência Salto",
        primaryCapacity: "explosive_power",
        targetZone: "RIR 2 · Máxima Intenção",
        typicalDurationMin: { min: 45, max: 60 },
        typicalRpe: { min: 7, max: 8.5 },
        applicablePhases: ["base", "build", "peak", "constancy"],
        purposePt: "Elevar diretamente o CMJ e a impulsão vertical na areia fofa.",
        usesStructuredRoutine: true,
      },
      {
        code: "bv_shoulder_core",
        labelPt: "Blindagem de Ombro, Escápula & Core Rotacional",
        shortLabelPt: "Ombro & Core",
        primaryCapacity: "shoulder_prehab",
        targetZone: "RIR 2–3 · Controle Excêntrico",
        typicalDurationMin: { min: 35, max: 50 },
        typicalRpe: { min: 6, max: 7.5 },
        applicablePhases: ["base", "build", "peak", "taper", "deload", "constancy"],
        purposePt: "Proteger o complexo do ombro na desaceleração do ataque e otimizar transferência do tronco (Cools et al., 2015).",
        usesStructuredRoutine: true,
      },
    ],
    periodizationPhases: [
      {
        phase: "base",
        labelPt: "Base de Força & Blindagem Articular",
        shareOfMacrocyclePct: 35,
        volumeMultiplier: 0.95,
        intensityFocusPt: "Força pesada + técnica na areia + pré-hab ombro",
        directivePt: "Construir base de força de pernas e estabilidade de ombro/core antes de elevar saltos máximos.",
      },
      {
        phase: "build",
        labelPt: "Transmutação para Potência & Jogo",
        shareOfMacrocyclePct: 40,
        volumeMultiplier: 1.08,
        intensityFocusPt: "Pliometria baixa dose + jogos competitivos",
        directivePt: "Converter força em altura de salto (CMJ) e velocidade de deslocamento na areia.",
      },
      {
        phase: "peak",
        labelPt: "Simulação de Torneio",
        shareOfMacrocyclePct: 15,
        volumeMultiplier: 0.95,
        intensityFocusPt: "Sets de alta intensidade + potência rápida",
        directivePt: "Ajustar tática com a dupla mantendo potência fresca.",
      },
      {
        phase: "taper",
        labelPt: "Polimento Neuromuscular",
        shareOfMacrocyclePct: 10,
        volumeMultiplier: 0.55,
        intensityFocusPt: "Saltos reduzidos -45%, ativação rápida",
        directivePt: "Chegar ao torneio com CMJ no pico e ombro/joelhos 100% recuperados.",
      },
    ],
    safetyGuardrails: {
      maxWeeklyVolumeJumpPct: 15,
      maxWeeklyMonotony: 2.0,
      acwrAdvisoryRange: { min: 0.8, max: 1.3 },
      acwrCautionNotePt:
        "Cruzar carga de areia (sRPE) com salto CMJ e sintomas de joelho/ombro; ACWR é sinal auxiliar.",
      deloadFrequencyWeeks: 4,
      modalitySpecificAlertsPt: [
        "Evitar musculação pesada de pernas e jogo competitivo na areia no mesmo dia (interferência de potência — Schumann et al., 2022)",
        "Queda >8% no CMJ ou dor anterior no joelho exige corte imediato de volume de saltos",
        "Garantir ≥2 sessões/semana de pré-hab de manguito e escápula (Cools et al., 2015)",
      ],
      scientificRefIds: ["claudino_2017", "markovic_2007", "cools_2015", "schumann_2022"],
    },
    scientificRefIds: ["markovic_2007", "claudino_2017", "cools_2015", "schumann_2022", "foster_2001"],
  },

  // =========================================================================
  // 5. NATAÇÃO (PISCINA & ÁGUAS ABERTAS)
  // =========================================================================
  swimming: {
    code: "swimming",
    namePt: "Natação (Piscina & Águas Abertas)",
    shortNamePt: "Natação",
    category: "endurance",
    systemicLoadFactor: 1.0,
    summaryPt:
      "Desenvolvimento de eficiência hidrodinâmica (SWOLF), limiar aeróbico na água (CSS — Critical Swim Speed) e volume técnico sustentável, com fortalecimento seco voltado a puxada, core e estabilidade escapular.",
    primaryCapacities: [
      "aerobic_base",
      "lactate_threshold",
      "technical_efficiency",
      "shoulder_prehab",
    ],
    goalExamplesPt: [
      "Reduzir CSS (pace/100m) em 5 segundos em 10 semanas",
      "Completar travessia de 1.500 m ou 3.000 m com braçada eficiente e estável",
      "Evoluir volume semanal de 4.000 m para 8.000 m preservando saúde dos ombros",
    ],
    casualActivityPolicyPt:
      "Nado solto ou regenerativo de atletas de outra modalidade entra como atividade casual: contribui para carga sistêmica/recuperação sem gerar metas de CSS.",
    intensityZones: [
      {
        zone: "A1 (Leve / Educativos)",
        labelPt: "Técnica & Aeróbico Leve",
        anchorMetric: "css_pct",
        rangeLabel: "CSS +8 a +15 s/100m · RPE 3–4",
        physiologicalTargetPt: "Aprimoramento de deslize, posição corporal e recuperação ativa.",
        recommendedWeeklySharePct: { min: 35, max: 45 },
      },
      {
        zone: "A2 (Base Aeróbica)",
        labelPt: "Resistência Aeróbica Contínua",
        anchorMetric: "css_pct",
        rangeLabel: "CSS +3 a +7 s/100m · RPE 5–6",
        physiologicalTargetPt: "Sustentar ritmo aeróbico com baixa degradação técnica da braçada.",
        recommendedWeeklySharePct: { min: 30, max: 40 },
      },
      {
        zone: "AT (Limiar / CSS)",
        labelPt: "Ritmo de Velocidade Crítica (CSS)",
        anchorMetric: "css_pct",
        rangeLabel: "CSS ±2 s/100m · RPE 7–8",
        physiologicalTargetPt: "Elevar o estado estável máximo de lactato (MLSS) na água (Wakayoshi et al., 1993).",
        recommendedWeeklySharePct: { min: 15, max: 20 },
      },
      {
        zone: "VO₂ / Velocidade",
        labelPt: "Séries Curtas Máximas",
        anchorMetric: "css_pct",
        rangeLabel: "CSS −4 a −8 s/100m · RPE 9",
        physiologicalTargetPt: "Potência propulsiva, velocidade terminal e recrutamento rápido.",
        recommendedWeeklySharePct: { min: 5, max: 10 },
      },
    ],
    kpis: [
      {
        key: "css_pace_sec_per_100m",
        labelPt: "Velocidade Crítica de Nado (CSS / 100m)",
        shortLabelPt: "CSS /100m",
        unit: "s/100m",
        direction: "lower_is_better",
        cadence: "mesocycle",
        isPrimaryGoalMetric: true,
        formulaExpression: "(T_400m_sec - T_200m_sec) / 2",
        formulaDescriptionPt:
          "Pace por 100 metros no limiar aeróbico calculado a partir de tomadas de tempo máximas de 400m e 200m (Wakayoshi et al., 1993).",
        requiredInputs: ["test.time400mSec", "test.time200mSec"],
        experienceRanges: {
          beginner: { min: 120, max: 165, optimalNotePt: "2:00 a 2:45 /100m — técnica gera ganhos rápidos" },
          intermediate: { min: 95, max: 120, optimalNotePt: "1:35 a 2:00 /100m" },
          advanced: { min: 80, max: 95, optimalNotePt: "1:20 a 1:35 /100m" },
          competitive: { min: 65, max: 80, optimalNotePt: "1:05 a 1:20 /100m" },
        },
        interpretationPt:
          "Menor tempo/100m no teste CSS significa maior velocidade sustentável sem acúmulo progressivo de lactato.",
        scientificRefIds: ["wakayoshi_1993"],
      },
      {
        key: "weekly_swim_distance_m",
        labelPt: "Volume Semanal Nadado",
        shortLabelPt: "Metros/Sem",
        unit: "m/sem",
        direction: "higher_is_better",
        cadence: "weekly",
        isPrimaryGoalMetric: true,
        formulaExpression: "SUM(distance_meters) OVER last_7_days WHERE modality = 'swimming'",
        formulaDescriptionPt: "Metragem total acumulada na piscina ou águas abertas nos últimos 7 dias.",
        requiredInputs: ["session.distanceMeters"],
        experienceRanges: {
          beginner: { min: 2000, max: 5000, optimalNotePt: "2–3 sessões/sem priorizando técnica limpa" },
          intermediate: { min: 5000, max: 10000, optimalNotePt: "3–4 sessões/sem com bloco semanal de CSS" },
          advanced: { min: 10000, max: 18000, optimalNotePt: "Monitorar ombro e qualidade de braçada" },
          competitive: { min: 18000, max: 35000, optimalNotePt: "Periodização estruturada com polimento pré-prova" },
        },
        interpretationPt:
          "Deve crescer gradualmente (≤15%/sem) sem deterioração da mecânica de entrada da mão e rotação do tronco.",
        scientificRefIds: ["seiler_2010", "wakayoshi_1993"],
      },
      {
        key: "swolf_score",
        labelPt: "Eficiência Hidrodinâmica (SWOLF)",
        shortLabelPt: "SWOLF",
        unit: "pts",
        direction: "lower_is_better",
        cadence: "session",
        isPrimaryGoalMetric: false,
        formulaExpression: "time_per_length_sec + strokes_per_length  [mesma piscina 25m ou 50m]",
        formulaDescriptionPt:
          "Soma do tempo (s) + número de braçadas em uma piscina padrão (25m ou 50m); quanto menor, maior a eficiência.",
        requiredInputs: ["session.lengthTimeSec", "session.strokesPerLength", "session.poolLengthM"],
        experienceRanges: {
          beginner: { min: 45, max: 65, optimalNotePt: "Referência para piscina de 25 m" },
          intermediate: { min: 36, max: 46, optimalNotePt: "Referência para piscina de 25 m" },
          advanced: { min: 30, max: 36, optimalNotePt: "Referência para piscina de 25 m" },
          competitive: { min: 25, max: 31, optimalNotePt: "Referência para piscina de 25 m" },
        },
        interpretationPt:
          "Permite verificar se o ganho de velocidade veio de melhor hidrodinâmica/deslize ou apenas de 'girar braço' em fadiga.",
        scientificRefIds: ["wakayoshi_1993"],
      },
    ],
    complementaryStrength: {
      role: "complementary_support",
      objectiveHeadlinePt:
        "Força Seca (Dryland) para Propulsão de Dorsal, Estabilidade de Core e Blindagem de Ombro",
      physiologicalTransferPt:
        "A propulsão na água depende da força relativa de grande dorsal/tríceps ancorada por um core rígido em linha hidrodinâmica; rotadores externos e estabilizadores escapulares previnem o 'ombro do nadador' (Cools et al., 2015).",
      recommendedFrequencyPerWeek: {
        beginner: { min: 1, max: 2 },
        intermediate: { min: 2, max: 2 },
        advanced: { min: 2, max: 3 },
        competitive: { min: 2, max: 3 },
      },
      targetCapacities: ["maximal_strength", "shoulder_prehab", "core_transfer", "explosive_power"],
      priorityExerciseCategories: ["costas", "ombros", "core", "pernas", "mobilidade"],
      intensityPrescriptionPt:
        "Puxadas/barra fixa/remadas (3–4×5–8 reps, RIR 2), core anti-extensão/anti-rotação, pernada/saída (agachamento/saltos) e manguito rotador em resistência moderada.",
      volumePrescriptionPt:
        "Sessões de 35–45 min com alta qualidade escapular; evitar fadiga extrema de ombros antes de treinos longos na água.",
      minSeparationHoursFromMainModality: 6,
      separationRationalePt:
        "Manter ombros frescos para a mecânica da braçada na água evita compensações que geram impacto subacromial.",
      avoidanceRulesPt: [
        "Evitar alto volume de supino/ombro anterior sem proporção ≥1,5:1 de puxadas e rotação externa",
        "Evitar exercícios atrás da nuca com sobrecarga articular",
      ],
      expectedKpiImpacts: [
        {
          kpiKey: "css_pace_sec_per_100m",
          expectedMechanismPt: "Maior força útil por braçada sustenta ritmo CSS com menor frequência de ciclos",
        },
        {
          kpiKey: "swolf_score",
          expectedMechanismPt: "Core rígido reduz arrasto de quadril/pernas e melhora distância por braçada",
        },
      ],
      scientificRefIds: ["cools_2015", "schumann_2022"],
    },
    sessionArchetypes: [
      {
        code: "swim_technique_a1",
        labelPt: "Técnica, Educativos & Base (A1–A2)",
        shortLabelPt: "Técnica/Base",
        primaryCapacity: "technical_efficiency",
        targetZone: "A1 (Leve / Educativos)",
        typicalDurationMin: { min: 40, max: 60 },
        typicalRpe: { min: 3.5, max: 5.5 },
        applicablePhases: ["base", "build", "peak", "taper", "deload", "constancy"],
        purposePt: "Melhorar SWOLF, deslize e posicionamento corporal com baixo estresse.",
        usesStructuredRoutine: false,
      },
      {
        code: "swim_css_threshold",
        labelPt: "Séries de Limiar (CSS)",
        shortLabelPt: "Série CSS",
        primaryCapacity: "lactate_threshold",
        targetZone: "AT (Limiar / CSS)",
        typicalDurationMin: { min: 45, max: 65 },
        typicalRpe: { min: 7, max: 8.5 },
        applicablePhases: ["build", "peak", "constancy"],
        purposePt: "Empurrar o pace CSS para baixo com pausas curtas (ex.: 10–15 × 100m no CSS, 15s pausa).",
        usesStructuredRoutine: false,
      },
      {
        code: "swim_dryland_strength",
        labelPt: "Força Seca (Dorsal, Ombro & Core)",
        shortLabelPt: "Dryland",
        primaryCapacity: "shoulder_prehab",
        targetZone: "RIR 2–3",
        typicalDurationMin: { min: 35, max: 45 },
        typicalRpe: { min: 6.5, max: 7.5 },
        applicablePhases: ["base", "build", "constancy"],
        purposePt: "Fortalecer cadeia propulsiva e proteger ombros contra sobrecarga repetitiva (Cools et al., 2015).",
        usesStructuredRoutine: true,
      },
    ],
    periodizationPhases: [
      {
        phase: "base",
        labelPt: "Eficiência Técnica & Volume Base",
        shareOfMacrocyclePct: 35,
        volumeMultiplier: 0.95,
        intensityFocusPt: "Educativos + A2 + Dryland 2×/sem",
        directivePt: "Reduzir SWOLF e adaptar ombros antes de elevar intensidade CSS.",
      },
      {
        phase: "build",
        labelPt: "Desenvolvimento de CSS",
        shareOfMacrocyclePct: 40,
        volumeMultiplier: 1.1,
        intensityFocusPt: "Blocos semanais em ritmo CSS",
        directivePt: "Expandir volume em limiar mantendo contagem de braçadas estável.",
      },
      {
        phase: "peak",
        labelPt: "Ritmo de Prova",
        shareOfMacrocyclePct: 15,
        volumeMultiplier: 0.95,
        intensityFocusPt: "Séries específicas na distância-alvo",
        directivePt: "Ajustar pacing e viradas/navegação.",
      },
      {
        phase: "taper",
        labelPt: "Polimento Aquático",
        shareOfMacrocyclePct: 10,
        volumeMultiplier: 0.5,
        intensityFocusPt: "Volume -50%, tiros curtos com descanso amplo",
        directivePt: "Maximizar sensibilidade à água e frescor muscular (Bosquet et al., 2007).",
      },
    ],
    safetyGuardrails: {
      maxWeeklyVolumeJumpPct: 15,
      maxWeeklyMonotony: 2.0,
      acwrAdvisoryRange: { min: 0.8, max: 1.3 },
      acwrCautionNotePt:
        "Monitorar volume semanal com palmilha/palmar (aumentam torque no ombro) e dor anterior de ombro; ACWR é auxiliar.",
      deloadFrequencyWeeks: 4,
      modalitySpecificAlertsPt: [
        "Limitar uso de palmar a <=20% do volume semanal em fases de aumento de metragem",
        "Manter pré-hab escapular e rotação externa semanalmente (Cools et al., 2015)",
      ],
      scientificRefIds: ["wakayoshi_1993", "cools_2015", "bosquet_2007"],
    },
    scientificRefIds: ["wakayoshi_1993", "cools_2015", "seiler_2010", "bosquet_2007"],
  },

  // =========================================================================
  // 6. FUNCIONAL & CROSS-TRAINING
  // =========================================================================
  functional: {
    code: "functional",
    namePt: "Funcional & Cross-Training",
    shortNamePt: "Funcional",
    category: "hybrid",
    systemicLoadFactor: 1.05,
    summaryPt:
      "Condicionamento híbrido que integra força relativa/peso corporal, capacidade de trabalho metabólico (WOD/HIIT), mobilidade e resistência muscular — exigindo dosagem cuidadosa de densidade para evitar fadiga crônica.",
    primaryCapacities: [
      "work_capacity",
      "muscular_endurance",
      "maximal_strength",
      "explosive_power",
      "core_transfer",
    ],
    goalExamplesPt: [
      "Progredir força relativa (ex.: de 5 para 12 barras fixas estritas ou muscle-up)",
      "Melhorar tempo/pontuação em benchmarks metabólicos mantendo técnica segura",
      "Sustentar 4 sessões/semana equilibrando força pura e condicionamento sem burnout",
    ],
    casualActivityPolicyPt:
      "Aula avulsa de funcional/HIIT de quem foca em outra modalidade entra como atividade casual: contabiliza carga sistêmica/EA (fator 1,05), sem alterar periodização principal.",
    intensityZones: [
      {
        zone: "Técnico / Skill",
        labelPt: "Habilidades Motoras & Mobilidade",
        anchorMetric: "srpe",
        rangeLabel: "RPE 4–6 · Baixa fadiga",
        physiologicalTargetPt: "Aprendizado técnico (ginásticos, LPO, equilíbrio) antes da fadiga metabólica.",
      },
      {
        zone: "Força Estruturada",
        labelPt: "Força Absoluta ou Relativa",
        anchorMetric: "rir_rpe",
        rangeLabel: "RIR 1–3 · Descanso completo",
        physiologicalTargetPt: "Elevar teto de força que serve de base para todos os movimentos sob fadiga.",
      },
      {
        zone: "Metabólico / WOD",
        labelPt: "Capacidade de Trabalho & HIIT",
        anchorMetric: "srpe",
        rangeLabel: "RPE 7,5–9,5 · Alta densidade",
        physiologicalTargetPt: "Tolerância à acidose, transições rápidas e potência aeróbica/anaeróbica mista.",
        recommendedWeeklySharePct: { min: 20, max: 35 },
      },
    ],
    kpis: [
      {
        key: "relative_strength_reps_or_ratio",
        labelPt: "Força Relativa (Movimentos-Âncora)",
        shortLabelPt: "Força Relativa",
        unit: "reps ou ×PC",
        direction: "higher_is_better",
        cadence: "mesocycle",
        isPrimaryGoalMetric: true,
        formulaExpression: "max_strict_reps(pullup/dip/pistol) OR (e1RM_kg / body_weight_kg)",
        formulaDescriptionPt:
          "Repetições estritas máximas em movimentos âncora de calistenia ou razão e1RM/peso corporal em compostos funcionais.",
        requiredInputs: ["test.anchorMovementScore", "athlete.bodyWeightKg"],
        experienceRanges: {
          beginner: { min: 1, max: 5, optimalNotePt: "Ex.: 1–5 barras fixas estritas ou 1,0×PC no agachamento" },
          intermediate: { min: 6, max: 12, optimalNotePt: "Ex.: 6–12 barras fixas ou 1,25–1,5×PC" },
          advanced: { min: 12, max: 18, optimalNotePt: "Ex.: 12–18 barras fixas ou progressões com carga extra" },
          competitive: { min: 18, max: 25, optimalNotePt: "Alta eficiência relativa associada a técnica limpa" },
        },
        interpretationPt:
          "Mede se o condicionamento está realmente construindo força estrutural e não apenas fadiga.",
        scientificRefIds: ["acsm_2009", "helms_2016"],
      },
      {
        key: "work_capacity_benchmark_score",
        labelPt: "Capacidade de Trabalho (Benchmark / Densidade)",
        shortLabelPt: "Capacidade WOD",
        unit: "reps/min ou s",
        direction: "higher_is_better",
        cadence: "mesocycle",
        isPrimaryGoalMetric: true,
        formulaExpression: "total_valid_reps / duration_minutes  [em benchmark padronizado]",
        formulaDescriptionPt:
          "Densidade de trabalho (repetições válidas/minuto ou redução de tempo) em circuito-referência repetido a cada 4–6 semanas.",
        requiredInputs: ["test.benchmarkReps", "test.benchmarkDurationMin"],
        experienceRanges: {
          beginner: { min: 8, max: 14, optimalNotePt: "Foco em ritmo sustentável sem quebra técnica" },
          intermediate: { min: 14, max: 22, optimalNotePt: "Evolução por eficiência de transição e base aeróbica" },
          advanced: { min: 22, max: 30, optimalNotePt: "Alta potência repetida com controle respiratório" },
          competitive: { min: 28, max: 40, optimalNotePt: "Comparar sempre no mesmo benchmark padronizado" },
        },
        interpretationPt:
          "Comprova melhora real de condicionamento misto quando medida em protocolos replicáveis.",
        scientificRefIds: ["foster_2001", "issurin_2010"],
      },
      {
        key: "high_rpe_session_share_pct",
        labelPt: "Proporção de Sessões de Alta Intensidade (RPE ≥ 8)",
        shortLabelPt: "% Sessões RPE≥8",
        unit: "%",
        direction: "target_band",
        cadence: "weekly",
        isPrimaryGoalMetric: false,
        formulaExpression: "(sessions_with_rpe_gte_8 / total_weekly_sessions) * 100",
        formulaDescriptionPt:
          "Percentual de treinos semanais realizados em esforço muito alto (RPE ≥ 8) — indicador-chave anti-burnout em treinos híbridos.",
        requiredInputs: ["session.rpe"],
        experienceRanges: {
          beginner: { min: 15, max: 35, optimalNotePt: "Máximo 1–2 sessões muito intensas/semana" },
          intermediate: { min: 25, max: 50, optimalNotePt: "Alternar dias fortes com força controlada/aeróbico Z2" },
          advanced: { min: 30, max: 55, optimalNotePt: "Evitar >3 dias seguidos de RPE ≥ 8,5" },
          competitive: { min: 30, max: 60, optimalNotePt: "Exige controle rigoroso de monotonia e sono" },
        },
        interpretationPt:
          "Treinar todos os dias no limite (RPE 9+) eleva monotonia, estagna força e dispara overreaching.",
        scientificRefIds: ["foster_1998", "kellmann_2018"],
      },
    ],
    complementaryStrength: {
      role: "complementary_support",
      objectiveHeadlinePt:
        "Blocos de Força Estruturada & Estabilidade Articular antes da Fadiga Metabólica",
      physiologicalTransferPt:
        "No funcional/cross-training, reservar blocos de força limpa (com descanso adequado, RIR 2) antes ou em dias distintos dos WODs evita que a fadiga metabólica limite o ganho de força máxima e reduz risco de lesão lombar e de ombro (Schumann et al., 2022).",
      recommendedFrequencyPerWeek: {
        beginner: { min: 2, max: 2 },
        intermediate: { min: 2, max: 3 },
        advanced: { min: 2, max: 3 },
        competitive: { min: 2, max: 4 },
      },
      targetCapacities: ["maximal_strength", "joint_durability", "core_transfer", "shoulder_prehab"],
      priorityExerciseCategories: ["pernas", "costas", "ombros", "core", "mobilidade"],
      intensityPrescriptionPt:
        "Movimentos compostos bilaterais e unilaterais em 3–4×5–8 reps (RIR 2) com 2–3 min de pausa, separados do condicionamento intenso.",
      volumePrescriptionPt:
        "6–12 séries/grupo/semana de força estruturada + acessórios escapulares/lombar.",
      minSeparationHoursFromMainModality: 3,
      separationRationalePt:
        "Executar potência/força explosiva antes do WOD ou com >=3h de intervalo preserva adaptação neural (Schumann et al., 2022).",
      avoidanceRulesPt: [
        "Não usar movimentos complexos (LPO pesado, levantamento terra pesado) até exaustão sob alta fadiga cardíaca sem domínio técnico",
        "Evitar 4+ dias consecutivos de WOD RPE ≥ 8,5 (dispara monotonia >2,0)",
      ],
      expectedKpiImpacts: [
        {
          kpiKey: "relative_strength_reps_or_ratio",
          expectedMechanismPt: "Força estruturada aumenta reserva de força para cada repetição de calistenia/WOD",
        },
        {
          kpiKey: "work_capacity_benchmark_score",
          expectedMechanismPt: "Cargas do benchmark passam a representar menor % da força máxima",
        },
      ],
      scientificRefIds: ["schumann_2022", "acsm_2009", "foster_1998"],
    },
    sessionArchetypes: [
      {
        code: "func_strength_skill",
        labelPt: "Força Estruturada & Habilidade (Skill)",
        shortLabelPt: "Força & Skill",
        primaryCapacity: "maximal_strength",
        targetZone: "Força Estruturada",
        typicalDurationMin: { min: 45, max: 60 },
        typicalRpe: { min: 6.5, max: 8 },
        applicablePhases: ["base", "build", "peak", "constancy"],
        purposePt: "Construir força relativa e técnica limpa sem interferência de fadiga metabólica.",
        usesStructuredRoutine: true,
      },
      {
        code: "func_metcon_wod",
        labelPt: "Condicionamento Metabólico (WOD / HIIT)",
        shortLabelPt: "Metcon / WOD",
        primaryCapacity: "work_capacity",
        targetZone: "Metabólico / WOD",
        typicalDurationMin: { min: 30, max: 50 },
        typicalRpe: { min: 7.5, max: 9 },
        applicablePhases: ["build", "peak", "constancy"],
        purposePt: "Desenvolver capacidade de trabalho, transições e resistência sob alta frequência cardíaca.",
        usesStructuredRoutine: true,
      },
      {
        code: "func_aerobic_mobility",
        labelPt: "Base Aeróbica Z2 & Mobilidade Articular",
        shortLabelPt: "Z2 & Mobilidade",
        primaryCapacity: "recovery_mobility",
        targetZone: "Técnico / Skill",
        typicalDurationMin: { min: 30, max: 45 },
        typicalRpe: { min: 3, max: 5 },
        applicablePhases: ["base", "build", "deload", "taper", "constancy"],
        purposePt: "Acelerar recuperação entre WODs e quebrar monotonia de carga semanal.",
        usesStructuredRoutine: false,
      },
    ],
    periodizationPhases: [
      {
        phase: "base",
        labelPt: "Base de Força, Técnica & Aeróbico",
        shareOfMacrocyclePct: 35,
        volumeMultiplier: 0.95,
        intensityFocusPt: "Força RIR 2 + Z2 + Técnica",
        directivePt: "Consolidar padrões motores e capacidade aeróbica para suportar densidade futura.",
      },
      {
        phase: "build",
        labelPt: "Construção Híbrida",
        shareOfMacrocyclePct: 40,
        volumeMultiplier: 1.08,
        intensityFocusPt: "Alternância força pesada / Metcon",
        directivePt: "Elevar carga nos âncoras e densidade nos circuitos controlando RPE.",
      },
      {
        phase: "peak",
        labelPt: "Benchmark & Realização",
        shareOfMacrocyclePct: 15,
        volumeMultiplier: 0.9,
        intensityFocusPt: "Simulação de benchmarks",
        directivePt: "Testar evolução real de força relativa e capacidade de trabalho.",
      },
      {
        phase: "deload",
        labelPt: "Deload & Mobilidade",
        shareOfMacrocyclePct: 10,
        volumeMultiplier: 0.55,
        intensityFocusPt: "RPE ≤ 6 · Técnica e Z2",
        directivePt: "Restaurar sistema nervoso e articulações.",
      },
    ],
    safetyGuardrails: {
      maxWeeklyVolumeJumpPct: 15,
      maxWeeklyMonotony: 2.0,
      acwrAdvisoryRange: { min: 0.8, max: 1.3 },
      acwrCautionNotePt:
        "No treinamento híbrido, Monotonia (Foster) e proporção de dias RPE >= 8 são críticos para prevenir fadiga crônica.",
      deloadFrequencyWeeks: 4,
      modalitySpecificAlertsPt: [
        "Evitar >55% das sessões semanais em RPE ≥ 8",
        "Preservar técnica em levantamentos complexos interrompendo a série antes de degradação postural",
      ],
      scientificRefIds: ["foster_1998", "schumann_2022", "kellmann_2018"],
    },
    scientificRefIds: ["foster_1998", "foster_2001", "schumann_2022", "acsm_2009", "kellmann_2018"],
  },

  // =========================================================================
  // 7. FUTSAL (QUADRA, MUDANÇA DE DIREÇÃO & ALTA INTENSIDADE INTERMITENTE)
  // =========================================================================
  futsal: {
    code: "futsal",
    namePt: "Futsal (Quadra & Agilidade)",
    shortNamePt: "Futsal",
    category: "team_sport",
    systemicLoadFactor: 1.15,
    summaryPt:
      "Modalidade de quadra de altíssima densidade intermitente (média ≥85% FCmáx), caracterizada por acelerações curtas, frenagens bruscas em piso duro, mudanças de direção (COD) e sprints repetidos — exigindo blindagem de posteriores, adutores e tornozelos.",
    primaryCapacities: [
      "change_of_direction",
      "repeated_sprint_ability",
      "explosive_power",
      "eccentric_hamstring_protection",
      "aerobic_base",
    ],
    goalExamplesPt: [
      "Sustentar explosão e velocidade de recomposição defensiva no 2º tempo sem queda de rendimento",
      "Reduzir tempo em testes de mudança de direção (agilidade 5-0-5 / T-Test) e sprints de 10–15 m",
      "Jogar 2–3×/semana na quadra mantendo adutores, posteriores e joelhos livres de sobrecarga",
    ],
    casualActivityPolicyPt:
      "Pelada de futsal semanal de quem foca em musculação ou corrida entra como atividade casual: soma alto custo sistêmico (fator 1,15) na EA/sRPE para evitar conflito com treino de perna pesada, sem exigir metas de futsal.",
    intensityZones: [
      {
        zone: "Técnico / Tático Leve",
        labelPt: "Passe, Domínio, Bola Parada & Organização",
        anchorMetric: "srpe",
        rangeLabel: "RPE 4–5,5 · <75% FCmáx",
        physiologicalTargetPt: "Precisão técnica, posicionamento e leitura de jogo com baixo estresse excêntrico.",
      },
      {
        zone: "Quadra Reduzida / Transição",
        labelPt: "Jogos Reduzidos & Mudança de Direção",
        anchorMetric: "srpe",
        rangeLabel: "RPE 6,5–8 · 80–88% FCmáx",
        physiologicalTargetPt: "Capacidade intermitente específica, aceleração/desaceleração e tomada de decisão rápida.",
      },
      {
        zone: "Jogo / Competitivo",
        labelPt: "Partida Intensa & Sprints Repetidos (RSA)",
        anchorMetric: "srpe",
        rangeLabel: "RPE 8,5–10 · ≥85% FCmáx (Naser et al., 2017)",
        physiologicalTargetPt: "Demanda máxima de quadra com transições ataque-defesa e alta sobrecarga excêntrica de frenagem.",
      },
    ],
    kpis: [
      {
        key: "weekly_futsal_load_ua",
        labelPt: "Carga Semanal de Quadra (sRPE Ponderado)",
        shortLabelPt: "Carga Quadra",
        unit: "UA/sem",
        direction: "target_band",
        cadence: "weekly",
        isPrimaryGoalMetric: true,
        formulaExpression: "SUM(duration_min * rpe * 1.15) OVER last_7_days WHERE modality = 'futsal'",
        formulaDescriptionPt:
          "Carga interna ponderada pelo fator biomecânico de quadra dura (1,15) devido a frenagens excêntricas repetidas.",
        requiredInputs: ["session.durationMinutes", "session.rpe"],
        experienceRanges: {
          beginner: { min: 450, max: 950, optimalNotePt: "1–2 sessões/sem adaptando articulações ao piso duro" },
          intermediate: { min: 900, max: 1700, optimalNotePt: "2–3 sessões/sem com fortalecimento preventivo" },
          advanced: { min: 1500, max: 2500, optimalNotePt: "3–4 sessões/sem exigindo controle de monotonia e sono" },
          competitive: { min: 2200, max: 3500, optimalNotePt: "Microciclos estruturados em torno do dia de jogo (MD)" },
        },
        interpretationPt:
          "Permite dosar jogos + treinos de quadra com a musculação para evitar sobrecarga de adutores e posteriores.",
        scientificRefIds: ["naser_2017", "foster_2001", "gabbett_2016"],
      },
      {
        key: "rsa_or_cod_index_sec",
        labelPt: "Velocidade de Mudança de Direção / Sprint 15m",
        shortLabelPt: "COD / 15m",
        unit: "s",
        direction: "lower_is_better",
        cadence: "mesocycle",
        isPrimaryGoalMetric: true,
        formulaExpression: "best_or_mean_time_sec(5-0-5_COD_or_15m_sprint)",
        formulaDescriptionPt:
          "Tempo médio em protocolo de agilidade (5-0-5) ou sprint curto (10–15 m) em quadra, refletindo potência de aceleração e frenagem.",
        requiredInputs: ["test.codOrSprintTimeSec"],
        experienceRanges: {
          beginner: { min: 2.75, max: 3.3, optimalNotePt: "Referência para teste 5-0-5 / sprint curto — comparar ao baseline" },
          intermediate: { min: 2.45, max: 2.8, optimalNotePt: "Foco em mecânica de frenagem e primeiro passo" },
          advanced: { min: 2.25, max: 2.5, optimalNotePt: "Alta transferência de força unilateral + pliometria lateral" },
          competitive: { min: 2.05, max: 2.3, optimalNotePt: "Nível competitivo de quadra" },
        },
        interpretationPt:
          "Tempos menores traduzem aceleração inicial mais rápida e frenagem segura para cortes na quadra.",
        scientificRefIds: ["naser_2017", "markovic_2007"],
      },
      {
        key: "eccentric_prehab_adherence_pct",
        labelPt: "Blindagem de Posteriores & Adutores",
        shortLabelPt: "Pré-Hab Pernas",
        unit: "%",
        direction: "higher_is_better",
        cadence: "weekly",
        isPrimaryGoalMetric: false,
        formulaExpression: "(completed_hamstring_adductor_sessions / target_2_per_week) * 100",
        formulaDescriptionPt:
          "Adesão semanal a protocolos excêntricos de isquiotibiais (Nordic/RDL) e adutores (Copenhagen) para prevenção de estiramentos e pubalgia.",
        requiredInputs: ["session.eccentricPrehabCompleted"],
        experienceRanges: {
          beginner: { min: 80, max: 100, optimalNotePt: "1–2×/sem com progressão gradual de volume" },
          intermediate: { min: 85, max: 100, optimalNotePt: "2×/sem protege contra picos de jogo" },
          advanced: { min: 90, max: 100, optimalNotePt: "Incluir controle excêntrico longe da véspera do jogo" },
          competitive: { min: 95, max: 100, optimalNotePt: "Pilar obrigatório na temporada (Petersen et al., 2011)" },
        },
        interpretationPt:
          "Queda nesta adesão durante semanas com 2+ jogos eleva drasticamente o risco de lesão muscular aguda.",
        scientificRefIds: ["petersen_2011", "naser_2017"],
      },
    ],
    complementaryStrength: {
      role: "complementary_support",
      objectiveHeadlinePt:
        "Potência de Aceleração, Frenagem Excêntrica (Posteriores/Adutores) e Estabilidade Lateral",
      physiologicalTransferPt:
        "No futsal, a musculação complementar constrói força unilateral de quadríceps/glúteo para aceleração nos primeiros 5 metros, força excêntrica de isquiotibiais e adutores para frear em piso duro (Petersen et al., 2011) e potência lateral/tornozelo para cortes seguros (Naser et al., 2017).",
      recommendedFrequencyPerWeek: {
        beginner: { min: 2, max: 2 },
        intermediate: { min: 2, max: 2 },
        advanced: { min: 2, max: 3 },
        competitive: { min: 2, max: 3 },
      },
      targetCapacities: [
        "maximal_strength",
        "explosive_power",
        "eccentric_hamstring_protection",
        "change_of_direction",
        "core_transfer",
      ],
      priorityExerciseCategories: ["pernas", "pliometria", "core", "mobilidade"],
      intensityPrescriptionPt:
        "Unilaterais de força (búlgaro, afundo reverso, step-up 3–4×5–8 reps RIR 2) + excêntrico de posterior/adutor (Nordic, RDL, Copenhagen 2–3×5–8 reps) + saltos laterais/horizontais de baixa dose (25–35 contatos).",
      volumePrescriptionPt:
        "Sessões de 40–50 min priorizando intenção explosiva e controle excêntrico sem levar pernas à falha.",
      minSeparationHoursFromMainModality: 24,
      separationRationalePt:
        "Fazer perna pesada ou Nordic intenso menos de 24–48h antes de partida competitiva gera fadiga excêntrica e reduz velocidade de corte/sprint (Schumann et al., 2022).",
      avoidanceRulesPt: [
        "Evitar treinos volumosos de perna (RIR 0 / DOMS forte) nas 36–48h que antecedem jogo de futsal",
        "Não introduzir Nordic Hamstring em alto volume de uma só vez; progredir semanalmente",
      ],
      expectedKpiImpacts: [
        {
          kpiKey: "rsa_or_cod_index_sec",
          expectedMechanismPt: "Força unilateral + potência lateral melhoram aceleração inicial e frenagem em quadra",
        },
        {
          kpiKey: "eccentric_prehab_adherence_pct",
          expectedMechanismPt: "Protocolos excêntricos reduzem drasticamente estiramentos de posterior e dores em adutor (Petersen et al., 2011)",
        },
      ],
      scientificRefIds: ["naser_2017", "petersen_2011", "markovic_2007", "schumann_2022"],
    },
    sessionArchetypes: [
      {
        code: "futsal_tech_tactical",
        labelPt: "Treino Técnico-Tático em Quadra",
        shortLabelPt: "Quadra Técnico",
        primaryCapacity: "technical_efficiency",
        targetZone: "Técnico / Tático Leve",
        typicalDurationMin: { min: 50, max: 75 },
        typicalRpe: { min: 4.5, max: 6.5 },
        applicablePhases: ["base", "build", "peak", "taper", "constancy"],
        purposePt: "Refinar tomada de decisão, bola parada e movimentação preservando pernas.",
        usesStructuredRoutine: false,
      },
      {
        code: "futsal_match_rsa",
        labelPt: "Jogo / Coletivo de Alta Intensidade (RSA)",
        shortLabelPt: "Jogo Futsal",
        primaryCapacity: "repeated_sprint_ability",
        targetZone: "Jogo / Competitivo",
        typicalDurationMin: { min: 50, max: 80 },
        typicalRpe: { min: 8, max: 9.5 },
        applicablePhases: ["build", "peak", "constancy"],
        purposePt: "Desenvolver tolerância a transições repetidas acima de 85% FCmáx.",
        usesStructuredRoutine: false,
      },
      {
        code: "futsal_strength_cod",
        labelPt: "Força Unilateral, COD & Blindagem Excêntrica",
        shortLabelPt: "Força & Pré-Hab",
        primaryCapacity: "eccentric_hamstring_protection",
        targetZone: "RIR 2 · Potência + Excêntrico",
        typicalDurationMin: { min: 40, max: 55 },
        typicalRpe: { min: 7, max: 8 },
        applicablePhases: ["base", "build", "peak", "constancy"],
        purposePt: "Potencializar mudança de direção e blindar posteriores, adutores e tornozelos.",
        usesStructuredRoutine: true,
      },
    ],
    periodizationPhases: [
      {
        phase: "base",
        labelPt: "Base Estrutural, Excêntrica & Aeróbica",
        shareOfMacrocyclePct: 35,
        volumeMultiplier: 0.95,
        intensityFocusPt: "Força unilateral + Nordic/Copenhagen + quadra técnico",
        directivePt: "Preparar tendões, adutores e lastro aeróbico para alta densidade de jogos.",
      },
      {
        phase: "build",
        labelPt: "Potência de Corte & Sprints Repetidos",
        shareOfMacrocyclePct: 40,
        volumeMultiplier: 1.08,
        intensityFocusPt: "Pliometria lateral + jogos reduzidos + coletivos",
        directivePt: "Elevar velocidade de mudança de direção e resistência a transições.",
      },
      {
        phase: "peak",
        labelPt: "Ritmo Competitivo (Microciclo MD)",
        shareOfMacrocyclePct: 15,
        volumeMultiplier: 0.95,
        intensityFocusPt: "Força em dose de manutenção distante do jogo",
        directivePt: "Chegar ao dia de jogo (MD) com frescor neuromuscular e sem DOMS.",
      },
      {
        phase: "taper",
        labelPt: "Polimento Pré-Torneio",
        shareOfMacrocyclePct: 10,
        volumeMultiplier: 0.55,
        intensityFocusPt: "Volume -45%, ativações curtas de velocidade",
        directivePt: "Dissipar fadiga de quadra preservando explosão do primeiro passo.",
      },
    ],
    safetyGuardrails: {
      maxWeeklyVolumeJumpPct: 15,
      maxWeeklyMonotony: 2.0,
      acwrAdvisoryRange: { min: 0.8, max: 1.3 },
      acwrCautionNotePt:
        "Monitorar soma de jogos de futsal + musculação de pernas; ACWR atua como sinal auxiliar junto à fadiga muscular local.",
      deloadFrequencyWeeks: 4,
      modalitySpecificAlertsPt: [
        "Separar treino pesado de pernas e jogos de futsal por >=24–48h",
        "Garantir estímulo semanal excêntrico de isquiotibiais e adutores (Petersen et al., 2011)",
        "Evitar 3+ jogos de alta intensidade em 72h sem protocolo de recuperação ativa",
      ],
      scientificRefIds: ["naser_2017", "petersen_2011", "schumann_2022", "foster_1998"],
    },
    scientificRefIds: ["naser_2017", "petersen_2011", "markovic_2007", "schumann_2022", "foster_2001"],
  },

  // =========================================================================
  // 8. FUTEBOL (CAMPO, SPRINTS REPETIDOS & RESISTÊNCIA INTERMITENTE)
  // =========================================================================
  football: {
    code: "football",
    namePt: "Futebol (Campo & Intermitente)",
    shortNamePt: "Futebol",
    category: "team_sport",
    systemicLoadFactor: 1.12,
    summaryPt:
      "Esporte de campo amplo (~8–12 km/jogo) combinando lastro aeróbico intermitente, sprints em alta velocidade (>20 km/h), força de chute e prevenção rigorosa de lesões de isquiotibiais e adutores.",
    primaryCapacities: [
      "aerobic_base",
      "repeated_sprint_ability",
      "explosive_power",
      "eccentric_hamstring_protection",
      "change_of_direction",
    ],
    goalExamplesPt: [
      "Chegar aos 90 minutos mantendo velocidade de sprint e capacidade de recuperação entre jogadas",
      "Evoluir distância em teste intermitente (Yo-Yo IR1) e velocidade em sprint de 20–30 m",
      "Reduzir risco de estiramento de posterior de coxa com fortalecimento excêntrico semanal",
    ],
    casualActivityPolicyPt:
      "Futebol society/campo recreativo de quem tem outra modalidade principal entra como atividade casual: soma sRPE/EA (fator 1,12) e avisa sobre fadiga de pernas, sem gerar periodização de futebol.",
    intensityZones: [
      {
        zone: "Regenerativo / Técnico",
        labelPt: "Rondos, Toque de Bola & Recuperação Pós-Jogo",
        anchorMetric: "srpe",
        rangeLabel: "RPE 3–5 · <75% FCmáx",
        physiologicalTargetPt: "Recuperação ativa nas 24–48h pós-jogo (MD+1/MD+2) e manutenção técnica.",
      },
      {
        zone: "Aeróbico Intermitente",
        labelPt: "Jogos Reduzidos & Corrida Intermitente",
        anchorMetric: "srpe",
        rangeLabel: "RPE 6,5–8 · 80–90% FCmáx",
        physiologicalTargetPt: "Elevar potência aeróbica específica e recuperação entre esforços de alta velocidade.",
      },
      {
        zone: "Alta Velocidade / Jogo (MD)",
        labelPt: "Partida Completa & Sprints >20 km/h",
        anchorMetric: "srpe",
        rangeLabel: "RPE 8,5–10 · Alta demanda excêntrica de sprint",
        physiologicalTargetPt: "Exposição controlada à velocidade máxima (efeito vacina de isquiotibiais) e ritmo real de 90 min.",
      },
    ],
    kpis: [
      {
        key: "weekly_football_load_ua",
        labelPt: "Carga Semanal de Campo (sRPE Ponderado)",
        shortLabelPt: "Carga Campo",
        unit: "UA/sem",
        direction: "target_band",
        cadence: "weekly",
        isPrimaryGoalMetric: true,
        formulaExpression: "SUM(duration_min * rpe * 1.12) OVER last_7_days WHERE modality = 'football'",
        formulaDescriptionPt:
          "Carga interna acumulada em treinos de campo e partidas ponderada pelo fator sistêmico do futebol (1,12).",
        requiredInputs: ["session.durationMinutes", "session.rpe"],
        experienceRanges: {
          beginner: { min: 500, max: 1100, optimalNotePt: "1–2 sessões/sem construindo base de corrida e força" },
          intermediate: { min: 1000, max: 1900, optimalNotePt: "2–3 sessões/sem (ex.: 1 jogo + 1–2 treinos)" },
          advanced: { min: 1800, max: 2900, optimalNotePt: "3–4 sessões/sem organizadas em microciclo MD" },
          competitive: { min: 2600, max: 4200, optimalNotePt: "Alta carga exige controle rígido de MD-2 / MD-1" },
        },
        interpretationPt:
          "Mantém progressão segura entre treinos de campo, força e partidas de fim de semana.",
        scientificRefIds: ["stolen_2005", "foster_2001", "gabbett_2016"],
      },
      {
        key: "yoyo_or_intermittent_distance_m",
        labelPt: "Resistência Intermitente (Yo-Yo IR1 / Distância)",
        shortLabelPt: "Yo-Yo IR1",
        unit: "m",
        direction: "higher_is_better",
        cadence: "mesocycle",
        isPrimaryGoalMetric: true,
        formulaExpression: "yoyo_ir1_distance_m  [ou distância de alta intensidade em campo]",
        formulaDescriptionPt:
          "Distância atingida no Yo-Yo Intermittent Recovery Test Level 1 — marcador validado de capacidade de repetir esforços no futebol (Stølen et al., 2005).",
        requiredInputs: ["test.yoyoIr1Meters"],
        experienceRanges: {
          beginner: { min: 600, max: 1100, optimalNotePt: "Construir base aeróbica antes de intervalos máximos" },
          intermediate: { min: 1100, max: 1700, optimalNotePt: "Faixa típica de jogadores amadores regulares" },
          advanced: { min: 1700, max: 2300, optimalNotePt: "Boa sustentação nos 20 min finais da partida" },
          competitive: { min: 2200, max: 3000, optimalNotePt: "Padrão competitivo semiprofissional/profissional" },
        },
        interpretationPt:
          "Evolução no Yo-Yo IR1 correlaciona-se diretamente com maior distância em alta intensidade no 2º tempo.",
        scientificRefIds: ["stolen_2005"],
      },
      {
        key: "hamstring_eccentric_prehab_pct",
        labelPt: "Protocolo Preventivo Excêntrico (Nordic / Posterior)",
        shortLabelPt: "Pré-Hab Posterior",
        unit: "%",
        direction: "higher_is_better",
        cadence: "weekly",
        isPrimaryGoalMetric: false,
        formulaExpression: "(completed_nordic_or_eccentric_sessions / target_weekly_sessions) * 100",
        formulaDescriptionPt:
          "Cumprimento semanal de exercício excêntrico de isquiotibiais (Nordic Hamstring / RDL excêntrico) — reduz lesões em ~71% (Petersen et al., 2011).",
        requiredInputs: ["session.eccentricPrehabCompleted"],
        experienceRanges: {
          beginner: { min: 80, max: 100, optimalNotePt: "1×/sem iniciando com 2×5 reps controladas" },
          intermediate: { min: 85, max: 100, optimalNotePt: "1–2×/sem em manutenção durante temporada" },
          advanced: { min: 90, max: 100, optimalNotePt: "Alocar preferencialmente em MD+2 / MD-3" },
          competitive: { min: 95, max: 100, optimalNotePt: "Padrão ouro de prevenção no futebol moderno" },
        },
        interpretationPt:
          "Lesão de posterior de coxa é a #1 em afastamento no futebol; consistência semanal tem o maior retorno preventivo.",
        scientificRefIds: ["petersen_2011", "stolen_2005"],
      },
      {
        key: "sprint_30m_time_sec",
        labelPt: "Velocidade de Sprint (20–30 m)",
        shortLabelPt: "Sprint 30m",
        unit: "s",
        direction: "lower_is_better",
        cadence: "mesocycle",
        isPrimaryGoalMetric: false,
        formulaExpression: "best_30m_sprint_time_sec",
        formulaDescriptionPt:
          "Melhor marca de sprint linear em 30 metros (campo/grama), avaliando aceleração e velocidade de pico.",
        requiredInputs: ["test.sprint30mSec"],
        experienceRanges: {
          beginner: { min: 4.6, max: 5.3, optimalNotePt: "Progredir exposição a sprints máximos gradualmente" },
          intermediate: { min: 4.25, max: 4.65, optimalNotePt: "Combinar força de membros inferiores + técnica de corrida" },
          advanced: { min: 4.0, max: 4.3, optimalNotePt: "Alta velocidade exige manutenção semanal de 1–2 sprints >90%" },
          competitive: { min: 3.75, max: 4.05, optimalNotePt: "Nível competitivo de campo" },
        },
        interpretationPt:
          "Exposição semanal controlada a sprints rápidos atua também como proteção mecânica para os isquiotibiais.",
        scientificRefIds: ["stolen_2005", "petersen_2011"],
      },
    ],
    complementaryStrength: {
      role: "complementary_support",
      objectiveHeadlinePt:
        "Força de Pernas, Proteção Excêntrica de Posteriores (Nordic −71% Lesões) e Potência de Sprint",
      physiologicalTransferPt:
        "A musculação complementar no futebol aumenta a produção de força horizontal/vertical para sprints e disputas de corpo, enquanto protocolos excêntricos (Nordic Hamstring + adutores Copenhagen) reduzem em até 71% lesões agudas de isquiotibiais (Petersen et al., 2011; Stølen et al., 2005).",
      recommendedFrequencyPerWeek: {
        beginner: { min: 2, max: 2 },
        intermediate: { min: 2, max: 2 },
        advanced: { min: 2, max: 2 },
        competitive: { min: 1, max: 2 },
      },
      targetCapacities: [
        "eccentric_hamstring_protection",
        "maximal_strength",
        "explosive_power",
        "core_transfer",
        "joint_durability",
      ],
      priorityExerciseCategories: ["pernas", "pliometria", "core", "mobilidade"],
      intensityPrescriptionPt:
        "Agachamento/trap bar/búlgaro (3–4×4–6 reps RIR 2, subida explosiva) + Nordic Hamstring (2–3×5–8 reps progressivas) + Copenhagen adutor + core anti-rotação.",
      volumePrescriptionPt:
        "Alocar força pesada longe do jogo (ex.: MD-4 ou MD-3; manutenção leve em MD-2 apenas se avançado), mantendo volume enxuto em temporada.",
      minSeparationHoursFromMainModality: 48,
      separationRationalePt:
        "Em microciclo de futebol, musculação pesada de membros inferiores deve ficar >=48h antes da partida (MD) para dissipar DOMS e preservar velocidade de sprint (Schumann et al., 2022).",
      avoidanceRulesPt: [
        "Nunca prescrever treino exaustivo de pernas em MD-1 ou MD-2 (véspera de partida)",
        "Evitar semanas sem exposição a velocidade alta seguidas de jogo de 90 min (pico de risco para posteriores)",
      ],
      expectedKpiImpacts: [
        {
          kpiKey: "hamstring_eccentric_prehab_pct",
          expectedMechanismPt: "Alongamento fascicular e força excêntrica dos isquiotibiais reduzem drasticamente estiramentos (Petersen et al., 2011)",
        },
        {
          kpiKey: "sprint_30m_time_sec",
          expectedMechanismPt: "Maior força relativa de membros inferiores melhora impulso inicial e velocidade de pico (Stølen et al., 2005)",
        },
      ],
      scientificRefIds: ["petersen_2011", "stolen_2005", "schumann_2022", "markovic_2007"],
    },
    sessionArchetypes: [
      {
        code: "football_match_day",
        labelPt: "Partida / Coletivo de Campo (MD)",
        shortLabelPt: "Jogo Campo",
        primaryCapacity: "repeated_sprint_ability",
        targetZone: "Alta Velocidade / Jogo (MD)",
        typicalDurationMin: { min: 70, max: 105 },
        typicalRpe: { min: 8, max: 9.5 },
        applicablePhases: ["build", "peak", "constancy"],
        purposePt: "Demanda real de 90 min com volume intermitente e sprints de alta velocidade.",
        usesStructuredRoutine: false,
      },
      {
        code: "football_intermittent_conditioning",
        labelPt: "Treino de Campo & Condicionamento Intermitente",
        shortLabelPt: "Campo / Interm.",
        primaryCapacity: "aerobic_base",
        targetZone: "Aeróbico Intermitente",
        typicalDurationMin: { min: 60, max: 85 },
        typicalRpe: { min: 6.5, max: 8 },
        applicablePhases: ["base", "build", "peak", "constancy"],
        purposePt: "Desenvolver Yo-Yo IR1, jogos reduzidos e mecânica de sprint controlado.",
        usesStructuredRoutine: false,
      },
      {
        code: "football_strength_nordic",
        labelPt: "Força de Pernas & Blindagem Excêntrica (MD-4/MD-3)",
        shortLabelPt: "Força & Nordic",
        primaryCapacity: "eccentric_hamstring_protection",
        targetZone: "RIR 2 · Força + Excêntrico",
        typicalDurationMin: { min: 40, max: 55 },
        typicalRpe: { min: 7, max: 8 },
        applicablePhases: ["base", "build", "peak", "constancy"],
        purposePt: "Elevar potência de aceleração e blindar isquiotibiais/adutores longe do dia do jogo.",
        usesStructuredRoutine: true,
      },
      {
        code: "football_recovery_md1",
        labelPt: "Regenerativo Pós-Jogo & Mobilidade (MD+1)",
        shortLabelPt: "Regenerativo",
        primaryCapacity: "recovery_mobility",
        targetZone: "Regenerativo / Técnico",
        typicalDurationMin: { min: 25, max: 40 },
        typicalRpe: { min: 2.5, max: 4 },
        applicablePhases: ["base", "build", "peak", "taper", "deload", "constancy"],
        purposePt: "Acelerar recuperação muscular nas 24–48h após a partida.",
        usesStructuredRoutine: false,
      },
    ],
    periodizationPhases: [
      {
        phase: "base",
        labelPt: "Pré-Temporada / Base Aeróbica & Força",
        shareOfMacrocyclePct: 35,
        volumeMultiplier: 1.0,
        intensityFocusPt: "Base intermitente + força 2×/sem + introdução Nordic",
        directivePt: "Construir tolerância a quilometragem de campo e força excêntrica de cadeia posterior.",
      },
      {
        phase: "build",
        labelPt: "Transição para Alta Velocidade & Jogos",
        shareOfMacrocyclePct: 40,
        volumeMultiplier: 1.08,
        intensityFocusPt: "Jogos reduzidos + sprints controlados + força explosiva",
        directivePt: "Elevar capacidade de repetir sprints sem queda no 2º tempo.",
      },
      {
        phase: "peak",
        labelPt: "Temporada Competitiva (Microciclo MD)",
        shareOfMacrocyclePct: 15,
        volumeMultiplier: 0.92,
        intensityFocusPt: "Manutenção de força em MD-3 + frescor em MD-1",
        directivePt: "Equilibrar jogos semanais mantendo prevenção excêntrica ativa.",
      },
      {
        phase: "taper",
        labelPt: "Polimento para Finais / Fase Decisiva",
        shareOfMacrocyclePct: 10,
        volumeMultiplier: 0.55,
        intensityFocusPt: "Volume -45%, ativação curta de velocidade",
        directivePt: "Maximizar reserva de EA e frescor muscular para o jogo decisivo.",
      },
    ],
    safetyGuardrails: {
      maxWeeklyVolumeJumpPct: 15,
      maxWeeklyMonotony: 2.0,
      acwrAdvisoryRange: { min: 0.8, max: 1.3 },
      acwrCautionNotePt:
        "No futebol, monitorar distância/carga de jogo junto ao intervalo entre partidas (<72h eleva fadiga residual); ACWR é sinal auxiliar.",
      deloadFrequencyWeeks: 4,
      modalitySpecificAlertsPt: [
        "Manter musculação pesada de pernas >=48h antes da partida (MD)",
        "Cumprir protocolo excêntrico de posteriores semanalmente para prevenção (Petersen et al., 2011)",
        "Partidas com intervalo <72h exigem corte imediato de volume acessório",
      ],
      scientificRefIds: ["stolen_2005", "petersen_2011", "schumann_2022", "kellmann_2018"],
    },
    scientificRefIds: ["stolen_2005", "petersen_2011", "foster_2001", "schumann_2022", "bosquet_2007"],
  },

  // =========================================================================
  // 9. LUTAS & ARTES MARCIAIS (GRAPPLING / JIU-JITSU, STRIKING & MMA)
  // =========================================================================
  martial_arts: {
    code: "martial_arts",
    namePt: "Lutas & Artes Marciais",
    shortNamePt: "Lutas",
    category: "combat",
    systemicLoadFactor: 1.15,
    summaryPt:
      "Esportes de combate (Jiu-Jitsu/Grappling, Judô, Boxe, Muay Thai e MMA) combinam altíssima demanda anaeróbica por rounds, força máxima e resistência de pegada/puxada (grappling) ou potência rotacional/balística (striking), exigindo controle rigoroso do volume de sparring intenso.",
    primaryCapacities: [
      "anaerobic_combat_capacity",
      "maximal_strength",
      "explosive_power",
      "grip_isometric_endurance",
      "joint_durability",
    ],
    goalExamplesPt: [
      "Sustentar ritmo intenso por 5 rounds (ou lutas de 6–10 min no BJJ) sem 'morrer no gás'",
      "Aumentar força máxima relativa (puxada/quadril) e resistência de pegada no tatame",
      "Chegar ao campeonato no peso e com pico de potência sem overreaching de sparring",
    ],
    casualActivityPolicyPt:
      "Treino recreativo de luta/boxe de quem foca em outra modalidade entra como atividade casual: soma alto custo sistêmico (fator 1,15) na EA/sRPE sem criar camp competitivo.",
    intensityZones: [
      {
        zone: "Drills / Técnico",
        labelPt: "Drills, Posições, Sombra & Manopla Técnica",
        anchorMetric: "srpe",
        rangeLabel: "RPE 4–6 · Baixo desgaste articular",
        physiologicalTargetPt: "Aquisição motora, eficiência técnica e economia de energia em combate.",
      },
      {
        zone: "Específico / Condicionamento de Rounds",
        labelPt: "Sparring Condicionado, Saco Pesado & Posicional",
        anchorMetric: "srpe",
        rangeLabel: "RPE 7–8 · Ritmo de round controlado",
        physiologicalTargetPt: "Capacidade anaeróbica lática/alática e transição técnica sob fadiga controlada.",
      },
      {
        zone: "Sparring Intenso / Rola Competitivo",
        labelPt: "Sparring Duro / Simulação de Luta",
        anchorMetric: "srpe",
        rangeLabel: "RPE 8,5–10 · Máxima carga sistêmica e neural",
        physiologicalTargetPt: "Testar estratégia sob pressão real; dosar para evitar lesões e fadiga crônica.",
      },
    ],
    kpis: [
      {
        key: "weekly_mat_load_ua",
        labelPt: "Carga Semanal de Tatame / Ringue (sRPE)",
        shortLabelPt: "Carga Tatame",
        unit: "UA/sem",
        direction: "target_band",
        cadence: "weekly",
        isPrimaryGoalMetric: true,
        formulaExpression: "SUM(duration_min * rpe * 1.15) OVER last_7_days WHERE modality = 'martial_arts'",
        formulaDescriptionPt:
          "Carga interna ponderada pelo fator sistêmico de combate (1,15), integrando isometrias de pegada, impacto e estresse adrenérgico.",
        requiredInputs: ["session.durationMinutes", "session.rpe"],
        experienceRanges: {
          beginner: { min: 550, max: 1200, optimalNotePt: "2–3 treinos/sem priorizando drills e técnica" },
          intermediate: { min: 1100, max: 2100, optimalNotePt: "3–5 treinos/sem mesclando drills e sparring" },
          advanced: { min: 1900, max: 3200, optimalNotePt: "4–6 treinos/sem com 2× força complementar bem dosada" },
          competitive: { min: 2800, max: 4600, optimalNotePt: "Camp estruturado com polimento pré-luta de 10–14 dias" },
        },
        interpretationPt:
          "Permite enxergar quando o volume de rolas/sparrings está drenando a reserva de EA e pedindo redução na academia.",
        scientificRefIds: ["franchini_2011", "james_2016", "foster_2001"],
      },
      {
        key: "relative_pull_hinge_strength",
        labelPt: "Força Relativa de Puxada & Quadril",
        shortLabelPt: "Força Relativa",
        unit: "×PC",
        direction: "higher_is_better",
        cadence: "mesocycle",
        isPrimaryGoalMetric: true,
        formulaExpression: "e1RM_key_compound_kg / body_weight_kg  [ex.: Terra / Agachamento / Barra com lastro]",
        formulaDescriptionPt:
          "Força estimada nos padrões fundamentais (terra/agachamento e puxada) dividida pelo peso corporal — diferenciador primário em esportes de combate (James et al., 2016).",
        requiredInputs: ["test.e1rmKg", "athlete.bodyWeightKg"],
        experienceRanges: {
          beginner: { min: 1.0, max: 1.35, optimalNotePt: "Construir base estrutural de quadril, costas e ombros" },
          intermediate: { min: 1.35, max: 1.75, optimalNotePt: "Boa vantagem mecânica em quedas, clinch e base" },
          advanced: { min: 1.75, max: 2.1, optimalNotePt: "Alta força relativa sem ganho excessivo de peso" },
          competitive: { min: 2.0, max: 2.5, optimalNotePt: "Nível de força competitiva — priorizar potência/velocidade" },
        },
        interpretationPt:
          "Em modalidades por categoria de peso, evoluir força relativa vale mais do que hipertrofia descontrolada.",
        scientificRefIds: ["james_2016", "franchini_2011"],
      },
      {
        key: "weekly_hard_sparring_sessions",
        labelPt: "Sessões Semanais de Sparring / Rola Duro (RPE ≥ 8,5)",
        shortLabelPt: "Sparring Duro",
        unit: "sessões/sem",
        direction: "target_band",
        cadence: "weekly",
        isPrimaryGoalMetric: false,
        formulaExpression: "COUNT(sessions WHERE modality = 'martial_arts' AND rpe >= 8.5) OVER last_7_days",
        formulaDescriptionPt:
          "Controle de exposição semanal a combates/rolas em intensidade máxima para prevenir lesões articulares e esgotamento neural.",
        requiredInputs: ["session.rpe"],
        experienceRanges: {
          beginner: { min: 0, max: 1, optimalNotePt: "Foco em técnica e rolas posicionais controlados" },
          intermediate: { min: 1, max: 2, optimalNotePt: "1–2 dias duros bem espaçados por drills leves" },
          advanced: { min: 2, max: 3, optimalNotePt: "Máximo 3 sessões duras/sem; acima disso sobe risco de lesão" },
          competitive: { min: 2, max: 3, optimalNotePt: "Reduzir para 0–1 na semana de luta (taper)" },
        },
        interpretationPt:
          "Fazer sparring máximo todos os dias estagna aprendizado técnico, aumenta monotonia e multiplica lesões.",
        scientificRefIds: ["foster_1998", "james_2016", "kellmann_2018"],
      },
      {
        key: "anaerobic_round_repeatability",
        labelPt: "Capacidade Anaeróbica de Rounds (Sustentação)",
        shortLabelPt: "Gás / Rounds",
        unit: "rounds",
        direction: "higher_is_better",
        cadence: "mesocycle",
        isPrimaryGoalMetric: false,
        formulaExpression: "completed_target_intensity_rounds_without_rpe_collapse",
        formulaDescriptionPt:
          "Número de rounds padrão (3–5 min com 1 min pausa) sustentados em ritmo competitivo sem queda brusca de rendimento.",
        requiredInputs: ["session.completedRounds", "session.rpe"],
        experienceRanges: {
          beginner: { min: 2, max: 4, optimalNotePt: "Construir controle respiratório sob pressão" },
          intermediate: { min: 4, max: 6, optimalNotePt: "Suporta maioria das lutas/rolas recreativos e amadores" },
          advanced: { min: 6, max: 8, optimalNotePt: "Alta recuperação entre rounds (base aeróbica + anaeróbica)" },
          competitive: { min: 8, max: 12, optimalNotePt: "Sobra fisiológica acima da duração oficial do combate" },
        },
        interpretationPt:
          "Integra a resistência de pegada/isometria (grappling) e explosão repetida (striking) ao condicionamento real.",
        scientificRefIds: ["franchini_2011", "james_2016"],
      },
    ],
    complementaryStrength: {
      role: "complementary_support",
      objectiveHeadlinePt:
        "Força Máxima Relativa, Potência Rotacional/Explosiva, Pegada e Blindagem Articular",
      physiologicalTransferPt:
        "Segundo James et al. (2016) e Franchini et al. (2011), a musculação complementar em lutas deve entregar força máxima de baixo volume (sem hipertrofia indesejada de categoria) para grappling, potência balística/rotacional (arremessos de med ball, saltos, puxadas explosivas) para striking, e resistência isométrica de pegada, core e ombros/pescoço para proteção no tatame.",
      recommendedFrequencyPerWeek: {
        beginner: { min: 2, max: 2 },
        intermediate: { min: 2, max: 2 },
        advanced: { min: 2, max: 3 },
        competitive: { min: 2, max: 3 },
      },
      targetCapacities: [
        "maximal_strength",
        "explosive_power",
        "grip_isometric_endurance",
        "core_transfer",
        "joint_durability",
      ],
      priorityExerciseCategories: ["costas", "pernas", "core", "pliometria", "ombros", "bracos"],
      intensityPrescriptionPt:
        "Compostos pesados de baixo volume (terra/trap bar, barra fixa, remada, supino/landmine 3–4×3–6 reps RIR 2) + potência rotacional (med ball/kettlebell) + isometria de pegada e estabilidade de ombro/core.",
      volumePrescriptionPt:
        "Sessões enxutas de 40–50 min; nunca esgotar o atleta na academia a ponto de comprometer a técnica ou segurança no sparring.",
      minSeparationHoursFromMainModality: 6,
      separationRationalePt:
        "Separar força/potência em >=6h (ou dias distintos de sparring duro) preserva velocidade de golpe/queda e evita interferência sobre força explosiva (Schumann et al., 2022).",
      avoidanceRulesPt: [
        "Evitar fichas de hipertrofia de altíssimo volume ('bodybuilding até a falha') que geram DOMS limitante no tatame",
        "Não fazer fadiga extrema de antebraço/pegada imediatamente antes de treino de Jiu-Jitsu/Judô",
        "Cortar volume de força em ~50% nas 10–14 dias pré-competição (taper)",
      ],
      expectedKpiImpacts: [
        {
          kpiKey: "relative_pull_hinge_strength",
          expectedMechanismPt: "Aumenta força máxima sem excesso de massa corporal, deslocando para cima a curva força-velocidade (James et al., 2016)",
        },
        {
          kpiKey: "anaerobic_round_repeatability",
          expectedMechanismPt: "Maior reserva de força reduz o custo relativo de cada pegada, clinch e golpe (Franchini et al., 2011)",
        },
      ],
      scientificRefIds: ["james_2016", "franchini_2011", "schumann_2022", "cools_2015"],
    },
    sessionArchetypes: [
      {
        code: "combat_drills_technical",
        labelPt: "Drills Técnicos & Posicional (Tatame/Ringue)",
        shortLabelPt: "Drills Técnico",
        primaryCapacity: "technical_efficiency",
        targetZone: "Drills / Técnico",
        typicalDurationMin: { min: 60, max: 90 },
        typicalRpe: { min: 4.5, max: 6.5 },
        applicablePhases: ["base", "build", "peak", "taper", "constancy"],
        purposePt: "Refinar entradas, defesas e economia de movimento sem drenar EA.",
        usesStructuredRoutine: false,
      },
      {
        code: "combat_sparring_rounds",
        labelPt: "Sparring / Rola Competitivo por Rounds",
        shortLabelPt: "Sparring / Rola",
        primaryCapacity: "anaerobic_combat_capacity",
        targetZone: "Sparring Intenso / Rola Competitivo",
        typicalDurationMin: { min: 60, max: 90 },
        typicalRpe: { min: 8, max: 9.5 },
        applicablePhases: ["build", "peak", "constancy"],
        purposePt: "Simular ritmo de luta e testar tomada de decisão sob alta fadiga anaeróbica.",
        usesStructuredRoutine: false,
      },
      {
        code: "combat_strength_power",
        labelPt: "Força Relativa, Potência & Pegada (S&C)",
        shortLabelPt: "Força & Potência",
        primaryCapacity: "maximal_strength",
        targetZone: "RIR 2 · Força & Balístico",
        typicalDurationMin: { min: 40, max: 50 },
        typicalRpe: { min: 7, max: 8 },
        applicablePhases: ["base", "build", "peak", "constancy"],
        purposePt: "Construir força de quadril/puxada, potência rotacional e blindagem articular sem DOMS excessivo.",
        usesStructuredRoutine: true,
      },
    ],
    periodizationPhases: [
      {
        phase: "base",
        labelPt: "Base de Força, Pegada & Aeróbico (Off-Camp)",
        shareOfMacrocyclePct: 35,
        volumeMultiplier: 0.95,
        intensityFocusPt: "Força máxima 2–3×/sem + drills + Z2",
        directivePt: "Elevar teto de força relativa e base aeróbica para acelerar recuperação entre rounds.",
      },
      {
        phase: "build",
        labelPt: "Camp: Potência & Capacidade Anaeróbica",
        shareOfMacrocyclePct: 40,
        volumeMultiplier: 1.1,
        intensityFocusPt: "Potência balística + 2–3 sparrings estruturados",
        directivePt: "Converter força em explosão específica e resistência de rounds.",
      },
      {
        phase: "peak",
        labelPt: "Simulação de Luta & Ritmo",
        shareOfMacrocyclePct: 15,
        volumeMultiplier: 0.9,
        intensityFocusPt: "Rounds específicos + manutenção rápida de potência",
        directivePt: "Ajustar tática e controle de peso sem sobrecarregar sistema nervoso.",
      },
      {
        phase: "taper",
        labelPt: "Polimento Pré-Luta (Fight Week)",
        shareOfMacrocyclePct: 10,
        volumeMultiplier: 0.45,
        intensityFocusPt: "Volume -55%, drills rápidos, zero sparring duro",
        directivePt: "Dissipar fadiga de camp e proteger contra lesões de última hora (Bosquet et al., 2007).",
      },
    ],
    safetyGuardrails: {
      maxWeeklyVolumeJumpPct: 15,
      maxWeeklyMonotony: 2.0,
      acwrAdvisoryRange: { min: 0.8, max: 1.3 },
      acwrCautionNotePt:
        "Cruzar carga de tatame (sRPE) com número de sessões de sparring duro e qualidade do sono; ACWR é indicador auxiliar.",
      deloadFrequencyWeeks: 4,
      modalitySpecificAlertsPt: [
        "Limitar sparring/rola máximo (RPE ≥ 8,5) a no máximo 3 sessões por semana",
        "Evitar musculação até a falha muscular em semanas de alto volume de tatame",
        "Em semanas de corte de peso, reduzir imediatamente o volume de S&C para preservar EA",
      ],
      scientificRefIds: ["james_2016", "franchini_2011", "foster_1998", "bosquet_2007"],
    },
    scientificRefIds: ["james_2016", "franchini_2011", "foster_2001", "schumann_2022", "bosquet_2007"],
  },

  // =========================================================================
  // 10. CALISTENIA (FORÇA RELATIVA, PESO CORPORAL & HABILIDADES GINÁSTICAS)
  // =========================================================================
  calisthenics: {
    code: "calisthenics",
    namePt: "Calistenia (Força Relativa & Skills)",
    shortNamePt: "Calistenia",
    category: "resistance",
    systemicLoadFactor: 1.0,
    summaryPt:
      "Treinamento de força relativa e domínio corporal baseado em progressões sistemáticas de alavanca (barra fixa, paralelas, flexões avançadas, isometrias e skills ginásticas), exigindo equilíbrio entre tensão muscular e adaptação mais lenta dos tendões de cotovelo, ombro e punho.",
    primaryCapacities: [
      "relative_strength_skill",
      "maximal_strength",
      "hypertrophy",
      "core_transfer",
      "joint_durability",
    ],
    goalExamplesPt: [
      "Desbloquear primeira Barra Fixa estrita, Muscle-Up, Handstand ou Front Lever",
      "Evoluir de 6 para 15 barras fixas / paralelas estritas ou avançar para calistenia com lastro",
      "Manter 10–16 séries semanais por padrão (puxar/empurrar/pernas/core) protegendo cotovelos e ombros",
    ],
    casualActivityPolicyPt:
      "Sessão solta de peso corporal em viagem/parque de quem tem outra modalidade principal entra como atividade casual: contabiliza carga e consistência sem abrir árvore de skills.",
    intensityZones: [
      {
        zone: "Skill / Controle Motor",
        labelPt: "Equilíbrio, Handstand & Técnica Fresca",
        anchorMetric: "rir_rpe",
        rangeLabel: "RIR 4+ · RPE 4–6 (sem fadiga)",
        physiologicalTargetPt: "Aprendizado neural de skills (handstand, L-sit, transições) no início da sessão com SNC fresco.",
      },
      {
        zone: "Força de Alavanca / Lastro",
        labelPt: "Progressões Pesadas & Isometrias de Força",
        anchorMetric: "rir_rpe",
        rangeLabel: "3–6 reps ou 5–12s isometria · RIR 1–2",
        physiologicalTargetPt: "Aumentar força relativa máxima via alavanca mais difícil ou carga externa (weighted) (Kotarsky et al., 2018).",
        recommendedWeeklySharePct: { min: 25, max: 40 },
      },
      {
        zone: "Hipertrofia & Base Estrutural",
        labelPt: "Séries de Trabalho em Padrões Básicos",
        anchorMetric: "rir_rpe",
        rangeLabel: "6–15 reps · RIR 2–3 (RPE 7–8)",
        physiologicalTargetPt: "Construir massa muscular útil e resistência tendínea em puxar, empurrar e pernas (Schoenfeld et al., 2017).",
        recommendedWeeklySharePct: { min: 50, max: 65 },
      },
    ],
    kpis: [
      {
        key: "anchor_strict_reps_pull_push",
        labelPt: "Repetições Estritas nos Básicos (Barra Fixa & Paralelas)",
        shortLabelPt: "Barra / Dip",
        unit: "reps",
        direction: "higher_is_better",
        cadence: "mesocycle",
        isPrimaryGoalMetric: true,
        formulaExpression: "max_strict_reps(pullup_or_dip_at_current_progression)",
        formulaDescriptionPt:
          "Número máximo de repetições estritas com amplitude completa em barra fixa e paralelas (ou nível equivalente de progressão de alavanca).",
        requiredInputs: ["test.strictPullupReps", "test.strictDipReps"],
        experienceRanges: {
          beginner: { min: 1, max: 6, optimalNotePt: "1–6 barras fixas estritas (ou remada australiana/negativas)" },
          intermediate: { min: 7, max: 14, optimalNotePt: "7–14 barras fixas estritas — pronto para lastro ou alavancas" },
          advanced: { min: 15, max: 22, optimalNotePt: "15+ barras estritas ou +25–40% PC de lastro" },
          competitive: { min: 22, max: 35, optimalNotePt: "Alto domínio relativo (street lifting / freestyle)" },
        },
        interpretationPt:
          "Quando ultrapassa o teto de repetições com forma limpa, progredir alavanca ou adicionar lastro garante sobrecarga contínua (Kotarsky et al., 2018).",
        scientificRefIds: ["kotarsky_2018", "acsm_2009"],
      },
      {
        key: "weekly_pattern_effective_sets",
        labelPt: "Séries Efetivas Semanais por Padrão (Puxar/Empurrar/Pernas)",
        shortLabelPt: "Séries/Padrão",
        unit: "séries/sem",
        direction: "target_band",
        cadence: "weekly",
        isPrimaryGoalMetric: true,
        formulaExpression: "SUM(effective_sets) GROUP BY movement_pattern (push, pull, legs, core)",
        formulaDescriptionPt:
          "Volume efetivo semanal equilibrado entre puxar vertical/horizontal, empurrar vertical/horizontal, pernas e core.",
        requiredInputs: ["set_logs.setType", "set_logs.rir", "exercise.category"],
        experienceRanges: {
          beginner: { min: 6, max: 10, optimalNotePt: "Priorizar adaptação tendínea (cotovelo/ombro/punho)" },
          intermediate: { min: 10, max: 15, optimalNotePt: "Manter razão próxima de 1:1 entre puxar e empurrar" },
          advanced: { min: 12, max: 18, optimalNotePt: "Contabilizar isometrias pesadas no teto de volume tendíneo" },
          competitive: { min: 14, max: 20, optimalNotePt: "Ciclar blocos de skill/isometria com deload a cada 4–5 sem" },
        },
        interpretationPt:
          "Equilíbrio entre puxar e empurrar evita desequilíbrios escapulares e epicondilite.",
        scientificRefIds: ["schoenfeld_2017", "helms_2016", "cools_2015"],
      },
      {
        key: "skill_progression_hold_or_level",
        labelPt: "Sustentação / Nível de Skill Alvo (Isometria)",
        shortLabelPt: "Skill / Hold",
        unit: "s",
        direction: "higher_is_better",
        cadence: "mesocycle",
        isPrimaryGoalMetric: false,
        formulaExpression: "clean_hold_seconds(target_skill_progression)",
        formulaDescriptionPt:
          "Tempo de sustentação limpa (em segundos) na progressão atual da habilidade alvo (ex.: L-sit, Handstand, Tuck Front Lever, Planche lean).",
        requiredInputs: ["test.skillHoldSeconds", "test.skillLevel"],
        experienceRanges: {
          beginner: { min: 8, max: 20, optimalNotePt: "Consolidar 15–20s limpos antes de avançar alavanca" },
          intermediate: { min: 10, max: 25, optimalNotePt: "Acumular 30–60s totais por sessão em séries curtas (6–12s)" },
          advanced: { min: 10, max: 30, optimalNotePt: "Alavancas avançadas exigem aquecimento rigoroso de punho/bíceps" },
          competitive: { min: 12, max: 40, optimalNotePt: "Alta força isométrica específica e linha corporal impecável" },
        },
        interpretationPt:
          "Aumentar tempo sob tensão limpa na mesma progressão sinaliza prontidão muscular e tendínea para avançar o nível.",
        scientificRefIds: ["kotarsky_2018", "helms_2016"],
      },
    ],
    complementaryStrength: {
      role: "complementary_support",
      objectiveHeadlinePt:
        "Sobrecarga Externa (Lastro / Pernas Pesadas) e Blindagem de Cotovelo, Punho e Escápula",
      physiologicalTransferPt:
        "Embora a calistenia progressiva gere ganhos de força equivalentes a pesos livres no tronco (Kotarsky et al., 2018), a musculação complementar preenche duas lacunas cruciais: sobrecarga pesada de membros inferiores (agachamento/RDL, onde peso corporal puro tem teto baixo) e adição mensurável de lastro (+kg em barra fixa/paralelas) além de acessórios isolados de manguito, escápula e bíceps distal para proteger tendões.",
      recommendedFrequencyPerWeek: {
        beginner: { min: 1, max: 2 },
        intermediate: { min: 1, max: 2 },
        advanced: { min: 1, max: 2 },
        competitive: { min: 1, max: 2 },
      },
      targetCapacities: ["maximal_strength", "joint_durability", "shoulder_prehab", "hypertrophy"],
      priorityExerciseCategories: ["pernas", "ombros", "costas", "bracos", "mobilidade"],
      intensityPrescriptionPt:
        "Pernas pesadas (agachamento/RDL/búlgaro 3–4×5–8 reps RIR 2) + calistenia com lastro (barra fixa/dip com cinto) + pré-hab de punhos, rotadores externos e condicionamento excêntrico de cotovelo.",
      volumePrescriptionPt:
        "1–2 sessões/sem integradas à rotina de calistenia para não exceder o teto semanal de séries de tronco.",
      minSeparationHoursFromMainModality: 24,
      separationRationalePt:
        "Separar sessões pesadas de braço reto/isometrias (planche/front lever) por >=24–48h protege tendões de cotovelo e ombro que recuperam mais devagar que o tecido muscular.",
      avoidanceRulesPt: [
        "Não pular etapas de alavanca (ex.: ir direto para braço reto avançado sem base de tendão) — alto risco de epicondilite/tendinite bicipital",
        "Não negligenciar membros inferiores por treinar apenas peso corporal",
      ],
      expectedKpiImpacts: [
        {
          kpiKey: "anchor_strict_reps_pull_push",
          expectedMechanismPt: "Séries com lastro elevam força máxima de puxar/empurrar, multiplicando repetições com peso corporal",
        },
        {
          kpiKey: "skill_progression_hold_or_level",
          expectedMechanismPt: "Acessórios de escápula, core e tendões sustentam progressões de alavanca sem dor articular",
        },
      ],
      scientificRefIds: ["kotarsky_2018", "schoenfeld_2017", "cools_2015", "acsm_2009"],
    },
    sessionArchetypes: [
      {
        code: "calis_skill_strength",
        labelPt: "Skills + Força de Alavanca / Lastro",
        shortLabelPt: "Skills & Força",
        primaryCapacity: "relative_strength_skill",
        targetZone: "Força de Alavanca / Lastro",
        typicalDurationMin: { min: 45, max: 70 },
        typicalRpe: { min: 7, max: 8.5 },
        applicablePhases: ["base", "build", "peak", "constancy"],
        purposePt: "Praticar habilidade técnica com SNC fresco seguida de séries pesadas de alavanca ou lastro.",
        usesStructuredRoutine: true,
      },
      {
        code: "calis_hypertrophy_basics",
        labelPt: "Volume nos Básicos (Puxar, Empurrar & Core)",
        shortLabelPt: "Básicos Volume",
        primaryCapacity: "hypertrophy",
        targetZone: "Hipertrofia & Base Estrutural",
        typicalDurationMin: { min: 45, max: 65 },
        typicalRpe: { min: 7, max: 8 },
        applicablePhases: ["base", "build", "constancy"],
        purposePt: "Acumular séries efetivas limpas para construir massa muscular útil e lastro tendíneo.",
        usesStructuredRoutine: true,
      },
      {
        code: "calis_lower_mobility",
        labelPt: "Pernas, Mobilidade & Blindagem Tendínea",
        shortLabelPt: "Pernas & Tendões",
        primaryCapacity: "joint_durability",
        targetZone: "RIR 2–3 · Controle Completo",
        typicalDurationMin: { min: 40, max: 55 },
        typicalRpe: { min: 6.5, max: 7.5 },
        applicablePhases: ["base", "build", "peak", "deload", "constancy"],
        purposePt: "Desenvolver membros inferiores (unilateral/sobrecarga) e proteger punhos, cotovelos e ombros.",
        usesStructuredRoutine: true,
      },
    ],
    periodizationPhases: [
      {
        phase: "base",
        labelPt: "Base Estrutural, Básicos & Tendões",
        shareOfMacrocyclePct: 35,
        volumeMultiplier: 0.95,
        intensityFocusPt: "Básicos RIR 2–3 + condicionamento articular",
        directivePt: "Consolidar amplitude total, escápula forte e resistência tendínea antes de alavancas pesadas.",
      },
      {
        phase: "build",
        labelPt: "Progressão de Alavanca & Lastro",
        shareOfMacrocyclePct: 40,
        volumeMultiplier: 1.08,
        intensityFocusPt: "Alavancas difíceis / lastro + volume nos básicos",
        directivePt: "Avançar sistematicamente o nível de alavanca ou carga mantendo RIR 1–2.",
      },
      {
        phase: "peak",
        labelPt: "Consolidação de Skill / Tomada de Marca",
        shareOfMacrocyclePct: 15,
        volumeMultiplier: 0.8,
        intensityFocusPt: "Baixo volume, tentativas limpas de skill/máximas",
        directivePt: "Testar novo patamar de repetições estritas ou tempo de sustentação da skill.",
      },
      {
        phase: "deload",
        labelPt: "Deload Tendíneo & Mobilidade",
        shareOfMacrocyclePct: 10,
        volumeMultiplier: 0.5,
        intensityFocusPt: "Sem isometrias máximas · mobilidade e básicos leves",
        directivePt: "Permitir remodelamento colágeno de cotovelos, punhos e ombros.",
      },
    ],
    safetyGuardrails: {
      maxWeeklyVolumeJumpPct: 15,
      maxWeeklyMonotony: 2.0,
      acwrAdvisoryRange: { min: 0.8, max: 1.3 },
      acwrCautionNotePt:
        "Na calistenia, tendões de cotovelo e ombro adaptam mais devagar que músculos; respeitar deloads a cada 4–5 semanas mesmo sentindo força muscular sobrando.",
      deloadFrequencyWeeks: 5,
      modalitySpecificAlertsPt: [
        "Respeitar >=48h entre sessões pesadas de braço reto / isometrias avançadas (planche, front lever, iron cross)",
        "Manter proporção equilibrada entre empurrar e puxar para proteção escapular (Cools et al., 2015)",
      ],
      scientificRefIds: ["kotarsky_2018", "schoenfeld_2017", "cools_2015", "acsm_2009"],
    },
    scientificRefIds: ["kotarsky_2018", "schoenfeld_2017", "helms_2016", "cools_2015", "acsm_2009"],
  },
};

/**
 * Resolve qualquer código de modalidade (core ou legado/alias) para sua especificação core.
 * Retorna `null` para modalidades puramente recreativas/sem perfil core na v1 (ex.: walking, other).
 */
export function resolveCoreModalityCode(
  code?: string | null
): CoreModalityCode | null {
  if (!code) return null;
  const normalized = code.trim().toLowerCase();
  if (normalized in MODALITY_ALIAS_MAP) {
    return MODALITY_ALIAS_MAP[normalized];
  }
  return null;
}

export function getModalitySpec(
  code?: string | null
): ModalityProfileSpec | null {
  const core = resolveCoreModalityCode(code);
  return core ? MODALITY_REGISTRY[core] : null;
}

export function listCoreModalities(): ModalityProfileSpec[] {
  return CORE_MODALITY_CODES.map((code) => MODALITY_REGISTRY[code]);
}

/**
 * Retorna o protocolo científico de fortalecimento complementar para a modalidade principal
 * e nível de experiência do atleta.
 */
export function getComplementaryStrengthGuidance(
  primaryModality: CoreModalityCode,
  experienceLevel: ExperienceLevel
): {
  protocol: ComplementaryStrengthProtocol;
  recommendedWeeklyFrequency: { min: number; max: number };
} {
  const spec = MODALITY_REGISTRY[primaryModality];
  return {
    protocol: spec.complementaryStrength,
    recommendedWeeklyFrequency:
      spec.complementaryStrength.recommendedFrequencyPerWeek[experienceLevel],
  };
}

/**
 * Classificação determinística entre:
 * - `serious`: sessão pertence à modalidade principal do atleta (alimenta KPIs da meta + carga + consistência)
 * - `complementary`: sessão pertence a uma modalidade complementar cadastrada (ex.: musculação para corredor;
 *   alimenta carga, consistência e transferência de fortalecimento, sem sobrescrever KPIs principais)
 * - `casual`: atividade solta (ex.: cardio leve, pedal no fim de semana, corrida recreativa fora do foco;
 *   alimenta carga sistêmica/EA e consistência, SEM poluir KPIs nem criar periodização daquela modalidade)
 */
export function classifyActivityForAthlete(input: {
  activityModalityCode?: string | null;
  athleteProfile: AthleteModalityProfile;
  explicitClass?: ActivityClass | null;
  linkedToPlannedSession?: boolean;
}): ActivityClassificationResult {
  const resolvedCore = resolveCoreModalityCode(input.activityModalityCode);

  if (input.explicitClass === "casual") {
    return {
      activityClass: "casual",
      resolvedCoreModality: resolvedCore,
      countsTowardPrimaryKpis: false,
      countsTowardSystemicLoadAndEa: true,
      countsTowardConsistencyStreak: true,
      rationalePt:
        "Marcada como atividade solta: soma na carga sistêmica (EA/sRPE) e na consistência, sem distorcer KPIs nem a periodização principal.",
    };
  }

  if (input.explicitClass === "complementary") {
    return {
      activityClass: "complementary",
      resolvedCoreModality: resolvedCore,
      countsTowardPrimaryKpis: false,
      countsTowardSystemicLoadAndEa: true,
      countsTowardConsistencyStreak: true,
      rationalePt:
        "Marcada como suporte complementar: contribui para transferência fisiológica (ex.: fortalecimento/pré-hab) e orçamento de carga/EA, mantendo o foco nos KPIs da modalidade principal.",
    };
  }

  if (
    resolvedCore &&
    (resolvedCore === input.athleteProfile.primaryModality ||
      input.explicitClass === "serious")
  ) {
    return {
      activityClass: "serious",
      resolvedCoreModality: resolvedCore,
      countsTowardPrimaryKpis: resolvedCore === input.athleteProfile.primaryModality,
      countsTowardSystemicLoadAndEa: true,
      countsTowardConsistencyStreak: true,
      rationalePt: `Sessão da modalidade principal (${MODALITY_REGISTRY[resolvedCore].shortNamePt}): atualiza KPIs da meta, curva de progresso e orçamento de recuperação.`,
    };
  }

  const isComplementary =
    (resolvedCore !== null &&
      input.athleteProfile.complementaryModalities.includes(resolvedCore)) ||
    (input.linkedToPlannedSession === true && resolvedCore === "strength");

  if (isComplementary) {
    return {
      activityClass: "complementary",
      resolvedCoreModality: resolvedCore,
      countsTowardPrimaryKpis: false,
      countsTowardSystemicLoadAndEa: true,
      countsTowardConsistencyStreak: true,
      rationalePt:
        "Sessão de suporte complementar: contribui para transferência fisiológica (ex.: fortalecimento) e orçamento de carga/EA, mantendo o foco nos KPIs da modalidade principal.",
    };
  }

  return {
    activityClass: "casual",
    resolvedCoreModality: resolvedCore,
    countsTowardPrimaryKpis: false,
    countsTowardSystemicLoadAndEa: true,
    countsTowardConsistencyStreak: true,
    rationalePt:
      "Atividade solta fora do foco principal: contabilizada no seu orçamento de recuperação (EA/sRPE) e consistência semanal sem gerar metas ou KPIs paralelos.",
  };
}

/**
 * Avalia guard-rails conservadores da Fase 0 para uma semana de treinamento da modalidade.
 */
export function evaluateWeeklySafetyGuardrails(
  input: GuardrailEvaluationInput
): GuardrailWarning[] {
  const spec = MODALITY_REGISTRY[input.modalityCode];
  const guard = spec.safetyGuardrails;
  const warnings: GuardrailWarning[] = [];

  // 1. Salto abrupto de volume semanal
  if (
    typeof input.previousWeekVolume === "number" &&
    input.previousWeekVolume > 0 &&
    typeof input.currentWeekVolume === "number"
  ) {
    const jumpPct =
      ((input.currentWeekVolume - input.previousWeekVolume) /
        input.previousWeekVolume) *
      100;
    if (jumpPct > guard.maxWeeklyVolumeJumpPct) {
      warnings.push({
        code: "weekly_volume_jump",
        severity: jumpPct > guard.maxWeeklyVolumeJumpPct * 1.5 ? "high" : "caution",
        titlePt: `Salto de volume semanal (+${Math.round(jumpPct)}%) acima do limite conservador`,
        detailPt: `Para ${spec.shortNamePt}, recomendamos progressão semanal de até +${guard.maxWeeklyVolumeJumpPct}% para reduzir risco de sobrecarga tecidual.`,
        scientificRefIds: guard.scientificRefIds,
      });
    }
  }

  // 2. Monotonia semanal (Foster, 1998)
  if (
    typeof input.weeklyMonotony === "number" &&
    input.weeklyMonotony > guard.maxWeeklyMonotony
  ) {
    warnings.push({
      code: "high_monotony",
      severity: input.weeklyMonotony > 2.5 ? "high" : "caution",
      titlePt: `Monotonia semanal elevada (${input.weeklyMonotony.toFixed(2)})`,
      detailPt:
        "Cargas muito parecidas todos os dias reduzem a supercompensação. Alterne dias fortes com sessões leves ou descanso ativo (Foster, 1998).",
      scientificRefIds: ["foster_1998", "kellmann_2018"],
    });
  }

  // 3. ACWR como sinal auxiliar (nunca diagnóstico isolado — Impellizzeri et al., 2020)
  if (typeof input.acwr === "number" && input.acwr > guard.acwrAdvisoryRange.max) {
    warnings.push({
      code: "acwr_elevated_advisory",
      severity: input.acwr > 1.5 ? "high" : "info",
      titlePt: `Carga aguda acima da sua média crônica (ACWR ${input.acwr.toFixed(2)})`,
      detailPt: guard.acwrCautionNotePt,
      scientificRefIds: ["gabbett_2016", "impellizzeri_2020"],
    });
  }

  // 4. Interferência concorrente de potência na mesma sessão (Schumann et al., 2022)
  if (input.sameSessionEnduranceAndPower) {
    warnings.push({
      code: "concurrent_power_interference",
      severity: "caution",
      titlePt: "Atenção à separação entre endurance e potência/força explosiva",
      detailPt:
        spec.complementaryStrength.separationRationalePt,
      scientificRefIds: ["schumann_2022"],
    });
  }

  // 5. Específico de Vôlei de Praia: excesso de saltos semanais
  if (
    input.modalityCode === "beach_volleyball" &&
    typeof input.weeklyJumpContacts === "number"
  ) {
    const level: ExperienceLevel = input.experienceLevel || "intermediate";
    const jumpKpi = spec.kpis.find((k) => k.key === "weekly_jump_contacts");
    const maxSafe = jumpKpi?.experienceRanges[level].max ?? 320;
    if (input.weeklyJumpContacts > maxSafe) {
      warnings.push({
        code: "excessive_jump_contacts",
        severity: input.weeklyJumpContacts > maxSafe * 1.25 ? "high" : "caution",
        titlePt: `Volume de saltos acima do teto semanal (${input.weeklyJumpContacts} > ${maxSafe})`,
        detailPt:
          "Reduza pliometria ou saltos máximos na areia nos próximos 2–3 dias para proteger o tendão patelar e manter altura de CMJ.",
        scientificRefIds: ["claudino_2017", "markovic_2007"],
      });
    }
  }

  // 6. Específico de Funcional: excesso de sessões em RPE >= 8
  if (
    input.modalityCode === "functional" &&
    typeof input.weeklyHighIntensitySharePct === "number" &&
    input.weeklyHighIntensitySharePct > 55
  ) {
    warnings.push({
      code: "excessive_high_rpe_share",
      severity: "caution",
      titlePt: `Alta concentração de sessões no limite (${Math.round(input.weeklyHighIntensitySharePct)}% com RPE ≥ 8)`,
      detailPt:
        "Intercale dias de força técnica controlada ou base aeróbica Z2 para sustentar ganhos sem burnout.",
      scientificRefIds: ["foster_1998", "kellmann_2018"],
    });
  }

  // 7. Específico de Lutas: excesso de sessões de sparring/rola duro (RPE >= 8.5)
  if (
    input.modalityCode === "martial_arts" &&
    typeof input.weeklyHardSparringSessions === "number" &&
    input.weeklyHardSparringSessions > 3
  ) {
    warnings.push({
      code: "excessive_hard_sparring",
      severity: input.weeklyHardSparringSessions >= 5 ? "high" : "caution",
      titlePt: `Excesso de sessões de sparring/rola duro (${input.weeklyHardSparringSessions}/sem)`,
      detailPt:
        "Mais de 3 sessões de combate máximo por semana eleva fadiga neural e risco articular. Troque 1–2 dias por drills técnicos ou posicionais controlados.",
      scientificRefIds: ["james_2016", "foster_1998", "kellmann_2018"],
    });
  }

  // 8. Específico de Futebol / Futsal: semanas com jogos sem prevenção excêntrica de posteriores
  if (
    (input.modalityCode === "football" || input.modalityCode === "futsal") &&
    typeof input.weeklyMatchesCount === "number" &&
    input.weeklyMatchesCount >= 2 &&
    typeof input.weeklyEccentricPrehabSessions === "number" &&
    input.weeklyEccentricPrehabSessions === 0
  ) {
    warnings.push({
      code: "missing_eccentric_hamstring_prehab",
      severity: "caution",
      titlePt: `Semana com ${input.weeklyMatchesCount} jogos sem prevenção excêntrica de posteriores`,
      detailPt:
        "Inclua ao menos 1–2 sessões curtas de excêntrico de isquiotibiais/adutores (Nordic/Copenhagen) longe do dia do jogo para reduzir em até 71% o risco de estiramento (Petersen et al., 2011).",
      scientificRefIds: ["petersen_2011", "stolen_2005", "naser_2017"],
    });
  }

  return warnings;
}

/**
 * Serializa o Registry v1 completo com metadados de versão para auditoria externa
 * (revisão por profissional de Educação Física) e ingestão nos seeds da Fase 1.
 */
export function buildModalityRegistrySnapshot() {
  return {
    schemaVersion: "1.1.0",
    phase: "Phase 0 — Scientific Foundation & Modality Registry",
    coreModalitiesCount: CORE_MODALITY_CODES.length,
    aliasMap: MODALITY_ALIAS_MAP,
    modalities: MODALITY_REGISTRY,
  };
}
