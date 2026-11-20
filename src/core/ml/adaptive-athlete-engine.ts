/**
 * Motor de Machine Learning Adaptativo Individual do Selye (§Fase 14+)
 * Inspirado na "Adaptation Energy" (Energia Adaptativa — EA) de Hans Selye (1938/1956).
 *
 * Em vez de assumir que todas as pessoas possuem uma reserva fixa igual de "UA",
 * este motor utiliza Aprendizado Online Bayesiano / Regressão Ridge Ponderada no Tempo (EW-RLS)
 * para aprender o perfil fisiológico único de cada usuário:
 *  1. Capacidade Adaptativa Pessoal (personalCapacityEa)
 *  2. Velocidade Individual de Regeneração (recoveryVelocityMultiplier — α_u)
 *  3. Sensibilidade Individual ao Sono e Atitudes Regenerativas (recoveryGainMultiplier — β_u)
 *  4. Eficiência Específica por Modalidade (Repeated Bout Effect — w_{m,u})
 *  5. Balanço Bidirecional: Atitudes que consomem (-EA) vs. Atitudes que aumentam (+EA) a reserva.
 */

export type RecoveryAttitudeCode =
  | "sleep_restorative"
  | "mobility_session"
  | "hydration_nutrition"
  | "sunlight_walk"
  | "myofascial_release"
  | "vagal_breathing";

export interface RecoveryAttitudeCatalogItem {
  code: RecoveryAttitudeCode;
  labelPt: string;
  shortLabelPt: string;
  baseRechargeEa: number;
  durationLabelPt: string;
  timingLabelPt: string;
  descriptionPt: string;
  stepsPt: string[];
}

