import { pgTable, uuid, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { users } from "./identity";

/**
 * Conexões com Dispositivos e Plataformas Externas (§16)
 * Strava, Apple Health / HealthKit, Google Health Connect, Garmin Connect
 */
export const userIntegrations = pgTable("user_integrations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(), // strava, apple_health, health_connect, garmin
  status: text("status").default("connected").notNull(), // connected, disconnected, expired, error
  externalAthleteId: text("external_athlete_id"),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  scopes: jsonb("scopes").$type<string[]>().default([]),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  syncSettings: jsonb("sync_settings").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});