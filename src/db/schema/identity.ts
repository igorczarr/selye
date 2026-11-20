import { pgTable, uuid, text, timestamp, boolean, doublePrecision, jsonb } from "drizzle-orm/pg-core";
import type { EaOnboardingCalibrationResult } from "../../core/ml/ea-onboarding-calibrator";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  username: text("username").notNull().unique(),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const profiles = pgTable("profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  timezone: text("timezone").default("America/Sao_Paulo").notNull(),
  experienceLevel: text("experience_level").default("beginner"), // beginner, intermediate, advanced, competitive
  goals: jsonb("goals").$type<string[]>().default([]),
  /** Snapshot da calibração científica de EA e perfil fisiológico do onboarding (§Fase 2) */
  eaCalibration: jsonb("ea_calibration").$type<EaOnboardingCalibrationResult | null>(),
  onboardingCompletedAt: timestamp("onboarding_completed_at", { withTimezone: true }),
  isPrivate: boolean("is_private").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const bodyMetrics = pgTable("body_metrics", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  metricType: text("metric_type").notNull(), // weight, body_fat, resting_hr, muscle_mass, height
  valueNumeric: doublePrecision("value_numeric").notNull(),
  unit: text("unit").notNull(), // kg, %, bpm, cm
  recordedAt: timestamp("recorded_at", { withTimezone: true }).defaultNow().notNull(),
  visibility: text("visibility").default("private").notNull(), // private (default), coach, public
  source: text("source").default("manual").notNull(), // manual, device, imported
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const consentRecords = pgTable("consent_records", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  consentType: text("consent_type").notNull(), // terms_of_service, privacy_policy, health_data_processing
  granted: boolean("granted").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  grantedAt: timestamp("granted_at", { withTimezone: true }).defaultNow().notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
});
