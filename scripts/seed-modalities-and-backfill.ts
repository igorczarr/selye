/**
 * Selye — Fase 1: Seed Idempotente de Modalidades/KPIs & Backfill de Registros Legados
 *
 * Execução segura e re-executável:
 * 1. Faz upsert das 10 modalidades Core + 6 modalidades de suporte em `sports`
 * 2. Faz upsert de todos os KPIs científicos do Modality Profile Registry em `sport_metrics`
 * 3. Backfill de `sport_id` em `training_programs` e `workout_sessions`
 * 4. Backfill de `sport_id`, `modality_code`, `primary_kpi_key` e `kpi_unit` em `planning_goals`
 * 5. Backfill de `role` ('primary' vs 'complementary') em `user_sports` preservando prioridades existentes
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, isNull } from "drizzle-orm";
import * as dotenv from "dotenv";
import * as schema from "../src/db/schema";
import {
  buildSportMetricsSeedRows,
  buildSportsSeedRows,
  getDefaultPrimaryKpiForModality,
  inferCoreModalityFromText,
} from "../src/core/modalities";

dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function run() {
  console.log("── Fase 1: Seed de Modalidades, KPIs e Backfill ──");

  // 1. Upsert de modalidades em `sports`
  const sportRows = buildSportsSeedRows();
  for (const row of sportRows) {
    await db
      .insert(schema.sports)
      .values(row)
      .onConflictDoUpdate({
        target: schema.sports.code,
        set: {
          namePt: row.namePt,
          category: row.category,
          icon: row.icon,
          isActive: row.isActive,
        },
      });
  }

  const allSports = await db.select().from(schema.sports);
  const sportIdByCode: Record<string, string> = Object.fromEntries(
    allSports.map((s) => [s.code, s.id])
  );
  console.log(`✓ sports sincronizados: ${allSports.length} modalidades ativas`);

  // 2. Upsert de KPIs científicos em `sport_metrics`
  const metricRows = buildSportMetricsSeedRows(sportIdByCode);
  for (const row of metricRows) {
    await db
      .insert(schema.sportMetrics)
      .values(row)
      .onConflictDoUpdate({
        target: [schema.sportMetrics.sportId, schema.sportMetrics.metricKey],
        set: {
          labelPt: row.labelPt,
          unit: row.unit,
          dataType: row.dataType,
          isRequired: row.isRequired,
          schemaDefinition: row.schemaDefinition,
        },
      });
  }
  console.log(`✓ sport_metrics sincronizados: ${metricRows.length} KPIs científicos`);

  // 3. Backfill de `training_programs.sport_id`
  const programsMissingSport = await db
    .select()
    .from(schema.trainingPrograms)
    .where(isNull(schema.trainingPrograms.sportId));

  let updatedPrograms = 0;
  for (const prog of programsMissingSport) {
    const inferredCode = inferCoreModalityFromText(
      prog.modalityCode || prog.title,
      "strength"
    );
    const sportId = sportIdByCode[prog.modalityCode] || sportIdByCode[inferredCode] || null;
    if (sportId) {
      await db
        .update(schema.trainingPrograms)
        .set({ sportId, updatedAt: new Date() })
        .where(eq(schema.trainingPrograms.id, prog.id));
      updatedPrograms++;
    }
  }
  console.log(`✓ training_programs backfill: ${updatedPrograms}/${programsMissingSport.length} vinculados a sports`);

  // 4. Backfill de `planning_goals` (sport_id, modality_code, primary_kpi_key, kpi_unit)
  const goalsToBackfill = await db
    .select()
    .from(schema.planningGoals)
    .where(isNull(schema.planningGoals.sportId));

  let updatedGoals = 0;
  for (const goal of goalsToBackfill) {
    const inferredCode = inferCoreModalityFromText(goal.modalityLabel, "strength");
    const sportId = sportIdByCode[inferredCode] || null;
    const defaultKpi = getDefaultPrimaryKpiForModality(inferredCode);

    await db
      .update(schema.planningGoals)
      .set({
        sportId,
        modalityCode: inferredCode,
        primaryKpiKey: goal.primaryKpiKey || defaultKpi.kpiKey,
        kpiUnit: goal.kpiUnit || defaultKpi.unit,
        updatedAt: new Date(),
      })
      .where(eq(schema.planningGoals.id, goal.id));
    updatedGoals++;
  }
  console.log(`✓ planning_goals backfill: ${updatedGoals}/${goalsToBackfill.length} vinculados a sports e KPI primário`);

  // 5. Backfill de `workout_sessions.sport_id`
  const sessionsMissingSport = await db
    .select()
    .from(schema.workoutSessions)
    .where(isNull(schema.workoutSessions.sportId));

  let updatedSessions = 0;
  for (const sess of sessionsMissingSport) {
    const inferredCode = inferCoreModalityFromText(sess.modalityCode, "strength");
    const sportId = sportIdByCode[sess.modalityCode] || sportIdByCode[inferredCode] || null;
    if (sportId) {
      await db
        .update(schema.workoutSessions)
        .set({ sportId, updatedAt: new Date() })
        .where(eq(schema.workoutSessions.id, sess.id));
      updatedSessions++;
    }
  }
  console.log(`✓ workout_sessions backfill: ${updatedSessions}/${sessionsMissingSport.length} vinculados a sports`);

  // 6. Backfill de `user_sports.role` conforme `isPriority` legado
  const allUserSports = await db.select().from(schema.userSports);
  let updatedUserSports = 0;
  for (const us of allUserSports) {
    const expectedRole = us.isPriority ? "primary" : "complementary";
    if (us.role !== expectedRole) {
      await db
        .update(schema.userSports)
        .set({ role: expectedRole, updatedAt: new Date() })
        .where(eq(schema.userSports.id, us.id));
      updatedUserSports++;
    }
  }
  console.log(`✓ user_sports role backfill: ${updatedUserSports}/${allUserSports.length} sincronizados`);

  console.log("── Fase 1: Seed e Backfill concluídos com sucesso! ──");
}

run().catch((err) => {
  console.error("Erro no seed/backfill da Fase 1:", err);
  process.exit(1);
});
