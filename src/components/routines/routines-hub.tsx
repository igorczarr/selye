"use client";

import { useMemo, useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { archiveRoutine, duplicateRoutine } from "@/actions/routines";
import { startWorkout } from "@/actions/workout";
import {
  WEEKDAYS_MONDAY_FIRST,
  getWeekdayLabelPt,
  jsDayToMondayIndex,
} from "@/lib/week";
import {
  estimateRoutineDurationMinutes,
  countTotalSets,
} from "@/lib/routine-metrics";
import { ExerciseLink } from "@/components/catalog/exercise-link";
import { ModalPortal } from "@/components/ui/modal-portal";
import {
  MODALITY_REGISTRY,
  type CoreModalityCode,
  type ExperienceLevel,
} from "@/core/modalities";
import {
  analyzeRoutineEffect,
  analyzeWeeklyRoutineGaps,
} from "@/core/routines";
import {
  PlusCircle,
  Play,
  Dumbbell,
  Clock,
  Layers,
  LayoutGrid,
  GalleryHorizontalEnd,
  ChevronDown,
  ChevronUp,
  Info,
  Trash2,
  MoreVertical,
  Pencil,
  Copy,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Target,
  Zap,
  ArrowRightLeft,
  X,
} from "lucide-react";

const MODALITY_LABELS: Record<string, string> = {
  strength: "Musculação",
  calisthenics: "Calistenia",
  functional: "Funcional",
  running: "Corrida",
  beach_volleyball: "Vôlei de Praia",
  footvolley: "Futevôlei",
  cycling: "Ciclismo",
  swimming: "Natação",
  futsal: "Futsal",
  football: "Futebol",
  pilates: "Pilates",
  mobility: "Mobilidade",
  cross_training: "Cross Training",
  martial_arts: "Lutas",
};

interface RoutineHubItem {
  id: string;
  title: string;
  description: string | null;
  modalityCode: string;
  version: { versionNumber: number } | null;
  templates: {
    id: string;
    dayOfWeek: number | null;
    prescriptions: {
      id: string;
      exerciseId: string;
      exerciseNamePt: string;
      targetSets: number | null;
      targetReps: string | null;
      targetLoadKg: number | null;
      restSeconds: number | null;
    }[];
  }[];
}

function BiometricScoreBadge({
  score,
  size = "md",
}: {
  score: number;
  size?: "sm" | "md";
}) {
  const isHigh = score >= 75;
  const isModerate = score >= 50 && score < 75;
  const colorHex = isHigh ? "#C7F000" : isModerate ? "#F59E0B" : "#EF4444";

  if (size === "sm") {
    return (
      <div className="inline-flex items-baseline px-2.5 py-1 rounded-xl bg-black/60 border border-white/15 shadow-inner backdrop-blur-md shrink-0">
        <span
          className="font-mono font-black text-white text-base leading-none tracking-tight"
          style={{ textShadow: `0 0 10px ${colorHex}55` }}
        >
          {score}
        </span>
        <span
          className="font-mono font-bold text-[10px] leading-none ml-0.5"
          style={{ color: colorHex }}
        >
          %
        </span>
      </div>
    );
  }

  const radius = 25;
  const circumference = 2 * Math.PI * radius;
  const offset =
    circumference - (Math.min(100, Math.max(0, score)) / 100) * circumference;

  return (
    <div className="relative w-15 h-15 sm:w-16 sm:h-16 shrink-0 flex items-center justify-center select-none">
      <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 60 60">
        <circle
          cx="30"
          cy="30"
          r={radius}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="3.5"
          fill="transparent"
        />
        <circle
          cx="30"
          cy="30"
          r={radius}
          stroke={colorHex}
          strokeWidth="3.5"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="transparent"
          style={{
            filter: `drop-shadow(0 0 6px ${colorHex}88)`,
            transition: "stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex items-baseline">
          <span
            className="font-mono font-black text-lg sm:text-xl text-white tracking-tighter leading-none"
            style={{ textShadow: `0 0 12px ${colorHex}66` }}
          >
            {score}
          </span>
          <span
            className="font-mono font-extrabold text-[11px] leading-none ml-0.5"
            style={{ color: colorHex }}
          >
            %
          </span>
        </div>
      </div>
    </div>
  );
}

export function RoutinesHub({
  routines,
  activeSession,
  athletePrimaryModality = "strength",
  experienceLevel = "intermediate",
}: {
  routines: RoutineHubItem[];
  activeSession?: {
    id: string;
    title: string;
    startedAt?: string | Date;
  } | null;
  athletePrimaryModality?: CoreModalityCode;
  experienceLevel?: ExperienceLevel;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [startingId, setStartingId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | "all">("all");
  const [layoutMode, setLayoutMode] = useState<"carousel" | "grid">("carousel");
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [showRadarDetails, setShowRadarDetails] = useState(false);
  const [isRadarOpen, setIsRadarOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("selye-radar-expanded");
      if (saved !== null) {
        setIsRadarOpen(saved === "true");
      }
    } catch {
      // ignora em SSR ou modo privado
    }
  }, []);

  const toggleRadarOpen = () => {
    setIsRadarOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("selye-radar-expanded", String(next));
      } catch {}
      return next;
    });
  };

  const todayJsDay = new Date().getDay();
  const todayMondayIdx = jsDayToMondayIndex(todayJsDay);
  const todayWeekdayName = getWeekdayLabelPt(todayJsDay, "full");

  const todayScheduledRoutine = routines.find((r) => {
    const tpl = r.templates?.[0];
    return typeof tpl?.dayOfWeek === "number" && tpl.dayOfWeek === todayJsDay;
  });

  const [selectedHeroRoutineId, setSelectedHeroRoutineId] = useState<string>(() => {
    if (todayScheduledRoutine) return todayScheduledRoutine.id;
    return routines[0]?.id || "";
  });

  const [heroAccordionOpen, setHeroAccordionOpen] = useState(false);
  const [openSwitchModal, setOpenSwitchModal] = useState(false);

  const heroRoutine =
    routines.find((r) => r.id === selectedHeroRoutineId) ||
    todayScheduledRoutine ||
    routines[0] ||
    null;

  // Análise Ficha ↔ Objetivo & Radar de Lacunas Semanais (§Fase 4)
  const weeklyCoverage = useMemo(
    () =>
      analyzeWeeklyRoutineGaps({
        routines: routines.map((r) => ({
          id: r.id,
          title: r.title,
          modalityCode: r.modalityCode,
          dayOfWeek: r.templates?.[0]?.dayOfWeek ?? null,
          prescriptions: (r.templates?.[0]?.prescriptions || []).map((p) => ({
            exerciseNamePt: p.exerciseNamePt,
            modalityCode: r.modalityCode,
            targetSets: p.targetSets,
            targetReps: p.targetReps,
            restSeconds: p.restSeconds,
          })),
        })),
        athletePrimaryModality,
        experienceLevel,
      }),
    [routines, athletePrimaryModality, experienceLevel]
  );

  const effectByRoutineId = useMemo(() => {
    const map = new Map<string, ReturnType<typeof analyzeRoutineEffect>>();
    for (const r of routines) {
      map.set(
        r.id,
        analyzeRoutineEffect({
          routine: {
            id: r.id,
            title: r.title,
            modalityCode: r.modalityCode,
            dayOfWeek: r.templates?.[0]?.dayOfWeek ?? null,
            prescriptions: (r.templates?.[0]?.prescriptions || []).map((p) => ({
              exerciseNamePt: p.exerciseNamePt,
              modalityCode: r.modalityCode,
              targetSets: p.targetSets,
              targetReps: p.targetReps,
              restSeconds: p.restSeconds,
            })),
          },
          athletePrimaryModality,
          experienceLevel,
        })
      );
    }
    return map;
  }, [routines, athletePrimaryModality, experienceLevel]);

  // Mapeia quais dias da semana (jsDay) possuem treino agendado
  const scheduledJsDays = new Set<number>();
  for (const r of routines) {
    const d = r.templates?.[0]?.dayOfWeek;
    if (typeof d === "number") scheduledJsDays.add(d);
  }

  const visibleRoutines =
    selectedDay === "all"
      ? routines
      : routines.filter((r) => r.templates?.[0]?.dayOfWeek === selectedDay);

  const handleStartRoutine = (routine: RoutineHubItem) => {
    setStartingId(routine.id);
    startTransition(async () => {
      await startWorkout(routine.title, routine.id);
      router.push("/");
    });
  };

  const handleDuplicate = (routineId: string) => {
    setOpenMenuId(null);
    startTransition(async () => {
      await duplicateRoutine(routineId);
      router.refresh();
    });
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    const targetId = deleteTarget.id;
    startTransition(async () => {
      await archiveRoutine(targetId);
      setDeleteTarget(null);
      router.refresh();
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const heroTemplate = heroRoutine?.templates?.[0];
  const heroPrescriptions = heroTemplate?.prescriptions || [];
  const heroEstMin = estimateRoutineDurationMinutes(heroPrescriptions);
  const heroTotalSets = countTotalSets(heroPrescriptions);
  const heroEffect = heroRoutine ? effectByRoutineId.get(heroRoutine.id) : null;

  const pillarCategories = [
    {
      id: "pernas",
      label: "Pernas",
      count: weeklyCoverage.weeklyCategorySets.pernas || 0,
      target: 10,
    },
    {
      id: "costas",
      label: "Costas",
      count: weeklyCoverage.weeklyCategorySets.costas || 0,
      target: 8,
    },
    {
      id: "peito",
      label: "Peitoral",
      count: weeklyCoverage.weeklyCategorySets.peito || 0,
      target: 8,
    },
    {
      id: "ombros",
      label: "Ombros",
      count: weeklyCoverage.weeklyCategorySets.ombros || 0,
      target: 6,
    },
    {
      id: "core",
      label: "Core",
      count: weeklyCoverage.weeklyCategorySets.core || 0,
      target: 6,
    },
    {
      id: "pliometria",
      label: "Potência",
      count: weeklyCoverage.weeklyCategorySets.pliometria || 0,
      target: 4,
    },
  ];

  return (
    <div className="flex flex-col gap-6 fade-up">
      {/* 1. Header Enxuto: Título "Treinos" + Nova Ficha */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <span className="t-label">
            Planejamento Semanal · {MODALITY_REGISTRY[athletePrimaryModality].shortNamePt}
          </span>
          <h1 className="t-h1 mt-0.5">Treinos</h1>
        </div>

        <Link
          href="/treinos/novo"
          className="btn btn-primary h-9 px-3.5 sm:px-4 text-xs font-mono font-bold inline-flex items-center gap-1.5 shrink-0"
        >
          <PlusCircle size={15} strokeWidth={2} />
          <span>Nova Ficha</span>
        </Link>
      </div>

      {/* 2. SESSÃO ATIVA OU TREINO DE HOJE EM DESTAQUE ABSOLUTO (Zero Fricção) */}
      {activeSession ? (
        <article className="card p-4 sm:p-5 border-lima bg-gradient-to-r from-lima/15 via-surface to-surface flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-lima animate-pulse shrink-0" />
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-accent-text">
                Sessão em Andamento
              </span>
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                {activeSession.title}
              </h2>
            </div>
          </div>
          <Link
            href="/"
            className="btn btn-primary h-9 px-4 text-xs font-mono font-bold shrink-0 inline-flex items-center gap-1.5"
          >
            <Play size={13} fill="currentColor" />
            <span>Continuar Treino</span>
          </Link>
        </article>
      ) : heroRoutine ? (
        <article className="card p-4 sm:p-5 border-lima/50 ring-1 ring-lima/30 bg-gradient-to-br from-surface via-surface to-lima/[0.04] flex flex-col gap-3.5 shadow-sm">
          {/* Topo do card Hero: Badges + Trocar Treino */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold bg-lima text-grafite shadow-2xs">
                {todayScheduledRoutine?.id === heroRoutine.id
                  ? `${todayWeekdayName} · Treino de Hoje`
                  : `Treino Selecionado · ${todayWeekdayName}`}
              </span>
              <span className="chip text-[11px]">
                {MODALITY_LABELS[heroRoutine.modalityCode] || heroRoutine.modalityCode}
              </span>
            </div>

            {routines.length > 1 && (
              <button
                type="button"
                onClick={() => setOpenSwitchModal(true)}
                className="text-[11px] font-mono text-muted hover:text-foreground inline-flex items-center gap-1 py-1 px-2 rounded hover:bg-foreground/[0.04] transition-colors cursor-pointer"
              >
                <ArrowRightLeft size={12} />
                <span>Trocar treino</span>
              </button>
            )}
          </div>

          {/* Título, descrição e métricas rápidas + Botão Iniciar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight leading-snug">
                {heroRoutine.title}
              </h2>
              {heroRoutine.description && (
                <p className="text-muted text-xs mt-0.5 line-clamp-1">
                  {heroRoutine.description}
                </p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-mono text-muted">
                <span className="inline-flex items-center gap-1">
                  <Clock size={13} className="text-accent-text" />
                  ~{heroEstMin} min
                </span>
                <span className="inline-flex items-center gap-1">
                  <Layers size={13} className="text-accent-text" />
                  {heroPrescriptions.length} exercícios · {heroTotalSets} séries
                </span>
                {heroEffect && heroEffect.snapshot.estimatedLoadUa > 0 && (
                  <span className="inline-flex items-center gap-1 text-foreground font-semibold">
                    <Zap size={12} className="text-accent-text" />
                    ~{heroEffect.snapshot.estimatedLoadUa} EA
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              disabled={isPending}
              onClick={() => handleStartRoutine(heroRoutine)}
              className="btn btn-primary h-11 px-6 text-xs font-mono font-bold shrink-0 inline-flex items-center justify-center gap-2 shadow-sm"
            >
              <Play size={14} fill="currentColor" />
              <span>
                {startingId === heroRoutine.id ? "Iniciando..." : "Iniciar Treino Agora"}
              </span>
            </button>
          </div>

          {/* Acordeão de exercícios do Hero (Menos poluição visual e mais espaço em branco) */}
          {heroPrescriptions.length > 0 && (
            <div className="pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => setHeroAccordionOpen((v) => !v)}
                aria-expanded={heroAccordionOpen}
                className="text-xs font-mono text-muted hover:text-foreground inline-flex items-center gap-1.5 cursor-pointer py-1 select-none"
              >
                <span>
                  {heroAccordionOpen
                    ? "Recolher exercícios"
                    : `Ver exercícios planejados (${heroPrescriptions.length})`}
                </span>
                {heroAccordionOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>

              {heroAccordionOpen && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 animate-in fade-in duration-150">
                  {heroPrescriptions.map((p, idx) => (
                    <div
                      key={p.id}
                      className="p-2.5 rounded-xl border border-line/60 bg-foreground/[0.02] flex items-center justify-between text-xs gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[11px] font-mono text-muted shrink-0">
                          {String(idx + 1).padStart(2, "0")}.
                        </span>
                        <ExerciseLink
                          exerciseId={p.exerciseId}
                          className="font-medium text-foreground truncate inline-flex items-center gap-1"
                        >
                          <span className="truncate">{p.exerciseNamePt}</span>
                          <Info size={11} className="text-muted shrink-0 opacity-70" />
                        </ExerciseLink>
                      </div>
                      <span className="text-[11px] font-mono text-muted shrink-0">
                        {p.targetSets}×{p.targetReps}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </article>
      ) : (
        <article className="card p-4 sm:p-5 border-line bg-surface/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-foreground/5 text-muted flex items-center justify-center shrink-0">
              <Dumbbell size={18} strokeWidth={1.75} />
            </div>
            <div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-foreground/10 text-muted">
                {todayWeekdayName} · Descanso
              </span>
              <h2 className="text-base font-semibold text-foreground mt-1">
                Nenhum treino programado para hoje
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Dia de recuperação ou cardio solto. Deseja realizar outra ficha da semana?
              </p>
            </div>
          </div>
          {routines.length > 0 && (
            <button
              type="button"
              onClick={() => setOpenSwitchModal(true)}
              className="btn btn-ghost h-9 px-4 text-xs font-mono shrink-0"
            >
              <ArrowRightLeft size={13} className="mr-1.5" />
              <span>Escolher Treino</span>
            </button>
          )}
        </article>
      )}

      {/* 3. RADAR BIOMECÂNICO & COBERTURA SEMANAL (Retrátil / Encolhível) */}
      <section
        aria-label="Radar Biomecânico Semanal"
        className={`rounded-2xl border transition-all duration-300 relative overflow-hidden ${
          isRadarOpen
            ? "p-4 sm:p-5 border-lima/35 bg-gradient-to-br from-[#111714] via-[#15211B] to-[#0F1512] text-white shadow-lg"
            : "p-3 sm:p-3.5 border-line bg-surface/90 hover:border-lima/40 hover:bg-surface text-foreground shadow-xs"
        }`}
      >
        {/* Glow de fundo bioluminescente quando aberto */}
        <div
          aria-hidden
          className={`pointer-events-none absolute -right-16 -top-16 w-60 h-60 rounded-full blur-3xl transition-opacity duration-500 ${
            isRadarOpen ? "opacity-35" : "opacity-0"
          }`}
          style={{
            background:
              weeklyCoverage.coverageScorePercent >= 70
                ? "radial-gradient(circle, rgba(199,240,0,0.28) 0%, rgba(16,185,129,0.18) 50%, transparent 70%)"
                : "radial-gradient(circle, rgba(245,158,11,0.22) 0%, transparent 70%)",
          }}
        />

        {!isRadarOpen ? (
          /* ESTADO ENCOLHIDO: BARRA SLIM, COMPACTA E MINIMALISTA */
          <div className="relative z-10 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={toggleRadarOpen}
              aria-expanded={false}
              aria-label="Expandir Radar Biomecânico"
              className="flex items-center gap-3 min-w-0 text-left flex-1 cursor-pointer group select-none"
            >
              {/* Porcentagem Estilizada em Badge Digital */}
              <BiometricScoreBadge
                score={weeklyCoverage.coverageScorePercent}
                size="sm"
              />

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lima opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-lima" />
                  </span>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-muted font-bold group-hover:text-accent-text transition-colors">
                    Radar Biomecânico · {weeklyCoverage.modalityShortNamePt}
                  </span>
                  <span className="text-muted/40 hidden sm:inline">·</span>
                  <span className="text-xs text-foreground font-semibold truncate hidden sm:inline">
                    {weeklyCoverage.statusLabelPt}
                  </span>
                </div>

                <div className="text-[11px] font-mono text-muted flex items-center gap-2 mt-0.5">
                  <span className="sm:hidden text-foreground font-medium truncate">
                    {weeklyCoverage.statusLabelPt}
                  </span>
                  <span className="hidden sm:inline">
                    <strong className="text-foreground">
                      {weeklyCoverage.totalWeeklyEffectiveSets}
                    </strong>{" "}
                    séries/sem
                  </span>
                  <span className="hidden sm:inline text-muted/40">·</span>
                  <span className="hidden sm:inline text-accent-text font-medium">
                    {weeklyCoverage.coveredPillarsPt.length} cadeias cobertas
                  </span>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={toggleRadarOpen}
              aria-label="Expandir radar completo"
              className="h-8 px-2.5 sm:px-3 rounded-xl border border-line bg-surface hover:bg-foreground/5 text-xs font-mono text-foreground inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-2xs"
            >
              <Target size={13} className="text-accent-text" />
              <span className="hidden sm:inline">Ver Radar</span>
              <ChevronDown size={14} className="text-muted" />
            </button>
          </div>
        ) : (
          /* ESTADO EXPANDIDO: COCKPIT BIOMECÂNICO COMPLETO COM BOTÃO ENCOLHER */
          <div className="relative z-10 flex flex-col gap-4 animate-in fade-in duration-200">
            {/* Topo do Radar Expandido */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3.5 min-w-0">
                <BiometricScoreBadge
                  score={weeklyCoverage.coverageScorePercent}
                  size="md"
                />

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lima opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-lima" />
                    </span>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-nevoa font-bold">
                      Radar Biomecânico · {weeklyCoverage.modalityShortNamePt}
                    </span>
                    <span className="text-white/20">·</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-lima/20 text-lima">
                      {weeklyCoverage.coverageScorePercent >= 75
                        ? "Blindagem Sólida"
                        : weeklyCoverage.coverageScorePercent >= 50
                          ? "Volume Moderado"
                          : "Ajuste Recomendado"}
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight mt-0.5 truncate">
                    {weeklyCoverage.statusLabelPt}
                  </h3>

                  <div className="text-xs text-nevoa flex flex-wrap items-center gap-2 mt-0.5 font-mono">
                    <span>
                      <strong className="text-white font-bold">
                        {weeklyCoverage.totalWeeklyEffectiveSets}
                      </strong>{" "}
                      séries/sem
                    </span>
                    <span className="text-white/25">·</span>
                    <span>
                      <strong className="text-white font-bold">
                        {weeklyCoverage.totalRoutinesAnalyzed}
                      </strong>{" "}
                      fichas ativas
                    </span>
                    <span className="text-white/25">·</span>
                    <span className="text-lima">
                      {weeklyCoverage.coveredPillarsPt.length} cadeias cobertas
                    </span>
                  </div>
                </div>
              </div>

              {/* Botão para Encolher o Radar */}
              <button
                type="button"
                onClick={toggleRadarOpen}
                aria-expanded={true}
                className="h-8 px-3 rounded-xl border border-white/15 bg-white/[0.07] hover:bg-white/[0.14] text-xs font-mono text-white inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-sm self-start sm:self-center shrink-0"
              >
                <span>Encolher radar</span>
                <ChevronUp size={14} className="text-lima" />
              </button>
            </div>

            {/* Espectro Biomecânico: Mini-barras horizontais das 6 cadeias musculares */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1 border-t border-white/10">
              {pillarCategories.map((pillar) => {
                const pct = Math.min(
                  100,
                  Math.round((pillar.count / pillar.target) * 100)
                );
                const isTargetReached = pillar.count >= pillar.target;

                return (
                  <div
                    key={pillar.id}
                    className="rounded-xl border border-white/10 bg-black/25 p-2 flex flex-col justify-between gap-1.5"
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono leading-none">
                      <span className="text-nevoa truncate text-[10px]">
                        {pillar.label}
                      </span>
                      <span
                        className={`font-bold ${
                          isTargetReached ? "text-lima" : "text-white/70"
                        }`}
                      >
                        {pillar.count}s
                      </span>
                    </div>

                    <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isTargetReached
                            ? "bg-lima shadow-[0_0_6px_rgba(199,240,0,0.5)]"
                            : "bg-amber-400"
                        }`}
                        style={{ width: `${Math.max(8, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Diagnóstico Detalhado: Pilares Blindados & Recomendações Clínicas */}
            <div className="pt-2 border-t border-white/10 flex flex-col gap-3">
              {weeklyCoverage.coveredPillarsPt.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-nevoa font-semibold">
                    Cadeias Blindadas na Semana:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {weeklyCoverage.coveredPillarsPt.map((pillar) => (
                      <span
                        key={pillar}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-emerald-500/30 bg-emerald-500/15 text-[11px] font-medium text-emerald-200"
                      >
                        <ShieldCheck
                          size={12}
                          className="text-emerald-400 shrink-0"
                        />
                        <span>{pillar}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {weeklyCoverage.gaps.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-nevoa font-semibold">
                    Pontos de Ajuste Recomendados:
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {weeklyCoverage.gaps.map((gap) => (
                      <div
                        key={gap.code}
                        className={`rounded-xl border p-3 flex flex-col gap-2 ${
                          gap.severity === "high"
                            ? "border-amber-400/40 bg-amber-400/[0.08]"
                            : "border-white/10 bg-black/30"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider ${
                              gap.severity === "high"
                                ? "bg-amber-400/25 text-amber-300"
                                : "bg-white/10 text-nevoa"
                            }`}
                          >
                            {gap.severity === "high"
                              ? "Alta Relevância"
                              : "Otimização Fina"}
                          </span>
                          {gap.scientificRefId && (
                            <span className="text-[9px] font-mono text-nevoa/80 truncate">
                              Ref: {gap.scientificRefId.replace(/_/g, " ")}
                            </span>
                          )}
                        </div>

                        <div>
                          <h4 className="text-xs font-bold text-white leading-snug">
                            {gap.titlePt}
                          </h4>
                          <p className="text-[11px] text-nevoa mt-1 leading-relaxed">
                            {gap.detailPt}
                          </p>
                        </div>

                        <div className="pt-1.5 border-t border-white/10 flex items-start gap-1.5 text-[11px] text-lima font-medium">
                          <Sparkles size={12} className="shrink-0 mt-0.5" />
                          <span>Sugestão: {gap.suggestionPt}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-center gap-2.5 text-xs text-emerald-200">
                  <CheckCircle2
                    size={16}
                    className="text-emerald-400 shrink-0"
                  />
                  <span>
                    Programação semanal perfeitamente alinhada com as exigências
                    científicas de{" "}
                    <strong>{weeklyCoverage.modalityShortNamePt}</strong>. Todas as
                    valências essenciais estão cobertas.
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* 4. SEÇÃO MINHAS FICHAS: Cabeçalho com Alternador Carrossel/Grade + Pílulas da Semana */}
      <div className="flex flex-col gap-3 pt-1">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="t-h2">Minhas Fichas</h2>
            <p className="text-xs text-muted">
              Organizadas por dia da semana com prescrições e cargas planejadas.
            </p>
          </div>

          <div
            role="group"
            aria-label="Modo de exibição das fichas"
            className="flex items-center p-0.5 rounded-lg border border-line bg-surface shrink-0"
          >
            <button
              type="button"
              onClick={() => setLayoutMode("carousel")}
              aria-pressed={layoutMode === "carousel"}
              title="Exibir em carrossel"
              className={`h-7 px-2.5 rounded-md flex items-center gap-1 text-xs font-mono transition-colors cursor-pointer ${
                layoutMode === "carousel"
                  ? "bg-foreground text-background font-semibold"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <GalleryHorizontalEnd size={13} />
              <span className="hidden sm:inline">Carrossel</span>
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode("grid")}
              aria-pressed={layoutMode === "grid"}
              title="Exibir em grade"
              className={`h-7 px-2.5 rounded-md flex items-center gap-1 text-xs font-mono transition-colors cursor-pointer ${
                layoutMode === "grid"
                  ? "bg-foreground text-background font-semibold"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <LayoutGrid size={13} />
              <span className="hidden sm:inline">Grade</span>
            </button>
          </div>
        </div>

        {/* Pílulas de dias da semana (Segunda a Domingo) */}
        <section
          aria-label="Filtro semanal de segunda a domingo"
          className="card p-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar"
        >
          <button
            type="button"
            onClick={() => setSelectedDay("all")}
            aria-pressed={selectedDay === "all"}
            className={`h-8 px-3 rounded-lg text-xs font-mono font-semibold shrink-0 transition-colors cursor-pointer ${
              selectedDay === "all"
                ? "bg-foreground text-background"
                : "text-muted hover:text-foreground hover:bg-foreground/5"
            }`}
          >
            Todos ({routines.length})
          </button>

          {WEEKDAYS_MONDAY_FIRST.map((day) => {
            const isSelected = selectedDay === day.jsDay;
            const hasWorkout = scheduledJsDays.has(day.jsDay);
            const isToday = day.mondayIndex === todayMondayIdx;

            return (
              <button
                key={day.shortPt}
                type="button"
                onClick={() =>
                  setSelectedDay(isSelected ? "all" : day.jsDay)
                }
                aria-pressed={isSelected}
                className={`h-8 px-2.5 rounded-lg text-xs font-mono shrink-0 flex items-center gap-1.5 transition-all cursor-pointer ${
                  isSelected
                    ? "bg-lima text-grafite font-semibold"
                    : isToday
                      ? "border border-profundo/60 text-foreground font-semibold bg-foreground/[0.03]"
                      : "text-muted hover:text-foreground hover:bg-foreground/5"
                }`}
              >
                <span>{day.shortPt}</span>
                {hasWorkout && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isSelected ? "bg-grafite" : "bg-lima"
                    }`}
                  />
                )}
              </button>
            );
          })}
        </section>
      </div>

      {/* Lista de Fichas (Carrossel ou Grade) */}
      {visibleRoutines.length === 0 ? (
        <div className="card p-10 text-center flex flex-col items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-foreground/5 flex items-center justify-center text-muted">
            <Dumbbell size={22} strokeWidth={1.75} />
          </div>
          <h2 className="t-h3">
            {selectedDay === "all"
              ? "Nenhuma ficha criada ainda"
              : `Descanso programado para ${getWeekdayLabelPt(selectedDay, "full")}`}
          </h2>
          <p className="text-muted text-xs max-w-sm">
            {selectedDay === "all"
              ? "Monte sua primeira programação com séries, repetições, cargas e intervalos."
              : "Nenhuma ficha vinculada a este dia. Aproveite para recuperar ou crie uma sessão específica."}
          </p>
          <div className="flex items-center gap-2 mt-2">
            {selectedDay !== "all" && (
              <button
                type="button"
                onClick={() => setSelectedDay("all")}
                className="btn btn-ghost h-9 px-3.5 text-xs"
              >
                Ver semana inteira
              </button>
            )}
            <Link href="/treinos/novo" className="btn btn-primary h-9 px-4 text-xs">
              <PlusCircle size={14} />
              <span>Criar Ficha</span>
            </Link>
          </div>
        </div>
      ) : (
        <div
          className={
            layoutMode === "carousel"
              ? "-mx-4 sm:mx-0 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-2"
              : ""
          }
        >
          <div
            className={
              layoutMode === "carousel"
                ? "flex gap-4 px-4 sm:px-0 items-stretch"
                : "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
            }
          >
            {visibleRoutines.map((routine) => {
              const firstTemplate = routine.templates?.[0];
              const prescriptions = firstTemplate?.prescriptions || [];
              const modalityLabel =
                MODALITY_LABELS[routine.modalityCode] || routine.modalityCode;
              const dayOfWeek = firstTemplate?.dayOfWeek;
              const dayLabel =
                typeof dayOfWeek === "number"
                  ? getWeekdayLabelPt(dayOfWeek, "short")
                  : null;
              const isToday =
                typeof dayOfWeek === "number" &&
                jsDayToMondayIndex(dayOfWeek) === todayMondayIdx;
              const estMin = estimateRoutineDurationMinutes(prescriptions);
              const totalSets = countTotalSets(prescriptions);
              const effect = effectByRoutineId.get(routine.id);
              const isExpanded = Boolean(expandedIds[routine.id]);
              const displayedPrescriptions = isExpanded
                ? prescriptions
                : prescriptions.slice(0, 4);
              const isStartingThis = isPending && startingId === routine.id;

              return (
                <article
                  key={routine.id}
                  className={`card card-interactive p-5 flex flex-col justify-between gap-4 ${
                    layoutMode === "carousel"
                      ? "snap-start shrink-0 w-[300px] sm:w-[340px]"
                      : "w-full"
                  } ${isToday ? "border-lima ring-1 ring-lima/50" : ""}`}
                >
                  <div>
                    {/* Metadados topo + Menu da ficha (Editar / Duplicar / Remover) */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {dayLabel && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold ${
                              isToday
                                ? "bg-lima text-grafite"
                                : "bg-foreground/8 text-foreground"
                            }`}
                          >
                            {isToday ? `${dayLabel} · Hoje` : dayLabel}
                          </span>
                        )}
                        <span className="chip text-[11px]">{modalityLabel}</span>
                      </div>

                      <div className="relative shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            setOpenMenuId(openMenuId === routine.id ? null : routine.id)
                          }
                          aria-haspopup="menu"
                          aria-expanded={openMenuId === routine.id}
                          aria-label={`Opções da ficha ${routine.title}`}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-foreground hover:bg-foreground/5 transition-colors cursor-pointer"
                        >
                          <MoreVertical size={15} />
                        </button>

                        {openMenuId === routine.id && (
                          <div
                            role="menu"
                            aria-label="Ações da ficha"
                            className="absolute right-0 mt-1 w-44 rounded-xl border border-line bg-surface shadow-lg p-1 z-30 flex flex-col gap-0.5"
                          >
                            <Link
                              href={`/treinos/${routine.id}/editar`}
                              role="menuitem"
                              onClick={() => setOpenMenuId(null)}
                              className="px-3 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-foreground/5 flex items-center gap-2 transition-colors"
                            >
                              <Pencil size={13} className="text-muted" />
                              <span>Editar ficha</span>
                            </Link>
                            <button
                              type="button"
                              role="menuitem"
                              disabled={isPending}
                              onClick={() => handleDuplicate(routine.id)}
                              className="px-3 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-foreground/5 flex items-center gap-2 text-left transition-colors cursor-pointer"
                            >
                              <Copy size={13} className="text-muted" />
                              <span>Duplicar ficha</span>
                            </button>
                            <button
                              type="button"
                              role="menuitem"
                              disabled={isPending}
                              onClick={() => {
                                setOpenMenuId(null);
                                setDeleteTarget({
                                  id: routine.id,
                                  title: routine.title,
                                });
                              }}
                              className="px-3 py-2 rounded-lg text-xs font-medium text-red-500 hover:bg-red-500/10 flex items-center gap-2 text-left transition-colors cursor-pointer"
                            >
                              <Trash2 size={13} />
                              <span>Remover ficha</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Título & métricas rápidas */}
                    <h2 className="t-h3 mt-3 leading-snug">{routine.title}</h2>
                    {routine.description && (
                      <p className="text-muted text-xs mt-1 line-clamp-2">
                        {routine.description}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] font-mono text-muted">
                      <span className="inline-flex items-center gap-1">
                        <Clock size={12} className="text-accent-text" />~{estMin} min
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Layers size={12} className="text-accent-text" />
                        {prescriptions.length} mov. · {totalSets} séries
                      </span>
                      {effect && effect.snapshot.estimatedLoadUa > 0 && (
                        <span className="inline-flex items-center gap-1 text-foreground">
                          <Zap size={11} className="text-accent-text" />~
                          {effect.snapshot.estimatedLoadUa} EA
                        </span>
                      )}
                    </div>

                    {/* O que esta ficha entrega (§Fase 4) */}
                    {effect && effect.snapshot.estimatedTotalSets > 0 && (
                      <div
                        className={`mt-3 rounded-xl border p-2.5 flex flex-col gap-1 ${
                          effect.alignmentTier === "high"
                            ? "border-profundo/35 bg-lima/10"
                            : effect.alignmentTier === "caution_overload"
                              ? "border-amber-500/40 bg-amber-500/10"
                              : "border-line bg-foreground/[0.02]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-accent-text inline-flex items-center gap-1">
                            <Target size={10} />
                            <span>{effect.alignmentBadgePt}</span>
                          </span>
                        </div>
                        <p className="text-[11px] font-medium text-foreground leading-snug">
                          {effect.primaryCapacityLabelPt}
                        </p>
                        <p className="text-[10px] text-muted leading-snug line-clamp-2">
                          {effect.alignmentExplanationPt}
                        </p>
                      </div>
                    )}

                    {/* Prévia clicável de exercícios (abre ExerciseSheet com passo a passo e vídeo) */}
                    <div className="mt-3.5 space-y-1.5 border-t border-line pt-3">
                      {displayedPrescriptions.map((p, idx) => (
                        <div
                          key={p.id}
                          className="flex justify-between items-center text-xs gap-2"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="t-data text-[11px] text-muted shrink-0">
                              {String(idx + 1).padStart(2, "0")}.
                            </span>
                            <ExerciseLink
                              exerciseId={p.exerciseId}
                              className="font-medium text-foreground truncate inline-flex items-center gap-1"
                            >
                              <span className="truncate">{p.exerciseNamePt}</span>
                              <Info
                                size={11}
                                className="text-muted shrink-0 opacity-70"
                              />
                            </ExerciseLink>
                          </div>
                          <span className="t-data text-[11px] text-muted shrink-0">
                            {p.targetSets}×{p.targetReps}
                          </span>
                        </div>
                      ))}

                      {prescriptions.length > 4 && (
                        <button
                          type="button"
                          onClick={() => toggleExpand(routine.id)}
                          className="t-aux text-accent-text hover:underline inline-flex items-center gap-1 pt-1 cursor-pointer"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp size={12} />
                              <span>Mostrar menos</span>
                            </>
                          ) : (
                            <>
                              <ChevronDown size={12} />
                              <span>
                                Ver todos os {prescriptions.length} movimentos
                              </span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Ação principal do card */}
                  <div className="pt-3.5 border-t border-line flex items-center justify-end">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleStartRoutine(routine)}
                      className="btn btn-dark h-9 w-full text-xs"
                    >
                      <Play size={12} fill="currentColor" />
                      <span>{isStartingThis ? "Abrindo..." : "Treinar"}</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal de Trocar Treino do Dia */}
      <ModalPortal
        open={openSwitchModal}
        onClose={() => setOpenSwitchModal(false)}
        ariaLabel="Trocar treino de hoje"
        maxWidthClass="max-w-md"
      >
        <div className="card p-5 w-full bg-surface border border-line shadow-2xl flex flex-col gap-3.5">
          <div className="flex items-center justify-between">
            <div>
              <span className="t-label !text-accent-text">Seleção de Treino</span>
              <h3 className="t-h3 mt-0.5">Trocar Treino de Hoje</h3>
            </div>
            <button
              type="button"
              onClick={() => setOpenSwitchModal(false)}
              className="text-muted hover:text-foreground cursor-pointer p-1"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto no-scrollbar pt-1">
            {routines.map((r) => {
              const t = r.templates?.[0];
              const p = t?.prescriptions || [];
              const day =
                typeof t?.dayOfWeek === "number"
                  ? getWeekdayLabelPt(t.dayOfWeek, "short")
                  : null;
              const isSelected = r.id === heroRoutine?.id;

              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setSelectedHeroRoutineId(r.id);
                    setOpenSwitchModal(false);
                  }}
                  className={`p-3 rounded-xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
                    isSelected
                      ? "border-lima bg-lima/10 ring-1 ring-lima/40"
                      : "border-line bg-surface hover:bg-foreground/[0.03]"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {day && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-foreground/10 text-foreground">
                          {day}
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-muted uppercase">
                        {MODALITY_LABELS[r.modalityCode] || r.modalityCode}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-foreground block truncate mt-0.5">
                      {r.title}
                    </span>
                    <span className="text-[10px] font-mono text-muted">
                      {p.length} mov. · {countTotalSets(p)} séries
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-lima shrink-0" />
                    )}
                    <span className="btn btn-ghost h-7 px-2 text-[11px] font-mono">
                      Selecionar
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </ModalPortal>

      {/* Modal customizado de confirmação de exclusão via ModalPortal */}
      <ModalPortal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        ariaLabel="Confirmar exclusão de ficha"
        maxWidthClass="max-w-sm"
      >
        <div className="card p-6 w-full bg-surface border border-line shadow-2xl flex flex-col gap-4">
          <h3 className="t-h3">Excluir esta ficha?</h3>
          <p className="text-xs text-muted leading-relaxed">
            A ficha <strong className="text-foreground">{deleteTarget?.title}</strong> será removida da sua lista ativa. Seu histórico de treinos já concluídos permanece intacto.
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className="btn btn-ghost h-9 px-3 text-xs"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={handleConfirmDelete}
              className="btn btn-dark h-9 px-4 text-xs"
            >
              {isPending ? "Excluindo..." : "Excluir Ficha"}
            </button>
          </div>
        </div>
      </ModalPortal>
    </div>
  );
}