export const RECOVERY_ATTITUDES_CATALOG: RecoveryAttitudeCatalogItem[] = [
  {
    code: "sleep_restorative",
    labelPt: "Sono Restaurador (7h30–8h+)",
    shortLabelPt: "Sono 8h+",
    baseRechargeEa: 110,
    durationLabelPt: "7h30 a 8h30",
    timingLabelPt: "Higiene Noturna",
    descriptionPt: "Pico de GH, reparo miofibrilar e restauração do sistema nervoso autônomo",
    stepsPt: [
      "Desligue luzes brancas de teto e reduza o brilho de telas 45 minutos antes de deitar para destravar a melatonina natural.",
      "Mantenha o quarto totalmente escuro e climatizado (18°C a 21°C) para estender os estágios de sono profundo (ondas lentas).",
      "Evite cafeína nas últimas 8 horas do dia e faça a última refeição sólida até 2 horas antes de dormir.",
      "Ao despertar após 7h30 ou mais de sono contínuo, marque esta recarga para adicionar +EA à sua Reserva Adaptativa.",
    ],
  },
  {
    code: "mobility_session",
    labelPt: "Mobilidade Articular Guiada",
    shortLabelPt: "Mobilidade",
    baseRechargeEa: 75,
    durationLabelPt: "12 a 15 min",
    timingLabelPt: "Pós-treino ou Noite",
    descriptionPt: "Descompressão articular, fluxo sanguíneo local e redução de rigidez",
    stepsPt: [
      "Coluna Torácica & Ombros (4 min): Em 4 apoios, faça 10 rotações torácicas lentas para cada lado abrindo o peito e respirando fundo.",
      "Quadril 90/90 & Flexores (6 min): Sente-se com os joelhos a 90° no solo, alterne a rotação interna/externa por 8 repetições e segure o avanço profundo por 40s de cada lado.",
      "Tornozelos & Cadeia Posterior (5 min): De frente para a parede, avance o joelho sobre a ponta do pé sem tirar o calcanhar do chão (12× cada lado) para liberar a dorsiflexão.",
    ],
  },
  {
    code: "hydration_nutrition",
    labelPt: "Hidratação (3L+) & Nutrição Reparadora",
    shortLabelPt: "Hidratação & Nutrição",
    baseRechargeEa: 65,
    durationLabelPt: "35–45 ml/kg",
    timingLabelPt: "Ao longo do dia",
    descriptionPt: "Ressíntese acelerada de glicogênio muscular e equilíbrio eletrolítico",
    stepsPt: [
      "Inicie a manhã ingerindo 500 ml de água nos primeiros 20 minutos após acordar para reidratar tecidos e discos intervertebrais.",
      "Distribua cerca de 40 ml de água por quilo de peso corporal ao longo do dia (adicione uma pitada de sal integral ou eletrólitos em dias de suor intenso na areia/quadra).",
      "Inclua uma fonte de proteína completa (25g a 40g) combinada com carboidratos naturais na janela pós-treino para repor o glicogênio muscular.",
    ],
  },
  {
    code: "sunlight_walk",
    labelPt: "Caminhada Regenerativa & Luz Solar",
    shortLabelPt: "Caminhada & Sol",
    baseRechargeEa: 60,
    durationLabelPt: "15 a 20 min",
    timingLabelPt: "Manhã ou Fim de Tarde",
    descriptionPt: "Sincronização circadiana e remoção ativa de metabólitos sem impacto",
    stepsPt: [
      "Saia ao ar livre preferencialmente nas primeiras 2 horas da manhã ou no final da tarde, sem óculos escuros, para ancorar seu ritmo circadiano.",
      "Caminhe em cadência leve e conversacional (esforço 2–3 de 10), mantendo os ombros soltos e passadas suaves.",
      "Respire exclusivamente pelo nariz durante toda a caminhada para estimular a produção de óxido nítrico e oxigenação periférica.",
    ],
  },
  {
    code: "myofascial_release",
    labelPt: "Liberação Miofascial & Contraste",
    shortLabelPt: "Miofascial / Contraste",
    baseRechargeEa: 70,
    durationLabelPt: "10 min",
    timingLabelPt: "Após sessões pesadas",
    descriptionPt: "Modulação da dor muscular tardia (DOMS) e recuperação de tônus",
    stepsPt: [
      "Posicione o rolo (foam roller) ou bola de liberação sob as panturrilhas, posteriores de coxa, quadríceps, glúteos e grande dorsal.",
      "Deslize lentamente por 60 a 90 segundos em cada grupo muscular; ao encontrar um ponto sensível (trigger point), pause sobre ele por 15 segundos respirando fundo.",
      "Se desejar potencializar o efeito, finalize o banho com 90 a 120 segundos de água fria nas pernas para reduzir o edema pós-impacto.",
    ],
  },
  {
    code: "vagal_breathing",
    labelPt: "Respiração Vagal 4-4-8 (Descompressão)",
    shortLabelPt: "Respiração Vagal",
    baseRechargeEa: 50,
    durationLabelPt: "6 a 8 min",
    timingLabelPt: "Pós-esforço ou Antes de Dormir",
    descriptionPt: "Ativação parassimpática e redução do cortisol pós-esforço",
    stepsPt: [
      "Deite-se de costas com os pés apoiados em uma cadeira/parede (joelhos a 90°) ou sente-se em local silencioso com a coluna apoiada.",
      "Inspire suavemente pelo nariz expandindo o abdômen durante 4 segundos.",
      "Sustente o ar nos pulmões por 4 segundos sem tensionar o pescoço e expire lentamente durante 8 segundos esvaziando todo o ar.",
      "Complete de 10 a 12 ciclos contínuos para estimular o nervo vago, baixar a frequência cardíaca e ligar o estado de recuperação.",
    ],
  },
];

export const RECOVERY_ATTITUDE_MAP: Record<
  RecoveryAttitudeCode,
  RecoveryAttitudeCatalogItem
> = Object.fromEntries(
  RECOVERY_ATTITUDES_CATALOG.map((item) => [item.code, item])
) as Record<RecoveryAttitudeCode, RecoveryAttitudeCatalogItem>;

export interface LoggedRecoveryAttitude {
  code: RecoveryAttitudeCode;
  localDate: string; // YYYY-MM-DD
  rechargeEa?: number;
}

export interface HistoricalSessionSample {
  date: string; // YYYY-MM-DD
  modalityCode: string;
  durationMinutes: number;
  rpe: number;
  rawLoadEa: number;
}

