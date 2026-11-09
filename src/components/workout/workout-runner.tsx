"use client";

import { useState, useEffect, useTransition } from "react";
import { formatDuration, calculateElapsedSeconds, calculateRestCountdown } from "@/core/workout-engine/timer";
import { startWorkout, finishWorkout } from "@/actions/workout";

interface WorkoutRunnerProps {
  initialSession: any;
  catalogSample: any[];
}

export function WorkoutRunner({ initialSession, catalogSample }: WorkoutRunnerProps) {
  const [session, setSession] = useState<any>(initialSession);
  const [isPending, startTransition] = useTransition();
  const [elapsedDisplay, setElapsedDisplay] = useState("00:00");
  const [restRemaining, setRestRemaining] = useState<number | null>(null);
  const [lastCompletedTime, setLastCompletedTime] = useState<Date | null>(null);
  const [completedSets, setCompletedSets] = useState<Record<string, boolean>>({});
  const [isFinishedModalOpen, setIsFinishedModalOpen] = useState(false);

  // Efeito do Cronômetro Principal baseado em timestamps persistidos (§10.3)
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

      // Descanso regressivo
      if (lastCompletedTime && restRemaining !== null && restRemaining > 0) {
        const rest = calculateRestCountdown(lastCompletedTime, 90);
        setRestRemaining(rest.remainingSeconds);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [session, lastCompletedTime, restRemaining]);

  const handleStart = () => {
    startTransition(async () => {
      const newSession = await startWorkout("Treino A · Força e Estabilidade");
      setSession(newSession);
    });
  };

  const handleFinish = () => {
    if (!session) return;
    startTransition(async () => {
      await finishWorkout(session.id, 8);
      setSession(null);
      setIsFinishedModalOpen(true);
    });
  };

  const toggleSet = (key: string) => {
    const nextState = !completedSets[key];
    setCompletedSets((prev) => ({ ...prev, [key]: nextState }));

    if (nextState) {
      // Inicia timer de descanso (90s)
      setLastCompletedTime(new Date());
      setRestRemaining(90);
    }
  };

  if (!session) {
    return (
      <div className="rounded-lg bg-surface border border-line p-6 flex flex-col items-center justify-between gap-4 text-center">
        <div>
          <span className="t-label">Pronto para treinar</span>
          <h2 className="t-h2 mt-1">Nenhuma sessão ativa</h2>
          <p className="text-muted text-sm mt-1">
            Inicie sua rotina para registrar cargas, cronometrar intervalos e computar sua consistência.
          </p>
        </div>
        <button
          onClick={handleStart}
          disabled={isPending}
          className="w-full h-12 rounded-md bg-grafite text-osso font-semibold hover:bg-noite transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          {isPending ? "Iniciando..." : "Iniciar Treino de Hoje"}
        </button>

        {isFinishedModalOpen && (
          <div className="mt-4 p-4 rounded-md bg-lima/20 border border-lima text-left w-full">
            <span className="t-label !text-profundo">PÓS · Ritual Selye</span>
            <p className="font-semibold text-grafite mt-1">Sessão concluída e registrada com sucesso!</p>
            <p className="text-xs text-muted mt-1">
              Seu histórico de carga, streak e analytics foram atualizados no Neon.
            </p>
          </div>
        )}
      </div>
    );
  }

  const sampleExercises = catalogSample.slice(0, 4);

  return (
    <div className="rounded-lg bg-surface border border-line p-6 flex flex-col gap-5">
      {/* Barra superior de status ativo */}
      <div className="flex items-center justify-between border-b border-line pb-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-lima text-grafite font-mono">
            <span className="w-2 h-2 rounded-full bg-grafite animate-pulse" />
            EM ANDAMENTO
          </span>
          <h2 className="t-h2 mt-2">{session.title}</h2>
          <p className="t-aux text-muted">Modalidade: Musculação · Fuso: {session.timezone}</p>
        </div>
        <div className="text-right">
          <span className="t-label">Tempo Ativo</span>
          <p className="t-data text-2xl font-semibold text-grafite">{elapsedDisplay}</p>
        </div>
      </div>

      {/* Temporizador de Descanso Automático (§10.3) */}
      {restRemaining !== null && restRemaining > 0 && (
        <div className="rounded-md bg-noite text-osso p-4 flex items-center justify-between">
          <div>
            <span className="t-label !text-nevoa">Descanso entre séries</span>
            <p className="t-data text-xl text-lima">{formatDuration(restRemaining)}</p>
          </div>
          <button
            onClick={() => setRestRemaining(0)}
            className="text-xs text-nevoa hover:text-osso underline px-2 py-1"
          >
            Pular descanso
          </button>
        </div>
      )}

      {/* Lista de Exercícios da Sessão */}
      <div className="flex flex-col gap-3">
        <span className="t-label">Exercícios Prescritos</span>
        {sampleExercises.map((ex, exIndex) => (
          <div key={ex.id} className="rounded-md border border-line p-3 flex flex-col gap-2">
            <div className="flex justify-between items-start">
              <div>
                <span className="t-data text-xs text-profundo">0{exIndex + 1}</span>
                <p className="font-semibold text-sm">{ex.namePt || ex.nameEn}</p>
                <p className="t-aux text-muted">Músculo: {ex.secondaryMuscles?.[0] || "Geral"}</p>
              </div>
              <span className="t-data text-xs text-muted">3 séries</span>
            </div>

            {/* Séries */}
            <div className="grid grid-cols-3 gap-2 mt-1">
              {[1, 2, 3].map((setNum) => {
                const key = `${ex.id}_${setNum}`;
                const done = completedSets[key];
                return (
                  <button
                    key={setNum}
                    onClick={() => toggleSet(key)}
                    className={`h-9 rounded border text-xs font-mono flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                      done
                        ? "bg-lima border-lima text-grafite font-bold"
                        : "border-line bg-osso/50 text-muted hover:border-grafite"
                    }`}
                  >
                    <span>S{setNum}:</span>
                    <span>10 reps</span>
                    {done && <span>✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Botão de Finalização */}
      <button
        onClick={handleFinish}
        disabled={isPending}
        className="w-full h-12 rounded-md bg-grafite text-osso font-semibold hover:bg-noite transition-colors mt-2 cursor-pointer"
      >
        {isPending ? "Registrando..." : "Concluir Treino"}
      </button>
    </div>
  );
}
