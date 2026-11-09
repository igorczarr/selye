import { ExerciseCatalogService } from "../src/core/catalog/api-ninjas-adapter";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function syncAll() {
  const service = new ExerciseCatalogService();
  const muscleGroups = ["chest", "biceps", "triceps", "lats", "quadriceps", "hamstrings", "glutes", "abdominals"];

  console.log("Iniciando sincronização de exercícios da API Ninjas para o banco Neon...");
  let totalSaved = 0;

  for (const muscle of muscleGroups) {
    try {
      console.log(`Buscando exercícios para músculo: ${muscle}...`);
      const count = await service.syncExercisesFromNinja({ muscle });
      console.log(`✓ Sincronizados ${count} novos exercícios para ${muscle}`);
      totalSaved += count;
    } catch (err) {
      console.error(`Erro ao sincronizar ${muscle}:`, err);
    }
  }

  console.log(`Sincronização concluída! Total de novos exercícios catalogados: ${totalSaved}`);
}

syncAll().catch((err) => {
  console.error("Falha no script:", err);
  process.exit(1);
});