export interface HistoricalCheckinSample {
  localDate: string; // YYYY-MM-DD
  sleepQuality: number; // 1..5
  energyLevel: number; // 1..5
  muscleFreshness: number; // 1..5
  moodLevel: number; // 1..5
}

import type { EaOnboardingCalibrationResult } from "./ea-onboarding-calibrator";

export interface AthleteMLInput {
  experienceLevel?: "beginner" | "intermediate" | "advanced" | "competitive" | string | null;
  targetDaysPerWeek: number;
  currentWeeklyStreak: number;
  restingHrBpm?: number | null;
  sessionsLast28Days: HistoricalSessionSample[];
  checkinsLast28Days: HistoricalCheckinSample[];
  recoveryAttitudesLast7Days: LoggedRecoveryAttitude[];
  todayDateStr: string;
  /** Calibração científica de onboarding (§Fase 2) — substitui o cold-start heurístico */
  eaCalibration?: EaOnboardingCalibrationResult | null;
}

export interface LearnedAthleteTrait {
  id: string;
  labelPt: string;
  detailPt: string;
  impact: "positive" | "neutral" | "caution";
}

export interface EnergyLedgerEntry {
  id: string;
  labelPt: string;
  date: string;
  deltaEa: number; // Negativo (-EA) para consumo, Positivo (+EA) para recarga
  category: "workout_drain" | "stress_drain" | "habit_recharge" | "sleep_recharge" | "rest_supercompensation";
}

export interface AdaptiveAthleteMLProfile {
  /** Capacidade Adaptativa Semanal Pessoal aprendida pelo modelo (em EA) */
  personalCapacityEa: number;
  /** Total de Energia Adaptativa consumida por treinos e estresse nos últimos 7 dias (-EA) */
  trainingDrainEa: number;
  /** Total de Energia Adaptativa regenerada por sono, hábitos e supercompensação nos últimos 7 dias (+EA) */
  recoveryRechargeEa: number;
  /** Consumo líquido após descontar as atitudes regenerativas */
  netSpentEa: number;
  /** Reserva Adaptativa líquida disponível hoje (em EA) */
  availableReserveEa: number;
  /** Percentual da Reserva Adaptativa disponível hoje (0 a 100%) */
  reservePercent: number;
  /** Percentual de utilização líquida do orçamento pessoal */
  usagePercent: number;
  /** Multiplicador individual de velocidade de recuperação aprendido por ML (ex: 1.12x) */
  recoveryVelocityMultiplier: number;
  /** Multiplicador individual de resposta a hábitos regenerativos (ex: 1.15x) */
  recoveryGainMultiplier: number;
  /** Eficiência aprendida por modalidade (Repeated Bout Effect: < 1.0 significa menor desgaste relativo) */
  modalityEfficiencyMap: Record<string, number>;
  /** Confiança estatística do modelo ML individual (25% a 98%) */
  modelConfidencePercent: number;
  /** Estágio de aprendizado do perfil */
  learningStageLabel: string;
  /** Total de observações biométricas/treinos processadas pelo motor ML */
  observationsCount: number;
  /** Traços fisiológicos descobertos sobre o usuário */
  learnedTraits: LearnedAthleteTrait[];
  /** Extrato bidirecional recente (-EA e +EA) */
  ledgerEntries: EnergyLedgerEntry[];
  /** Atitudes regenerativas já registradas hoje */
  todayLoggedAttitudes: RecoveryAttitudeCode[];
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(`${dateA}T12:00:00Z`).getTime();
  const b = new Date(`${dateB}T12:00:00Z`).getTime();
  return Math.round(Math.abs(b - a) / (24 * 3600 * 1000));
}

/**
 * Executa a inferência e atualização Bayesiana / EW-RLS do perfil adaptativo individual do atleta.
 */
