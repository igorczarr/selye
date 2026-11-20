"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Brain,
  Check,
  CheckCircle2,
  Compass,
  Dumbbell,
  HeartPulse,
  Moon,
  ShieldCheck,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import {
  CORE_MODALITY_CODES,
  MODALITY_REGISTRY,
  SCIENTIFIC_REFERENCES,
  type CoreModalityCode,
  type ExperienceLevel,
} from "@/core/modalities";
import {
  calibrateInitialEaFromOnboarding,
  type EaOnboardingCalibrationResult,
  type EaOnboardingInput,
  type LifeStressBand,
  type OccupationalDemandBand,
  type RecentWeeklyHoursBand,
  type SleepDurationBand,
  type SleepQualityBand,
  type TissueStatusBand,
  type TrainingAgeBand,
} from "@/core/ml/ea-onboarding-calibrator";
import { WEEKDAYS_MONDAY_FIRST } from "@/lib/week";
import { saveAthleteOnboardingProfile } from "@/actions/profile";

interface WizardProps {
  initialCalibration?: EaOnboardingCalibrationResult | null;
  initialPrimaryModality?: CoreModalityCode;
  initialComplementary?: CoreModalityCode[];
  initialExperienceLevel?: ExperienceLevel;
  initialWeightKg?: number | null;
  initialRestingHrBpm?: number | null;
  initialTargetKpiKey?: string | null;
  initialTargetKpiValue?: number | null;
}

const EXPERIENCE_OPTIONS: { value: ExperienceLevel; label: string; hint: string }[] = [
  { value: "beginner", label: "Iniciante", hint: "Construindo base técnica e rotina" },
  { value: "intermediate", label: "Intermediário", hint: "Treina regular e busca evoluir marcas" },
  { value: "advanced", label: "Avançado", hint: "Alto volume/carga e periodização" },
  { value: "competitive", label: "Competitivo", hint: "Provas, campeonatos ou alto rendimento" },
];

const TRAINING_AGE_OPTIONS: { value: TrainingAgeBand; label: string }[] = [
  { value: "under_3m", label: "< 3 meses" },
  { value: "3_to_12m", label: "3 a 12 meses" },
  { value: "1_to_3y", label: "1 a 3 anos" },
  { value: "over_3y", label: "3+ anos" },
];

const RECENT_HOURS_OPTIONS: { value: RecentWeeklyHoursBand; label: string; sub: string }[] = [
  { value: "under_2h", label: "< 2h/sem", sub: "Retomando" },
  { value: "2_to_4h", label: "2–4h/sem", sub: "Base leve" },
  { value: "4_to_7h", label: "4–7h/sem", sub: "Consistente" },
  { value: "7_to_10h", label: "7–10h/sem", sub: "Alto volume" },
  { value: "over_10h", label: "10h+/sem", sub: "Competitivo" },
];

const SLEEP_DURATION_OPTIONS: { value: SleepDurationBand; label: string; hint: string }[] = [
  { value: "under_6h", label: "< 6 horas", hint: "Déficit crônico" },
  { value: "6_to_7h", label: "6 a 7 horas", hint: "Abaixo do ótimo" },
  { value: "7_to_8h", label: "7 a 8 horas", hint: "Faixa saudável" },
  { value: "over_8h", label: "8h ou mais", hint: "Alta regeneração" },
];

const SLEEP_QUALITY_OPTIONS: { value: SleepQualityBand; label: string }[] = [
  { value: "poor", label: "Fragmentado / acordo cansado" },
  { value: "fair", label: "Regular / oscila na semana" },
  { value: "restorative", label: "Profundo e restaurador" },
];

const LIFE_STRESS_OPTIONS: { value: LifeStressBand; label: string; hint: string }[] = [
  { value: "low", label: "Baixo", hint: "Rotina previsível" },
  { value: "moderate", label: "Moderado", hint: "Pressão normal" },
  { value: "high", label: "Alto", hint: "Prazos / desgaste mental" },
  { value: "very_high", label: "Intenso / Crônico", hint: "Alta carga alostática" },
];

const OCCUPATIONAL_OPTIONS: { value: OccupationalDemandBand; label: string }[] = [
  { value: "sedentary", label: "Escritório / Sentado" },
  { value: "active_standing", label: "Em pé / Ativo no dia" },
  { value: "heavy_manual", label: "Trabalho físico pesado" },
];

