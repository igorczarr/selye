import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  doublePrecision,
  date,
  jsonb,
} from "drizzle-orm/pg-core";
import { users } from "./identity";
import { sports } from "./sports";
import { workoutTemplates } from "./training";

/**
 * Meta ou Competição Ativa no Calendário Perene Integrado por Modalidade (§Fase 1 / §Fase 18)
 */
export const planningGoals = pgTable("planning_goals", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  sportId: uuid("sport_id").references(() => sports.id, {
    onDelete: "set null",
  }),
  modalityCode: text("modality_code").default("strength").notNull(),
  complementaryModalityCode: text("complementary_modality_code"),
  mode: text("mode").default("wellness_constancy").notNull(), // "competition" | "wellness_constancy"
  eventTitle: text("event_title").notNull(),
  modalityLabel: text("modality_label")
    .default("Multimodal & Força")
    .notNull(),
  primaryKpiKey: text("primary_kpi_key"),
  baselineKpiValue: doublePrecision("baseline_kpi_value"),
  targetKpiValue: doublePrecision("target_kpi_value"),
  kpiUnit: text("kpi_unit"),
  startDate: date("start_date").notNull(), // YYYY-MM-DD
  targetDate: date("target_date").notNull(), // YYYY-MM-DD
  initialEa: integer("initial_ea").notNull(),
  targetEa: integer("target_ea").notNull(),
  projectedPeakEa: integer("projected_peak_ea").notNull(),
  targetDaysPerWeek: integer("target_days_per_week").default(4).notNull(),
  preferredWorkoutDays: jsonb("preferred_workout_days")
    .$type<number[]>()
    .default([1, 2, 4, 6])
    .notNull(),
  status: text("status").default("active").notNull(), // "active" | "completed" | "archived"
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/**
 * Compromissos Pessoais, Sessões Planejadas por Arquétipo e Bloqueios no Calendário (§Fase 1 / §Fase 18)
 * Quando `blocksWorkout = true`, o Selye protege automaticamente o dia como janela de absorção.
 */
export const calendarCommitments = pgTable("calendar_commitments", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  goalId: uuid("goal_id").references(() => planningGoals.id, {
    onDelete: "set null",
  }),
  templateId: uuid("template_id").references(() => workoutTemplates.id, {
    onDelete: "set null",
  }),
  sessionArchetypeCode: text("session_archetype_code"),
  activityClass: text("activity_class").default("serious").notNull(), // "serious" | "complementary" | "casual"
  localDate: date("local_date").notNull(), // YYYY-MM-DD
  kind: text("kind").default("personal_block").notNull(), // "personal_block" | "custom_habit" | "custom_workout" | "event_milestone"
  title: text("title").notNull(),
  notes: text("notes"),
  blocksWorkout: boolean("blocks_workout").default(false).notNull(),
  eaSignedDelta: integer("ea_signed_delta").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/**
 * Checklist Diário do Plano Energético (§Fase 18)
 * Registra a conclusão de cada compromisso prescrito (treino, hábito +EA, proteção de descanso)
 * para recalcular adesão e distância real até a meta.
 */
export const planDailyCheckins = pgTable("plan_daily_checkins", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  goalId: uuid("goal_id").references(() => planningGoals.id, {
    onDelete: "cascade",
  }),
  localDate: date("local_date").notNull(), // YYYY-MM-DD
  commitmentKey: text("commitment_key").notNull(),
  kind: text("kind").notNull(), // "workout" | "recharge_habit" | "rest_protection" | "competition_day" | "custom"
  title: text("title").notNull(),
  eaSignedDelta: integer("ea_signed_delta").default(0).notNull(),
  completed: boolean("completed").default(true).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
