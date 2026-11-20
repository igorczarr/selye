import {
  pgTable,
  uuid,
  text,
  timestamp,
  doublePrecision,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./identity";
import { sports } from "./sports";
import { workoutSessions } from "./workout";

/**
 * Medições e Testes de KPIs por Modalidade (§Fase 1 / §Fase 3)
 * Armazena marcas periódicas ou derivadas (ex.: CMJ em cm, FTP em W, CSS em s/100m,
 * Yo-Yo IR1 em m, Sprint 30m, 5-0-5 COD, barra fixa estrita, e1RM de referência).
 */
export const athleteKpiMeasurements = pgTable(
  "athlete_kpi_measurements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sportId: uuid("sport_id").references(() => sports.id, {
      onDelete: "set null",
    }),
    sessionId: uuid("session_id").references(() => workoutSessions.id, {
      onDelete: "set null",
    }),
    modalityCode: text("modality_code").notNull(),
    kpiKey: text("kpi_key").notNull(),
    valueNumeric: doublePrecision("value_numeric").notNull(),
    unit: text("unit").notNull(),
    source: text("source").default("manual_test").notNull(), // "manual_test" | "session_derived" | "imported"
    measuredAt: timestamp("measured_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    notes: text("notes"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("athlete_kpi_user_modality_key_idx").on(
      table.userId,
      table.modalityCode,
      table.kpiKey,
      table.measuredAt
    ),
  ]
);
