"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  savePlanningGoal,
  archivePlanningGoal,
  completePlanningGoal,
  addCalendarCommitment,
  removeCalendarCommitment,
  togglePlanDailyCommitment,
  type ActivePlanningSnapshot,
} from "@/actions/planning";
import {
  planEnergeticGrowthCurve,
  type EnergeticCyclePhase,
  type PlanningGoalMode,
} from "@/core/planning/energetic-cycle-planner";
import type { EnrichedCalendarDay } from "@/core/planning/plan-progress";
import { WEEKDAYS_MONDAY_FIRST, jsDayToMondayIndex } from "@/lib/week";
import { ModalPortal } from "@/components/ui/modal-portal";
import {
  CORE_MODALITY_CODES,
  MODALITY_REGISTRY,
  type CoreModalityCode,
} from "@/core/modalities";
import {
  CalendarDays,
  Trophy,
  Sparkles,
  Target,
  Dumbbell,
  BatteryCharging,
  ShieldCheck,
  CalendarOff,
  Check,
  CheckCircle2,
  Plus,
  Trash2,
  X,
  Zap,
  TrendingUp,
  HeartPulse,
  AlertTriangle,
  RotateCcw,
  Flag,
  Clock,
} from "lucide-react";

const PHASE_STYLES: Record<
  EnergeticCyclePhase,
  {
    shortPt: string;
    dotClass: string;
    badgeClass: string;
    cellBorderClass: string;
    strokeColor: string;
    hintPt: string;
  }
> = {
  expansion: {
    shortPt: "Acelerar",
    dotClass: "bg-lima",
    badgeClass: "bg-lima text-grafite",
    cellBorderClass: "border-lima/45 bg-lima/[0.06]",
    strokeColor: "#C7F000",
    hintPt: "Energia em alta · Progredir força e ritmo",
  },
  stabilization: {
    shortPt: "Ritmo",
    dotClass: "bg-sky-400",
    badgeClass: "bg-sky-500/20 text-sky-300 border border-sky-400/40",
    cellBorderClass: "border-sky-400/35 bg-sky-500/[0.05]",
    strokeColor: "#38BDF8",
    hintPt: "Energia estável · Técnica e constância",
  },
  absorption: {
    shortPt: "Recarga",
    dotClass: "bg-amber-400",
    badgeClass: "bg-amber-500/20 text-amber-300 border border-amber-400/40",
    cellBorderClass: "border-amber-400/40 bg-amber-500/[0.06]",
    strokeColor: "#F59E0B",
    hintPt: "Absorção · Somar hábitos +EA e poupar",
  },
  peak: {
    shortPt: "Ápice",
    dotClass: "bg-emerald-400",
    badgeClass: "bg-emerald-400 text-grafite",
    cellBorderClass: "border-emerald-400/55 bg-emerald-500/[0.09]",
    strokeColor: "#34D399",
    hintPt: "Semana Leve pré-prova · Corpo descansado no dia D",
  },
};

function formatDateBr(dateStr: string, withYear = false): string {
  try {
    return new Date(`${dateStr}T12:00:00Z`).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      ...(withYear ? { year: "numeric" } : {}),
    });
  } catch {
    return dateStr;
  }
}

