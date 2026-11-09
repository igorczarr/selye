import { pgTable, uuid, text, timestamp, boolean, integer, doublePrecision } from "drizzle-orm/pg-core";
import { users } from "./identity";
import { teams } from "./teams";
import { exercises } from "./exercises";
import { programVersions, workoutTemplates } from "./training";

export const workoutSessions = pgTable("workout_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  teamId: uuid("team_id").references(() => teams.id),
  programVersionId: uuid("program_version_id").references(() => programVersions.id),
  templateId: uuid("template_id").references(() => workoutTemplates.id),
  title: text("title").notNull(),
  modalityCode: text("modality_code").default("strength").notNull(),
  status: text("status").default("in_progress").notNull(), // in_progress, paused, completed, discarded
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  pausedAt: timestamp("paused_at", { withTimezone: true }),
  resumedAt: timestamp("resumed_at", { withTimezone: true }),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  accumulatedPausedSeconds: integer("accumulated_paused_seconds").default(0).notNull(),
  timezone: text("timezone").default("America/Sao_Paulo").notNull(),
  rpeSession: doublePrecision("rpe_session"),
  notes: text("notes"),
  clientSessionId: text("client_session_id").notNull().unique(), // idempotência offline e concorrência
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const sessionExercises = pgTable("session_exercises", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id").notNull().references(() => workoutSessions.id, { onDelete: "cascade" }),
  exerciseId: uuid("exercise_id").notNull().references(() => exercises.id),
  orderIndex: integer("order_index").default(0).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const setLogs = pgTable("set_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionExerciseId: uuid("session_exercise_id").notNull().references(() => sessionExercises.id, { onDelete: "cascade" }),
  sessionId: uuid("session_id").notNull().references(() => workoutSessions.id, { onDelete: "cascade" }),
  setNumber: integer("set_number").notNull(),
  setType: text("set_type").default("effective").notNull(), // warmup, effective, failure, drop_set, recovery, custom
  weightKg: doublePrecision("weight_kg"),
  reps: integer("reps"),
  distanceMeters: doublePrecision("distance_meters"),
  durationSeconds: integer("duration_seconds"),
  rpe: doublePrecision("rpe"),
  rir: integer("rir"),
  isCompleted: boolean("is_completed").default(false).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  clientEventId: text("client_event_id").notNull().unique(), // chave única estrita para evitar duplicatas em sync offline
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const sessionMetrics = pgTable("session_metrics", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id").notNull().references(() => workoutSessions.id, { onDelete: "cascade" }),
  metricKey: text("metric_key").notNull(), // total_volume_kg, total_reps, active_duration_seconds, pr_count
  metricValue: doublePrecision("metric_value").notNull(),
  unit: text("unit").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
