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
  Compass,
  Sun,
  Check,
  X,
  Moon,
  Zap,
  Activity,
  Smile,
  ShieldCheck,
  BatteryCharging,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle2,
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
    icon: Zap,
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
    label: "Estado Muscular (Sem Dor/DOMS)",
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

function ReadinessGauge({
  score,
  tier,
}: {
  score: number;
  tier: DailyDecisionResult["tier"];
}) {
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const norm = Math.max(0, Math.min(1, score / 100));
  const strokeDashoffset = circumference * (1 - norm);
  const strokeColor =
    tier === "green_push"
      ? "var(--lima)"
      : tier === "yellow_modulate"
        ? "#e0b354"
        : "#e57373";

  return (
    <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
      <svg
        viewBox="0 0 72 72"
        className="w-full h-full -rotate-90"
        role="img"
        aria-label={`Prontidão ${score} de 100`}
      >
        <circle
          cx="36"
          cy="36"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          className="text-white/10"
        />
        <circle
          cx="36"
          cy="36"
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: "stroke-dashoffset 450ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="t-data text-2xl font-bold text-osso leading-none">
          {score}
        </span>
      </div>
    </div>
  );
}

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
  const [expandedAttitude, setExpandedAttitude] =
    useState<RecoveryAttitudeCode | null>("mobility_session");
  const [dismissedOverride, setDismissedOverride] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState<MorningCheckinInput>({
    sleepQuality: initialCheckin?.sleepQuality ?? 4,
    energyLevel: initialCheckin?.energyLevel ?? 4,
    muscleFreshness: initialCheckin?.muscleFreshness ?? 4,
    moodLevel: initialCheckin?.moodLevel ?? 4,
  });

  const [loggedAttitudes, setLoggedAttitudes] = useState<
    RecoveryAttitudeCode[]
  >(adaptiveProfile?.todayLoggedAttitudes || []);

  const livePreviewScore = calculateSubjectiveReadinessScore(form);

  const handleSaveCheckin = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      await submitMorningCheckin(form);
      setOpenCheckinModal(false);
      setDismissedOverride(false);
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

  const tierBadgeStyle =
    decision.tier === "green_push"
      ? "bg-lima text-grafite"
      : decision.tier === "yellow_modulate"
        ? "bg-[#e0b354] text-noite"
        : "bg-[#e57373] text-noite";

  return (
    <>
      <section
        aria-label="Decisão do Dia, Prontidão e Reserva de Energia Adaptativa"
        className="card p-5 sm:p-6"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* ZONA 1 (3 colunas): Medidor Radial de Prontidão + Balanço Bidirecional EA */}
          <div className="lg:col-span-3 surface-hero !rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-3.5">
            <ReadinessGauge
              score={decision.readinessScore}
              tier={decision.tier}
            />

            <div className="min-w-0 flex-1 flex flex-col justify-between gap-2">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-nevoa block">
                  Reserva Adaptativa
                </span>
                <p className="t-data text-xl font-bold text-lima leading-tight mt-0.5">
                  {adaptiveProfile
                    ? `${adaptiveProfile.availableReserveEa} EA`
                    : `${decision.readinessScore}%`}
                </p>
                <span className="text-[10px] text-nevoa/90 block mt-0.5">
                  Energia livre do seu corpo hoje
                </span>
              </div>

              {adaptiveProfile && (
                <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-white/12 text-[11px] font-mono">
                  <div>
                    <span className="text-[9px] text-nevoa block uppercase">
                      Consumo
                    </span>
                    <span className="text-osso font-semibold">
                      -{adaptiveProfile.trainingDrainEa} EA
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-nevoa block uppercase">
                      Recarga
                    </span>
                    <span className="text-lima font-semibold">
                      +{adaptiveProfile.recoveryRechargeEa} EA
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ZONA 2 (5 colunas): Bússola do Dia + Explicação + Diretriz Prática */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-3 px-1">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 t-label !text-accent-text">
                  <Compass size={14} className="text-accent-text shrink-0" />
                  <span>Decisão do Dia</span>
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold shadow-sm ${tierBadgeStyle}`}
                >
                  {decision.badgeLabel}
                </span>
                {decision.hasCheckinToday && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono text-muted">
                    <ShieldCheck size={12} className="text-accent-text" />
                    <span>Calibrado hoje</span>
                  </span>
                )}
              </div>

              <h2 className="t-h2 mt-2 text-foreground">
                {dismissedOverride
                  ? "Autonomia Ativa: você escolheu seguir seu plano original hoje"
                  : decision.headline}
              </h2>
              <p className="text-xs sm:text-[13px] text-muted mt-1.5 leading-relaxed">
                {decision.whyExplanation}
              </p>
            </div>

            <div className="rounded-xl bg-foreground/[0.03] border border-line px-4 py-3 flex items-start justify-between gap-3">
              <p className="text-xs text-foreground leading-relaxed">
                <span className="font-mono text-[10px] uppercase tracking-wider text-accent-text font-semibold mr-1.5">
                  Diretriz:
                </span>
                {decision.suggestedAction}
              </p>
              {decision.tier !== "green_push" && !dismissedOverride && (
                <button
                  type="button"
                  onClick={() => setDismissedOverride(true)}
                  className="text-[11px] font-mono text-muted hover:text-foreground underline shrink-0 cursor-pointer"
                >
                  Ignorar
                </button>
              )}
            </div>
          </div>

          {/* ZONA 3 (4 colunas): Grade 2×2 de Sinais do Corpo + Ações Diretas */}
          <div className="lg:col-span-4 flex flex-col justify-between gap-3.5 lg:border-l lg:border-line lg:pl-5">
            <div className="grid grid-cols-2 gap-2.5">
              {decision.factors.slice(0, 4).map((f) => (
                <div
                  key={f.label}
                  className="rounded-xl bg-foreground/[0.025] border border-line px-3 py-2.5 flex flex-col justify-between transition-colors hover:border-mineral/60"
                >
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted truncate">
                    {f.label}
                  </span>
                  <span
                    className={`text-xs font-mono mt-0.5 truncate ${
                      f.impact === "positive"
                        ? "text-accent-text font-semibold"
                        : f.impact === "caution"
                          ? "text-[#e0b354] font-semibold"
                          : "text-foreground font-medium"
                    }`}
                  >
                    {f.valueText}
                  </span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOpenCheckinModal(true)}
                className={`btn h-9 px-3 text-xs w-full ${
                  decision.hasCheckinToday ? "btn-ghost" : "btn-primary"
                }`}
              >
                <Sun size={14} className="shrink-0" />
                <span className="truncate">
                  {decision.hasCheckinToday
                    ? "Check-in Feito"
                    : "Check-in Matinal"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setOpenRechargeModal(true)}
                className="btn btn-dark h-9 px-3 text-xs font-mono w-full"
                title="Protocolos guiados que aumentam sua Reserva de Energia Adaptativa (+EA)"
              >
                <BatteryCharging size={14} className="text-lima shrink-0" />
                <span className="truncate">Recarregar +EA</span>
                {loggedAttitudes.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-lima text-grafite text-[10px] font-semibold shrink-0">
                    +{loggedAttitudes.length}
                  </span>
                )}
              </button>
            </div>
          </div>
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
                Toque de 1 a 5 em cada eixo para calibrar sua Decisão do Dia e sua Reserva de Energia Adaptativa (EA).
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
                Índice de Prontidão de Hoje
              </span>
              <p className="text-xs text-nevoa mt-0.5">
                {form.sleepQuality >= 4
                  ? "Sono reparador detectado: adiciona +EA à sua Reserva Adaptativa"
                  : form.sleepQuality <= 2
                    ? "Sono curto detectado: reduz -EA da sua reserva disponível"
                    : "Cruzado automaticamente com sua carga de ontem e seu ritmo pessoal"}
              </p>
            </div>
            <span className="t-data text-2xl font-semibold text-lima shrink-0">
              {livePreviewScore}/100
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <span className="text-[11px] text-muted">
              Dados privados · Calibração contínua do seu perfil
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOpenCheckinModal(false)}
                className="btn btn-ghost h-10 px-4 text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="btn btn-primary h-10 px-5 text-xs"
              >
                <Check size={14} strokeWidth={2.4} />
                <span>
                  {isPending ? "Calibrando..." : "Salvar Check-in"}
                </span>
              </button>
            </div>
          </div>
        </form>
      </ModalPortal>

      {/* Modal 2: Protocolos Guiados Passo a Passo para Recarregar Energia Adaptativa (+EA) */}
      <ModalPortal
        open={openRechargeModal}
        onClose={() => setOpenRechargeModal(false)}
        ariaLabel="Protocolos para Recarregar Energia Adaptativa"
        maxWidthClass="sm:max-w-xl"
      >
        <div className="w-full bg-surface border border-line rounded-2xl shadow-2xl p-5 sm:p-6 flex flex-col gap-4 max-h-[88dvh] overflow-y-auto">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="t-label !text-accent-text">
                Protocolos de Recuperação Ativa · +EA
              </span>
              <h2 className="t-h2 mt-0.5">
                Recarregar sua Energia Adaptativa
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Abra qualquer protocolo abaixo para ver o passo a passo prático e marque os hábitos concluídos hoje para expandir sua reserva.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpenRechargeModal(false)}
              aria-label="Fechar protocolos de recarga"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-foreground hover:bg-foreground/5 cursor-pointer shrink-0"
            >
              <X size={16} />
            </button>
          </div>

          {adaptiveProfile && (
            <div className="rounded-xl bg-noite text-osso p-4 flex flex-col gap-2.5 border border-line">
              <div className="flex items-center justify-between gap-2 text-xs font-mono">
                <span className="text-lima font-semibold">
                  {adaptiveProfile.learningStageLabel}
                </span>
                <span className="text-nevoa">
                  Capacidade Semanal: {adaptiveProfile.personalCapacityEa} EA
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1">
                <div className="p-2.5 rounded-lg bg-white/[0.05]">
                  <span className="text-[10px] font-mono text-nevoa block">
                    Esforço (-EA)
                  </span>
                  <p className="t-data text-sm font-semibold text-osso mt-0.5">
                    -{adaptiveProfile.trainingDrainEa} EA
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-lima/15 border border-lima/30">
                  <span className="text-[10px] font-mono text-lima block">
                    Recarga (+EA)
                  </span>
                  <p className="t-data text-sm font-semibold text-lima mt-0.5">
                    +{adaptiveProfile.recoveryRechargeEa} EA
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-white/[0.05]">
                  <span className="text-[10px] font-mono text-nevoa block">
                    Reserva Livre
                  </span>
                  <p className="t-data text-sm font-semibold text-osso mt-0.5">
                    {adaptiveProfile.availableReserveEa} EA
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2.5">
            {RECOVERY_ATTITUDES_CATALOG.map((item) => {
              const active = loggedAttitudes.includes(item.code);
              const isExpanded = expandedAttitude === item.code;
              const scaledGain = Math.round(
                item.baseRechargeEa *
                  (adaptiveProfile?.recoveryGainMultiplier ?? 1.0)
              );

              return (
                <article
                  key={item.code}
                  className={`rounded-xl border transition-all overflow-hidden ${
                    active
                      ? "border-lima bg-lima/10"
                      : "border-line bg-foreground/[0.02]"
                  }`}
                >
                  <div className="p-3.5 flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedAttitude(isExpanded ? null : item.code)
                      }
                      aria-expanded={isExpanded}
                      className="min-w-0 flex-1 text-left cursor-pointer"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xs font-semibold text-foreground">
                          {item.labelPt}
                        </h3>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface border border-line text-[10px] font-mono text-muted">
                          <Clock size={10} />
                          <span>{item.durationLabelPt}</span>
                        </span>
                        <span className="text-[10px] font-mono text-accent-text">
                          {item.timingLabelPt}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted mt-1">
                        {item.descriptionPt}
                      </p>
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono text-accent-text mt-1.5 hover:underline">
                        <span>
                          {isExpanded
                            ? "Ocultar passo a passo"
                            : "Ver passo a passo de execução"}
                        </span>
                        {isExpanded ? (
                          <ChevronUp size={12} />
                        ) : (
                          <ChevronDown size={12} />
                        )}
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={isPending}
                      aria-pressed={active}
                      onClick={() => handleToggleAttitude(item.code)}
                      className={`h-9 px-3 rounded-lg border text-xs font-mono font-semibold inline-flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                        active
                          ? "bg-lima text-grafite border-lima"
                          : "bg-surface border-line text-foreground hover:border-mineral"
                      }`}
                    >
                      <CheckCircle2 size={13} />
                      <span>
                        {active ? `Concluído (+${scaledGain} EA)` : `+${scaledGain} EA`}
                      </span>
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="px-3.5 pb-3.5 pt-2 border-t border-line/60 bg-surface/60">
                      <span className="t-label block mb-2">
                        Passo a Passo Recomendado
                      </span>
                      <ol className="flex flex-col gap-2">
                        {item.stepsPt.map((step, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2.5 text-xs text-foreground leading-relaxed"
                          >
                            <span className="w-5 h-5 rounded-full bg-lima text-grafite font-mono text-[11px] font-semibold flex items-center justify-center shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => setOpenRechargeModal(false)}
              className="btn btn-primary h-10 px-5 text-xs"
            >
              Concluir
            </button>
          </div>
        </div>
      </ModalPortal>
    </>
  );
}
