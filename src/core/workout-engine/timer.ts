/**
 * SELYE Workout Engine — Cálculo de Tempo Baseado em Timestamps Persistidos
 * Conforme Briefing §10.3 (Requisito técnico crítico: precisão temporal)
 * Não utiliza setInterval() como fonte da verdade. O tempo é sempre recalculado
 * a partir de marcadores UTC imutáveis.
 */

export interface SessionTimestamps {
  startedAt: string | Date;
  pausedAt?: string | Date | null;
  resumedAt?: string | Date | null;
  finishedAt?: string | Date | null;
  accumulatedPausedSeconds: number;
}

export function calculateElapsedSeconds(
  timestamps: SessionTimestamps,
  currentReferenceTime: Date = new Date()
): { elapsedSeconds: number; isPaused: boolean } {
  const startedTime = new Date(timestamps.startedAt).getTime();
  const isPaused = Boolean(timestamps.pausedAt);

  if (timestamps.finishedAt) {
    const finishedTime = new Date(timestamps.finishedAt).getTime();
    const grossSeconds = Math.max(0, Math.floor((finishedTime - startedTime) / 1000));
    const netSeconds = Math.max(0, grossSeconds - (timestamps.accumulatedPausedSeconds || 0));
    return { elapsedSeconds: netSeconds, isPaused: false };
  }

  if (isPaused && timestamps.pausedAt) {
    const pausedTime = new Date(timestamps.pausedAt).getTime();
    const grossSeconds = Math.max(0, Math.floor((pausedTime - startedTime) / 1000));
    const netSeconds = Math.max(0, grossSeconds - (timestamps.accumulatedPausedSeconds || 0));
    return { elapsedSeconds: netSeconds, isPaused: true };
  }

  const nowTime = currentReferenceTime.getTime();
  const grossSeconds = Math.max(0, Math.floor((nowTime - startedTime) / 1000));
  const netSeconds = Math.max(0, grossSeconds - (timestamps.accumulatedPausedSeconds || 0));

  return { elapsedSeconds: netSeconds, isPaused: false };
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;

  const pad = (n: number) => n.toString().padStart(2, "0");

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

export function calculateRestCountdown(
  setCompletedAt: string | Date,
  targetRestSeconds: number,
  currentReferenceTime: Date = new Date()
): { remainingSeconds: number; isOver: boolean } {
  const completedTime = new Date(setCompletedAt).getTime();
  const now = currentReferenceTime.getTime();
  const elapsedSinceCompletion = Math.floor((now - completedTime) / 1000);
  const remainingSeconds = Math.max(0, targetRestSeconds - elapsedSinceCompletion);

  return {
    remainingSeconds,
    isOver: remainingSeconds <= 0,
  };
}
