import { pgTable, uuid, text, timestamp, boolean, integer, doublePrecision, jsonb } from "drizzle-orm/pg-core";
import { users } from "./identity";
import { coaches } from "./coaching";
import { teams } from "./teams";
import { exercises } from "./exercises";
import { sports } from "./sports";
import type { RoutineTrainingEffectSnapshot } from "../../core/modalities/backfill";

export const trainingPrograms = pgTable("training_programs", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  sportId: uuid("sport_id").references(() => sports.id, { onDelete: "set null" }),
  modalityCode: text("modality_code").default("strength").notNull(),
  /** Quando a ficha é fortalecimento complementar para outro esporte (ex.: musculação -> corrida) */
  targetPrimaryModalityCode: text("target_primary_modality_code"),
  /** Snapshot estruturado do efeito fisiológico entregue pela ficha (§Fase 1 / §Fase 4) */
  trainingEffect: jsonb("training_effect").$type<RoutineTrainingEffectSnapshot>(),
  creatorUserId: uuid("creator_user_id").notNull().references(() => users.id),
  coachId: uuid("coach_id").references(() => coaches.id),
  teamId: uuid("team_id").references(() => teams.id),
  isArchived: boolean("is_archived").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const programVersions = pgTable("program_versions", {
  id: uuid("id").defaultRandom().primaryKey(),
  programId: uuid("program_id").notNull().references(() => trainingPrograms.id, { onDelete: "cascade" }),
  versionNumber: integer("version_number").notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true }).defaultNow().notNull(),
  changeLog: text("change_log"),
  isCurrent: boolean("is_current").default(true).notNull(),
  rawPlanData: jsonb("raw_plan_data"), // Snapshot imutável da estrutura do programa
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const workoutTemplates = pgTable("workout_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  programVersionId: uuid("program_version_id").notNull().references(() => programVersions.id, { onDelete: "cascade" }),
  title: text("title").notNull(), // ex: "Rotina A - Superiores", "Treino de Tiro 5k"
  dayOfWeek: integer("day_of_week"), // 0-6 (domingo a sábado), opcional
  orderIndex: integer("order_index").default(0).notNull(),
  targetDurationMinutes: integer("target_duration_minutes"),
  notes: text("notes"),
});

export const templatePrescriptions = pgTable("template_prescriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  templateId: uuid("template_id").notNull().references(() => workoutTemplates.id, { onDelete: "cascade" }),
  exerciseId: uuid("exercise_id").notNull().references(() => exercises.id),
  orderIndex: integer("order_index").default(0).notNull(),
  targetSets: integer("target_sets"),
  targetReps: text("target_reps"), // "8-12", "15", "até a falha"
  targetLoadKg: doublePrecision("target_load_kg"),
  targetRpe: doublePrecision("target_rpe"),
  targetRir: integer("target_rir"),
  restSeconds: integer("rest_seconds").default(90),
  setType: text("set_type").default("effective").notNull(), // warmup, effective, drop_set, failure
  notes: text("notes"),
  customParams: jsonb("custom_params"), // extensível para corrida/outras modalidades
});

export const programAssignments = pgTable("program_assignments", {
  id: uuid("id").defaultRandom().primaryKey(),
  programVersionId: uuid("program_version_id").notNull().references(() => programVersions.id),
  athleteUserId: uuid("athlete_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  coachId: uuid("coach_id").references(() => coaches.id),
  teamId: uuid("team_id").references(() => teams.id),
  startDate: timestamp("start_date", { withTimezone: true }).defaultNow().notNull(),
  endDate: timestamp("end_date", { withTimezone: true }),
  customOverrides: jsonb("custom_overrides"), // ajustes por atleta sem duplicar programa para 30 pessoas
  status: text("status").default("active").notNull(), // active, completed, paused
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