function addDaysStr(baseStr: string, days: number): string {
  const d = new Date(`${baseStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

export function EnergeticCalendarHub({
  snapshot,
}: {
  snapshot: ActivePlanningSnapshot;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { plan, progress, activeGoal, hasCustomGoal } = snapshot;

  // Dia selecionado no calendário (inicia em hoje)
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    progress.todayDay?.dateStr || plan.startDateStr
  );

  // Estado otimista do checklist
  const [optimisticChecks, setOptimisticChecks] = useState<
    Record<string, boolean>
  >({});

  // Feedback de ações
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // Modal 1: Planejador de Competição / Meta de EA
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [goalMode, setGoalMode] = useState<PlanningGoalMode>(
    activeGoal?.mode || "competition"
  );
  const [goalTitle, setGoalTitle] = useState(
    activeGoal?.eventTitle ||
      `Ciclo de Performance · ${MODALITY_REGISTRY[snapshot.athletePrimaryModality].shortNamePt}`
  );
  const [goalModalityCode, setGoalModalityCode] = useState<CoreModalityCode>(
    activeGoal?.modalityCode || snapshot.athletePrimaryModality
  );
  const [goalIncludeStrength, setGoalIncludeStrength] = useState<boolean>(
    activeGoal
      ? activeGoal.complementaryModalityCode === "strength"
      : snapshot.athleteComplementaryModality === "strength"
  );
  const [goalTargetKpiValueStr, setGoalTargetKpiValueStr] = useState<string>(
    activeGoal?.targetKpiValue != null ? String(activeGoal.targetKpiValue) : ""
  );
  const [goalTargetDate, setGoalTargetDate] = useState(
    activeGoal?.targetDate || addDaysStr(snapshot.todayDateStr, 28)
  );
  const baseAnchorEa = Math.max(
    snapshot.personalCapacityEa || 1700,
    snapshot.realCurrentEa || 1700
  );
  const [goalTargetEa, setGoalTargetEa] = useState<number>(
    activeGoal?.targetEa ||
      Math.max(baseAnchorEa + 200, Math.round(baseAnchorEa * 1.12))
  );
  const [goalWorkoutDays, setGoalWorkoutDays] = useState<number[]>(
    activeGoal?.preferredWorkoutDays || [1, 2, 4, 6]
  );
  const [goalNotes, setGoalNotes] = useState(activeGoal?.notes || "");
  const [mobileSectionTab, setMobileSectionTab] = useState<
    "agenda" | "blueprint" | "curve"
  >("agenda");

  // Modal 2: Adicionar Compromisso Pessoal ou Bloqueio
  const [commitModalOpen, setCommitModalOpen] = useState(false);
  const [commitDate, setCommitDate] = useState(
    progress.todayDay?.dateStr || snapshot.todayDateStr
  );
  const [commitKind, setCommitKind] = useState<
    "personal_block" | "custom_habit" | "custom_workout" | "event_milestone"
  >("personal_block");
  const [commitTitle, setCommitTitle] = useState("");
  const [commitNotes, setCommitNotes] = useState("");
  const [commitBlocksWorkout, setCommitBlocksWorkout] = useState(true);
  const [commitEaDelta, setCommitEaDelta] = useState(0);

  // Prévia ao vivo no simulador dentro do Modal 1
  const blockedDatesList = useMemo(
    () =>
      snapshot.commitments
        .filter((c) => c.blocksWorkout)
        .map((c) => c.localDate),
    [snapshot.commitments]
  );

  const selectedGoalModSpec = MODALITY_REGISTRY[goalModalityCode];
  const selectedGoalPrimaryKpi =
    selectedGoalModSpec.kpis.find((k) => k.isPrimaryGoalMetric) ||
    selectedGoalModSpec.kpis[0];

  const liveSimulation = useMemo(() => {
    const parsedKpiVal = Number(goalTargetKpiValueStr.replace(",", "."));
    return planEnergeticGrowthCurve({
      mode: goalMode,
      eventTitle: goalTitle || `Ciclo · ${selectedGoalModSpec.shortNamePt}`,
      modalityCode: goalModalityCode,
      modalityLabelPt: selectedGoalModSpec.shortNamePt,
      complementaryModalityCode:
        goalModalityCode !== "strength" && goalIncludeStrength
          ? "strength"
          : null,
      experienceLevel: snapshot.athleteExperienceLevel,
      primaryKpiKey: selectedGoalPrimaryKpi.key,
      targetKpiValue:
        goalTargetKpiValueStr.trim() !== "" && !Number.isNaN(parsedKpiVal)
          ? parsedKpiVal
          : null,
      kpiUnit: selectedGoalPrimaryKpi.unit,
      userRoutines: snapshot.linkedRoutines,
      currentEa: baseAnchorEa,
      targetEa: goalTargetEa,
      startDateStr: snapshot.todayDateStr,
      targetDateStr: goalTargetDate,
      targetDaysPerWeek: Math.max(2, goalWorkoutDays.length),
      preferredWorkoutJsDays:
        goalWorkoutDays.length >= 2 ? goalWorkoutDays : [1, 3, 5],
      blockedDates: blockedDatesList,
      strengthRecordsCount: snapshot.strengthRecordsCount,
      monthlyVolumeKg: snapshot.monthlyVolumeKg,
    });
  }, [
    goalMode,
    goalTitle,
    goalModalityCode,
    goalIncludeStrength,
    goalTargetKpiValueStr,
    selectedGoalModSpec,
    selectedGoalPrimaryKpi,
    snapshot.athleteExperienceLevel,
    snapshot.linkedRoutines,
    snapshot.realCurrentEa,
    goalTargetEa,
    snapshot.todayDateStr,
    goalTargetDate,
    goalWorkoutDays,
    blockedDatesList,
    snapshot.strengthRecordsCount,
    snapshot.monthlyVolumeKg,
  ]);

  // Aplica estado otimista nos dias enriquecidos
  const daysWithOptimistic: EnrichedCalendarDay[] = useMemo(() => {
    return progress.enrichedDays.map((day) => {
      const commitments = day.commitments.map((c) => {
        const overridden = optimisticChecks[c.id];
        return typeof overridden === "boolean"
          ? { ...c, isCompleted: overridden }
          : c;
      });
      const completedCount = commitments.filter((c) => c.isCompleted).length;
      const totalCommitmentsCount = commitments.length;
      return {
        ...day,
        commitments,
        completedCount,
        totalCommitmentsCount,
        dailyAdherencePercent:
          totalCommitmentsCount > 0
            ? Math.round((completedCount / totalCommitmentsCount) * 100)
            : 0,
      };
    });
  }, [progress.enrichedDays, optimisticChecks]);

  const selectedDay =
    daysWithOptimistic.find((d) => d.dateStr === selectedDateStr) ||
    daysWithOptimistic[0];

  // Padding inicial para alinhar o calendário estritamente em Segunda -> Domingo
  const leadingEmptySlots = useMemo(() => {
    const first = daysWithOptimistic[0];
    if (!first) return 0;
    return jsDayToMondayIndex(first.jsDay);
  }, [daysWithOptimistic]);

  // Cálculos do gráfico SVG da curva de EA
  const curveChart = useMemo(() => {
    const pts = daysWithOptimistic;
    if (pts.length === 0) return null;
    const minEa = Math.min(
      plan.currentEa,
      progress.currentRealEa,
      ...pts.map((p) => p.projectedEa)
    );
    const maxEa = Math.max(
      plan.projectedPeakEa,
      plan.requestedTargetEa,
      ...pts.map((p) => p.projectedEa)
    );
    const padMin = Math.max(0, minEa - 60);
    const padMax = maxEa + 60;
    const span = Math.max(100, padMax - padMin);

    const W = 440;
    const H = 148;
    const padX = 14;
    const padY = 16;

    const mapped = pts.map((d, idx) => {
      const x =
        padX +
        (idx / Math.max(1, pts.length - 1)) * (W - padX * 2);
      const y =
        H - padY - ((d.projectedEa - padMin) / span) * (H - padY * 2);
      return { x, y, day: d };
    });

    const polylinePoints = mapped
      .map((m) => `${m.x.toFixed(1)},${m.y.toFixed(1)}`)
      .join(" ");
    const areaPath =
      mapped.length > 1
        ? `M ${mapped[0].x.toFixed(1)} ${(H - padY).toFixed(1)} L ${mapped
            .map((m) => `${m.x.toFixed(1)} ${m.y.toFixed(1)}`)
            .join(" L ")} L ${mapped[mapped.length - 1].x.toFixed(1)} ${(
            H - padY
          ).toFixed(1)} Z`
        : "";

    const targetY =
      H - padY - ((plan.projectedPeakEa - padMin) / span) * (H - padY * 2);

    return { W, H, mapped, polylinePoints, areaPath, targetY };
  }, [daysWithOptimistic, plan, progress.currentRealEa]);

  const handleToggleWorkoutDay = (jsDay: number) => {
    setGoalWorkoutDays((prev) => {
      if (prev.includes(jsDay)) {
        if (prev.length <= 2) return prev; // Mínimo 2 dias/semana
        return prev.filter((d) => d !== jsDay);
      }
      return [...prev, jsDay];
    });
  };

  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedKpiVal = Number(goalTargetKpiValueStr.replace(",", "."));
    startTransition(async () => {
      await savePlanningGoal({
        mode: goalMode,
        eventTitle:
          goalTitle.trim() || `Ciclo · ${selectedGoalModSpec.shortNamePt}`,
        modalityCode: goalModalityCode,
        modalityLabel: selectedGoalModSpec.shortNamePt,
        complementaryModalityCode:
          goalModalityCode !== "strength" && goalIncludeStrength
            ? "strength"
            : null,
        primaryKpiKey: selectedGoalPrimaryKpi.key,
        targetKpiValue:
          goalTargetKpiValueStr.trim() !== "" && !Number.isNaN(parsedKpiVal)
            ? parsedKpiVal
            : null,
        kpiUnit: selectedGoalPrimaryKpi.unit,
        targetDate: goalTargetDate,
        targetEa: goalTargetEa,
        initialEa: snapshot.realCurrentEa,
        targetDaysPerWeek: goalWorkoutDays.length,
        preferredWorkoutDays: goalWorkoutDays,
        notes: goalNotes.trim() || undefined,
      });
      setGoalModalOpen(false);
      setStatusBanner(
        `Plano de ${selectedGoalModSpec.shortNamePt} ativado no calendário e sincronizado com suas fichas!`
      );
      router.refresh();
    });
  };

  const handleArchiveGoal = () => {
    if (!activeGoal) return;
    startTransition(async () => {
      await archivePlanningGoal(activeGoal.id);
      setStatusBanner(
        "Você retornou ao Ciclo de Vitalidade & Constância."
      );
      router.refresh();
    });
  };

  const handleCompleteGoal = () => {
    if (!activeGoal) return;
    startTransition(async () => {
      await completePlanningGoal(activeGoal.id);
      setStatusBanner(
        `Parabéns! Ciclo "${activeGoal.eventTitle}" concluído e arquivado no seu histórico.`
      );
      router.refresh();
    });
  };

  const handleToggleCheck = (
    dayDateStr: string,
    commitment: EnrichedCalendarDay["commitments"][number]
  ) => {
    const nextVal = !commitment.isCompleted;
    setOptimisticChecks((prev) => ({ ...prev, [commitment.id]: nextVal }));

    startTransition(async () => {
      await togglePlanDailyCommitment({
        commitmentKey: commitment.id,
        localDate: dayDateStr,
        kind: commitment.kind,
        title: commitment.titlePt,
        eaSignedDelta: commitment.eaSignedDelta,
        goalId: activeGoal?.id || null,
      });
      router.refresh();
    });
  };

  const handleAddCommitment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commitTitle.trim()) return;
    startTransition(async () => {
      await addCalendarCommitment({
        localDate: commitDate,
        kind: commitKind,
        title: commitTitle.trim(),
        notes: commitNotes.trim() || undefined,
        blocksWorkout: commitBlocksWorkout,
        eaSignedDelta: commitEaDelta,
        goalId: activeGoal?.id || null,
      });
      setCommitModalOpen(false);
      setCommitTitle("");
      setCommitNotes("");
      setStatusBanner(
        commitBlocksWorkout
          ? `Compromisso salvo em ${formatDateBr(commitDate)}: o Selye protegeu esse dia automaticamente como janela de absorção.`
          : `Compromisso adicionado ao seu calendário em ${formatDateBr(commitDate)}.`
      );
      router.refresh();
    });
  };

  const handleRemoveCustomCommitment = (customId: string) => {
    startTransition(async () => {
      await removeCalendarCommitment(customId);
      router.refresh();
    });
  };

  const todayPhaseMeta = PHASE_STYLES[plan.todayPhase];

  return (
    <div className="flex flex-col gap-6 fade-up">
      {/* Cabeçalho Global da Página */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="t-label !text-accent-text inline-flex items-center gap-1.5">
            <CalendarDays size={13} />
            <span>Ciclo Energético & Planejamento Fisiológico</span>
          </span>
          <h1 className="t-h1 mt-1">Calendário do Seu Corpo</h1>
          <p className="text-sm text-muted mt-1 max-w-2xl">
            Entenda seus dias de maior e menor energia, organize seus compromissos e acompanhe com clareza a curva de <strong>Energia do Corpo (EA)</strong> até sua próxima prova ou meta pessoal.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setCommitDate(selectedDay?.dateStr || snapshot.todayDateStr);
              setCommitModalOpen(true);
            }}
            className="btn btn-ghost h-10 px-3.5 text-xs"
          >
            <Plus size={14} />
            <span>Compromisso / Bloqueio</span>
          </button>

          <button
            type="button"
            onClick={() => setGoalModalOpen(true)}
            className="btn btn-primary h-10 px-4 text-xs"
          >
            <Trophy size={14} />
            <span>
              {hasCustomGoal
                ? "Ajustar Meta / Competição"
                : "Planejar Competição ou Meta"}
            </span>
          </button>
        </div>
      </div>

      {statusBanner && (
        <div
          role="status"
          className="rounded-xl border border-profundo bg-lima/20 px-4 py-3 flex items-center justify-between gap-3 text-xs text-foreground"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} className="text-accent-text shrink-0" />
            <span className="font-medium">{statusBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            aria-label="Fechar aviso"
            className="text-muted hover:text-foreground cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ================= SEÇÃO 1: HERO DO CICLO + CURVA DE EA (BENTO 7 + 5) ================= */}
      <div className="bento-grid items-stretch stagger-1">
        {/* Esquerda (7 cols): Status da Meta / Ciclo Perene */}
        <section className="col-span-12 xl:col-span-7 surface-hero p-5 sm:p-6 flex flex-col justify-between gap-5">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-lima text-grafite">
                  {plan.mode === "competition"
                    ? "Modo Competição & Ápice"
                    : "Ciclo · Constância"}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-white/10 text-osso">
                  {progress.trajectoryBadgePt}
                </span>
              </div>
              <span className="t-data text-xs text-nevoa">
                {progress.daysRemaining === 0
                  ? "Dia da Meta!"
                  : `Faltam ${progress.daysRemaining} dias · Alvo: ${formatDateBr(
                      plan.targetDateStr,
                      true
                    )}`}
              </span>
            </div>

            <div>
              <h2 className="t-h2 !text-osso">{plan.eventTitle}</h2>
              <p className="text-xs text-nevoa mt-1 leading-relaxed">
                {progress.trajectoryMessagePt}
              </p>
            </div>
          </div>

          {/* Barra de Progresso de EA: Atual -> Meta */}
          <div className="rounded-xl bg-white/[0.05] border border-white/10 p-4 flex flex-col gap-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-nevoa block">
                  EA Base → Atual
                </span>
                <p className="t-data text-xl sm:text-2xl font-bold text-lima mt-0.5">
                  {progress.currentRealEa}
                  <span className="text-xs font-normal text-nevoa ml-1">EA</span>
                </p>
                <span className="text-[10px] font-mono text-nevoa/80 block">
                  Base: {snapshot.personalCapacityEa} EA
                </span>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-nevoa block">
                  Meta Planejada
                </span>
                <p className="t-data text-xl sm:text-2xl font-bold text-osso mt-0.5">
                  {plan.projectedPeakEa}
                  <span className="text-xs font-normal text-nevoa ml-1">EA</span>
                </p>
                <span className="text-[10px] font-mono text-nevoa/80 block">
                  Meta fixa do ciclo
                </span>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-nevoa block">
                  Falta Construir
                </span>
                <p className="t-data text-xl sm:text-2xl font-bold text-emerald-400 mt-0.5">
                  {progress.remainingEaToTarget > 0
                    ? `+${progress.remainingEaToTarget}`
                    : "Atingido"}
                  {progress.remainingEaToTarget > 0 && (
                    <span className="text-xs font-normal text-nevoa ml-1">EA</span>
                  )}
                </p>
                <span className="text-[10px] font-mono text-nevoa/80 block">
                  Adesão: {progress.adherencePercent}%
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-lima to-emerald-400 transition-all duration-500"
                  style={{
                    width: `${Math.max(8, progress.eaProgressPercent)}%`,
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono text-nevoa">
                <span>
                  Base inicial: {plan.currentEa} EA · Adesão do plano:{" "}
                  <strong className="text-osso">{progress.adherencePercent}%</strong>
                </span>
                <span>{progress.eaProgressPercent}% da curva</span>
              </div>
            </div>
          </div>

          {/* Fase Biológica de Hoje + Ações de Ciclo */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${todayPhaseMeta.dotClass}`}
              />
              <div className="min-w-0">
                <span className="text-[11px] font-mono text-lima uppercase tracking-wider block">
                  Hoje: {plan.todayPhaseLabelPt}
                </span>
                <p className="text-xs text-nevoa truncate">
                  {plan.todayEnergySummaryPt}
                </p>
              </div>
            </div>

            {hasCustomGoal && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleCompleteGoal}
                  className="h-8 px-3 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-mono text-osso inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Flag size={12} className="text-lima" />
                  <span>Concluir</span>
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleArchiveGoal}
                  className="h-8 px-3 rounded-lg border border-white/15 hover:bg-white/10 text-xs font-mono text-nevoa inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw size={12} />
                  <span>Ciclo Contínuo</span>
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Direita (5 cols): Gráfico SVG da Curva Previsível de EA (no mobile aparece na aba 'Curva & Fases') */}
        <section
          className={`col-span-12 xl:col-span-5 card p-5 sm:p-6 flex-col justify-between gap-4 ${
            mobileSectionTab === "curve" ? "flex" : "hidden xl:flex"
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="t-label !text-accent-text">
                Curva de Crescimento Previsível
              </span>
              <h2 className="t-h3 mt-0.5">
                Projeção de EA ({plan.currentEa} → {plan.projectedPeakEa} EA)
              </h2>
            </div>
            <span className="chip text-[11px] font-mono shrink-0">
              {plan.totalWeeks}{" "}
              {plan.totalWeeks === 1 ? "semana" : "semanas"}
            </span>
          </div>

          {curveChart && (
            <div className="w-full">
              <svg
                viewBox={`0 0 ${curveChart.W} ${curveChart.H}`}
                className="w-full h-40 overflow-visible"
                role="img"
                aria-label="Curva prevista de Energia Adaptativa até a data da meta"
              >
                <defs>
                  <linearGradient
                    id="selyeEaAreaGrad"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#C7F000" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#C7F000" stopOpacity="0.02" />
                  </linearGradient>
                </defs>

                {/* Linha tracejada da Meta */}
                <line
                  x1="12"
                  x2={curveChart.W - 12}
                  y1={curveChart.targetY}
                  y2={curveChart.targetY}
                  stroke="#34D399"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  opacity="0.7"
                />
                <text
                  x={curveChart.W - 14}
                  y={Math.max(12, curveChart.targetY - 5)}
                  textAnchor="end"
                  className="fill-muted text-[9px] font-mono"
                >
                  Meta: {plan.projectedPeakEa} EA
                </text>

                {/* Área sob a curva */}
                {curveChart.areaPath && (
                  <path d={curveChart.areaPath} fill="url(#selyeEaAreaGrad)" />
                )}

                {/* Linha principal */}
                <polyline
                  fill="none"
                  stroke="var(--lima)"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={curveChart.polylinePoints}
                />

                {/* Pontos interativos coloridos pela fase do dia */}
                {curveChart.mapped.map((pt, idx) => {
                  const isSel = pt.day.dateStr === selectedDateStr;
                  const isKeyPoint =
                    idx === 0 ||
                    idx === curveChart.mapped.length - 1 ||
                    pt.day.isToday ||
                    isSel ||
                    idx % Math.max(1, Math.floor(curveChart.mapped.length / 8)) === 0;
                  if (!isKeyPoint) return null;

                  return (
                    <g
                      key={pt.day.dateStr}
                      onClick={() => setSelectedDateStr(pt.day.dateStr)}
                      className="cursor-pointer"
                    >
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isSel ? 5.5 : pt.day.isTargetEventDay ? 5 : 3.5}
                        fill={PHASE_STYLES[pt.day.phase].strokeColor}
                        stroke="var(--surface)"
                        strokeWidth="1.5"
                      />
                    </g>
                  );
                })}
              </svg>

              <div className="flex items-center justify-between text-[11px] font-mono text-muted mt-1 pt-2 border-t border-line">
                <span>Início: {formatDateBr(plan.startDateStr)}</span>
                <span className="text-foreground font-semibold">
                  Selecionado ({formatDateBr(selectedDay.dateStr)}):{" "}
                  {selectedDay.projectedEa} EA
                </span>
                <span className="text-accent-text font-semibold">
                  Ápice: {formatDateBr(plan.targetDateStr)}
                </span>
              </div>
            </div>
          )}

          {/* Legenda rápida das 4 fases */}
          <div className="grid grid-cols-2 gap-1.5 text-[11px] text-muted">
            {(
              ["expansion", "stabilization", "absorption", "peak"] as const
            ).map((ph) => (
              <div key={ph} className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${PHASE_STYLES[ph].dotClass}`}
                />
                <span className="truncate">
                  <strong className="text-foreground">
                    {PHASE_STYLES[ph].shortPt}:
                  </strong>{" "}
                  {ph === "expansion"
                    ? "subir carga"
                    : ph === "stabilization"
                      ? "manter ritmo"
                      : ph === "absorption"
                        ? "somar +EA"
                        : "polimento"}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Filtro Rápido de Visão no Mobile/Tablet (evita excesso de informação empilhada) */}
      <div
        role="tablist"
        aria-label="Organizar visão do calendário"
        className="xl:hidden grid grid-cols-3 gap-1 p-1 rounded-xl border border-line bg-surface"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mobileSectionTab === "agenda"}
          onClick={() => setMobileSectionTab("agenda")}
          className={`h-9 rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer ${
            mobileSectionTab === "agenda"
              ? "bg-lima text-grafite"
              : "text-muted hover:text-foreground"
          }`}
        >
          Agenda & Dia
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mobileSectionTab === "blueprint"}
          onClick={() => setMobileSectionTab("blueprint")}
          className={`h-9 rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer ${
            mobileSectionTab === "blueprint"
              ? "bg-lima text-grafite"
              : "text-muted hover:text-foreground"
          }`}
        >
          Plano Semanal
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mobileSectionTab === "curve"}
          onClick={() => setMobileSectionTab("curve")}
          className={`h-9 rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer ${
            mobileSectionTab === "curve"
              ? "bg-lima text-grafite"
              : "text-muted hover:text-foreground"
          }`}
        >
          Curva & Fases
        </button>
      </div>

      {/* ================= SEÇÃO 2: ARQUITETURA SEMANAL INTEGRADA POR MODALIDADE (SEM X/Y/Z) ================= */}
      <section
        className={`card p-5 sm:p-6 flex-col gap-4 border-l-4 border-l-lima ${
          mobileSectionTab === "blueprint" ? "flex" : "hidden xl:flex"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <span className="t-label !text-accent-text inline-flex items-center gap-1.5">
              <Sparkles size={13} />
              <span>
                Arquitetura do Ciclo · {plan.cycleBlueprint.primaryModalityNamePt}
              </span>
            </span>
            <h2 className="t-h2 mt-1">{plan.cycleBlueprint.headlinePt}</h2>
            <p className="text-xs text-muted mt-0.5 leading-relaxed">
              {plan.cycleBlueprint.subheadlinePt}
            </p>
          </div>

          <span
            className={`px-3 py-1 rounded-full text-xs font-mono font-semibold shrink-0 self-start ${
              plan.feasibility === "excessive_adjusted"
                ? "bg-amber-500/20 text-amber-400 border border-amber-400/40"
                : "bg-lima/20 text-accent-text border border-profundo/30"
            }`}
          >
            {plan.feasibilityBadgePt}
          </span>
        </div>

        {plan.feasibility === "excessive_adjusted" && (
          <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-3.5 flex items-start gap-2.5 text-xs text-foreground">
            <AlertTriangle
              size={16}
              className="text-amber-400 shrink-0 mt-0.5"
            />
            <p className="leading-relaxed">{plan.feasibilityExplanationPt}</p>
          </div>
        )}

        {/* Distribuição Real das Sessões da Semana (Modalidade Principal + Fichas Vinculadas) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {plan.cycleBlueprint.weeklySlots.map((slot) => (
            <article
              key={`${slot.jsDay}-${slot.archetypeCode}`}
              className="rounded-xl border border-line bg-foreground/[0.02] p-3.5 flex flex-col justify-between gap-2"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-foreground text-background">
                    {slot.weekdayShortPt}
                  </span>
                  <span
                    className={`text-[10px] font-mono uppercase ${
                      slot.activityClass === "complementary"
                        ? "text-accent-text font-semibold"
                        : "text-muted"
                    }`}
                  >
                    {slot.activityClass === "complementary"
                      ? "Fortalecimento"
                      : plan.modalityLabelPt}
                  </span>
                </div>
                <h3 className="text-xs font-semibold text-foreground mt-2 leading-snug">
                  {slot.titlePt}
                </h3>
                <p className="text-[11px] text-muted mt-1 leading-snug">
                  {slot.purposePt}
                </p>
              </div>
              <div className="pt-2 border-t border-line/60 flex items-center justify-between gap-2 text-[10px] font-mono">
                <span className="text-muted truncate">{slot.targetZone}</span>
                {slot.linkedRoutineId && (
                  <Link
                    href={`/treinos/${slot.linkedRoutineId}/editar`}
                    className="text-accent-text font-semibold hover:underline shrink-0"
                  >
                    Ver ficha
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>

        <p className="text-[11px] text-muted border-t border-line/60 pt-2.5">
          <strong className="text-foreground">Papel da EA:</strong>{" "}
          {plan.cycleBlueprint.eaModulationRulePt}
        </p>
      </section>

      {/* ================= SEÇÃO 3: CALENDÁRIO PERENE VISUAL (8) + CHECKLIST DO DIA (4) ================= */}
      <div
        className={`bento-grid items-start ${
          mobileSectionTab === "agenda" ? "" : "max-xl:hidden"
        }`}
      >
        {/* Esquerda (8 cols): Grade Calendário Seg -> Dom */}
        <section className="col-span-12 xl:col-span-8 card p-3 sm:p-6 flex flex-col gap-3 sm:gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="t-label">Mapa Cíclico (Seg → Dom)</span>
              <h2 className="t-h2 mt-0.5">
                Agenda Energética Dia a Dia ({daysWithOptimistic.length} dias)
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Toque em qualquer dia para ver o treino, o hábito +EA e marcar seu progresso.
              </p>
            </div>
          </div>

          {/* Cabeçalho fixo Seg -> Dom */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center">
            {WEEKDAYS_MONDAY_FIRST.map((w) => (
              <span key={w.shortPt} className="t-label text-[10px] py-1">
                {w.shortPt}
              </span>
            ))}
          </div>

          {/* Células dos dias */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {Array.from({ length: leadingEmptySlots }).map((_, idx) => (
              <div
                key={`empty-${idx}`}
                aria-hidden="true"
                className="min-h-[60px] sm:min-h-[96px] rounded-lg sm:rounded-xl border border-dashed border-line/35 bg-foreground/[0.01]"
              />
            ))}

            {daysWithOptimistic.map((day) => {
              const pStyle = PHASE_STYLES[day.phase];
              const isSelected = day.dateStr === selectedDateStr;
              const allDone =
                day.totalCommitmentsCount > 0 &&
                day.completedCount === day.totalCommitmentsCount;

              return (
                <button
                  key={day.dateStr}
                  type="button"
                  onClick={() => setSelectedDateStr(day.dateStr)}
                  aria-pressed={isSelected}
                  className={`min-h-[60px] sm:min-h-[96px] rounded-lg sm:rounded-xl border p-1 sm:p-2 text-left flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden ${
                    pStyle.cellBorderClass
                  } ${
                    isSelected
                      ? "ring-2 ring-foreground shadow-md scale-[1.01]"
                      : "hover:border-foreground/50"
                  } ${day.isToday ? "ring-2 ring-lima" : ""}`}
                >
                  {/* Topo: Data + Ícone principal */}
                  <div className="flex items-center justify-between gap-1 w-full">
                    <span
                      className={`t-data text-[11px] font-semibold leading-none ${
                        day.isToday ? "text-accent-text" : "text-foreground"
                      }`}
                    >
                      <span className="sm:hidden">{day.dateStr.slice(8, 10)}</span>
                      <span className="hidden sm:inline">
                        {formatDateBr(day.dateStr)}
                      </span>
                    </span>

                    <div className="flex items-center gap-0.5 shrink-0 max-sm:hidden">
                      {day.isTargetEventDay ? (
                        <Trophy size={12} className="text-emerald-400" />
                      ) : day.isBlockedByPersonalCommitment ? (
                        <CalendarOff size={11} className="text-amber-400" />
                      ) : day.isWorkoutDay ? (
                        <Dumbbell size={11} className="text-foreground/80" />
                      ) : (
                        <HeartPulse size={11} className="text-amber-400" />
                      )}
                    </div>
                  </div>

                  {/* Meio: EA Projetado */}
                  <div className="my-1">
                    <span className="t-data text-xs sm:text-sm font-bold text-foreground block leading-tight">
                      {day.projectedEa}
                    </span>
                    <span className="text-[9px] font-mono text-muted hidden sm:block truncate">
                      {day.isTargetEventDay
                        ? "DIA-ALVO"
                        : day.primarySessionShortLabelPt || pStyle.shortPt}
                    </span>
                  </div>

                  {/* Base: Mini barra de conclusão do checklist */}
                  <div className="w-full flex items-center justify-between gap-1">
                    <div className="flex-1 h-1 rounded-full bg-foreground/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          allDone ? "bg-emerald-400" : pStyle.dotClass
                        }`}
                        style={{
                          width: `${
                            day.completedCount > 0
                              ? Math.max(25, day.dailyAdherencePercent)
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                    {allDone && (
                      <Check size={10} className="text-emerald-400 shrink-0" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Direita (4 cols): Painel do Dia Selecionado + Checklist Persistido */}
        {selectedDay && (
          <aside className="col-span-12 xl:col-span-4 card p-5 flex flex-col gap-4 xl:sticky xl:top-20">
            <div className="flex items-start justify-between gap-2 pb-3 border-b border-line">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      PHASE_STYLES[selectedDay.phase].dotClass
                    }`}
                  />
                  <span className="t-label !text-accent-text">
                    {selectedDay.isToday
                      ? "Hoje"
                      : selectedDay.isTargetEventDay
                        ? "Dia da Meta"
                        : `Dia ${selectedDay.dayNumberInPlan} do Plano`}
                  </span>
                </div>
                <h2 className="t-h3 mt-1">
                  {selectedDay.weekdayFullPt} · {formatDateBr(selectedDay.dateStr)}
                </h2>
                <p className="text-xs text-muted mt-0.5">
                  {selectedDay.phaseLabelPt}
                </p>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] font-mono text-muted block uppercase">
                  EA Previsto
                </span>
                <span className="t-data text-xl font-bold text-foreground">
                  {selectedDay.projectedEa}
                </span>
              </div>
            </div>

            {/* Balanço previsto do dia */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-line bg-foreground/[0.02] p-2.5">
                <span className="text-[10px] font-mono text-muted block uppercase">
                  Esforço Previsto
                </span>
                <span className="t-data text-sm font-semibold text-foreground">
                  {selectedDay.expectedDrainEa > 0
                    ? `-${selectedDay.expectedDrainEa} EA`
                    : "Sem desgaste"}
                </span>
              </div>
              <div className="rounded-xl border border-lima/40 bg-lima/10 p-2.5">
                <span className="text-[10px] font-mono text-accent-text block uppercase">
                  Recarga Alvo
                </span>
                <span className="t-data text-sm font-semibold text-accent-text">
                  +{selectedDay.expectedRechargeEa} EA
                </span>
              </div>
            </div>

            {/* Checklist Interativo do Dia */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="t-label">
                  Compromissos do Dia ({selectedDay.completedCount}/
                  {selectedDay.totalCommitmentsCount})
                </span>
                <span className="t-data text-[11px] text-accent-text font-semibold">
                  {selectedDay.dailyAdherencePercent}%
                </span>
              </div>

              {selectedDay.commitments.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-xl border p-3 flex items-start gap-2.5 transition-all ${
                    item.isCompleted
                      ? "border-lima bg-lima/10"
                      : "border-line bg-foreground/[0.02] hover:border-mineral"
                  }`}
                >
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleToggleCheck(selectedDay.dateStr, item)}
                    aria-pressed={item.isCompleted}
                    aria-label={`Marcar "${item.titlePt}" como ${
                      item.isCompleted ? "pendente" : "concluído"
                    }`}
                    className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 transition-colors cursor-pointer ${
                      item.isCompleted
                        ? "bg-lima border-lima text-grafite"
                        : "border-line bg-surface text-transparent hover:border-foreground"
                    }`}
                  >
                    <Check size={14} strokeWidth={2.8} />
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-muted">
                        {item.timeSlotLabelPt}
                      </span>
                      <span
                        className={`text-[10px] font-mono font-semibold ${
                          item.eaSignedDelta > 0
                            ? "text-accent-text"
                            : "text-foreground"
                        }`}
                      >
                        {item.eaImpactText}
                      </span>
                    </div>
                    <h4
                      className={`text-xs font-semibold mt-0.5 leading-snug ${
                        item.isCompleted
                          ? "line-through text-muted"
                          : "text-foreground"
                      }`}
                    >
                      {item.titlePt}
                    </h4>
                    <p className="text-[11px] text-muted mt-1 leading-relaxed">
                      {item.detailPt}
                    </p>
                    {item.linkedRoutineId && (
                      <div className="mt-2 flex items-center gap-2">
                        <Link
                          href={`/treinos/${item.linkedRoutineId}/editar`}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-profundo/40 bg-lima/15 text-[10px] font-mono font-semibold text-accent-text hover:underline"
                        >
                          <Dumbbell size={10} />
                          <span>Ficha: {item.linkedRoutineTitle || "Abrir"}</span>
                        </Link>
                      </div>
                    )}
                  </div>

                  {item.isCustom && item.customCommitmentId && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        handleRemoveCustomCommitment(item.customCommitmentId!)
                      }
                      title="Remover compromisso"
                      aria-label="Remover compromisso personalizado"
                      className="text-muted hover:text-foreground p-1 cursor-pointer shrink-0"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                setCommitDate(selectedDay.dateStr);
                setCommitModalOpen(true);
              }}
              className="btn btn-ghost h-9 w-full text-xs font-mono"
            >
              <Plus size={13} />
              <span>
                Adicionar compromisso em {formatDateBr(selectedDay.dateStr)}
              </span>
            </button>
          </aside>
        )}
      </div>

      {/* ================= SEÇÃO 4: BLOCOS SEMANAIS (PERIODIZAÇÃO) ================= */}
      <section
        className={`card p-5 sm:p-6 flex-col gap-4 ${
          mobileSectionTab === "curve" || mobileSectionTab === "blueprint"
            ? "flex"
            : "hidden xl:flex"
        }`}
      >
        <div>
          <span className="t-label">Plano Semanal Inteligente</span>
          <h2 className="t-h2 mt-0.5">
            Fases da Sua Jornada ({plan.weeklyMilestones.length}{" "}
            {plan.weeklyMilestones.length === 1 ? "Semana" : "Semanas"})
          </h2>
          <p className="text-xs text-muted mt-0.5">
            Cada semana tem um foco claro — alternando evolução, descanso e semana leve antes da prova para você chegar bem sem se esgotar.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {plan.weeklyMilestones.map((wk) => {
            const pStyle = PHASE_STYLES[wk.phase];
            return (
              <article
                key={wk.weekNumber}
                className="rounded-xl border border-line bg-foreground/[0.02] p-4 flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono text-muted uppercase">
                      {formatDateBr(wk.startDateStr)} –{" "}
                      {formatDateBr(wk.endDateStr)}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold ${pStyle.badgeClass}`}
                    >
                      {pStyle.shortPt}
                    </span>
                  </div>
                  <h3 className="text-xs font-semibold text-foreground mt-2 leading-snug">
                    {wk.blockNamePt}
                  </h3>
                  <p className="text-[11px] text-muted mt-1.5 leading-relaxed">
                    {wk.directivePt}
                  </p>
                </div>

                <div className="pt-2.5 border-t border-line/60 flex items-center justify-between text-xs font-mono">
                  <span className="text-muted">
                    {wk.plannedWorkoutsCount} treinos
                  </span>
                  <span className="text-foreground font-semibold">
                    {wk.startEa} →{" "}
                    <span className="text-accent-text">{wk.targetEndEa} EA</span>
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* ================= MODAL 1: SIMULADOR & CONSTRUTOR DE META / COMPETIÇÃO ================= */}
      <ModalPortal
        open={goalModalOpen}
        onClose={() => setGoalModalOpen(false)}
        ariaLabel="Planejar competição ou meta de Energia Adaptativa"
        maxWidthClass="sm:max-w-2xl"
      >
        <form
          onSubmit={handleSaveGoal}
          className="w-full bg-surface border border-line rounded-2xl shadow-2xl p-5 sm:p-6 flex flex-col gap-4 max-h-[90dvh] overflow-y-auto"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="t-label !text-accent-text">
                Simulador Fisiológico Selye
              </span>
              <h2 className="t-h2 mt-0.5">
                Planejar Sua Curva de Energia (EA)
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Escolha se você quer se preparar para uma competição com data marcada ou manter um ciclo perene de bem-estar e disciplina.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setGoalModalOpen(false)}
              aria-label="Fechar simulador"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-foreground hover:bg-foreground/5 cursor-pointer shrink-0"
            >
              <X size={16} />
            </button>
          </div>

          {/* Escolha do Público / Trilha */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setGoalMode("competition")}
              aria-pressed={goalMode === "competition"}
              className={`rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
                goalMode === "competition"
                  ? "border-lima bg-lima/15"
                  : "border-line bg-foreground/[0.02] hover:border-mineral"
              }`}
            >
              <div className="flex items-center gap-2">
                <Trophy size={15} className="text-accent-text" />
                <span className="text-xs font-semibold text-foreground">
                  Vou Competir / Quero Pico de EA
                </span>
              </div>
              <p className="text-[11px] text-muted mt-1">
                Inclui semanas de evolução + semana leve pré-prova para chegar descansado e no seu melhor no dia D.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setGoalMode("wellness_constancy")}
              aria-pressed={goalMode === "wellness_constancy"}
              className={`rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
                goalMode === "wellness_constancy"
                  ? "border-lima bg-lima/15"
                  : "border-line bg-foreground/[0.02] hover:border-mineral"
              }`}
            >
              <div className="flex items-center gap-2">
                <HeartPulse size={15} className="text-accent-text" />
                <span className="text-xs font-semibold text-foreground">
                  Bem-Estar, Constância & Vitalidade
                </span>
              </div>
              <p className="text-[11px] text-muted mt-1">
                Evolução suave em ondas naturais (3 semanas ativas + 1 de alívio), disciplina e disposição sem pressão.
              </p>
            </button>
          </div>

          {/* Campos principais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="t-aux font-semibold text-foreground">
                Nome da Competição ou Objetivo
              </span>
              <input
                type="text"
                required
                value={goalTitle}
                onChange={(e) => setGoalTitle(e.target.value)}
                placeholder="Ex: Open de Vôlei de Praia, Meia Maratona..."
                className="input h-10 text-xs"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="t-aux font-semibold text-foreground">
                Modalidade Principal
              </span>
              <select
                value={goalModalityCode}
                onChange={(e) => {
                  const next = e.target.value as CoreModalityCode;
                  setGoalModalityCode(next);
                  setGoalIncludeStrength(next !== "strength");
                  setGoalTargetKpiValueStr("");
                }}
                className="input h-10 text-xs"
              >
                {CORE_MODALITY_CODES.map((code) => (
                  <option key={code} value={code}>
                    {MODALITY_REGISTRY[code].namePt}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* KPI-Alvo da Modalidade + Fortalecimento Complementar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <label className="flex flex-col gap-1.5">
              <span className="t-aux font-semibold text-foreground">
                Meta em {selectedGoalPrimaryKpi.shortLabelPt} (opcional ·{" "}
                {selectedGoalPrimaryKpi.unit})
              </span>
              <input
                type="number"
                step="any"
                value={goalTargetKpiValueStr}
                onChange={(e) => setGoalTargetKpiValueStr(e.target.value)}
                placeholder={`Ref.: ${
                  selectedGoalPrimaryKpi.experienceRanges[
                    snapshot.athleteExperienceLevel
                  ].max
                } ${selectedGoalPrimaryKpi.unit}`}
                className="input h-10 text-xs font-mono"
              />
            </label>

            {goalModalityCode !== "strength" && (
              <label className="flex items-center gap-2.5 h-10 px-3 rounded-xl border border-line bg-foreground/[0.02] cursor-pointer">
                <input
                  type="checkbox"
                  checked={goalIncludeStrength}
                  onChange={(e) => setGoalIncludeStrength(e.target.checked)}
                  className="accent-[#C7F000]"
                />
                <span className="text-xs text-foreground font-medium">
                  Incluir fortalecimento complementar na semana
                </span>
              </label>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="t-aux font-semibold text-foreground">
                Data-Alvo (Dia da Prova ou Marco)
              </span>
              <input
                type="date"
                required
                min={addDaysStr(snapshot.todayDateStr, 7)}
                max={addDaysStr(snapshot.todayDateStr, 180)}
                value={goalTargetDate}
                onChange={(e) => setGoalTargetDate(e.target.value)}
                className="input h-10 text-xs t-data"
              />
            </label>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="t-aux font-semibold text-foreground">
                  EA Desejado na Data-Alvo
                </span>
                <span className="t-data text-xs font-bold text-accent-text">
                  Hoje: {snapshot.realCurrentEa} → Alvo: {goalTargetEa} EA
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={snapshot.realCurrentEa + 60}
                  max={snapshot.realCurrentEa + 900}
                  step={10}
                  value={goalTargetEa}
                  onChange={(e) => setGoalTargetEa(Number(e.target.value))}
                  className="flex-1 accent-[#C7F000] cursor-pointer"
                />
                <input
                  type="number"
                  min={snapshot.realCurrentEa + 50}
                  max={5000}
                  value={goalTargetEa}
                  onChange={(e) =>
                    setGoalTargetEa(Math.max(500, Number(e.target.value) || 1800))
                  }
                  className="input h-10 w-24 text-center t-data text-xs"
                />
              </div>
            </div>
          </div>

          {/* Dias da semana disponíveis (Seg -> Dom) */}
          <div className="flex flex-col gap-1.5">
            <span className="t-aux font-semibold text-foreground">
              Quais dias da semana você pode treinar? ({goalWorkoutDays.length}{" "}
              dias/semana)
            </span>
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAYS_MONDAY_FIRST.map((day) => {
                const active = goalWorkoutDays.includes(day.jsDay);
                return (
                  <button
                    key={day.shortPt}
                    type="button"
                    onClick={() => handleToggleWorkoutDay(day.jsDay)}
                    aria-pressed={active}
                    className={`h-9 px-3 rounded-lg border text-xs font-mono transition-colors cursor-pointer ${
                      active
                        ? "bg-lima text-grafite border-lima font-semibold"
                        : "border-line bg-surface text-muted hover:text-foreground"
                    }`}
                  >
                    {day.shortPt}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Prévia Ao Vivo da Simulação */}
          <div className="rounded-xl bg-noite text-osso p-4 flex flex-col gap-2.5 border border-white/10">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-lima font-semibold inline-flex items-center gap-1.5">
                <TrendingUp size={13} />
                <span>Prévia do Seu Plano ({liveSimulation.totalDays} dias)</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-white/10 text-osso">
                {liveSimulation.feasibilityBadgePt}
              </span>
            </div>

            <p className="text-xs text-osso font-medium leading-snug">
              {liveSimulation.cycleBlueprint.headlinePt}
            </p>
            <p className="text-[11px] text-nevoa leading-relaxed">
              {liveSimulation.cycleBlueprint.subheadlinePt} {liveSimulation.feasibilityExplanationPt}
            </p>

            {liveSimulation.recommendedAlternativeDateStr && (
              <button
                type="button"
                onClick={() =>
                  setGoalTargetDate(liveSimulation.recommendedAlternativeDateStr!)
                }
                className="self-start text-[11px] font-mono text-lima underline cursor-pointer"
              >
                Usar data segura recomendada (
                {formatDateBr(liveSimulation.recommendedAlternativeDateStr, true)})
              </button>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setGoalModalOpen(false)}
              className="btn btn-ghost h-10 px-4 text-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="btn btn-primary h-10 px-5 text-xs"
            >
              <Target size={14} />
              <span>
                {isPending ? "Ativando Plano..." : "Ativar Plano no Calendário"}
              </span>
            </button>
          </div>
        </form>
      </ModalPortal>

      {/* ================= MODAL 2: ADICIONAR COMPROMISSO / BLOQUEIO DE AGENDA ================= */}
      <ModalPortal
        open={commitModalOpen}
        onClose={() => setCommitModalOpen(false)}
        ariaLabel="Adicionar compromisso ou bloqueio no calendário"
        maxWidthClass="sm:max-w-lg"
      >
        <form
          onSubmit={handleAddCommitment}
          className="w-full bg-surface border border-line rounded-2xl shadow-2xl p-5 sm:p-6 flex flex-col gap-4 max-h-[88dvh] overflow-y-auto"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="t-label !text-accent-text">
                Agenda Viva & Inteligente
              </span>
              <h2 className="t-h2 mt-0.5">
                Novo Compromisso no Calendário
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Avise o Selye sobre viagens, dias cheios no trabalho ou hábitos extras — seu plano se adapta automaticamente.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCommitModalOpen(false)}
              aria-label="Fechar janela"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-foreground hover:bg-foreground/5 cursor-pointer shrink-0"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="t-aux font-semibold text-foreground">Data</span>
              <input
                type="date"
                required
                value={commitDate}
                onChange={(e) => setCommitDate(e.target.value)}
                className="input h-10 text-xs t-data"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="t-aux font-semibold text-foreground">Tipo</span>
              <select
                value={commitKind}
                onChange={(e) => {
                  const v = e.target.value as typeof commitKind;
                  setCommitKind(v);
                  if (v === "personal_block") {
                    setCommitBlocksWorkout(true);
                    setCommitEaDelta(0);
                  } else if (v === "custom_habit") {
                    setCommitBlocksWorkout(false);
                    setCommitEaDelta(75);
                  } else if (v === "custom_workout") {
                    setCommitBlocksWorkout(false);
                    setCommitEaDelta(-220);
                  } else {
                    setCommitBlocksWorkout(false);
                    setCommitEaDelta(0);
                  }
                }}
                className="input h-10 text-xs"
              >
                <option value="personal_block">
                  Compromisso Pessoal / Viagem (Bloqueio)
                </option>
                <option value="custom_habit">
                  Hábito Regenerativo Extra (+EA)
                </option>
                <option value="custom_workout">
                  Treino ou Jogo Agendado (-EA)
                </option>
                <option value="event_milestone">
                  Marco / Avaliação Física
                </option>
              </select>
            </label>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="t-aux font-semibold text-foreground">Título</span>
            <input
              type="text"
              required
              value={commitTitle}
              onChange={(e) => setCommitTitle(e.target.value)}
              placeholder="Ex: Viagem a trabalho, Sessão de fisioterapia, Jogo treino..."
              className="input h-10 text-xs"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="t-aux font-semibold text-foreground">
              Observações (Opcional)
            </span>
            <input
              type="text"
              value={commitNotes}
              onChange={(e) => setCommitNotes(e.target.value)}
              placeholder="Ex: Dia sem academia, priorizar hidratação e dormir cedo"
              className="input h-10 text-xs"
            />
          </label>

          <label className="flex items-start gap-2.5 rounded-xl border border-line bg-foreground/[0.02] p-3 cursor-pointer">
            <input
              type="checkbox"
              checked={commitBlocksWorkout}
              onChange={(e) => setCommitBlocksWorkout(e.target.checked)}
              className="mt-0.5 accent-[#C7F000]"
            />
            <div className="text-xs">
              <span className="font-semibold text-foreground block">
                Proteger este dia (sem treino pesado)
              </span>
              <span className="text-muted text-[11px]">
                O Selye converte automaticamente este dia em janela de absorção e ajusta sua agenda sem gerar culpa.
              </span>
            </div>
          </label>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setCommitModalOpen(false)}
              className="btn btn-ghost h-10 px-4 text-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="btn btn-primary h-10 px-5 text-xs"
            >
              <Check size={14} />
              <span>{isPending ? "Salvando..." : "Salvar no Calendário"}</span>
            </button>
          </div>
        </form>
      </ModalPortal>
    </div>
  );
}