const TISSUE_STATUS_OPTIONS: { value: TissueStatusBand; label: string; hint: string }[] = [
  { value: "fresh", label: "Fresco e sem dores", hint: "100% apto para progredir" },
  { value: "normal_training", label: "Cansaço normal de treino", hint: "Ritmo habitual" },
  { value: "returning_detrained", label: "Retornando de pausa (>3 sem)", hint: "Ativa rampa segura" },
  { value: "injury_rehab", label: "Dor ativa / retorno de lesão", hint: "Margem protetora máxima" },
];

export function AthleteOnboardingWizard({
  initialCalibration,
  initialPrimaryModality,
  initialComplementary,
  initialExperienceLevel,
  initialWeightKg,
  initialRestingHrBpm,
  initialTargetKpiKey,
  initialTargetKpiValue,
}: WizardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const prevInputs = initialCalibration?.inputs;

  const [primaryModality, setPrimaryModality] = useState<CoreModalityCode>(
    prevInputs?.primaryModality || initialPrimaryModality || "strength"
  );
  const [complementaryModalities, setComplementaryModalities] = useState<CoreModalityCode[]>(
    prevInputs?.complementaryModalities ||
      initialComplementary ||
      (initialPrimaryModality && initialPrimaryModality !== "strength" ? ["strength"] : [])
  );
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>(
    prevInputs?.experienceLevel || initialExperienceLevel || "intermediate"
  );
  const [trainingAge, setTrainingAge] = useState<TrainingAgeBand>(
    prevInputs?.trainingAge || "1_to_3y"
  );
  const [recentWeeklyHours, setRecentWeeklyHours] = useState<RecentWeeklyHoursBand>(
    prevInputs?.recentWeeklyHours || "4_to_7h"
  );
  const [preferredWorkoutDays, setPreferredWorkoutDays] = useState<number[]>(
    prevInputs?.preferredWorkoutDays?.length ? prevInputs.preferredWorkoutDays : [1, 2, 4, 6]
  );

  const activeSpec = MODALITY_REGISTRY[primaryModality];
  const defaultKpi =
    activeSpec.kpis.find((k) => k.isPrimaryGoalMetric) || activeSpec.kpis[0];

  const [targetKpiKey, setTargetKpiKey] = useState<string>(
    initialTargetKpiKey && activeSpec.kpis.some((k) => k.key === initialTargetKpiKey)
      ? initialTargetKpiKey
      : defaultKpi.key
  );
  const [baselineKpiStr, setBaselineKpiStr] = useState<string>("");
  const [targetKpiStr, setTargetKpiStr] = useState<string>(
    initialTargetKpiValue != null ? String(initialTargetKpiValue) : ""
  );

  const [sleepDuration, setSleepDuration] = useState<SleepDurationBand>(
    prevInputs?.sleepDuration || "7_to_8h"
  );
  const [sleepQuality, setSleepQuality] = useState<SleepQualityBand>(
    prevInputs?.sleepQuality || "fair"
  );
  const [lifeStress, setLifeStress] = useState<LifeStressBand>(
    prevInputs?.lifeStress || "moderate"
  );
  const [occupationalDemand, setOccupationalDemand] = useState<OccupationalDemandBand>(
    prevInputs?.occupationalDemand || "sedentary"
  );
  const [tissueStatus, setTissueStatus] = useState<TissueStatusBand>(
    prevInputs?.tissueStatus || "normal_training"
  );

  const [ageStr, setAgeStr] = useState<string>(
    prevInputs?.ageYears != null ? String(prevInputs.ageYears) : ""
  );
  const [weightStr, setWeightStr] = useState<string>(
    prevInputs?.bodyWeightKg != null
      ? String(prevInputs.bodyWeightKg)
      : initialWeightKg != null
        ? String(initialWeightKg)
        : ""
  );
  const [rhrStr, setRhrStr] = useState<string>(
    prevInputs?.restingHrBpm != null
      ? String(prevInputs.restingHrBpm)
      : initialRestingHrBpm != null
        ? String(initialRestingHrBpm)
        : ""
  );

  const selectedKpiDef = useMemo(() => {
    return (
      activeSpec.kpis.find((k) => k.key === targetKpiKey) ||
      activeSpec.kpis.find((k) => k.isPrimaryGoalMetric) ||
      activeSpec.kpis[0]
    );
  }, [activeSpec, targetKpiKey]);

  const handleSelectPrimary = (code: CoreModalityCode) => {
    setPrimaryModality(code);
    const nextSpec = MODALITY_REGISTRY[code];
    const nextPrimaryKpi =
      nextSpec.kpis.find((k) => k.isPrimaryGoalMetric) || nextSpec.kpis[0];
    setTargetKpiKey(nextPrimaryKpi.key);
    setBaselineKpiStr("");
    setTargetKpiStr("");

    // Remove a nova principal das complementares; se não for musculação e lista estiver vazia, sugere musculação
    setComplementaryModalities((prev) => {
      const cleaned = prev.filter((c) => c !== code);
      if (code !== "strength" && cleaned.length === 0) {
        return ["strength"];
      }
      return cleaned;
    });
  };

  const toggleComplementary = (code: CoreModalityCode) => {
    if (code === primaryModality) return;
    setComplementaryModalities((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code].slice(0, 3)
    );
  };

  const toggleWorkoutDay = (jsDay: number) => {
    setPreferredWorkoutDays((prev) => {
      if (prev.includes(jsDay)) {
        if (prev.length <= 2) return prev; // mínimo 2 dias
        return prev.filter((d) => d !== jsDay);
      }
      return [...prev, jsDay];
    });
  };

  const calibrationInput: EaOnboardingInput = useMemo(() => {
    const parseNum = (s: string) => {
      const n = Number(s.replace(",", "."));
      return s.trim() !== "" && !Number.isNaN(n) ? n : null;
    };
    return {
      primaryModality,
      complementaryModalities,
      experienceLevel,
      trainingAge,
      recentWeeklyHours,
      targetDaysPerWeek: Math.max(2, Math.min(7, preferredWorkoutDays.length)),
      preferredWorkoutDays,
      sleepDuration,
      sleepQuality,
      lifeStress,
      occupationalDemand,
      tissueStatus,
      ageYears: parseNum(ageStr),
      bodyWeightKg: parseNum(weightStr),
      restingHrBpm: parseNum(rhrStr),
    };
  }, [
    primaryModality,
    complementaryModalities,
    experienceLevel,
    trainingAge,
    recentWeeklyHours,
    preferredWorkoutDays,
    sleepDuration,
    sleepQuality,
    lifeStress,
    occupationalDemand,
    tissueStatus,
    ageStr,
    weightStr,
    rhrStr,
  ]);

  const liveCalibration = useMemo(
    () => calibrateInitialEaFromOnboarding(calibrationInput),
    [calibrationInput]
  );

  const handleSubmit = () => {
    setErrorMsg(null);
    const parseNum = (s: string) => {
      const n = Number(s.replace(",", "."));
      return s.trim() !== "" && !Number.isNaN(n) ? n : null;
    };

    startTransition(async () => {
      try {
        await saveAthleteOnboardingProfile({
          ...calibrationInput,
          targetKpiKey: selectedKpiDef.key,
          baselineKpiValue: parseNum(baselineKpiStr),
          targetKpiValue: parseNum(targetKpiStr),
        });
        router.push("/perfil?calibrated=1");
        router.refresh();
      } catch {
        setErrorMsg("Não foi possível salvar sua calibração agora. Tente novamente.");
      }
    });
  };

  const stepLabels = [
    { num: 1 as const, label: "Modalidade" },
    { num: 2 as const, label: "Nível & Meta" },
    { num: 3 as const, label: "Calibração EA" },
    { num: 4 as const, label: "Raio-X" },
  ];

  const levelBand = selectedKpiDef.experienceRanges[experienceLevel];

  return (
    <div className="max-w-3xl mx-auto w-full flex flex-col gap-5 fade-up">
      {/* Cabeçalho com Preview Ao Vivo da EA */}
      <section className="card p-5 sm:p-6 flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5">
              <Sparkles size={13} className="text-accent-text" />
              <span className="t-label !text-accent-text">
                Calibração Fisiológica Individual · ~2 min
              </span>
            </div>
            <h1 className="t-h1 mt-1">Perfil Esportivo & Energia Adaptativa</h1>
            <p className="text-xs text-muted mt-1 max-w-xl">
              Poucas perguntas diretas para o Selye adaptar seus indicadores, calendário, fortalecimento e sua
              bateria semanal de energia (EA) ao seu corpo real.
            </p>
          </div>

          {/* Preview ao vivo da EA calibrada */}
          <div className="px-3.5 py-2.5 rounded-xl border border-profundo/40 bg-lima/15 flex items-center gap-3 shrink-0">
            <Zap size={18} className="text-accent-text shrink-0" />
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted block">
                EA Semanal Estimada
              </span>
              <span className="t-data text-lg font-bold text-foreground leading-none">
                {liveCalibration.calibratedCapacityEa} EA
              </span>
              <span className="text-[10px] font-mono text-muted block mt-0.5">
                ±{liveCalibration.uncertaintyMarginEa} · Confiança{" "}
                {liveCalibration.initialConfidencePercent}%
              </span>
            </div>
          </div>
        </div>

        {/* Stepper limpo */}
        <div className="grid grid-cols-4 gap-2 pt-1">
          {stepLabels.map((s) => {
            const isActive = step === s.num;
            const isDone = step > s.num;
            return (
              <button
                key={s.num}
                type="button"
                onClick={() => setStep(s.num)}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border text-left transition-all cursor-pointer ${
                  isActive
                    ? "border-foreground bg-foreground text-background"
                    : isDone
                      ? "border-profundo/40 bg-lima/15 text-foreground"
                      : "border-line bg-foreground/[0.02] text-muted hover:text-foreground"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full text-[10px] font-mono font-bold flex items-center justify-center shrink-0 ${
                    isActive
                      ? "bg-lima text-grafite"
                      : isDone
                        ? "bg-foreground text-background"
                        : "bg-foreground/10 text-muted"
                  }`}
                >
                  {isDone ? <Check size={11} /> : s.num}
                </span>
                <span className="text-[11px] font-medium truncate">{s.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ==================== PASSO 1: MODALIDADE PRINCIPAL & COMPLEMENTAR ==================== */}
      {step === 1 && (
        <section className="card p-5 sm:p-6 flex flex-col gap-5">
          <div>
            <span className="t-label">Passo 1 de 4 · Identidade Esportiva</span>
            <h2 className="t-h2 mt-1">Qual é a sua modalidade principal?</h2>
            <p className="text-xs text-muted mt-1">
              Ela define seus indicadores principais, o plano do calendário e como o Selye acompanha se
              você está nos trilhos.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {CORE_MODALITY_CODES.map((code) => {
              const mod = MODALITY_REGISTRY[code];
              const isSelected = primaryModality === code;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => handleSelectPrimary(code)}
                  aria-pressed={isSelected}
                  className={`p-3.5 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                    isSelected
                      ? "border-foreground bg-foreground text-background shadow-sm"
                      : "border-line bg-foreground/[0.02] hover:border-mineral text-foreground"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-semibold leading-tight">
                      {mod.shortNamePt}
                    </span>
                    {isSelected && <Check size={14} className="text-lima shrink-0" />}
                  </div>
                  <span
                    className={`text-[10px] leading-snug line-clamp-2 ${
                      isSelected ? "text-background/75" : "text-muted"
                    }`}
                  >
                    {mod.kpis
                      .filter((k) => k.isPrimaryGoalMetric)
                      .map((k) => k.shortLabelPt)
                      .join(" · ")}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Modalidades Complementares */}
          <div className="pt-4 border-t border-line flex flex-col gap-3">
            <div>
              <h3 className="t-h3 flex items-center gap-1.5">
                <Dumbbell size={14} className="text-accent-text" />
                <span>Modalidade complementar estruturada (opcional)</span>
              </h3>
              <p className="text-xs text-muted mt-0.5">
                {primaryModality === "strength"
                  ? "Se você também treina algum esporte regularmente como suporte, marque abaixo."
                  : `Para ${activeSpec.shortNamePt}: ${activeSpec.complementaryStrength.objectiveHeadlinePt}.`}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {CORE_MODALITY_CODES.filter((c) => c !== primaryModality).map((code) => {
                const mod = MODALITY_REGISTRY[code];
                const active = complementaryModalities.includes(code);
                const isRecommendedStrength =
                  code === "strength" && primaryModality !== "strength";
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => toggleComplementary(code)}
                    aria-pressed={active}
                    className={`px-3 py-1.5 rounded-full border text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                      active
                        ? "border-profundo bg-lima/25 text-foreground font-semibold"
                        : "border-line bg-surface text-muted hover:text-foreground"
                    }`}
                  >
                    {active && <Check size={12} className="text-accent-text" />}
                    <span>{mod.shortNamePt}</span>
                    {isRecommendedStrength && (
                      <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-foreground/10 text-foreground">
                        Recomendado
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="rounded-xl border border-line bg-foreground/[0.02] p-3 text-[11px] text-muted leading-relaxed">
              <strong className="text-foreground">Sobre cardios e atividades soltas:</strong>{" "}
              corridas leves, pedais de lazer ou peladas ocasionais fora do foco não precisam
              entrar aqui — você poderá registrá-los como{" "}
              <span className="font-mono text-foreground">Atividade Solta</span> para entrar na sua
              energia (EA) e consistência sem misturar com os indicadores da sua modalidade principal.
            </div>
          </div>
        </section>
      )}

      {/* ==================== PASSO 2: NÍVEL, BASE CRÔNICA, DIAS & KPI-ALVO ==================== */}
      {step === 2 && (
        <section className="card p-5 sm:p-6 flex flex-col gap-5">
          <div>
            <span className="t-label">
              Passo 2 de 4 · Base Crônica & Meta ({activeSpec.shortNamePt})
            </span>
            <h2 className="t-h2 mt-1">Seu estágio atual, rotina e objetivo</h2>
            <p className="text-xs text-muted mt-1">
              O volume que seu corpo já sustenta nos últimos 3 meses é o maior preditor da sua
              capacidade semanal segura (Banister; Gabbett).
            </p>
          </div>

          {/* Nível de Experiência */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-foreground">
              Nível em {activeSpec.shortNamePt}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {EXPERIENCE_OPTIONS.map((opt) => {
                const active = experienceLevel === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setExperienceLevel(opt.value)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      active
                        ? "border-foreground bg-foreground text-background"
                        : "border-line bg-foreground/[0.02] hover:border-mineral text-foreground"
                    }`}
                  >
                    <span className="text-xs font-semibold block">{opt.label}</span>
                    <span
                      className={`text-[10px] block mt-0.5 leading-snug ${
                        active ? "text-background/75" : "text-muted"
                      }`}
                    >
                      {opt.hint}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tempo de prática contínua + Volume recente (3 meses) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-foreground">
                Tempo de prática contínua
              </label>
              <div className="grid grid-cols-2 gap-2">
                {TRAINING_AGE_OPTIONS.map((opt) => {
                  const active = trainingAge === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setTrainingAge(opt.value)}
                      className={`h-10 px-3 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                        active
                          ? "border-foreground bg-foreground text-background font-semibold"
                          : "border-line bg-foreground/[0.02] text-muted hover:text-foreground"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-foreground">
                Horas/semana sustentadas (últimos 3 meses)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {RECENT_HOURS_OPTIONS.map((opt) => {
                  const active = recentWeeklyHours === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setRecentWeeklyHours(opt.value)}
                      className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                        active
                          ? "border-foreground bg-foreground text-background"
                          : "border-line bg-foreground/[0.02] text-muted hover:text-foreground"
                      }`}
                    >
                      <span className="text-[11px] font-mono font-semibold block">
                        {opt.label}
                      </span>
                      <span
                        className={`text-[9px] block ${
                          active ? "text-background/75" : "text-muted"
                        }`}
                      >
                        {opt.sub}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Dias preferidos na semana */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground">
                Dias disponíveis para treinar
              </label>
              <span className="text-[11px] font-mono text-accent-text font-semibold">
                {preferredWorkoutDays.length} dias/semana
              </span>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {WEEKDAYS_MONDAY_FIRST.map((w) => {
                const active = preferredWorkoutDays.includes(w.jsDay);
                return (
                  <button
                    key={w.jsDay}
                    type="button"
                    onClick={() => toggleWorkoutDay(w.jsDay)}
                    aria-pressed={active}
                    className={`h-10 rounded-xl border text-xs font-mono font-semibold transition-all cursor-pointer ${
                      active
                        ? "border-profundo bg-lima text-grafite"
                        : "border-line bg-foreground/[0.02] text-muted hover:text-foreground"
                    }`}
                  >
                    {w.shortPt}
                  </button>
                );
              })}
            </div>
          </div>

          {/* KPI Principal da Modalidade */}
          <div className="pt-4 border-t border-line flex flex-col gap-3">
            <div className="flex items-center gap-1.5">
              <Target size={14} className="text-accent-text" />
              <h3 className="t-h3">Qual indicador você quer acompanhar de perto?</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {activeSpec.kpis.map((kpi) => {
                const active = selectedKpiDef.key === kpi.key;
                return (
                  <button
                    key={kpi.key}
                    type="button"
                    onClick={() => setTargetKpiKey(kpi.key)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      active
                        ? "border-profundo bg-lima/15 text-foreground"
                        : "border-line bg-foreground/[0.02] text-muted hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-foreground">
                        {kpi.labelPt}
                      </span>
                      <span className="text-[10px] font-mono text-muted shrink-0">
                        {kpi.unit}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted mt-1 leading-snug">
                      Ref. ({experienceLevel}): {kpi.experienceRanges[experienceLevel].min}–
                      {kpi.experienceRanges[experienceLevel].max} {kpi.unit}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-foreground">
                  Marca atual (opcional · {selectedKpiDef.unit})
                </label>
                <input
                  type="number"
                  step="any"
                  value={baselineKpiStr}
                  onChange={(e) => setBaselineKpiStr(e.target.value)}
                  placeholder={`Ex: ${levelBand.min}`}
                  className="input h-10 text-xs font-mono"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-foreground">
                  Meta desejada (opcional · {selectedKpiDef.unit})
                </label>
                <input
                  type="number"
                  step="any"
                  value={targetKpiStr}
                  onChange={(e) => setTargetKpiStr(e.target.value)}
                  placeholder={`Ex: ${levelBand.max}`}
                  className="input h-10 text-xs font-mono"
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ==================== PASSO 3: CALIBRAÇÃO FISIOLÓGICA DA EA ==================== */}
      {step === 3 && (
        <section className="card p-5 sm:p-6 flex flex-col gap-5">
          <div>
            <span className="t-label">
              Passo 3 de 4 · Calibração Científica da EA
            </span>
            <h2 className="t-h2 mt-1">Sono, Carga Alostática & Biometria</h2>
            <p className="text-xs text-muted mt-1">
              Seu corpo compartilha uma única reserva adaptativa entre treino, trabalho, estresse e
              sono (Selye; McEwen; Walsh et al., 2021).
            </p>
          </div>

          {/* 1. Sono Habitual */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-1.5">
              <Moon size={14} className="text-accent-text" />
              <span className="text-xs font-semibold text-foreground">
                1. Sono habitual na semana
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SLEEP_DURATION_OPTIONS.map((opt) => {
                const active = sleepDuration === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSleepDuration(opt.value)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      active
                        ? "border-foreground bg-foreground text-background"
                        : "border-line bg-foreground/[0.02] text-foreground hover:border-mineral"
                    }`}
                  >
                    <span className="text-xs font-semibold block">{opt.label}</span>
                    <span
                      className={`text-[10px] block ${
                        active ? "text-background/75" : "text-muted"
                      }`}
                    >
                      {opt.hint}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {SLEEP_QUALITY_OPTIONS.map((opt) => {
                const active = sleepQuality === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSleepQuality(opt.value)}
                    className={`px-3 py-2 rounded-xl border text-xs transition-all cursor-pointer ${
                      active
                        ? "border-profundo bg-lima/20 text-foreground font-semibold"
                        : "border-line bg-surface text-muted hover:text-foreground"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Carga Alostática Extra-Treino */}
          <div className="flex flex-col gap-2.5 pt-3 border-t border-line">
            <div className="flex items-center gap-1.5">
              <Brain size={14} className="text-accent-text" />
              <span className="text-xs font-semibold text-foreground">
                2. Estresse mental & demanda física fora do treino
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {LIFE_STRESS_OPTIONS.map((opt) => {
                const active = lifeStress === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setLifeStress(opt.value)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      active
                        ? "border-foreground bg-foreground text-background"
                        : "border-line bg-foreground/[0.02] text-foreground hover:border-mineral"
                    }`}
                  >
                    <span className="text-xs font-semibold block">{opt.label}</span>
                    <span
                      className={`text-[10px] block ${
                        active ? "text-background/75" : "text-muted"
                      }`}
                    >
                      {opt.hint}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {OCCUPATIONAL_OPTIONS.map((opt) => {
                const active = occupationalDemand === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setOccupationalDemand(opt.value)}
                    className={`px-3 py-2 rounded-xl border text-xs transition-all cursor-pointer ${
                      active
                        ? "border-profundo bg-lima/20 text-foreground font-semibold"
                        : "border-line bg-surface text-muted hover:text-foreground"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Estado Tecidual / Retorno */}
          <div className="flex flex-col gap-2.5 pt-3 border-t border-line">
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-accent-text" />
              <span className="text-xs font-semibold text-foreground">
                3. Condição articular e muscular atual
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TISSUE_STATUS_OPTIONS.map((opt) => {
                const active = tissueStatus === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTissueStatus(opt.value)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      active
                        ? "border-foreground bg-foreground text-background"
                        : "border-line bg-foreground/[0.02] text-foreground hover:border-mineral"
                    }`}
                  >
                    <span className="text-xs font-semibold block">{opt.label}</span>
                    <span
                      className={`text-[10px] block mt-0.5 ${
                        active ? "text-background/75" : "text-muted"
                      }`}
                    >
                      {opt.hint}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Biometria de Precisão (Opcional) */}
          <div className="flex flex-col gap-2.5 pt-3 border-t border-line">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <HeartPulse size={14} className="text-accent-text" />
                <span className="text-xs font-semibold text-foreground">
                  4. Biometria de precisão (opcional · privado)
                </span>
              </div>
              <span className="text-[10px] font-mono text-accent-text">
                +18% confiança inicial
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-muted">Idade (anos)</label>
                <input
                  type="number"
                  min={14}
                  max={95}
                  value={ageStr}
                  onChange={(e) => setAgeStr(e.target.value)}
                  placeholder="Ex: 31"
                  className="input h-10 text-xs font-mono"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-muted">Peso Corporal (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  min={35}
                  max={200}
                  value={weightStr}
                  onChange={(e) => setWeightStr(e.target.value)}
                  placeholder="Ex: 74.5"
                  className="input h-10 text-xs font-mono"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-muted">FC de Repouso (bpm)</label>
                <input
                  type="number"
                  min={35}
                  max={105}
                  value={rhrStr}
                  onChange={(e) => setRhrStr(e.target.value)}
                  placeholder="Ex: 56"
                  className="input h-10 text-xs font-mono"
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ==================== PASSO 4: RAIO-X DA EA & PLANO INTEGRADO ==================== */}
      {step === 4 && (
        <section className="card p-5 sm:p-6 flex flex-col gap-5">
          <div>
            <span className="t-label !text-accent-text">
              Passo 4 de 4 · Diagnóstico Calibrado
            </span>
            <h2 className="t-h2 mt-1">{liveCalibration.readinessTierLabelPt}</h2>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              {liveCalibration.summaryPt}
            </p>
          </div>

          {/* 3 Cards Resumo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-profundo/40 bg-lima/15 p-4">
              <span className="text-[10px] font-mono uppercase text-muted block">
                Capacidade Semanal (EA)
              </span>
              <span className="t-data text-2xl font-bold text-foreground mt-1 block">
                {liveCalibration.calibratedCapacityEa} EA
              </span>
              <span className="text-[10px] font-mono text-muted">
                Margem inicial: ±{liveCalibration.uncertaintyMarginEa} EA
              </span>
            </div>

            <div className="rounded-xl border border-line bg-foreground/[0.02] p-4">
              <span className="text-[10px] font-mono uppercase text-muted block">
                Velocidade de Recuperação (α₀)
              </span>
              <span className="t-data text-2xl font-bold text-foreground mt-1 block">
                {liveCalibration.recoveryVelocityPrior.toFixed(2)}×
              </span>
              <span className="text-[10px] font-mono text-muted">
                Ganho de recarga (β₀): {liveCalibration.recoveryGainPrior.toFixed(2)}×
              </span>
            </div>

            <div className="rounded-xl border border-line bg-foreground/[0.02] p-4">
              <span className="text-[10px] font-mono uppercase text-muted block">
                Precisão Inicial
              </span>
              <span className="t-data text-2xl font-bold text-foreground mt-1 block">
                {liveCalibration.initialConfidencePercent}%
              </span>
              <span className="text-[10px] font-mono text-muted">
                Evolui até 98% com check-ins e treinos
              </span>
            </div>
          </div>

          {/* Decomposição transparente (XAI) */}
          <div className="flex flex-col gap-2">
            <h3 className="t-h3 flex items-center gap-1.5">
              <Activity size={14} className="text-accent-text" />
              <span>Como chegamos à sua EA (Fatores Científicos)</span>
            </h3>
            <div className="flex flex-col gap-2">
              {liveCalibration.factors.map((f) => {
                const ref = SCIENTIFIC_REFERENCES[f.scientificRefId];
                return (
                  <div
                    key={f.code}
                    className="rounded-xl border border-line bg-foreground/[0.02] p-3 flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-foreground block">
                        {f.labelPt}
                      </span>
                      <p className="text-[11px] text-muted mt-0.5 leading-relaxed">
                        {f.explanationPt}
                      </p>
                      {ref && (
                        <span className="text-[10px] font-mono text-muted/80 block mt-1">
                          Base: {ref.authors} ({ref.year})
                        </span>
                      )}
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold shrink-0 ${
                        f.impact === "positive"
                          ? "bg-lima/25 text-accent-text"
                          : f.impact === "protective"
                            ? "bg-amber-500/15 text-amber-500"
                            : "bg-foreground/10 text-muted"
                      }`}
                    >
                      {f.deltaPercent > 0 ? `+${f.deltaPercent}%` : `${f.deltaPercent}%`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Integração Modalidade + Fortalecimento */}
          <div className="rounded-xl border border-line bg-foreground/[0.02] p-4 flex flex-col gap-2">
            <div className="flex items-center gap-1.5">
              <Compass size={14} className="text-accent-text" />
              <span className="text-xs font-semibold text-foreground">
                Resumo da sua Arquitetura de Treino
              </span>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              <strong className="text-foreground">Modalidade principal:</strong>{" "}
              {activeSpec.namePt} ({EXPERIENCE_OPTIONS.find((e) => e.value === experienceLevel)?.label},{" "}
              {preferredWorkoutDays.length} dias/sem) ·{" "}
              <strong className="text-foreground">Indicador principal:</strong> {selectedKpiDef.labelPt}.
            </p>
            {complementaryModalities.length > 0 && (
              <p className="text-xs text-muted leading-relaxed">
                <strong className="text-foreground">Complementares:</strong>{" "}
                {complementaryModalities
                  .map((c) => MODALITY_REGISTRY[c].shortNamePt)
                  .join(", ")}{" "}
                — integradas sem conflito com as sessões-chave.
              </p>
            )}
            {liveCalibration.priorityRecommendationsPt.length > 0 && (
              <ul className="mt-1 space-y-1 text-[11px] text-muted list-disc pl-4">
                {liveCalibration.priorityRecommendationsPt.map((rec, i) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            )}
          </div>

          {errorMsg && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-400">
              {errorMsg}
            </div>
          )}
        </section>
      )}

      {/* Rodapé de Navegação do Wizard */}
      <div className="flex items-center justify-between gap-3">
        {step === 1 ? (
          <Link href="/perfil" className="btn btn-ghost h-10 px-4 text-xs">
            <ArrowLeft size={14} />
            <span>Voltar ao Perfil</span>
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3 | 4) : s))}
            className="btn btn-ghost h-10 px-4 text-xs cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Anterior</span>
          </button>
        )}

        {step < 4 ? (
          <button
            type="button"
            onClick={() => setStep((s) => (s < 4 ? ((s + 1) as 1 | 2 | 3 | 4) : s))}
            className="btn btn-primary h-10 px-5 text-xs font-mono font-bold cursor-pointer"
          >
            <span>Continuar</span>
            <ArrowRight size={14} />
          </button>
        ) : (
          <button
            type="button"
            disabled={isPending}
            onClick={handleSubmit}
            className="btn btn-primary h-10 px-5 text-xs font-mono font-bold cursor-pointer"
          >
            <CheckCircle2 size={15} />
            <span>{isPending ? "Salvando Calibração..." : "Confirmar e Ativar Perfil"}</span>
          </button>
        )}
      </div>
    </div>
  );
}
