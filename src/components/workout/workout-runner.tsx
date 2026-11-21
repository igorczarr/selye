"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  formatDuration,
  calculateElapsedSeconds,
  calculateRestCountdown,
} from "@/core/workout-engine/timer";
import {
  startWorkout,
  finishWorkout,
  updateSetLog,
  cancelWorkout,
} from "@/actions/workout";
import { getWeekdayLabelPt, jsDayToMondayIndex } from "@/lib/week";
import { getModalityProfile } from "@/core/performance/training-load";
import { ExerciseLink } from "@/components/catalog/exercise-link";
import { ModalPortal } from "@/components/ui/modal-portal";
import {
  Play,
  Check,
  Timer,
  CheckCircle2,
  Dumbbell,
  Info,
  XCircle,
  ArrowRightLeft,
  Calendar,
  X,
  Plus,
  Flame,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  Sparkles,
} from "lucide-react";

interface SetLogItem {
  id: string;
  setNumber: number;
  weightKg: number | null;
  reps: number | null;
  isCompleted: boolean;
}

interface SessionExerciseItem {
  id: string;
  sessionExerciseId?: string;
  namePt: string;
  nameEn?: string | null;
  secondaryMuscles?: string[] | null;
  sets?: SetLogItem[];
}

export interface PrescriptionSummary {
  id: string;
  exerciseNamePt?: string | null;
  exerciseNameEn?: string | null;
  targetSets?: number | null;
  targetReps?: number | null;
}

export interface RoutineCardData {
  id: string;
  title: string;
  modalityCode: string;
  templates?: {
    dayOfWeek?: number | null;
    prescriptions?: PrescriptionSummary[];
  }[];
}

export interface TodayCompletedSessionSummary {
  id: string;
  title: string;
  modalityCode: string;
  durationMinutes: number;
  loadUa: number;
  rpeSession: number | null;
  finishedAt: string;
}

interface WorkoutRunnerProps {
  initialSession: any;
  sessionExercises: SessionExerciseItem[];
  routines: RoutineCardData[];
  todayCompletedSessions?: TodayCompletedSessionSummary[];
}

