"use client";

import { useState, useEffect, useTransition } from "react";
import {
  formatDuration,
  calculateElapsedSeconds,
  calculateRestCountdown,
} from "@/core/workout-engine/timer";
import { startWorkout, finishWorkout } from "@/actions/workout";
import { Play, Check, Timer, CheckCircle2, Dumbbell } from "lucide-react";

interface WorkoutRunnerProps {
  initialSession: any;
  catalogSample: any[];
}

export function WorkoutRunner({
  initialSession,
  catalogSample,
}: WorkoutRunnerProps) {
  const [session, setSession] = useState<any>(initialSession);
  const [isPending, startTransition] = useTransition();
  const [elapsedDisplay, setElapsedDisplay] = useState("00:00");
  const [restTargetSeconds, setRestTargetSeconds] = useState(90);
  const [restRemaining, setRestRemaining] = useState<number | null>(null);
  const [lastCompletedTime, setLastCompletedTime] = useState<Date | null>(null);
  const [completedSets, setCompletedSets] = useState<Record<string, boolean>>({});
  const [sessionRpe, setSessionRpe] = useState<number>(8);
  const [isFinishedBannerOpen, setIsFinishedBannerOpen] = useState(false);

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

  const handleStart = () => {
    setIsFinishedBannerOpen(false);
    startTransition(async () => {
      const newSession = await startWorkout("Treino A · Força e Estabilidade");
      setSession(newSession);
    });
  };

  const handleFinish = () => {
    if (!session) return;
    startTransition(async () => {
      await finishWorkout(session.id, sessionRpe);
      setSession(null);
      setCompletedSets({});
      setRestRemaining(null);
      setIsFinishedBannerOpen(true);
    });
  };

  const toggleSet = (key: string) => {
    const nextState = !completedSets[key];
    setCompletedSets((prev) => ({ ...prev, [key]: nextState }));

    if (nextState) {
      setRestTargetSeconds(90);
      setLastCompletedTime(new Date());
      setRestRemaining(90);
    }
  };

  const adjustRest = (deltaSeconds: number) => {
    setRestTargetSeconds((prev) => Math.max(15, prev + deltaSeconds));
    setRestRemaining((prev) =>
      prev !== null ? Math.max(0, prev + deltaSeconds) : null
    );
  };

  if (!session) {
    return (
      <div className="card p-6 sm:p-8 flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-lima/25 text-foreground flex items-center justify-center shrink-0">
              <Dumbbell size={20} strokeWidth={1.75} />
            </div>
            <div>
              <span className="t-label">Pronto para iniciar</span>
              <h3 className="t-h2 mt-0.5">Sessão de Treinamento</h3>
              <p className="text-muted text-sm mt-1">
                Inicie o cronômetro para registrar séries em tempo real e controlar os intervalos de recuperação.
              </p>
            </div>
          </div>

          <button
            onClick={handleStart}
            disabled={isPending}
            className="btn btn-primary h-11 px-6 shrink-0"
          >
            <Play size={15} fill="currentColor" />
            <span>{isPending ? "Iniciando..." : "Iniciar Treino de Hoje"}</span>
          </button>
        </div>

        {isFinishedBannerOpen && (
          <div
            role="status"
            className="p-4 rounded-xl bg-lima/20 border border-lima flex items-start gap-3"
          >
            <CheckCircle2 size={18} className="text-profundo mt-0.5 shrink-0" />
            <div>
              <span className="t-label !text-accent-text">Sessão registrada</span>
              <p className="font-semibold text-foreground text-sm mt-0.5">
                Treino concluído com RPE {sessionRpe}/10.
              </p>
              <p className="text-xs text-muted mt-0.5">
                Seu volume acumulado, consistência semanal e histórico foram atualizados.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  const sampleExercises = catalogSample.slice(0, 4);
  const totalSetsCount = sampleExercises.length * 3;
  const completedSetsCount = Object.values(completedSets).filter(Boolean).length;
  const progressPercent =
    totalSetsCount > 0 ? Math.round((completedSetsCount / totalSetsCount) * 100) : 0;

  return (
    <div className="card p-6 flex flex-col gap-6">
      {/* Cabeçalho do Modo Foco */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-lima text-grafite">
              <span className="w-2 h-2 rounded-full bg-grafite animate-pulse" />
              EM EXECUÇÃO
            </span>
            <span className="t-data text-xs text-muted">
              {completedSetsCount}/{totalSetsCount} séries ({progressPercent}%)
            </span>
          </div>
          <h3 className="t-h2 mt-2">{session.title}</h3>
          <p className="t-aux text-muted mt-0.5">
            Musculação · Fuso {session.timezone}
          </p>
        </div>

        <div className="flex items-center sm:flex-col sm:items-end justify-between bg-foreground/[0.03] sm:bg-transparent px-4 py-2.5 sm:p-0 rounded-xl border border-line sm:border-0">
          <span className="t-label">Tempo decorrido</span>
          <p className="t-data text-3xl font-semibold text-foreground mt-0.5">
            {elapsedDisplay}
          </p>
        </div>
      </div>

      {/* Barra de progresso da sessão */}
      <div className="w-full h-1.5 bg-foreground/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-lima transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Timer de Descanso em Destaque */}
      {restRemaining !== null && restRemaining > 0 && (
        <div
          role="timer"
          aria-live="polite"
          className="rounded-xl bg-noite text-osso p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 text-lima flex items-center justify-center">
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

      {/* Blocos Tabulares de Exercícios */}
      <div className="flex flex-col gap-3">
        <span className="t-label">Movimentos Prescritos</span>
        {sampleExercises.map((ex, exIndex) => (
          <div
            key={ex.id}
            className="rounded-xl border border-line p-4 bg-foreground/[0.02] flex flex-col gap-3"
          >
            <div className="flex justify-between items-start gap-2">
              <div className="flex items-center gap-2.5">
                <span className="t-data text-xs px-2 py-0.5 rounded bg-surface border border-line text-accent-text">
                  {String(exIndex + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="font-semibold text-sm text-foreground">
                    {ex.namePt || ex.nameEn}
                  </p>
                  <p className="t-aux text-muted">
                    {ex.secondaryMuscles?.[0] || "Musculação"} · 90s de intervalo
                  </p>
                </div>
              </div>
              <span className="t-data text-xs text-muted">3 × 10 reps</span>
            </div>

            {/* Botões de Série (44px para toque rápido na academia) */}
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((setNum) => {
                const key = `${ex.id}_${setNum}`;
                const done = Boolean(completedSets[key]);
                return (
                  <button
                    key={setNum}
                    type="button"
                    aria-pressed={done}
                    onClick={() => toggleSet(key)}
                    className={`h-11 rounded-lg border text-xs font-mono flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      done
                        ? "bg-lima border-lima text-grafite font-semibold shadow-2xs"
                        : "border-line bg-surface text-muted hover:text-foreground hover:border-mineral"
                    }`}
                  >
                    <span>S{setNum}</span>
                    <span className="opacity-75">· 10r</span>
                    {done && <Check size={14} strokeWidth={2.5} />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Percepção Subjetiva de Esforço (RPE) + Finalização */}
      <div className="pt-4 border-t border-line flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="t-label">Esforço percebido da sessão (RPE)</span>
          <div className="flex items-center gap-1.5">
            {[6, 7, 8, 9, 10].map((rpeValue) => (
              <button
                key={rpeValue}
                type="button"
                onClick={() => setSessionRpe(rpeValue)}
                aria-pressed={sessionRpe === rpeValue}
                className={`h-9 w-10 rounded-md border t-data text-xs transition-colors cursor-pointer ${
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
