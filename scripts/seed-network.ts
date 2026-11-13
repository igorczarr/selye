import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as dotenv from "dotenv";
import * as schema from "../src/db/schema";
import { eq } from "drizzle-orm";

dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function seedNetwork() {
  console.log("Seeding SELYE Network & Gamification data...");

  // 1. Cadastrar Conquistas Oficiais (§13 e §15)
  const officialAchievements = [
    {
      code: "first_workout",
      title: "Primeiro Registro",
      description: "Concluiu seu primeiro treino completo no Selye e iniciou sua jornada de autonomia física.",
      category: "milestone",
      icon: "🌱",
    },
    {
      code: "streak_week_3",
      title: "Consistência Tríplice",
      description: "Manteve o cumprimento ininterrupto da meta semanal por 3 semanas consecutivas.",
      category: "consistency",
      icon: "🔥",
    },
    {
      code: "streak_week_10",
      title: "Construção de Hábito",
      description: "10 semanas consecutivas atingindo a meta esportiva definida sem quebra.",
      category: "consistency",
      icon: "⚡",
    },
    {
      code: "multimodal_athlete",
      title: "Atleta Multimodal",
      description: "Praticou e registrou atividades em 2 ou mais modalidades esportivas distintas.",
      category: "multimodal",
      icon: "🔄",
    },
    {
      code: "team_belonging",
      title: "Espírito de Equipe",
      description: "Ingressou em uma assessoria esportiva ou equipe no ecossistema Selye.",
      category: "social",
      icon: "🛡️",
    },
    {
      code: "pr_achiever",
      title: "Superação Pessoal",
      description: "Superou um recorde pessoal histórico de carga máxima ou desempenho.",
      category: "milestone",
      icon: "🏆",
    },
  ];

  for (const ach of officialAchievements) {
    const existing = await db
      .select()
      .from(schema.achievements)
      .where(eq(schema.achievements.code, ach.code))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(schema.achievements).values(ach);
    }
  }
  console.log(`✓ Seeded ${officialAchievements.length} official achievements`);

  // 2. Cadastrar Desafios Comunitários
  const today = new Date();
  const pastDate = new Date(today);
  pastDate.setDate(today.getDate() - 7);
  const futureDate = new Date(today);
  futureDate.setDate(today.getDate() + 21);

  const defaultChallenges = [
    {
      title: "Semana de Consistência 100%",
      description: "Cumpra sua meta de 4 sessões na semana focando na técnica apurada e na recuperação ativa.",
      startDate: pastDate.toISOString().split("T")[0],
      endDate: futureDate.toISOString().split("T")[0],
      challengeType: "consistency_week",
      targetMetric: "dias_meta",
      targetValue: "4",
      isActive: true,
    },
    {
      title: "Desafio Multimodal do Mês",
      description: "Registre sessões de pelo menos duas modalidades diferentes nas próximas semanas.",
      startDate: pastDate.toISOString().split("T")[0],
      endDate: futureDate.toISOString().split("T")[0],
      challengeType: "frequency",
      targetMetric: "modalidades",
      targetValue: "2",
      isActive: true,
    },
    {
      title: "Qualidade Técnica & Cadência",
      description: "Acumule 8 sessões com registro de percepção de esforço (RPE) e intervalos rigorosos.",
      startDate: pastDate.toISOString().split("T")[0],
      endDate: futureDate.toISOString().split("T")[0],
      challengeType: "technical",
      targetMetric: "sessoes_rpe",
      targetValue: "8",
      isActive: true,
    },
  ];

  for (const chal of defaultChallenges) {
    const existing = await db
      .select()
      .from(schema.challenges)
      .where(eq(schema.challenges.title, chal.title))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(schema.challenges).values(chal);
    }
  }
  console.log(`✓ Seeded ${defaultChallenges.length} challenges`);

  // 3. Cadastrar Atletas da Comunidade para Descoberta (§11)
  const peerUsers = [
    {
      name: "Rodrigo Silva",
      email: "rodrigo.silva@selye.com.br",
      username: "rodrigosilva",
      bio: "Treinador de corrida e atleta amador de futevôlei. Focado em cadência e volume semanal sustentável.",
      location: "Rio de Janeiro, RJ",
      sports: ["running", "footvolley"],
    },
    {
      name: "Camila Duarte",
      email: "camila.duarte@selye.com.br",
      username: "camiladuarte",
      bio: "Praticante de Calistenia e Mobilidade funcional. Autonomia e controle corporal acima de tudo.",
      location: "São Paulo, SP",
      sports: ["calisthenics", "mobility"],
    },
    {
      name: "Lucas Andrade",
      email: "lucas.andrade@selye.com.br",
      username: "lucasandrade",
      bio: "Focado em LPO, Musculação pesada e Cross Training. Menos achismo, mais histórico.",
      location: "Curitiba, PR",
      sports: ["strength", "cross_training"],
    },
    {
      name: "Beatriz Lima",
      email: "beatriz.lima@selye.com.br",
      username: "beatrizlima",
      bio: "Triatleta amadora: Natação em águas abertas, Ciclismo de estrada e Corrida de rua.",
      location: "Florianópolis, SC",
      sports: ["swimming", "cycling", "running"],
    },
  ];

  // Obter esportes
  const allSports = await db.select().from(schema.sports);
  const sportsMap = new Map(allSports.map((s) => [s.code, s.id]));

  for (const u of peerUsers) {
    let [userRecord] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, u.email))
      .limit(1);

    if (!userRecord) {
      const [created] = await db
        .insert(schema.users)
        .values({
          name: u.name,
          email: u.email,
          username: u.username,
          bio: u.bio,
        })
        .returning();
      userRecord = created;

      await db.insert(schema.profiles).values({
        userId: userRecord.id,
        timezone: "America/Sao_Paulo",
        experienceLevel: "advanced",
      });

      // Cadastrar modalidades do atleta
      for (const sportCode of u.sports) {
        const sportId = sportsMap.get(sportCode);
        if (sportId) {
          await db.insert(schema.userSports).values({
            userId: userRecord.id,
            sportId: sportId,
            isPriority: true,
            experienceLevel: "advanced",
          });
        }
      }

      // Criar streak para o atleta
      await db.insert(schema.streaks).values({
        userId: userRecord.id,
        currentWeeklyStreak: Math.floor(Math.random() * 8) + 2,
        bestWeeklyStreak: 12,
        currentDailyStreak: 3,
        bestDailyStreak: 7,
      });
    }
  }
  console.log(`✓ Seeded ${peerUsers.length} community athletes`);

  console.log("SELYE Network seed completed successfully!");
}

seedNetwork().catch((err) => {
  console.error("Network seed error:", err);
  process.exit(1);
});