import { pgTable, uuid, text, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { users } from "./identity";
import { teams } from "./teams";
import { sports } from "./sports";

export const coaches = pgTable("coaches", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  biography: text("biography"),
  specialties: jsonb("specialties").$type<string[]>().default([]),
  certifications: jsonb("certifications").$type<string[]>().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const athleteAssignments = pgTable("athlete_assignments", {
  id: uuid("id").defaultRandom().primaryKey(),
  coachId: uuid("coach_id").notNull().references(() => coaches.id, { onDelete: "cascade" }),
  athleteUserId: uuid("athlete_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  teamId: uuid("team_id").references(() => teams.id, { onDelete: "cascade" }),
  sportId: uuid("sport_id").references(() => sports.id),
  status: text("status").default("active").notNull(), // active, inactive, terminated
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  notes: text("notes"),
});

export const dataGrants = pgTable("data_grants", {
  id: uuid("id").defaultRandom().primaryKey(),
  athleteUserId: uuid("athlete_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  coachId: uuid("coach_id").notNull().references(() => coaches.id, { onDelete: "cascade" }),
  grantType: text("grant_type").notNull(), // body_metrics, progress_photos, full_analytics
  isGranted: boolean("is_granted").default(false).notNull(),
  grantedAt: timestamp("granted_at", { withTimezone: true }).defaultNow().notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
});