export function learnAdaptiveAthleteProfile(
  input: AthleteMLInput
): AdaptiveAthleteMLProfile {
  const safeTargetDays = clamp(input.targetDaysPerWeek || 4, 2, 7);

  // 1. Prior Bayesiano da Capacidade Base
  // Quando existe Calibração Científica de Onboarding (§Fase 2), usamos o prior calibrado
  // por base crônica, sono, carga alostática e biometria em vez da heurística fixa.
  const calib = input.eaCalibration || null;
  let priorCapacityEa: number;

  if (calib && calib.calibratedCapacityEa > 0) {
    priorCapacityEa = calib.calibratedCapacityEa;
    const streakBonusRatio = Math.min(0.12, (input.currentWeeklyStreak || 0) * 0.015);
    priorCapacityEa *= 1 + streakBonusRatio;
  } else {
    const exp = (input.experienceLevel || "intermediate").toLowerCase();
    const basePerDayPrior =
      exp === "advanced" || exp === "expert" || exp === "competitive"
        ? 430
        : exp === "beginner"
          ? 300
          : 370;

    priorCapacityEa = safeTargetDays * basePerDayPrior;

    // Ajuste por consistência histórica (Streak Semanal consolida mitocôndrias e tolerância a carga)
    const streakBonusRatio = Math.min(0.18, (input.currentWeeklyStreak || 0) * 0.02);
    priorCapacityEa *= 1 + streakBonusRatio;

    // Ajuste por condicionamento cardiovascular (FC de repouso se informada)
    if (input.restingHrBpm && input.restingHrBpm > 35 && input.restingHrBpm < 95) {
      if (input.restingHrBpm <= 56) {
        priorCapacityEa *= 1.08;
      } else if (input.restingHrBpm >= 76) {
        priorCapacityEa *= 0.94;
      }
    }
  }

  // 2. Aprendizado Online (EW-RLS / Ridge) da Velocidade de Recuperação (α_u) e Resposta ao Sono (β_u)
  // Construímos pares (Carga do dia anterior, Sono do dia, Prontidão/Musculatura observada)
  const dailyRawLoad28 = new Map<string, number>();
  const modalityCounts28 = new Map<string, number>();

  for (const s of input.sessionsLast28Days) {
    dailyRawLoad28.set(s.date, (dailyRawLoad28.get(s.date) || 0) + s.rawLoadEa);
    modalityCounts28.set(
      s.modalityCode,
      (modalityCounts28.get(s.modalityCode) || 0) + 1
    );
  }

  // Eficiência Específica por Modalidade (Repeated Bout Effect — Nosaka & Clarkson, 1995)
  // Quanto mais sessões de uma modalidade o atleta acumulou nos 28 dias, menor o microtrauma marginal (até -12%)
  const modalityEfficiencyMap: Record<string, number> = {};
  for (const [mod, count] of modalityCounts28.entries()) {
    const adaptationDiscount = Math.min(0.12, count * 0.018);
    modalityEfficiencyMap[mod] =
      Math.round((1 - adaptationDiscount) * 100) / 100;
  }

  // Regressão Regularizada (L2 Prior λ = 3.0 centrada no prior científico α_0, β_0)
  const lambda = 3.0;
  const alphaPrior = calib?.recoveryVelocityPrior ?? 1.0;
  const betaPrior = calib?.recoveryGainPrior ?? 1.0;

  let weightedAlphaNum = lambda * alphaPrior;
  let weightedAlphaDen = lambda;

  let weightedBetaNum = lambda * betaPrior;
  let weightedBetaDen = lambda;

  const checkinsSorted = [...input.checkinsLast28Days].sort((a, b) =>
    a.localDate.localeCompare(b.localDate)
  );

  for (const chk of checkinsSorted) {
    const ageDays = daysBetween(chk.localDate, input.todayDateStr);
    const decayWeight = Math.pow(0.93, Math.min(28, ageDays));

    const prevDateObj = new Date(`${chk.localDate}T12:00:00Z`);
    prevDateObj.setUTCDate(prevDateObj.getUTCDate() - 1);
    const prevDateStr = prevDateObj.toISOString().split("T")[0];
    const prevLoad = dailyRawLoad28.get(prevDateStr) || 0;

    // Resposta muscular e energética observada (normalizada em torno de 3.5/5)
    const observedFreshness = (chk.muscleFreshness * 0.55 + chk.energyLevel * 0.45) / 5;
    // Expectativa padrão dado o esforço de ontem
    const expectedFreshness = clamp(0.84 - prevLoad / 1800, 0.35, 0.92);
    const residual = observedFreshness - expectedFreshness;

    // Atualiza α_u (Velocidade de Regeneração Individual)
    const sampleAlpha = clamp(1.0 + residual * 0.85, 0.72, 1.38);
    const loadRelevance = prevLoad > 0 ? 1.25 : 0.75;
    weightedAlphaNum += decayWeight * loadRelevance * sampleAlpha;
    weightedAlphaDen += decayWeight * loadRelevance;

    // Atualiza β_u (Sensibilidade ao Sono e Hábitos Regenerativos)
    const sleepNorm = (chk.sleepQuality - 3) / 2; // -1 a +1
    const energyNorm = (chk.energyLevel + chk.moodLevel - 6) / 4; // -1 a +1
    if (Math.abs(sleepNorm) >= 0.4) {
      const concordance = clamp(1.0 + sleepNorm * energyNorm * 0.35, 0.8, 1.4);
      weightedBetaNum += decayWeight * concordance;
      weightedBetaDen += decayWeight;
    }
  }

  // Também aprende a partir da estabilidade de RPE em treinos consecutivos mesmo quando há poucos check-ins
  const sessionsSorted = [...input.sessionsLast28Days].sort((a, b) =>
    a.date.localeCompare(b.date)
  );
  for (let i = 1; i < sessionsSorted.length; i++) {
    const prev = sessionsSorted[i - 1];
    const cur = sessionsSorted[i];
    const gap = daysBetween(prev.date, cur.date);
    if (gap <= 2 && prev.rawLoadEa >= 320) {
      // Se manteve carga alta com RPE controlado (<= 8), indica boa capacidade de recuperação
      const rpeEfficiency = cur.rpe <= 7.5 ? 1.08 : cur.rpe >= 9.5 ? 0.91 : 1.01;
      weightedAlphaNum += 0.45 * rpeEfficiency;
      weightedAlphaDen += 0.45;
    }
  }

  const recoveryVelocityMultiplier =
    Math.round(clamp(weightedAlphaNum / weightedAlphaDen, 0.75, 1.35) * 100) /
    100;
  const recoveryGainMultiplier =
    Math.round(clamp(weightedBetaNum / weightedBetaDen, 0.85, 1.38) * 100) /
    100;

  // 3. Capacidade Crônica Observada nos 28 dias + Fusão Bayesiana com o Prior
  const total28RawEa = Array.from(dailyRawLoad28.values()).reduce(
    (a, b) => a + b,
    0
  );
  const chronicWeeklyAvgEa = total28RawEa / 4;

  // Fusão Bayesiana: combina o prior do perfil com a média crônica real escalada por α_u
  const chronicWeight =
    input.sessionsLast28Days.length === 0
      ? 0
      : clamp(input.sessionsLast28Days.length / 12, 0.15, 0.75);
  const blendedBaseCapacity =
    priorCapacityEa * (1 - chronicWeight) +
    Math.max(priorCapacityEa * 0.8, chronicWeeklyAvgEa * 1.15) * chronicWeight;

  // Quando calibratedCapacityEa já embutiu o prior α_0, aplicamos apenas a razão incremental α_u / α_0
  const effectiveAlphaScale = calib
    ? recoveryVelocityMultiplier / Math.max(0.7, alphaPrior)
    : recoveryVelocityMultiplier;

  const personalCapacityEa = Math.round(
    clamp(blendedBaseCapacity * effectiveAlphaScale, 650, 3800)
  );

  // 4. Balanço Bidirecional dos Últimos 7 Dias (-EA de Treino/Estresse vs. +EA de Regeneração)
  const ledgerEntries: EnergyLedgerEntry[] = [];
  let trainingDrainEa = 0;
  let recoveryRechargeEa = 0;

  const activeDaysLast7 = new Set<string>();

  for (const s of input.sessionsLast28Days) {
    if (daysBetween(s.date, input.todayDateStr) < 7) {
      activeDaysLast7.add(s.date);
      const eff = modalityEfficiencyMap[s.modalityCode] ?? 1.0;

      // Caminhada leve / mobilidade com RPE <= 4 conta como recarga ativa (+EA) em vez de dreno!
      if (
        (s.modalityCode === "walking" || s.modalityCode === "mobility") &&
        s.rpe <= 4
      ) {
        const gain = Math.round(
          clamp(s.durationMinutes * 1.5 * recoveryGainMultiplier, 35, 95)
        );
        recoveryRechargeEa += gain;
        ledgerEntries.push({
          id: `rec_sess_${s.date}_${ledgerEntries.length}`,
          labelPt: "Sessão Regenerativa / Mobilidade",
          date: s.date,
          deltaEa: gain,
          category: "habit_recharge",
        });
      } else {
        const adjustedDrain = Math.round(s.rawLoadEa * eff);
        trainingDrainEa += adjustedDrain;
        ledgerEntries.push({
          id: `drain_sess_${s.date}_${ledgerEntries.length}`,
          labelPt: `Treino (${s.durationMinutes} min · RPE ${s.rpe})`,
          date: s.date,
          deltaEa: -adjustedDrain,
          category: "workout_drain",
        });
      }
    }
  }

  // Impacto bidirecional do Check-in Matinal nos últimos 7 dias (Sono Restaurador +EA vs Privação -EA)
  for (const chk of checkinsSorted) {
    if (daysBetween(chk.localDate, input.todayDateStr) < 7) {
      if (chk.sleepQuality >= 4) {
        const sleepBonus = Math.round(
          (chk.sleepQuality === 5 ? 95 : 60) * recoveryGainMultiplier
        );
        recoveryRechargeEa += sleepBonus;
        ledgerEntries.push({
          id: `sleep_plus_${chk.localDate}`,
          labelPt:
            chk.sleepQuality === 5
              ? "Sono Profundo Restaurador (Check-in)"
              : "Sono Reparador (Check-in)",
          date: chk.localDate,
          deltaEa: sleepBonus,
          category: "sleep_recharge",
        });
      } else if (chk.sleepQuality <= 2) {
        const sleepDrain = chk.sleepQuality === 1 ? 70 : 45;
        trainingDrainEa += sleepDrain;
        ledgerEntries.push({
          id: `sleep_minus_${chk.localDate}`,
          labelPt: "Dreno por Privação de Sono",
          date: chk.localDate,
          deltaEa: -sleepDrain,
          category: "stress_drain",
        });
      }
    }
  }

  // Atitudes Regenerativas Registradas nos últimos 7 dias (+EA)
  const todayLoggedAttitudes: RecoveryAttitudeCode[] = [];
  for (const att of input.recoveryAttitudesLast7Days) {
    if (daysBetween(att.localDate, input.todayDateStr) < 7) {
      const meta = RECOVERY_ATTITUDE_MAP[att.code];
      if (!meta) continue;
      if (att.localDate === input.todayDateStr && !todayLoggedAttitudes.includes(att.code)) {
        todayLoggedAttitudes.push(att.code);
      }
      const gain =
        att.rechargeEa ||
        Math.round(meta.baseRechargeEa * recoveryGainMultiplier);
      recoveryRechargeEa += gain;
      ledgerEntries.push({
        id: `att_${att.code}_${att.localDate}`,
        labelPt: meta.labelPt,
        date: att.localDate,
        deltaEa: gain,
        category: "habit_recharge",
      });
    }
  }

  // Dias de Supercompensação (dias sem treino após estímulo nos últimos 7 dias geram recarga biológica natural)
  if (activeDaysLast7.size > 0 && activeDaysLast7.size < 7) {
    const restDaysCount = Math.min(3, 7 - activeDaysLast7.size);
    const restBonusPerDay = Math.round(45 * recoveryVelocityMultiplier);
    const totalRestBonus = restDaysCount * restBonusPerDay;
    recoveryRechargeEa += totalRestBonus;
    ledgerEntries.push({
      id: `supercomp_${input.todayDateStr}`,
      labelPt: `Supercompensação Natural (${restDaysCount}d de descanso)`,
      date: input.todayDateStr,
      deltaEa: totalRestBonus,
      category: "rest_supercompensation",
    });
  }

  const netSpentEa = Math.max(0, trainingDrainEa - recoveryRechargeEa);
  const availableReserveEa = Math.max(0, personalCapacityEa - netSpentEa);
  const usagePercent = Math.round(
    (netSpentEa / Math.max(1, personalCapacityEa)) * 100
  );
  const reservePercent = clamp(100 - usagePercent, 0, 100);

  // 5. Confiança do Modelo & Traços Aprendidos sobre o Usuário
  const observationsCount =
    input.sessionsLast28Days.length +
    input.checkinsLast28Days.length * 2 +
    input.recoveryAttitudesLast7Days.length;

  const baseConfidence = calib?.initialConfidencePercent ?? 32;
  const confidenceGainPerObs = calib ? 1.8 : 3.8;
  const modelConfidencePercent = Math.round(
    clamp(baseConfidence + observationsCount * confidenceGainPerObs, 32, 98)
  );

  const learningStageLabel =
    observationsCount >= 14
      ? "Perfil Biológico Consolidado"
      : observationsCount >= 5
        ? "Ritmo Individual Calibrado"
        : calib
          ? "Calibrado via Onboarding Científico"
          : "Conhecendo seu Ritmo";

  const learnedTraits: LearnedAthleteTrait[] = [];

  if (recoveryVelocityMultiplier >= 1.06) {
    learnedTraits.push({
      id: "trait_fast_recovery",
      labelPt: `Regeneração Acelerada (${recoveryVelocityMultiplier.toFixed(2)}×)`,
      detailPt:
        "Seu corpo assimila cargas intensas com baixa queda de prontidão no dia seguinte.",
      impact: "positive",
    });
  } else if (recoveryVelocityMultiplier <= 0.94) {
    learnedTraits.push({
      id: "trait_volume_sensitive",
      labelPt: `Alta Sensibilidade Neuromuscular (${recoveryVelocityMultiplier.toFixed(2)}×)`,
      detailPt:
        "Você responde melhor a sessões intensas intercaladas com dias de recarga ativa (+EA).",
      impact: "caution",
    });
  } else {
    learnedTraits.push({
      id: "trait_balanced_recovery",
      labelPt: `Curva de Supercompensação Estável (${recoveryVelocityMultiplier.toFixed(2)}×)`,
      detailPt:
        "Sua velocidade de recuperação entre sessões segue o ritmo fisiológico ótimo de 24–48h.",
      impact: "positive",
    });
  }

  // Traço de eficiência por modalidade mais praticada
  const topModality = Array.from(modalityCounts28.entries()).sort(
    (a, b) => b[1] - a[1]
  )[0];
  if (topModality && topModality[1] >= 2) {
    const eff = modalityEfficiencyMap[topModality[0]] ?? 1.0;
    const savedPct = Math.round((1 - eff) * 100);
    learnedTraits.push({
      id: `trait_mod_${topModality[0]}`,
      labelPt: `Adaptação Específica (+${savedPct}% eficiência)`,
      detailPt: `Pelo efeito da carga repetida (${topModality[1]} sessões em 28d), seu custo inflamatório por sessão diminuiu.`,
      impact: "positive",
    });
  }

  learnedTraits.push({
    id: "trait_sleep_gain",
    labelPt: `Multiplicador de Recarga: ${recoveryGainMultiplier.toFixed(2)}×`,
    detailPt:
      "Cada hábito regenerativo (sono 8h+, mobilidade, hidratação) devolve Energia Adaptativa (+EA) diretamente à sua reserva.",
    impact: "positive",
  });

  return {
    personalCapacityEa,
    trainingDrainEa,
    recoveryRechargeEa,
    netSpentEa,
    availableReserveEa,
    reservePercent,
    usagePercent,
    recoveryVelocityMultiplier,
    recoveryGainMultiplier,
    modalityEfficiencyMap,
    modelConfidencePercent,
    learningStageLabel,
    observationsCount,
    learnedTraits,
    ledgerEntries: ledgerEntries.slice(-8),
    todayLoggedAttitudes,
  };
}
