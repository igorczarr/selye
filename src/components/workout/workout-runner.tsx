"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { ExerciseLink } from "@/components/catalog/exercise-link";
import {
  Play,
  Check,
  Timer,
  CheckCircle2,
  Dumbbell,
  Info,
  XCircle,
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

interface RoutineCardData {
  id: string;
  title: string;
  modalityCode: string;
  templates?: {
    dayOfWeek?: number | null;
    prescriptions?: { id: string }[];
  }[];
}

interface WorkoutRunnerProps {
  initialSession: any;
  sessionExercises: SessionExerciseItem[];
  routines: RoutineCardData[];
}

export function WorkoutRunner({
  initialSession,
  sessionExercises,
  routines,
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

  // Atualiza mapa quando sessionExercises recarrega após iniciar nova ficha
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
    startTransition(async () => {
      const newSession = await startWorkout(title, programId);
      setSession(newSession);
      router.refresh();
    });
  };

  const handleFinish = () => {
    if (!session) return;
    startTransition(async () => {
      await finishWorkout(session.id, sessionRpe);
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

  if (!session) {
    const todayMondayIdx = jsDayToMondayIndex(new Date().getDay());

    return (
      <div className="flex flex-col gap-4">
        {routines.length === 0 ? (
          <div className="card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-lima/25 text-foreground flex items-center justify-center shrink-0">
                <Dumbbell size={20} strokeWidth={1.75} />
              </div>
              <div>
                <h3 className="t-h3">Nenhuma ficha cadastrada</h3>
                <p className="text-muted text-sm mt-1">
                  Crie sua primeira ficha para treinar com séries e cargas planejadas.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleStart()}
              disabled={isPending}
              className="btn btn-primary h-11 px-6 shrink-0"
            >
              <Play size={15} fill="currentColor" />
              <span>{isPending ? "Iniciando..." : "Treino livre"}</span>
            </button>
          </div>
        ) : (
          <div className="-mx-4 sm:mx-0 overflow-x-auto sm:overflow-visible no-scrollbar snap-x snap-mandatory">
            <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-3 px-4 sm:px-0 pb-1">
              {routines.map((r) => {
                const tpl = r.templates?.[0];
                const day = tpl?.dayOfWeek;
                const isToday =
                  typeof day === "number" &&
                  jsDayToMondayIndex(day) === todayMondayIdx;
                const count = tpl?.prescriptions?.length ?? 0;

                return (
                  <article
                    key={r.id}
                    className={`card card-interactive snap-start shrink-0 w-[240px] sm:w-auto p-4 flex flex-col justify-between gap-4 ${
                      isToday ? "border-lima ring-1 ring-lima/60" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        {typeof day === "number" && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold ${
                              isToday
                                ? "bg-lima text-grafite"
                                : "bg-foreground/8 text-muted"
                            }`}
                          >
                            {isToday ? "Hoje" : getWeekdayLabelPt(day, "short")}
                          </span>
                        )}
                        <span className="t-data text-[11px] text-muted">
                          {count} {count === 1 ? "exercício" : "exercícios"}
                        </span>
                      </div>
                      <h3 className="font-semibold text-sm mt-2 line-clamp-2 text-foreground">
                        {r.title}
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleStart(r.id, r.title)}
                      disabled={isPending}
                      className="btn btn-dark h-10 w-full text-xs"
                    >
                      <Play size={13} fill="currentColor" />
                      <span>{isPending ? "Iniciando..." : "Treinar"}</span>
                    </button>
                  </article>
                );
              })}
            </div>
          </div>
        )}

        {isFinishedBannerOpen && (
          <div
            role="status"
            className="p-4 rounded-xl bg-lima/20 border border-lima flex items-start gap-3"
          >
            <CheckCircle2 size={18} className="text-profundo mt-0.5 shrink-0" />
            <div>
              <span className="t-label !text-accent-text">Sessão registrada</span>
              <p className="font-semibold text-foreground text-sm mt-0.5">
                Treino concluído com esforço nota {sessionRpe}/10.
              </p>
              <p className="text-xs text-muted mt-0.5">
                Sua evolução, sequência semanal e bateria do corpo já foram atualizadas.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

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
    <div className="card p-5 sm:p-6 flex flex-col gap-5">
      {/* Cabeçalho do Modo Foco */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-lima text-grafite">
              <span className="w-2 h-2 rounded-full bg-grafite animate-pulse" />
              EM EXECUÇÃO
            </span>
            <span className="t-data text-xs text-muted">
              {completedSetsCount}/{totalSetsCount} séries ({progressPercent}%)
            </span>
          </div>
          <h3 className="t-h2 mt-2 truncate">{session.title}</h3>
          <p className="t-aux text-muted mt-0.5">
            Toque em qualquer movimento para abrir o passo a passo ilustrado.
          </p>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
          <div className="sm:text-right">
            <span className="t-label block">Tempo</span>
            <p className="t-data text-2xl sm:text-3xl font-semibold text-foreground">
              {elapsedDisplay}
            </p>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isPending}
            title="Descartar sessão e trocar ficha"
            aria-label="Descartar sessão em andamento"
            className="btn btn-ghost h-9 px-2.5 text-xs font-mono text-muted hover:text-foreground"
          >
            <XCircle size={15} />
            <span className="hidden sm:inline">Trocar</span>
          </button>
        </div>
      </div>

      {/* Barra de progresso da sessão (somente para fichas com séries prescritas) */}
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
          className="sticky top-16 z-20 rounded-xl bg-noite text-osso p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg border border-lima/30"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 text-lima flex items-center justify-center shrink-0">
              <Timer size={20} />
            </div>
            <div>
              <span className="t-label !text-nevoa">Recuperação entre séries</span>
              <p className="t-data text-2xl text-lima font-semibold">
                {formatDuration(restRemaining)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => adjustRest(-15)}
              className="h-9 px-3 rounded-md border border-white/15 text-xs font-mono text-osso hover:bg-white/10 transition-colors cursor-pointer"
            >
              -15s
            </button>
            <button
              type="button"
              onClick={() => adjustRest(15)}
              className="h-9 px-3 rounded-md border border-white/15 text-xs font-mono text-osso hover:bg-white/10 transition-colors cursor-pointer"
            >
              +15s
            </button>
            <button
              type="button"
              onClick={() => setRestRemaining(0)}
              className="h-9 px-3.5 rounded-md bg-lima text-grafite text-xs font-mono font-semibold hover:brightness-95 transition-all cursor-pointer"
            >
              Pular
            </button>
          </div>
        </div>
      )}

      {/* Movimentos Prescritos ou Modo Atividade Livre (corrida, futsal, ciclismo, etc.) */}
      {normalizedExercises.length === 0 ? (
        <div className="rounded-xl border border-line bg-foreground/[0.02] p-5 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="t-label !text-accent-text">
              Cronômetro de Atividade Livre
            </span>
            <p className="text-sm text-foreground font-medium">
              Seu tempo está sendo contabilizado em segundo plano mesmo se você sair da tela.
            </p>
            <p className="text-xs text-muted">
              Ao terminar, selecione o esforço do treino abaixo e toque em Concluir Treino.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="t-label">Exercícios do seu Treino</span>
            <span className="text-[11px] font-mono text-muted">
              Dica: toque no nome do exercício para assistir ao vídeo de como fazer
            </span>
          </div>
          {normalizedExercises.map((ex, exIndex) => (
          <div
            key={ex.sessionExerciseId ?? ex.id}
            className="rounded-xl border border-line p-4 bg-foreground/[0.02] flex flex-col gap-3"
          >
            <div className="flex justify-between items-start gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="t-data text-xs px-2 py-0.5 rounded bg-surface border border-line text-accent-text shrink-0">
                  {String(exIndex + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-foreground">
                    <ExerciseLink
                      exerciseId={ex.id}
                      className="inline-flex items-center gap-1.5"
                    >
                      <span>{ex.namePt || ex.nameEn}</span>
                      <Info size={13} className="text-muted shrink-0" />
                    </ExerciseLink>
                  </p>
                  <p className="t-aux text-muted">
                    {ex.secondaryMuscles?.[0] || "Treinamento"} ·{" "}
                    {ex.resolvedSets.length}{" "}
                    {ex.resolvedSets.length === 1 ? "série" : "séries"}
                  </p>
                </div>
              </div>
            </div>

            {/* Grade tabular de séries reais com edição rápida de carga/reps + check 44px */}
            <div className="flex flex-col gap-2">
              {ex.resolvedSets.map((set) => {
                const st = setStateMap[set.id] ?? {
                  isCompleted: set.isCompleted,
                  weightKg: set.weightKg ?? 0,
                  reps: set.reps ?? 10,
                };
                return (
                  <div
                    key={set.id}
                    className={`grid grid-cols-12 items-center gap-2 rounded-lg border px-2.5 py-1.5 transition-colors ${
                      st.isCompleted
                        ? "border-lima/70 bg-lima/10"
                        : "border-line bg-surface"
                    }`}
                  >
                    <span className="col-span-2 t-data text-xs font-semibold text-muted">
                      Série {set.setNumber}
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
                        aria-label={`Carga da série ${set.setNumber} em kg`}
                        className="w-full h-9 px-2 rounded-md border border-line bg-background text-foreground t-data text-xs text-center focus:outline-none focus:border-profundo"
                      />
                      <span className="text-[11px] font-mono text-muted">kg</span>
                    </div>

                    <div className="col-span-3 flex items-center gap-1">
                      <input
                        type="number"
                        min={1}
                        value={st.reps}
                        onChange={(e) =>
                          updateSetField(set.id, "reps", e.target.value)
                        }
                        aria-label={`Repetições da série ${set.setNumber}`}
                        className="w-full h-9 px-2 rounded-md border border-line bg-background text-foreground t-data text-xs text-center focus:outline-none focus:border-profundo"
                      />
                      <span className="text-[11px] font-mono text-muted">reps</span>
                    </div>

                    <div className="col-span-3 flex justify-end">
                      <button
                        type="button"
                        aria-pressed={st.isCompleted}
                        onClick={() => toggleSet(set.id)}
                        className={`h-11 w-full rounded-lg border text-xs font-mono flex items-center justify-center gap-1 transition-all cursor-pointer ${
                          st.isCompleted
                            ? "bg-lima border-lima text-grafite font-semibold"
                            : "border-line bg-background text-muted hover:text-foreground hover:border-mineral"
                        }`}
                      >
                        <Check size={14} strokeWidth={2.5} />
                        <span className="hidden sm:inline">
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
      <div className="pt-4 border-t border-line flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="t-label">
            Como você avalia o esforço deste treino? (6 = Moderado · 10 = Máximo)
          </span>
          <div className="flex items-center gap-1.5">
            {[6, 7, 8, 9, 10].map((rpeValue) => (
              <button
                key={rpeValue}
                type="button"
                onClick={() => setSessionRpe(rpeValue)}
                aria-pressed={sessionRpe === rpeValue}
                className={`h-10 w-10 rounded-md border t-data text-xs transition-colors cursor-pointer ${
                  sessionRpe === rpeValue
                    ? "bg-foreground text-background border-foreground font-semibold"
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
          className="btn btn-primary h-11 px-6"
        >
          <Check size={16} strokeWidth={2.2} />
          <span>{isPending ? "Registrando..." : "Concluir Treino"}</span>
        </button>
      </div>
    </div>
  );
}
