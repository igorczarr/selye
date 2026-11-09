/**
 * SELYE Exercise Catalog — Adapter da API Ninjas
 * Conforme Briefing §6.2 e §6.3:
 * O sistema NÃO depende diretamente da estrutura de dados do fornecedor.
 * Normaliza os metadados para a tabela interna `exercises` e garante identificadores permanentes.
 */

import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, ilike, or } from "drizzle-orm";

export interface ApiNinjasRawExercise {
  name: string;
  type: string;
  muscle: string;
  difficulty: "beginner" | "intermediate" | "expert";
  instructions: string;
  equipments?: string[];
  safety_info?: string;
}

export const MUSCLE_TRANSLATIONS: Record<string, string> = {
  abdominals: "Abdômen",
  abductors: "Abdutores",
  adductors: "Adutores",
  biceps: "Bíceps",
  calves: "Panturrilhas",
  chest: "Peitoral",
  forearms: "Antebraços",
  glutes: "Glúteos",
  hamstrings: "Isquiotibiais",
  lats: "Dorsais / Costas",
  lower_back: "Lombar",
  middle_back: "Costas Médias",
  neck: "Pescoço",
  quadriceps: "Quadríceps",
  traps: "Trapézio",
  triceps: "Tríceps",
};

export const EQUIPMENT_TRANSLATIONS: Record<string, string> = {
  barbell: "Barra",
  dumbbell: "Halteres",
  machine: "Máquina",
  cable: "Polia / Cabo",
  "body only": "Peso Corporal",
  body_only: "Peso Corporal",
  kettlebell: "Kettlebell",
  "incline bench": "Banco Inclinado",
  "resistance band": "Elástico de Resistência",
};

export class ExerciseCatalogService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.API_NINJAS_KEY || "";
  }

  /**
   * Busca exercícios na API externa e os armazena no catálogo do Neon.
   */
  async syncExercisesFromNinja(params: { muscle?: string; name?: string; type?: string }): Promise<number> {
    if (!this.apiKey) {
      throw new Error("API_NINJAS_KEY não configurada no servidor");
    }

    const query = new URLSearchParams();
    if (params.muscle) query.set("muscle", params.muscle);
    if (params.name) query.set("name", params.name);
    if (params.type) query.set("type", params.type);

    const url = `https://api.api-ninjas.com/v1/exercises?${query.toString()}`;
    const response = await fetch(url, {
      headers: { "X-Api-Key": this.apiKey },
    });

    if (!response.ok) {
      throw new Error(`Falha ao consultar API Ninjas (${response.status}): ${await response.text()}`);
    }

    const items: ApiNinjasRawExercise[] = await response.json();
    let savedCount = 0;

    for (const item of items) {
      // Verifica se já existe exercício com este nome externo
      const existing = await db
        .select({ id: schema.exercises.id })
        .from(schema.exercises)
        .where(eq(schema.exercises.nameEn, item.name))
        .limit(1);

      const musclePt = MUSCLE_TRANSLATIONS[item.muscle.toLowerCase()] || item.muscle;
      const equipCodes = (item.equipments || []).map((e) => e.toLowerCase().replace(/\s+/g, "_"));

      if (existing.length === 0) {
        await db.insert(schema.exercises).values({
          externalProvider: "api_ninjas",
          externalId: item.name,
          nameEn: item.name,
          namePt: item.name, // Nome mantido ou enriquecido
          modalityCode: "strength",
          difficulty: item.difficulty,
          instructionsEn: item.instructions,
          instructionsPt: item.instructions, // Pode ser traduzido
          safetyInfoEn: item.safety_info,
          safetyInfoPt: item.safety_info,
          equipmentCodes: equipCodes,
          secondaryMuscles: [musclePt],
          licenseInfo: "API Ninjas Commercial / Internal cache",
        });
        savedCount++;
      }
    }

    return savedCount;
  }

  /**
   * Busca no catálogo local (resiliente a falhas de rede externa).
   */
  async searchLocalCatalog(term?: string, muscle?: string) {
    let query = db.select().from(schema.exercises);

    if (term) {
      return await db
        .select()
        .from(schema.exercises)
        .where(
          or(
            ilike(schema.exercises.namePt, `%${term}%`),
            ilike(schema.exercises.nameEn, `%${term}%`)
          )
        )
        .limit(50);
    }

    return await query.limit(50);
  }
}
