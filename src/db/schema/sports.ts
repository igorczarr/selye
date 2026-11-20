import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  jsonb,
  integer,
  doublePrecision,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./identity";

export const sports = pgTable("sports", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: text("code").notNull().unique(), // Core v1.1: strength, running, cycling, beach_volleyball, swimming, functional, futsal, football, martial_arts, calisthenics + suporte (footvolley, beach_tennis, cross_training, pilates, mobility, walking)
  namePt: text("name_pt").notNull(),
  category: text("category").notNull(), // resistance, endurance, sand_court, team_sport, hybrid, combat, wellness
  icon: text("icon"),
  isActive: boolean("is_active").default(true).notNull(),
});

export const sportMetrics = pgTable(
  "sport_metrics",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sportId: uuid("sport_id")
      .notNull()
      .references(() => sports.id, { onDelete: "cascade" }),
    metricKey: text("metric_key").notNull(), // KPI key do Modality Profile Registry
    labelPt: text("label_pt").notNull(),
    unit: text("unit").notNull(),
    dataType: text("data_type").notNull(), // numeric, time, integer, string
    isRequired: boolean("is_required").default(false).notNull(),
    schemaDefinition: jsonb("schema_definition"), // fórmula, faixas por nível e referências científicas
  },
  (table) => [
    uniqueIndex("sport_metrics_sport_id_metric_key_idx").on(
      table.sportId,
      table.metricKey
    ),
  ]
);

export const userSports = pgTable(
  "user_sports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sportId: uuid("sport_id")
      .notNull()
      .references(() => sports.id, { onDelete: "cascade" }),
    experienceLevel: text("experience_level").default("beginner"), // beginner, intermediate, advanced, competitive
    isPriority: boolean("is_priority").default(true).notNull(),
    /** Papel da modalidade para o atleta: 'primary' (séria com meta/periodização) | 'complementary' (suporte, ex: musculação para corredor) */
    role: text("role").default("primary").notNull(),
    targetKpiKey: text("target_kpi_key"),
    targetKpiValue: doublePrecision("target_kpi_value"),
    targetKpiUnit: text("target_kpi_unit"),
    weeklySessionsTarget: integer("weekly_sessions_target"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("user_sports_user_id_sport_id_idx").on(
      table.userId,
      table.sportId
    ),
  ]
);
