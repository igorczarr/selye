import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as dotenv from "dotenv";
import * as schema from "../src/db/schema";
import {
  buildSportMetricsSeedRows,
  buildSportsSeedRows,
} from "../src/core/modalities";

dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function seed() {
  console.log("Seeding SELYE database with foundational data...");

  // 1. Modalidades Esportivas e KPIs Científicos (§Fase 0 / §Fase 1)
  const sportsList = buildSportsSeedRows();

  for (const s of sportsList) {
    await db
      .insert(schema.sports)
      .values(s)
      .onConflictDoUpdate({ target: schema.sports.code, set: s });
  }
  console.log(`✓ Seeded ${sportsList.length} sports`);

  const allSports = await db.select().from(schema.sports);
  const sportIdByCode = Object.fromEntries(allSports.map((s) => [s.code, s.id]));
  const metricRows = buildSportMetricsSeedRows(sportIdByCode);
  for (const m of metricRows) {
    await db
      .insert(schema.sportMetrics)
      .values(m)
      .onConflictDoUpdate({
        target: [schema.sportMetrics.sportId, schema.sportMetrics.metricKey],
        set: {
          labelPt: m.labelPt,
          unit: m.unit,
          dataType: m.dataType,
          isRequired: m.isRequired,
          schemaDefinition: m.schemaDefinition,
        },
      });
  }
  console.log(`✓ Seeded ${metricRows.length} sport KPI metrics`);

  // 2. Músculos
  const musclesList = [
    { code: "chest", namePt: "Peitoral", nameEn: "chest", bodyPart: "upper_body" },
    { code: "biceps", namePt: "Bíceps", nameEn: "biceps", bodyPart: "upper_body" },
    { code: "triceps", namePt: "Tríceps", nameEn: "triceps", bodyPart: "upper_body" },
    { code: "lats", namePt: "Dorsal / Costas", nameEn: "lats", bodyPart: "upper_body" },
    { code: "middle_back", namePt: "Costas Médias", nameEn: "middle_back", bodyPart: "upper_body" },
    { code: "lower_back", namePt: "Lombar", nameEn: "lower_back", bodyPart: "core" },
    { code: "quadriceps", namePt: "Quadríceps", nameEn: "quadriceps", bodyPart: "lower_body" },
    { code: "hamstrings", namePt: "Isquiotibiais", nameEn: "hamstrings", bodyPart: "lower_body" },
    { code: "glutes", namePt: "Glúteos", nameEn: "glutes", bodyPart: "lower_body" },
    { code: "calves", namePt: "Panturrilhas", nameEn: "calves", bodyPart: "lower_body" },
    { code: "traps", namePt: "Trapézio", nameEn: "traps", bodyPart: "upper_body" },
    { code: "abdominals", namePt: "Abdômen", nameEn: "abdominals", bodyPart: "core" },
    { code: "shoulders", namePt: "Ombros / Deltoides", nameEn: "shoulders", bodyPart: "upper_body" },
  ];

  for (const m of musclesList) {
    await db
      .insert(schema.muscles)
      .values(m)
      .onConflictDoUpdate({ target: schema.muscles.code, set: m });
  }
  console.log(`✓ Seeded ${musclesList.length} muscle groups`);

  // 3. Equipamentos
  const equipmentList = [
    { code: "barbell", namePt: "Barra", nameEn: "barbell" },
    { code: "dumbbell", namePt: "Halteres", nameEn: "dumbbell" },
    { code: "machine", namePt: "Máquina", nameEn: "machine" },
    { code: "cable", namePt: "Polia / Cabo", nameEn: "cable" },
    { code: "body_only", namePt: "Peso Corporal", nameEn: "body only" },
    { code: "kettlebell", namePt: "Kettlebell", nameEn: "kettlebell" },
    { code: "incline_bench", namePt: "Banco Inclinado", nameEn: "incline bench" },
    { code: "resistance_band", namePt: "Elástico de Resistência", nameEn: "resistance band" },
  ];

  for (const eq of equipmentList) {
    await db
      .insert(schema.equipment)
      .values(eq)
      .onConflictDoUpdate({ target: schema.equipment.code, set: eq });
  }
  console.log(`✓ Seeded ${equipmentList.length} equipment types`);

  // 4. Nota do Dia (§14 - biblioteca editorial com voz do manual Selye)
  const today = new Date().toISOString().split("T")[0];
  const sampleMessages = [
    {
      publishDate: today,
      messageText: "O desenvolvimento físico não acontece em saltos repentinos, mas na constância silenciosa dos dias comuns.",
      author: "Selye Editorial",
      category: "consistencia",
      isActive: true,
    },
    {
      publishDate: "2026-11-10",
      messageText: "O descanso não é o oposto do treino; é a metade invisível onde a adaptação se consolida.",
      author: "Selye Editorial",
      category: "recuperacao",
      isActive: true,
    },
    {
      publishDate: "2026-11-11",
      messageText: "Menos achismo, mais histórico. O que se registra pode ser compreendido e aprimorado.",
      author: "Selye Editorial",
      category: "evolucao",
      isActive: true,
    },
  ];

  for (const msg of sampleMessages) {
    await db
      .insert(schema.dailyMessages)
      .values(msg)
      .onConflictDoUpdate({ target: schema.dailyMessages.publishDate, set: msg });
  }
  console.log(`✓ Seeded ${sampleMessages.length} daily messages`);

  console.log("Seeding complete! Database is ready.");
}

seed().catch((err) => {
  console.error("Seeding error:", err);
  process.exit(1);
});