export function WorkoutRunner({
  initialSession,
  sessionExercises,
  routines,
  todayCompletedSessions = [],
}: WorkoutRunnerProps) {
  const router = useRouter();
  const [session, setSession] = useState<any>(initialSession);
  const [isPending, startTransition] = useTransition();
  const [elapsedDisplay, setElapsedDisplay] = useState("00:00");
  const [restTargetSeconds, setRestTargetSeconds] = useState(90);
  const [restRemaining, setRestRemaining] = useState<number | null>(null);
  const [lastCompletedTime, setLastCompletedTime] = useState<Date | null>(null);
  const [sessionRpe, setSessionRpe] = useState<number>(8);
  const [isFinishedBannerOpen, setIsFinishedBannerOpen] = useState(false);
  const [localCompletedToday, setLocalCompletedToday] = useState<
    TodayCompletedSessionSummary[]
  >([]);

  const mergedCompletedToday = (() => {
    const map = new Map<string, TodayCompletedSessionSummary>();
    for (const s of localCompletedToday) map.set(s.id, s);
    for (const s of todayCompletedSessions) map.set(s.id, s);
    return Array.from(map.values());
  })();

  const findCompletedForRoutine = (title?: string | null) => {
    if (!title) return undefined;
    const norm = title.trim().toLowerCase();
    return mergedCompletedToday.find(
      (s) => s.title.trim().toLowerCase() === norm
    );
  };

  // Filtro de visão: "hoje" (card slim de hoje) vs "todas" (o widget anterior de fichas)
  const [viewFilter, setViewFilter] = useState<"hoje" | "todas">("hoje");
  const [isExercisesAccordionOpen, setIsExercisesAccordionOpen] = useState(false);
  const [openSwitchModal, setOpenSwitchModal] = useState(false);

  // Identificação inteligente do Treino de Hoje (baixa fricção)
  const todayJsDay = new Date().getDay();
  const todayMondayIdx = jsDayToMondayIndex(todayJsDay);
  const todayWeekdayName = getWeekdayLabelPt(todayJsDay, "full");

  const todayScheduledRoutine = routines.find((r) => {
    const tpl = r.templates?.[0];
    return typeof tpl?.dayOfWeek === "number" && tpl.dayOfWeek === todayJsDay;
  });

  const [selectedRoutineId, setSelectedRoutineId] = useState<string>(() => {
    if (todayScheduledRoutine) return todayScheduledRoutine.id;
    return routines[0]?.id || "";
  });

  const activeRoutine =
    routines.find((r) => r.id === selectedRoutineId) ||
    todayScheduledRoutine ||
    routines[0] ||
    null;

  // Estado local otimista das séries (sincronizado com set_logs reais do banco)
  const [setStateMap, setSetStateMap] = useState<
    Record<string, { isCompleted: boolean; weightKg: number; reps: number }>
  >(() => {
    const initial: Record<
      string,
      { isCompleted: boolean; weightKg: number; reps: number }
    > = {};
    for (const ex of sessionExercises) {
      const sets = ex.sets?.length
        ? ex.sets
        : [1, 2, 3].map((n) => ({
            id: `${ex.sessionExerciseId ?? ex.id}_${n}`,
            setNumber: n,
            weightKg: 40,
            reps: 10,
            isCompleted: false,
          }));
      for (const s of sets) {
        initial[s.id] = {
          isCompleted: Boolean(s.isCompleted),
          weightKg: s.weightKg ?? 0,
          reps: s.reps ?? 10,
        };
      }
    }
    return initial;
  });

  useEffect(() => {
    setSession(initialSession);
    const next: Record<
      string,
      { isCompleted: boolean; weightKg: number; reps: number }
    > = {};
    for (const ex of sessionExercises) {
      const sets = ex.sets?.length
        ? ex.sets
        : [1, 2, 3].map((n) => ({
            id: `${ex.sessionExerciseId ?? ex.id}_${n}`,
            setNumber: n,
            weightKg: 40,
            reps: 10,
            isCompleted: false,
          }));
      for (const s of sets) {
        next[s.id] = {
          isCompleted: Boolean(s.isCompleted),
          weightKg: s.weightKg ?? 0,
          reps: s.reps ?? 10,
        };
      }
    }
    setSetStateMap(next);
  }, [initialSession, sessionExercises]);

  useEffect(() => {
    if (!session || session.status !== "in_progress") {
      setElapsedDisplay("00:00");
      return;
    }

    const updateTimer = () => {
      const { elapsedSeconds } = calculateElapsedSeconds({
        startedAt: session.startedAt,
        pausedAt: session.pausedAt,
        accumulatedPausedSeconds: session.accumulatedPausedSeconds || 0,
      });
      setElapsedDisplay(formatDuration(elapsedSeconds));

      if (lastCompletedTime && restRemaining !== null && restRemaining > 0) {
        const rest = calculateRestCountdown(lastCompletedTime, restTargetSeconds);
        setRestRemaining(rest.remainingSeconds);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [session, lastCompletedTime, restRemaining, restTargetSeconds]);

  const handleStart = (programId?: string, title?: string) => {
    setIsFinishedBannerOpen(false);
    setOpenSwitchModal(false);
    startTransition(async () => {
      const newSession = await startWorkout(title, programId);
      setSession(newSession);
      router.refresh();
    });
  };

  const handleFinish = () => {
    if (!session) return;
    const finishedSessionSnapshot = session;
    startTransition(async () => {
      await finishWorkout(finishedSessionSnapshot.id, sessionRpe);
      const durMin = finishedSessionSnapshot.startedAt
        ? Math.max(
            15,
            Math.round(
              (Date.now() -
                new Date(finishedSessionSnapshot.startedAt).getTime()) /
                60000
            )
          )
        : 45;
      setLocalCompletedToday((prev) => [
        {
          id: finishedSessionSnapshot.id,
          title: finishedSessionSnapshot.title || "Treino",
          modalityCode: finishedSessionSnapshot.modalityCode || "strength",
          durationMinutes: durMin,
          loadUa: Math.round(durMin * sessionRpe),
          rpeSession: sessionRpe,
          finishedAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      setSession(null);
      setRestRemaining(null);
      setIsFinishedBannerOpen(true);
      router.refresh();
    });
  };

  const handleCancel = () => {
    if (!session) return;
    startTransition(async () => {
      await cancelWorkout(session.id);
      setSession(null);
      setRestRemaining(null);
      router.refresh();
    });
  };

  const isRealUuid = (id: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  const toggleSet = (setId: string) => {
    const current = setStateMap[setId] ?? {
      isCompleted: false,
      weightKg: 40,
      reps: 10,
    };
    const nextCompleted = !current.isCompleted;

    setSetStateMap((prev) => ({
      ...prev,
      [setId]: { ...current, isCompleted: nextCompleted },
    }));

    if (nextCompleted) {
      setRestTargetSeconds(90);
      setLastCompletedTime(new Date());
      setRestRemaining(90);
    }

    if (isRealUuid(setId)) {
      updateSetLog(setId, {
        isCompleted: nextCompleted,
        weightKg: current.weightKg,
        reps: current.reps,
      }).catch(() => {});
    }
  };

  const updateSetField = (
    setId: string,
    field: "weightKg" | "reps",
    rawValue: string
  ) => {
    const parsed = Math.max(0, Number(rawValue) || 0);
    const current = setStateMap[setId] ?? {
      isCompleted: false,
      weightKg: 40,
      reps: 10,
    };
    const updated = { ...current, [field]: parsed };
    setSetStateMap((prev) => ({ ...prev, [setId]: updated }));

    if (isRealUuid(setId)) {
      updateSetLog(setId, { [field]: parsed }).catch(() => {});
    }
  };

  const adjustRest = (deltaSeconds: number) => {
    setRestTargetSeconds((prev) => Math.max(15, prev + deltaSeconds));
    setRestRemaining((prev) =>
      prev !== null ? Math.max(0, prev + deltaSeconds) : null
    );
  };

  // =========================================================================
  // ESTADO 1: NENHUMA SESSÃO EM ANDAMENTO -> WIDGET COMPACTO COM FILTROS & MENUS
  // =========================================================================
  if (!session) {
    if (routines.length === 0) {
      return (
        <div className="card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-lima/25 text-foreground flex items-center justify-center shrink-0">
              <Dumbbell size={18} strokeWidth={1.75} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Nenhuma ficha cadastrada
              </h3>
              <p className="text-muted text-xs mt-0.5">
                Crie sua primeira ficha para treinar com séries e cargas planejadas.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleStart()}
            disabled={isPending}
            className="btn btn-primary h-9 px-4 text-xs font-mono font-bold shrink-0"
          >
            <Play size={13} fill="currentColor" />
            <span>{isPending ? "Iniciando..." : "Treino livre"}</span>
          </button>
        </div>
      );
    }

    const tpl = activeRoutine?.templates?.[0];
    const prescs = tpl?.prescriptions || [];
    const exerciseCount = prescs.length;
    const isTodayScheduled =
      typeof tpl?.dayOfWeek === "number" && tpl.dayOfWeek === todayJsDay;

    const completedForActive = findCompletedForRoutine(activeRoutine?.title);
    const completedHeroSession =
      completedForActive ||
      (isTodayScheduled || activeRoutine?.id === todayScheduledRoutine?.id
        ? mergedCompletedToday[0]
        : undefined);
    const isHeroDone = Boolean(completedHeroSession);

    return (
      <div className="flex flex-col gap-3">
        {/* FILTROS E MENUS COMPACTOS: Alternância "Hoje" vs "Todas as Fichas" */}
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center p-0.5 rounded-lg bg-foreground/[0.04] border border-line text-xs font-mono">
            <button
              type="button"
              onClick={() => setViewFilter("hoje")}
              className={`h-7 px-3 rounded-md transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                viewFilter === "hoje"
                  ? "bg-surface text-foreground font-semibold shadow-2xs border border-line/60"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  mergedCompletedToday.length > 0 ? "bg-emerald-400" : "bg-lima"
                }`}
              />
              <span>
                {mergedCompletedToday.length > 0 ? "Hoje · Feito" : "Hoje"}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setViewFilter("todas")}
              className={`h-7 px-3 rounded-md transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                viewFilter === "todas"
                  ? "bg-surface text-foreground font-semibold shadow-2xs border border-line/60"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <LayoutGrid size={12} />
              <span>Todas ({routines.length})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setOpenSwitchModal(true)}
            className="text-[11px] font-mono text-muted hover:text-foreground inline-flex items-center gap-1 cursor-pointer py-1 px-2 rounded hover:bg-foreground/[0.03]"
          >
            <ArrowRightLeft size={12} />
            <span>Mudar ficha</span>
          </button>
        </div>

        {/* MODO 1: VISÃO "HOJE" -> CARD SLIM, BREVE E PRECISO COM ACORDEÃO */}
        {viewFilter === "hoje" && (
          <article
            className={`card p-4 sm:p-4.5 flex flex-col gap-3 transition-all ${
              isHeroDone
                ? "border-emerald-500/45 ring-1 ring-emerald-500/25 bg-gradient-to-br from-surface via-surface to-emerald-500/[0.05]"
                : "border-lima/40 ring-1 ring-lima/30"
            }`}
          >
            {/* Linha Principal Slim */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {isHeroDone ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1">
                      <CheckCircle2 size={11} />
                      <span>Treino feito</span>
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-lima text-grafite">
                      {isTodayScheduled ? "Hoje" : "Sugerido"}
                    </span>
                  )}
                  <span className="text-xs font-mono text-muted">
                    {isHeroDone && completedHeroSession
                      ? `${todayWeekdayName} · ${completedHeroSession.durationMinutes} min · RPE ${completedHeroSession.rpeSession ?? 8}/10 · ${completedHeroSession.loadUa} EA`
                      : `${todayWeekdayName} · ${exerciseCount} ${
                          exerciseCount === 1 ? "exercício" : "exercícios"
                        } · ~45 min`}
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-foreground mt-1 truncate">
                  {isHeroDone && completedHeroSession
                    ? completedHeroSession.title
                    : activeRoutine?.title}
                </h3>
              </div>

              {/* Ações Diretas: Estado Concluído ou Botão Iniciar + Acordeão Exercícios */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                {prescs.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setIsExercisesAccordionOpen((prev) => !prev)
                    }
                    aria-expanded={isExercisesAccordionOpen}
                    aria-label="Ver exercícios prescritos"
                    className="h-9 px-3 rounded-lg border border-line bg-surface hover:bg-foreground/[0.04] text-xs font-mono text-muted hover:text-foreground inline-flex items-center transition-all cursor-pointer"
                  >
                    <span>
                      {isExercisesAccordionOpen ? "Ocultar" : "Exercícios"}
                    </span>
                  </button>
                )}

                {isHeroDone ? (
                  <>
                    <span className="h-9 px-3.5 rounded-lg bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 font-mono font-bold text-xs inline-flex items-center gap-1.5 select-none">
                      <Check size={14} strokeWidth={2.8} />
                      <span>Concluído</span>
                    </span>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        handleStart(activeRoutine?.id, activeRoutine?.title)
                      }
                      title="Iniciar outra sessão hoje"
                      className="h-9 px-3 rounded-lg border border-line bg-surface hover:bg-foreground/[0.04] text-xs font-mono text-muted hover:text-foreground inline-flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Play size={11} fill="currentColor" />
                      <span>{isPending ? "..." : "Repetir"}</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      handleStart(activeRoutine?.id, activeRoutine?.title)
                    }
                    className="h-9 px-4 rounded-lg bg-lima hover:brightness-105 active:scale-[0.99] text-grafite font-mono font-bold text-xs inline-flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <Play size={13} fill="currentColor" />
                    <span>{isPending ? "Iniciando..." : "Treinar"}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Acordeão de Exercícios (Fechado por padrão, abre apenas se o atleta pedir) */}
            {isExercisesAccordionOpen && prescs.length > 0 && (
              <div className="pt-2.5 border-t border-line flex flex-wrap gap-1.5 animate-in fade-in duration-150">
                {prescs.map((p, idx) => (
                  <span
                    key={p.id || idx}
                    className="px-2 py-0.5 rounded text-[11px] bg-foreground/[0.04] border border-line text-foreground font-mono"
                  >
                    {p.exerciseNamePt || p.exerciseNameEn || `Exercício ${idx + 1}`}
                    {p.targetSets ? ` (${p.targetSets}x)` : ""}
                  </span>
                ))}
              </div>
            )}
          </article>
        )}

        {/* MODO 2: VISÃO "TODAS AS FICHAS" -> O WIDGET DOS TREINOS ANTERIORES */}
        {viewFilter === "todas" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {routines.map((r) => {
              const rTpl = r.templates?.[0];
              const day = rTpl?.dayOfWeek;
              const isToday =
                typeof day === "number" &&
                jsDayToMondayIndex(day) === todayMondayIdx;
              const count = rTpl?.prescriptions?.length ?? 0;
              const doneToday = findCompletedForRoutine(r.title);

              return (
                <article
                  key={r.id}
                  className={`card card-interactive p-4 flex flex-col justify-between gap-3.5 transition-all ${
                    doneToday
                      ? "border-emerald-500/45 ring-1 ring-emerald-500/25 bg-gradient-to-br from-surface via-surface to-emerald-500/[0.04]"
                      : isToday
                        ? "border-lima ring-1 ring-lima/60"
                        : ""
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {doneToday ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1">
                          <Check size={10} strokeWidth={2.8} />
                          <span>Feito hoje</span>
                        </span>
                      ) : (
                        typeof day === "number" && (
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                              isToday
                                ? "bg-lima text-grafite"
                                : "bg-foreground/8 text-muted"
                            }`}
                          >
                            {isToday ? "Hoje" : getWeekdayLabelPt(day, "short")}
                          </span>
                        )
                      )}
                      <span className="t-data text-[11px] text-muted">
                        {count} {count === 1 ? "exercício" : "exercícios"}
                      </span>
                    </div>
                    <h3 className="font-semibold text-sm mt-1.5 line-clamp-2 text-foreground">
                      {r.title}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleStart(r.id, r.title)}
                    disabled={isPending}
                    className={
                      doneToday
                        ? "h-9 w-full rounded-lg border border-emerald-500/35 bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-400 font-mono font-semibold text-xs inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        : "btn btn-dark h-9 w-full text-xs"
                    }
                  >
                    {doneToday ? (
                      <>
                        <CheckCircle2 size={13} />
                        <span>{isPending ? "Iniciando..." : "Treino feito · Repetir"}</span>
                      </>
                    ) : (
                      <>
                        <Play size={12} fill="currentColor" />
                        <span>{isPending ? "Iniciando..." : "Treinar"}</span>
                      </>
                    )}
                  </button>
                </article>
              );
            })}
          </div>
        )}

        {/* FEEDBACK DE TREINO CONCLUÍDO (SE HOUVER) */}
        {isFinishedBannerOpen && (
          <div
            role="status"
            className="p-3.5 rounded-xl bg-lima/20 border border-lima flex items-start gap-2.5 text-xs text-foreground"
          >
            <CheckCircle2 size={16} className="text-profundo mt-0.5 shrink-0" />
            <div>
              <span className="font-mono font-bold text-accent-text block">
                Sessão Concluída (Nota {sessionRpe}/10)
              </span>
              <span className="text-muted text-[11px]">
                Sua evolução e bateria do corpo foram atualizadas.
              </span>
            </div>
          </div>
        )}

        {/* MODAL PARA TROCAR FICHA (VIA MODALPORTAL) */}
        <ModalPortal
          open={openSwitchModal}
          onClose={() => setOpenSwitchModal(false)}
          ariaLabel="Trocar Ficha de Treino"
          maxWidthClass="sm:max-w-md"
        >
          <div className="w-full bg-surface border border-line rounded-2xl shadow-2xl p-5 flex flex-col gap-3.5 max-h-[85dvh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="t-label !text-accent-text">Fichas de Treino</span>
                <h2 className="t-h3 mt-0.5">Escolha uma ficha</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpenSwitchModal(false)}
                aria-label="Fechar"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-foreground hover:bg-foreground/5 cursor-pointer shrink-0"
              >
                <X size={15} />
              </button>
            </div>

            <div className="divide-y divide-line">
              {routines.map((r) => {
                const rTpl = r.templates?.[0];
                const rDay = rTpl?.dayOfWeek;
                const isDayToday =
                  typeof rDay === "number" && rDay === todayJsDay;
                const count = rTpl?.prescriptions?.length ?? 0;

                return (
                  <div
                    key={r.id}
                    className="py-2.5 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {typeof rDay === "number" && (
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${
                              isDayToday
                                ? "bg-lima text-grafite"
                                : "bg-foreground/10 text-muted"
                            }`}
                          >
                            {isDayToday ? "Hoje" : getWeekdayLabelPt(rDay, "short")}
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-muted">
                          {count} ex.
                        </span>
                      </div>
                      <p className="font-semibold text-xs text-foreground mt-0.5 truncate">
                        {r.title}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRoutineId(r.id);
                          setViewFilter("hoje");
                          setOpenSwitchModal(false);
                        }}
                        className="btn btn-ghost h-8 px-2.5 text-[11px] font-mono"
                      >
                        Ver
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleStart(r.id, r.title)}
                        className="btn btn-primary h-8 px-3 text-[11px] font-mono font-bold inline-flex items-center gap-1"
                      >
                        <Play size={11} fill="currentColor" />
                        <span>Treinar</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-line flex items-center justify-between text-xs">
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleStart()}
                className="btn btn-ghost h-8 px-2 text-[11px] font-mono text-muted hover:text-foreground inline-flex items-center gap-1"
              >
                <Flame size={13} className="text-lima" />
                <span>Treino livre</span>
              </button>

              <Link
                href="/treinos/novo"
                className="btn btn-ghost h-8 px-2 text-[11px] font-mono text-accent-text inline-flex items-center gap-1"
              >
                <Plus size={13} />
                <span>Nova Ficha</span>
              </Link>
            </div>
          </div>
        </ModalPortal>
      </div>
    );
  }

  // =========================================================================
  // ESTADO 2: SESSÃO EM ANDAMENTO -> RUNNER ATIVO (TIMER, SÉRIES, DESCANSO)
  // =========================================================================
  const normalizedExercises = sessionExercises.map((ex) => ({
    ...ex,
    resolvedSets:
      ex.sets && ex.sets.length > 0
        ? ex.sets
        : [1, 2, 3].map((n) => ({
            id: `${ex.sessionExerciseId ?? ex.id}_${n}`,
            setNumber: n,
            weightKg: 40,
            reps: 10,
            isCompleted: false,
          })),
  }));

  const allSetIds = normalizedExercises.flatMap((ex) =>
    ex.resolvedSets.map((s) => s.id)
  );
  const totalSetsCount = allSetIds.length;
  const completedSetsCount = allSetIds.filter(
    (id) => setStateMap[id]?.isCompleted
  ).length;
  const progressPercent =
    totalSetsCount > 0
      ? Math.round((completedSetsCount / totalSetsCount) * 100)
      : 0;

  return (
    <div className="card p-4 sm:p-5 flex flex-col gap-4">
      {/* Cabeçalho do Modo Foco */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-lima text-grafite">
              <span className="w-1.5 h-1.5 rounded-full bg-grafite animate-pulse" />
              EM EXECUÇÃO
            </span>
            <span className="t-data text-xs text-muted">
              {completedSetsCount}/{totalSetsCount} séries ({progressPercent}%)
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-foreground mt-1 truncate">
            {session.title}
          </h3>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
          <div className="sm:text-right">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted block">
              Tempo
            </span>
            <p className="t-data text-xl sm:text-2xl font-bold text-foreground leading-none">
              {elapsedDisplay}
            </p>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isPending}
            title="Descartar sessão e trocar ficha"
            aria-label="Descartar sessão em andamento"
            className="btn btn-ghost h-8 px-2 text-xs font-mono text-muted hover:text-foreground"
          >
            <XCircle size={14} />
            <span className="hidden sm:inline">Trocar</span>
          </button>
        </div>
      </div>

      {/* Barra de progresso da sessão */}
      {totalSetsCount > 0 && (
        <div className="w-full h-1.5 bg-foreground/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-lima transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* Timer de Descanso em Destaque */}
      {restRemaining !== null && restRemaining > 0 && (
        <div
          role="timer"
          aria-live="polite"
          className="sticky top-16 z-20 rounded-xl bg-noite text-osso p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-lg border border-lima/30"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 text-lima flex items-center justify-center shrink-0">
              <Timer size={16} />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-nevoa block">
                Descanso
              </span>
              <p className="t-data text-xl text-lima font-bold leading-none mt-0.5">
                {formatDuration(restRemaining)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => adjustRest(-15)}
              className="h-8 px-2.5 rounded-md border border-white/15 text-xs font-mono text-osso hover:bg-white/10 transition-colors cursor-pointer"
            >
              -15s
            </button>
            <button
              type="button"
              onClick={() => adjustRest(15)}
              className="h-8 px-2.5 rounded-md border border-white/15 text-xs font-mono text-osso hover:bg-white/10 transition-colors cursor-pointer"
            >
              +15s
            </button>
            <button
              type="button"
              onClick={() => setRestRemaining(0)}
              className="h-8 px-3 rounded-md bg-lima text-grafite text-xs font-mono font-semibold hover:brightness-95 transition-all cursor-pointer"
            >
              Pular
            </button>
          </div>
        </div>
      )}

      {/* Movimentos Prescritos ou Modo Atividade Livre */}
      {normalizedExercises.length === 0 ? (
        <div className="rounded-xl border border-line bg-foreground/[0.02] p-4 flex items-center justify-between gap-3 text-xs">
          <div>
            <span className="font-semibold text-foreground block">
              Atividade Livre em Execução
            </span>
            <span className="text-muted">
              Ao concluir, selecione o esforço abaixo e clique em Finalizar.
            </span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {normalizedExercises.map((ex, exIndex) => (
            <div
              key={ex.sessionExerciseId ?? ex.id}
              className="rounded-xl border border-line p-3 bg-foreground/[0.015] flex flex-col gap-2.5"
            >
              <div className="flex justify-between items-start gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[11px] font-mono font-bold px-1.5 py-0.2 rounded bg-surface border border-line text-accent-text shrink-0">
                    {String(exIndex + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-xs sm:text-sm text-foreground truncate">
                      <ExerciseLink
                        exerciseId={ex.id}
                        className="inline-flex items-center gap-1 hover:underline"
                      >
                        <span>{ex.namePt || ex.nameEn}</span>
                        <Info size={12} className="text-muted shrink-0" />
                      </ExerciseLink>
                    </p>
                    <p className="text-[11px] text-muted">
                      {ex.secondaryMuscles?.[0] || "Treinamento"} ·{" "}
                      {ex.resolvedSets.length}{" "}
                      {ex.resolvedSets.length === 1 ? "série" : "séries"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Séries em grade tabular compacta */}
              <div className="flex flex-col gap-1.5">
                {ex.resolvedSets.map((set) => {
                  const st = setStateMap[set.id] ?? {
                    isCompleted: set.isCompleted,
                    weightKg: set.weightKg ?? 0,
                    reps: set.reps ?? 10,
                  };
                  return (
                    <div
                      key={set.id}
                      className={`grid grid-cols-12 items-center gap-1.5 rounded-lg border px-2 py-1 transition-colors ${
                        st.isCompleted
                          ? "border-lima/70 bg-lima/10"
                          : "border-line bg-surface"
                      }`}
                    >
                      <span className="col-span-2 text-[11px] font-mono font-semibold text-muted">
                        S{set.setNumber}
                      </span>

                      <div className="col-span-4 flex items-center gap-1">
                        <input
                          type="number"
                          min={0}
                          step={0.5}
                          value={st.weightKg}
                          onChange={(e) =>
                            updateSetField(set.id, "weightKg", e.target.value)
                          }
                          aria-label={`Carga série ${set.setNumber}`}
                          className="w-full h-8 px-1.5 rounded border border-line bg-background text-foreground text-xs text-center focus:outline-none focus:border-profundo"
                        />
                        <span className="text-[10px] font-mono text-muted">kg</span>
                      </div>

                      <div className="col-span-3 flex items-center gap-1">
                        <input
                          type="number"
                          min={1}
                          value={st.reps}
                          onChange={(e) =>
                            updateSetField(set.id, "reps", e.target.value)
                          }
                          aria-label={`Reps série ${set.setNumber}`}
                          className="w-full h-8 px-1.5 rounded border border-line bg-background text-foreground text-xs text-center focus:outline-none focus:border-profundo"
                        />
                        <span className="text-[10px] font-mono text-muted">r</span>
                      </div>

                      <div className="col-span-3 flex justify-end">
                        <button
                          type="button"
                          aria-pressed={st.isCompleted}
                          onClick={() => toggleSet(set.id)}
                          className={`h-8 w-full rounded border text-xs font-mono flex items-center justify-center gap-1 transition-all cursor-pointer ${
                            st.isCompleted
                              ? "bg-lima border-lima text-grafite font-bold"
                              : "border-line bg-background text-muted hover:text-foreground hover:border-mineral"
                          }`}
                        >
                          <Check size={12} strokeWidth={2.8} />
                          <span className="text-[10px]">
                            {st.isCompleted ? "Feita" : "OK"}
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Esforço + Finalização */}
      <div className="pt-3 border-t border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted font-mono">
            Esforço:
          </span>
          <div className="flex items-center gap-1">
            {[6, 7, 8, 9, 10].map((rpeValue) => (
              <button
                key={rpeValue}
                type="button"
                onClick={() => setSessionRpe(rpeValue)}
                aria-pressed={sessionRpe === rpeValue}
                className={`h-8 w-8 rounded-md border text-xs font-mono transition-colors cursor-pointer ${
                  sessionRpe === rpeValue
                    ? "bg-foreground text-background border-foreground font-bold"
                    : "border-line bg-surface text-muted hover:text-foreground"
                }`}
              >
                {rpeValue}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={handleFinish}
          disabled={isPending}
          className="btn btn-primary h-9 px-5 text-xs font-mono font-bold"
        >
          <Check size={14} strokeWidth={2.2} />
          <span>{isPending ? "Salvando..." : "Concluir Treino"}</span>
        </button>
      </div>
    </div>
  );
}
