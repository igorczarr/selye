import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as dotenv from "dotenv";
import * as schema from "../src/db/schema";
import { eq } from "drizzle-orm";

dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function createLegacyAccount() {
  console.log("Iniciando criação da Conta Legado SELYE...");

  const email = "igorsantos979.is@gmail.com";
  const username = "_.igors";
  const name = "Igor Oliveira dos Santos";
  const bio = "Primeiro piora, depois melhora.";
  const experienceLevel = "beginner";
  const goals = ["Força máxima"];
  const targetDaysPerWeek = 5;
  const weight = 82;
  const height = 180;
  const restingHr = 70;

  // 1. Verificar se usuário já existe ou criar
  let existingUser = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);

  let userId: string;

  if (existingUser.length > 0) {
    userId = existingUser[0].id;
    console.log(`Usuário já existente encontrado com ID: ${userId}. Atualizando dados cadastrais...`);
    await db
      .update(schema.users)
      .set({
        name,
        username,
        bio,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, userId));
  } else {
    const [newUser] = await db
      .insert(schema.users)
      .values({
        email,
        name,
        username,
        bio,
      })
      .returning();
    userId = newUser.id;
    console.log(`✓ Conta Legado criada com sucesso! ID: ${userId}`);
  }

  // 2. Perfil
  const existingProfile = await db
    .select()
    .from(schema.profiles)
    .where(eq(schema.profiles.userId, userId))
    .limit(1);

  if (existingProfile.length > 0) {
    await db
      .update(schema.profiles)
      .set({
        experienceLevel,
        goals,
        timezone: "America/Sao_Paulo",
        updatedAt: new Date(),
      })
      .where(eq(schema.profiles.userId, userId));
    console.log("✓ Perfil atualizado.");
  } else {
    await db.insert(schema.profiles).values({
      userId,
      experienceLevel,
      goals,
      timezone: "America/Sao_Paulo",
      isPrivate: false,
    });
    console.log("✓ Perfil criado.");
  }

  // 3. Meta Semanal
  const today = new Date().toISOString().split("T")[0];
  const existingGoal = await db
    .select()
    .from(schema.weeklyGoals)
    .where(eq(schema.weeklyGoals.userId, userId))
    .limit(1);

  if (existingGoal.length > 0) {
    await db
      .update(schema.weeklyGoals)
      .set({ targetDaysPerWeek })
      .where(eq(schema.weeklyGoals.id, existingGoal[0].id));
    console.log("✓ Meta semanal atualizada para 5 treinos/semana.");
  } else {
    await db.insert(schema.weeklyGoals).values({
      userId,
      targetDaysPerWeek,
      effectiveFrom: today,
    });
    console.log("✓ Meta semanal de 5 treinos/semana configurada.");
  }

  // 4. Métricas Físicas Basais (Armazenamento Privado)
  const metricsToLog = [
    { type: "weight", val: weight, unit: "kg", note: "Métrica basal de fundação (Conta Legado)" },
    { type: "height", val: height, unit: "cm", note: "Métrica basal de fundação (Conta Legado)" },
    { type: "resting_hr", val: restingHr, unit: "bpm", note: "Métrica basal de fundação (Conta Legado)" },
  ];

  for (const m of metricsToLog) {
    await db.insert(schema.bodyMetrics).values({
      userId,
      metricType: m.type,
      valueNumeric: m.val,
      unit: m.unit,
      notes: m.note,
      visibility: "private",
      source: "manual",
    });
  }
  console.log("✓ Métricas corporais privadas (Peso: 82kg, Altura: 180cm, FC: 70bpm) gravadas.");

  // 5. Modalidades Esportivas (Musculação como prioritária, Vôlei de praia como secundária)
  const sports = await db.select().from(schema.sports);
  const strengthSport = sports.find((s) => s.code === "strength");
  const volleyballSport = sports.find((s) => s.code === "beach_volleyball");

  await db.delete(schema.userSports).where(eq(schema.userSports.userId, userId));

  if (strengthSport) {
    await db.insert(schema.userSports).values({
      userId,
      sportId: strengthSport.id,
      experienceLevel: "beginner",
      isPriority: true,
    });
    console.log("✓ Modalidade prioritária vinculada: Musculação.");
  }

  if (volleyballSport) {
    await db.insert(schema.userSports).values({
      userId,
      sportId: volleyballSport.id,
      experienceLevel: "beginner",
      isPriority: false,
    });
    console.log("✓ Modalidade secundária vinculada: Vôlei de Praia.");
  }

  // 6. Streak Inicial
  const existingStreak = await db
    .select()
    .from(schema.streaks)
    .where(eq(schema.streaks.userId, userId))
    .limit(1);

  if (existingStreak.length === 0) {
    await db.insert(schema.streaks).values({
      userId,
      currentDailyStreak: 0,
      bestDailyStreak: 0,
      currentWeeklyStreak: 0,
      bestWeeklyStreak: 0,
    });
    console.log("✓ Tabela de streak inicializada.");
  }

  // 7. Registros de Consentimento LGPD
  const consentTypes = ["terms_of_service", "privacy_policy", "health_data_processing"];
  for (const cType of consentTypes) {
    await db.insert(schema.consentRecords).values({
      userId,
      consentType: cType,
      granted: true,
      grantedAt: new Date(),
    });
  }
  console.log("✓ Registros de consentimento e conformidade LGPD formalizados.");

  // 8. Distintivo Especial: Conta Legado · Fundador
  const legacyAchievement = {
    code: "founder_legacy",
    title: "Conta Legado · Fundador",
    description: "Membro pioneiro nº 001 do ecossistema SELYE. Detentor da conta legado fundadora.",
    category: "milestone",
    icon: "🏛️",
  };

  const existingAch = await db
    .select()
    .from(schema.achievements)
    .where(eq(schema.achievements.code, legacyAchievement.code))
    .limit(1);

  let achId: string;
  if (existingAch.length > 0) {
    achId = existingAch[0].id;
  } else {
    const [insertedAch] = await db.insert(schema.achievements).values(legacyAchievement).returning();
    achId = insertedAch.id;
    console.log("✓ Conquista 'Conta Legado · Fundador' registrada no catálogo.");
  }

  const existingUserAch = await db
    .select()
    .from(schema.userAchievements)
    .where(eq(schema.userAchievements.userId, userId));

  const hasLegacyAch = existingUserAch.some((ua) => ua.achievementId === achId);
  if (!hasLegacyAch) {
    await db.insert(schema.userAchievements).values({
      userId,
      achievementId: achId,
      unlockedAt: new Date(),
    });
    console.log("✓ Distintivo de Fundador desbloqueado e atribuído à Conta Legado!");
  }

  console.log("\n=======================================================");
  console.log("🎉 CONTA LEGADO ATIVADA COM SUCESSO NO SELYE!");
  console.log(`Atleta: ${name} (@${username})`);
  console.log(`E-mail: ${email}`);
  console.log(`Modalidades: Musculação (Prioritária) & Vôlei de Praia`);
  console.log(`Meta Semanal: 5 dias/semana | Foco: Força máxima`);
  console.log(`Lema: "${bio}"`);
  console.log("=======================================================\n");
}

createLegacyAccount().catch((err) => {
  console.error("Erro ao criar Conta Legado:", err);
  process.exit(1);
});
