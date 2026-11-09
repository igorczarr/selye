import { pgTable, uuid, text, timestamp, boolean, integer, date } from "drizzle-orm/pg-core";
import { users } from "./identity";
import { workoutSessions } from "./workout";
import { sports } from "./sports";

export const activityEvents = pgTable("activity_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sessionId: uuid("session_id").references(() => workoutSessions.id),
  sportId: uuid("sport_id").references(() => sports.id),
  source: text("source").default("app_workout").notNull(), // app_workout, strava, manual
  externalActivityId: text("external_activity_id"), // dedupe key
  localDate: date("local_date").notNull(), // YYYY-MM-DD no fuso do usuário
  durationMinutes: integer("duration_minutes").default(0).notNull(),
  countsForStreak: boolean("counts_for_streak").default(true).notNull(), // Apenas treinos reais contam
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const weeklyGoals = pgTable("weekly_goals", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  targetDaysPerWeek: integer("target_days_per_week").default(3).notNull(),
  effectiveFrom: date("effective_from").notNull(),
  effectiveTo: date("effective_to"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const streaks = pgTable("streaks", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  currentDailyStreak: integer("current_daily_streak").default(0).notNull(),
  bestDailyStreak: integer("best_daily_streak").default(0).notNull(),
  currentWeeklyStreak: integer("current_weekly_streak").default(0).notNull(), // Destaque principal do Selye
  bestWeeklyStreak: integer("best_weekly_streak").default(0).notNull(),
  lastActiveDate: date("last_active_date"),
  lastCalculatedAt: timestamp("last_calculated_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
