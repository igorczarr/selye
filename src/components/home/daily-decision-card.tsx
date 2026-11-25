"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  submitMorningCheckin,
  toggleRecoveryAttitude,
} from "@/actions/workout";
import {
  calculateSubjectiveReadinessScore,
  type DailyDecisionResult,
  type MorningCheckinInput,
} from "@/core/performance/daily-decision";
import {
  RECOVERY_ATTITUDES_CATALOG,
  type AdaptiveAthleteMLProfile,
  type RecoveryAttitudeCode,
} from "@/core/ml/adaptive-athlete-engine";
import { ModalPortal } from "@/components/ui/modal-portal";
import {
  Sun,
  BatteryCharging,
  Activity,
  Droplets,
  HeartPulse,
  Moon,
  Smile,
  Check,
  X,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const DIMENSIONS: {
  key: keyof Pick<
    MorningCheckinInput,
    "sleepQuality" | "energyLevel" | "muscleFreshness" | "moodLevel"
  >;
  label: string;
  icon: typeof Moon;
  levels: { value: number; short: string; desc: string }[];
}[] = [
  {
    key: "sleepQuality",
    label: "Sono da Última Noite",
    icon: Moon,
    levels: [
      { value: 1, short: "1", desc: "Muito curto / interrompido (-EA)" },
      { value: 2, short: "2", desc: "Leve / cansado ao acordar (-EA)" },
      { value: 3, short: "3", desc: "Regular (~6–7h)" },
      { value: 4, short: "4", desc: "Bom e contínuo (+EA)" },
      { value: 5, short: "5", desc: "Profundo e restaurador 8h+ (++EA)" },
    ],
  },
  {
    key: "energyLevel",
    label: "Energia & Disposição",
    icon: Activity,
    levels: [
      { value: 1, short: "1", desc: "Exausto / sem bateria" },
      { value: 2, short: "2", desc: "Baixa energia" },
      { value: 3, short: "3", desc: "Estável / normal" },
      { value: 4, short: "4", desc: "Boa disposição" },
      { value: 5, short: "5", desc: "Energia máxima para treinar" },
    ],
  },
  {
    key: "muscleFreshness",
    label: "Corpo & Musculatura",
    icon: Activity,
    levels: [
      { value: 1, short: "1", desc: "Dor intensa / musculatura travada" },
      { value: 2, short: "2", desc: "Pernas/corpo pesados do último treino" },
      { value: 3, short: "3", desc: "Dor pós-treino leve normal" },
      { value: 4, short: "4", desc: "Musculatura recuperada" },
      { value: 5, short: "5", desc: "100% solto e pronto para potência" },
    ],
  },
  {
    key: "moodLevel",
    label: "Foco & Humor",
    icon: Smile,
    levels: [
      { value: 1, short: "1", desc: "Sobrecarregado / alto estresse" },
      { value: 2, short: "2", desc: "Disperso / tenso" },
      { value: 3, short: "3", desc: "Equilibrado" },
      { value: 4, short: "4", desc: "Focado e motivado" },
      { value: 5, short: "5", desc: "Foco competitivo total" },
    ],
  },
];

const QUICK_HABIT_PRESETS: {
  code: RecoveryAttitudeCode;
  label: string;
  bonusEa: number;
  icon: typeof Droplets;
}[] = [
  {
    code: "hydration_nutrition",
    label: "Hidratação",
    bonusEa: 60,
    icon: Droplets,
  },
  {
    code: "mobility_session",
    label: "Mobilidade",
    bonusEa: 75,
    icon: Activity,
  },
  {
    code: "vagal_breathing",
    label: "Respiração",
    bonusEa: 40,
    icon: HeartPulse,
  },
];

export function DailyDecisionCard({
  decision,
  initialCheckin,
  adaptiveProfile,
}: {
  decision: DailyDecisionResult;
  initialCheckin: MorningCheckinInput | null;
  adaptiveProfile?: AdaptiveAthleteMLProfile;
}) {
  const router = useRouter();
  const [openCheckinModal, setOpenCheckinModal] = useState(false);
  const [openRechargeModal, setOpenRechargeModal] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState<MorningCheckinInput>({
    sleepQuality: initialCheckin?.sleepQuality ?? 4,
    energyLevel: initialCheckin?.energyLevel ?? 4,
    muscleFreshness: initialCheckin?.muscleFreshness ?? 4,
    moodLevel: initialCheckin?.moodLevel ?? 4,
  });

  const [loggedAttitudes, setLoggedAttitudes] = useState<RecoveryAttitudeCode[]>(
    adaptiveProfile?.todayLoggedAttitudes || []
  );

  const livePreviewScore = calculateSubjectiveReadinessScore(form);

  const handleSaveCheckin = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      await submitMorningCheckin(form);
      setOpenCheckinModal(false);
      router.refresh();
    });
  };

  const handleToggleAttitude = (code: RecoveryAttitudeCode) => {
    setLoggedAttitudes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
    startTransition(async () => {
      await toggleRecoveryAttitude(code);
      router.refresh();
    });
  };

  const availableEa = adaptiveProfile?.availableReserveEa ?? 1700;
  const capacityEa = adaptiveProfile?.personalCapacityEa ?? 1700;
  const drainEa = adaptiveProfile?.trainingDrainEa ?? 0;
  const rechargeEa = adaptiveProfile?.recoveryRechargeEa ?? 0;
  const reservePct = Math.min(
    100,
    Math.max(6, Math.round((availableEa / Math.max(1, capacityEa)) * 100))
  );

  const isHighEnergy = reservePct >= 70;
  const isModerateEnergy = reservePct >= 45 && reservePct < 70;

  const activeHabitSuggestion = (() => {
    if (form.sleepQuality <= 2) {
      return {
        title: "Sono Curto Detectado",
        text: "Pausa de 15 min sem celular após o almoço e 500ml de água fria reidratam a fáscia e restauram sua bateria.",
        tag: "+15 EA",
      };
    }
    if (form.moodLevel <= 2) {
      return {
        title: "Carga de Tensão / Estresse",
        text: "5 minutos de respiração consciente (inspire 4s, expire 4s) reduzem o cortisol e reativam o foco neural.",
        tag: "+10 EA",
      };
    }
    if (form.muscleFreshness <= 2) {
      return {
        title: "Musculatura Carregada",
        text: "10 minutos de mobilidade solta ou banho morno aceleram a drenagem muscular e o alívio articular.",
        tag: "+15 EA",
      };
    }
    if (availableEa >= capacityEa * 0.85) {
      return {
        title: "Bateria em Alta Performance",
        text: "Reserva de energia em ótimo nível. Mantenha hidratação constante e aproveite para buscar consistência.",
        tag: "Alta carga",
      };
    }
    return {
      title: "Ritmo Saudável & Constância",
      text: "Equilíbrio estável. Mantenha sono regular e refeições nutritivas para sustentar sua curva de energia.",
      tag: "Constância",
    };
  })();

  const batteryStatusLabel =
    decision.tier === "green_push"
      ? "Pronto para Acelerar"
      : decision.tier === "yellow_modulate"
        ? "Ritmo Consciente"
        : "Priorize Recarga";

  return (
    <>
      <style>{`
        @keyframes selyeAuraPulse {
          0%, 100% {
            opacity: 0.35;
            transform: scale(1) translate(0, 0);
          }
          50% {
            opacity: 0.68;
            transform: scale(1.10) translate(1.5%, -1.5%);
          }
        }
        @keyframes selyeBarWave {
          0%, 100% {
            transform: scaleY(0.45);
          }
          50% {
            transform: scaleY(1);
          }
        }
      `}</style>

      <section
        aria-label="Bateria do Corpo e Energia Disponível"
        className={`rounded-2xl p-4 sm:p-5 border text-white shadow-lg relative overflow-hidden transition-all duration-500 ${
          isHighEnergy
            ? "border-lima/40 bg-gradient-to-br from-[#121A17] via-[#16231E] to-[#111815]"
            : isModerateEnergy
              ? "border-amber-400/35 bg-gradient-to-br from-[#181B15] via-[#20221A] to-[#141612]"
              : "border-red-400/30 bg-gradient-to-br from-[#1C1616] via-[#241A1A] to-[#181313]"
        }`}
      >
        {/* ANIMAÇÃO DE BACKGROUND BIOLUMINESCENTE CONECTADA À EA */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-20 w-72 h-72 rounded-full blur-3xl transition-opacity"
          style={{
            background: isHighEnergy
              ? "radial-gradient(circle, rgba(199,240,0,0.28) 0%, rgba(16,185,129,0.18) 50%, transparent 75%)"
              : isModerateEnergy
                ? "radial-gradient(circle, rgba(234,179,8,0.22) 0%, rgba(199,240,0,0.14) 50%, transparent 75%)"
                : "radial-gradient(circle, rgba(239,68,68,0.20) 0%, rgba(245,158,11,0.12) 50%, transparent 75%)",
            animation: `selyeAuraPulse ${isHighEnergy ? "4.2s" : "6s"} ease-in-out infinite`,
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-20 -bottom-20 w-64 h-64 rounded-full blur-3xl transition-opacity"
          style={{
            background: isHighEnergy
              ? "radial-gradient(circle, rgba(16,185,129,0.22) 0%, rgba(199,240,0,0.12) 50%, transparent 75%)"
              : "radial-gradient(circle, rgba(199,240,0,0.10) 0%, transparent 70%)",
            animation: `selyeAuraPulse ${isHighEnergy ? "5.5s" : "7.5s"} ease-in-out infinite reverse`,
          }}
        />

        <div className="relative z-10 flex flex-col gap-3">
          {/* LINHA PRINCIPAL INTEGRADA: BATERIA DO CORPO + EA + PORCENTAGEM + CHECKIN + SETA */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Lado Esquerdo: Nome Redesenhado + Saldo de EA */}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="w-1.5 h-1.5 rounded-full bg-lima animate-pulse" />
                <span className="text-[11px] font-mono uppercase tracking-widest text-nevoa font-semibold">
                  Bateria do Corpo
                </span>
                <span className="text-white/20">·</span>
                <span className="text-xs text-white/70 font-medium">
                  {batteryStatusLabel}
                </span>
              </div>

              <div className="flex items-baseline gap-2 mt-1 flex-wrap">
                <h2 className="text-2xl sm:text-3xl font-extrabold font-mono text-white tracking-tight leading-tight">
                  {availableEa.toLocaleString("pt-BR")}{" "}
                  <span className="text-lima text-lg sm:text-xl font-sans font-bold">
                    EA
                  </span>
                </h2>
                <span className="text-xs text-nevoa">
                  livres hoje <span className="text-white/40">/</span> {capacityEa.toLocaleString("pt-BR")} EA
                </span>
              </div>
            </div>

            {/* Lado Direito: Porcentagem + Checkin + +EA + Seta juntos em linha */}
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center flex-wrap">
              {/* Apenas a porcentagem com barras vitais (palavra Prontidão removida) */}
              <div
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/12 shadow-inner backdrop-blur-sm"
                title={`Nível biológico: ${decision.readinessScore}%`}
              >
                <span className="text-xs font-mono font-bold text-white leading-none">
                  {decision.readinessScore}%
                </span>

                <div className="flex items-end gap-0.5 h-4 pl-1.5 border-l border-white/15">
                  {[0.4, 0.7, 0.9, 0.6].map((baseHeight, i) => {
                    const isLit = decision.readinessScore >= (i + 1) * 22;
                    return (
                      <span
                        key={i}
                        className={`w-1 rounded-full transition-all ${
                          isLit
                            ? "bg-lima shadow-[0_0_5px_rgba(199,240,0,0.6)]"
                            : "bg-white/20"
                        }`}
                        style={{
                          height: `${Math.round(baseHeight * 14)}px`,
                          animation: isLit
                            ? `selyeBarWave ${1.2 + i * 0.3}s ease-in-out infinite`
                            : "none",
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Botão de Check-in */}
              <button
                type="button"
                onClick={() => setOpenCheckinModal(true)}
                className="h-8 px-3 rounded-lg bg-lima hover:brightness-105 active:scale-[0.98] text-grafite text-xs font-mono font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                <Sun size={13} />
                <span>
                  {decision.hasCheckinToday ? "Check-in feito" : "Check-in (+EA)"}
                </span>
              </button>

              {/* Botão +EA Recarga */}
              <button
                type="button"
                onClick={() => setOpenRechargeModal(true)}
                className="h-8 px-2.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] text-white border border-white/15 text-xs font-mono inline-flex items-center gap-1 transition-all cursor-pointer"
                title="Hábitos de Recarga (+EA)"
              >
                <BatteryCharging size={13} className="text-lima" />
                <span>+EA</span>
                {loggedAttitudes.length > 0 && (
                  <span className="px-1 py-0.2 rounded bg-lima text-grafite text-[9px] font-bold">
                    {loggedAttitudes.length}
                  </span>
                )}
              </button>

              {/* Seta para expandir/recolher detalhes colocada junta */}
              <button
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
                aria-expanded={isExpanded}
                aria-label={
                  isExpanded ? "Recolher detalhes" : "Expandir detalhes"
                }
                className="h-8 w-8 rounded-lg border border-white/12 bg-white/[0.05] hover:bg-white/[0.12] text-nevoa hover:text-white flex items-center justify-center transition-all cursor-pointer shrink-0"
              >
                {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>
            </div>
          </div>

          {/* Barra de Carga Esguia Bioluminescente */}
          <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden shadow-inner">
            <div
              className="h-full rounded-full bg-gradient-to-r from-lima via-emerald-400 to-sky-400 transition-all duration-700 shadow-[0_0_8px_rgba(199,240,0,0.4)]"
              style={{ width: `${reservePct}%` }}
            />
          </div>

          {/* Linha Concisa de Realidade Fisiológica (Argumento imediato do dia a dia) */}
          {adaptiveProfile?.energyContext && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-nevoa">
              <span className="truncate">
                <strong className="text-white/90 font-semibold">
                  {adaptiveProfile.energyContext.feelingHeadlinePt}:
                </strong>{" "}
                {adaptiveProfile.energyContext.raw7DayDrainEa > 0
                  ? `${adaptiveProfile.energyContext.circadianClearedPercent}% do esforço da semana já limpo pelo sono (+${adaptiveProfile.energyContext.circadianClearedEa} EA)`
                  : "Sistemas energético e neuromuscular 100% recarregados"}
              </span>
              <button
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
                className="text-[10px] font-mono text-lima hover:underline cursor-pointer shrink-0"
              >
                {isExpanded ? "Ocultar porquê" : "Entender cálculo"}
              </button>
            </div>
          )}

          {/* ACORDEÃO EXPANSÍVEL: ARGUMENTO REAL DO DIA A DIA, PILARES DO CÁLCULO E SUGESTÃO ATIVA */}
          {isExpanded && (
            <div className="pt-2.5 border-t border-white/10 flex flex-col gap-2.5 animate-in fade-in duration-200">
              {adaptiveProfile?.energyContext ? (
                <div className="rounded-xl border border-white/10 bg-black/30 p-3 flex flex-col gap-2.5">
                  <p className="text-xs text-white/90 leading-relaxed">
                    {adaptiveProfile.energyContext.realLifeArgumentPt}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1.5 border-t border-white/10">
                    {adaptiveProfile.energyContext.factors.map((f) => (
                      <div
                        key={f.id}
                        className="rounded-lg bg-white/[0.04] border border-white/8 px-2.5 py-2 flex flex-col gap-0.5"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-mono text-nevoa truncate">
                            {f.labelPt}
                          </span>
                          <span
                            className={`text-[10px] font-mono font-bold shrink-0 ${
                              f.tone === "positive"
                                ? "text-lima"
                                : f.tone === "caution"
                                  ? "text-amber-300"
                                  : "text-white"
                            }`}
                          >
                            {f.valuePt}
                          </span>
                        </div>
                        <p className="text-[10px] text-nevoa/80 leading-snug">
                          {f.explanationPt}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between text-[11px] font-mono text-nevoa">
                  <span>
                    Fadiga residual ativa:{" "}
                    <strong className="text-red-300">-{drainEa} EA</strong>
                  </span>
                  <span>
                    Recarga com hábitos:{" "}
                    <strong className="text-lima">+{rechargeEa} EA</strong>
                  </span>
                </div>
              )}

              <div className="rounded-xl border border-white/10 bg-black/25 p-3 flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Sparkles size={12} className="text-lima shrink-0" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider truncate">
                      {activeHabitSuggestion.title}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-lima/20 text-lima shrink-0">
                    {activeHabitSuggestion.tag}
                  </span>
                </div>
                <p className="text-xs text-nevoa leading-relaxed">
                  {activeHabitSuggestion.text}
                </p>

                <div className="pt-1.5 border-t border-white/10 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-mono text-nevoa uppercase tracking-wider mr-1">
                    Atalhos:
                  </span>
                  {QUICK_HABIT_PRESETS.map((preset) => {
                    const Icon = preset.icon;
                    const isLogged = loggedAttitudes.includes(preset.code);
                    return (
                      <button
                        key={preset.code}
                        type="button"
                        disabled={isPending}
                        onClick={() => handleToggleAttitude(preset.code)}
                        className={`h-6 px-2 rounded-full text-[10px] font-mono font-medium inline-flex items-center gap-1 transition-all cursor-pointer ${
                          isLogged
                            ? "bg-lima text-grafite font-bold"
                            : "bg-white/[0.05] hover:bg-white/[0.10] text-nevoa hover:text-white border border-white/10"
                        }`}
                      >
                        {isLogged ? (
                          <Check size={10} strokeWidth={2.8} />
                        ) : (
                          <Icon size={10} className="text-lima" />
                        )}
                        <span>{preset.label}</span>
                        <span className="opacity-75">+{preset.bonusEa}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Modal 1: Check-in Matinal via ModalPortal */}
      <ModalPortal
        open={openCheckinModal}
        onClose={() => setOpenCheckinModal(false)}
        ariaLabel="Check-in Matinal"
        maxWidthClass="sm:max-w-lg"
      >
        <form
          onSubmit={handleSaveCheckin}
          className="w-full bg-surface border border-line rounded-2xl shadow-2xl p-5 sm:p-6 flex flex-col gap-4 max-h-[88dvh] overflow-y-auto"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="t-label !text-accent-text">
                Prontidão Biológica · Check-in Matinal
              </span>
              <h2 className="t-h2 mt-0.5">Como seu corpo acordou hoje?</h2>
              <p className="text-xs text-muted mt-0.5">
                Toque de 1 a 5 em cada item para calibrar a bateria do seu corpo (EA).
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpenCheckinModal(false)}
              aria-label="Fechar check-in"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-foreground hover:bg-foreground/5 cursor-pointer shrink-0"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {DIMENSIONS.map((dim) => {
              const Icon = dim.icon;
              const currentVal = form[dim.key];
              const currentDesc =
                dim.levels.find((l) => l.value === currentVal)?.desc || "";

              return (
                <div
                  key={dim.key}
                  className="rounded-xl border border-line p-3.5 bg-foreground/[0.02] flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-foreground inline-flex items-center gap-1.5">
                      <Icon size={14} className="text-accent-text" />
                      <span>{dim.label}</span>
                    </span>
                    <span className="text-[11px] font-mono text-muted">
                      {currentDesc}
                    </span>
                  </div>

                  <div className="grid grid-cols-5 gap-1.5">
                    {dim.levels.map((lvl) => {
                      const active = currentVal === lvl.value;
                      return (
                        <button
                          key={lvl.value}
                          type="button"
                          aria-pressed={active}
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              [dim.key]: lvl.value,
                            }))
                          }
                          className={`h-9 rounded-lg border font-mono text-xs transition-all cursor-pointer ${
                            active
                              ? "bg-lima text-grafite border-lima font-semibold shadow-sm"
                              : "border-line bg-surface text-muted hover:text-foreground"
                          }`}
                        >
                          {lvl.short}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-xl border border-line bg-noite text-osso px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-nevoa block">
                Prontidão Estimada
              </span>
              <p className="text-xs text-nevoa mt-0.5">
                {form.sleepQuality >= 4
                  ? "Sono restaurador: recarrega +EA na sua Bateria"
                  : form.sleepQuality <= 2
                    ? "Sono leve detectado: orienta pausa e hidratação"
                    : "Calibrado com seu ritmo corporal"}
              </p>
            </div>
            <span className="t-data text-2xl font-semibold text-lima shrink-0">
              {livePreviewScore}%
            </span>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="btn btn-primary h-10 w-full text-xs font-mono font-bold"
          >
            {isPending ? "Salvando..." : "Confirmar e Atualizar Bateria"}
          </button>
        </form>
      </ModalPortal>

      {/* Modal 2: Catálogo de Hábitos de Recarga (+EA) via ModalPortal */}
      <ModalPortal
        open={openRechargeModal}
        onClose={() => setOpenRechargeModal(false)}
        ariaLabel="Recarregar Bateria do Corpo (+EA)"
        maxWidthClass="sm:max-w-xl"
      >
        <div className="w-full bg-surface border border-line rounded-2xl shadow-2xl p-5 sm:p-6 flex flex-col gap-4 max-h-[88dvh] overflow-y-auto">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="t-label !text-accent-text inline-flex items-center gap-1.5">
                <BatteryCharging size={13} />
                <span>Hábitos Regenerativos (+EA)</span>
              </span>
              <h2 className="t-h2 mt-0.5">Recarregue a Bateria do Seu Corpo</h2>
              <p className="text-xs text-muted mt-0.5">
                Pequenas atitudes diárias que reduzem o estresse e aceleram sua recuperação entre treinos.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpenRechargeModal(false)}
              aria-label="Fechar"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-foreground hover:bg-foreground/5 cursor-pointer shrink-0"
            >
              <X size={16} />
            </button>
          </div>

          <div className="divide-y divide-line">
            {RECOVERY_ATTITUDES_CATALOG.map((att) => {
              const active = loggedAttitudes.includes(att.code);
              return (
                <div
                  key={att.code}
                  className="py-3 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-semibold text-foreground">
                        {att.labelPt}
                      </h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-lima/20 text-accent-text">
                        +{att.baseRechargeEa} EA
                      </span>
                    </div>
                    <p className="text-[11px] text-muted mt-1 leading-relaxed">
                      {att.descriptionPt}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleToggleAttitude(att.code)}
                    className={`h-8 px-3 rounded-lg text-xs font-mono font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                      active
                        ? "bg-lima text-grafite font-bold"
                        : "border border-line bg-surface hover:bg-foreground/5 text-muted hover:text-foreground"
                    }`}
                  >
                    {active ? <Check size={12} strokeWidth={2.8} /> : null}
                    <span>{active ? "Feito hoje" : "Marcar"}</span>
                  </button>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setOpenRechargeModal(false)}
            className="btn btn-primary h-9 w-full text-xs font-mono font-bold mt-2"
          >
            Concluir
          </button>
        </div>
      </ModalPortal>
    </>
  );
}
