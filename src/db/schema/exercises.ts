import { pgTable, uuid, text, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { coaches } from "./coaching";
import { teams } from "./teams";

export const muscles = pgTable("muscles", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: text("code").notNull().unique(), // biceps, chest, quadriceps, etc.
  namePt: text("name_pt").notNull(),
  nameEn: text("name_en").notNull(),
  bodyPart: text("body_part").notNull(), // upper_body, lower_body, core, full_body
});

export const equipment = pgTable("equipment", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: text("code").notNull().unique(), // dumbbell, barbell, machine, body_only, cable, etc.
  namePt: text("name_pt").notNull(),
  nameEn: text("name_en").notNull(),
});

export const exercises = pgTable("exercises", {
  id: uuid("id").defaultRandom().primaryKey(),
  externalProvider: text("external_provider").default("selye_catalog").notNull(), // api_ninjas, selye_catalog, coach_custom
  externalId: text("external_id"),
  namePt: text("name_pt").notNull(),
  nameEn: text("name_en"),
  modalityCode: text("modality_code").default("strength").notNull(), // strength, calisthenics, running, etc.
  primaryMuscleId: uuid("primary_muscle_id").references(() => muscles.id),
  secondaryMuscles: jsonb("secondary_muscles").$type<string[]>().default([]),
  equipmentCodes: jsonb("equipment_codes").$type<string[]>().default([]),
  difficulty: text("difficulty").default("beginner"), // beginner, intermediate, expert
  instructionsPt: text("instructions_pt"),
  instructionsEn: text("instructions_en"),
  safetyInfoPt: text("safety_info_pt"),
  safetyInfoEn: text("safety_info_en"),
  mediaUrls: jsonb("media_urls").$type<string[]>().default([]),
  isCustom: boolean("is_custom").default(false).notNull(),
  coachId: uuid("coach_id").references(() => coaches.id),
  teamId: uuid("team_id").references(() => teams.id),
  licenseInfo: text("license_info"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
