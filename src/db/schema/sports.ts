import { pgTable, uuid, text, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { users } from "./identity";

export const sports = pgTable("sports", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: text("code").notNull().unique(), // strength, running, cycling, swimming, beach_volleyball, footvolley, calisthenics, functional, pilates, mobility, cross_training, martial_arts
  namePt: text("name_pt").notNull(),
  category: text("category").notNull(), // resistance, endurance, team_sport, combat, wellness
  icon: text("icon"),
  isActive: boolean("is_active").default(true).notNull(),
});

export const sportMetrics = pgTable("sport_metrics", {
  id: uuid("id").defaultRandom().primaryKey(),
  sportId: uuid("sport_id").notNull().references(() => sports.id, { onDelete: "cascade" }),
  metricKey: text("metric_key").notNull(), // weight, reps, distance, speed, pace, duration, sets, rpe, heart_rate, elevation, watts
  labelPt: text("label_pt").notNull(),
  unit: text("unit").notNull(), // kg, reps, m, km, km/h, min/km, s, rpe, bpm, w
  dataType: text("data_type").notNull(), // numeric, time, integer, string
  isRequired: boolean("is_required").default(false).notNull(),
  schemaDefinition: jsonb("schema_definition"), // versioned schema for validation
});

export const userSports = pgTable("user_sports", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sportId: uuid("sport_id").notNull().references(() => sports.id, { onDelete: "cascade" }),
  experienceLevel: text("experience_level").default("beginner"), // beginner, intermediate, advanced, competitive
  isPriority: boolean("is_priority").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
