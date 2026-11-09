/**
 * SELYE Workout Engine — Tipos e Contratos de Domínio
 * Conforme Briefing §10 e §28 (Testes críticos 1, 2, 3)
 */

export type WorkoutSessionStatus = "idle" | "in_progress" | "paused" | "completed" | "discarded";

export type SetType = "warmup" | "effective" | "failure" | "drop_set" | "recovery" | "custom";

export interface SetLogItem {
  id: string; // UUID interno ou client_event_id
  clientEventId: string; // Idempotência offline
  exerciseId: string;
  setNumber: number;
  setType: SetType;
  weightKg?: number | null;
  reps?: number | null;
  distanceMeters?: number | null;
  durationSeconds?: number | null;
  rpe?: number | null; // 1-10
  rir?: number | null; // Reps in reserve
  completed: boolean;
  completedAt?: string | null; // ISO timestamp
  notes?: string | null;
}

export interface SessionExerciseItem {
  id: string;
  exerciseId: string;
  orderIndex: number;
  sets: SetLogItem[];
  notes?: string | null;
}

export interface ActiveSessionState {
  sessionId: string;
  clientSessionId: string;
  userId: string;
  title: string;
  sportCode: string; // 'strength', 'running', etc.
  status: WorkoutSessionStatus;
  startedAt: string; // ISO
  pausedAt?: string | null; // ISO se atualmente pausado
  resumedAt?: string | null; // ISO da última retomada
  finishedAt?: string | null; // ISO
  accumulatedPausedSeconds: number;
  programVersionId?: string | null;
  exercises: SessionExerciseItem[];
  userTimezone: string;
}

export interface TimerCalculationResult {
  elapsedSeconds: number;
  isPaused: boolean;
  formattedDuration: string; // "HH:MM:SS" ou "MM:SS"
}
