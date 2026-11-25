import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  date,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./identity";

/**
 * Hábitos Saudáveis Diários configurados pelo próprio aluno ou prescritos pelo treinador.
 */
export const userHealthyHabits = pgTable("user_healthy_habits", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdByUserId: uuid("created_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  createdByRole: text("created_by_role").default("athlete").notNull(), // "athlete" | "coach"
  axisCode: text("axis_code").default("custom").notNull(), // "hydration" | "nutrition" | "movement" | "mind_recovery" | "circadian_sleep" | "custom"
  presetCode: text("preset_code"),
  title: text("title").notNull(),
  targetLabel: text("target_label"),
  positiveImpactPt: text("positive_impact_pt"),
  eaImpact: integer("ea_impact").default(40).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/**
 * Registro diário de cumprimento (feito / não feito) de cada hábito saudável.
 */
export const dailyHabitLogs = pgTable(
  "daily_habit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    habitId: uuid("habit_id")
      .notNull()
      .references(() => userHealthyHabits.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    localDate: date("local_date").notNull(), // YYYY-MM-DD (America/Sao_Paulo)
    completed: boolean("completed").default(true).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("daily_habit_logs_habit_date_idx").on(
      table.habitId,
      table.localDate
    ),
  ]
);
