/**
 * Selye — Fase 1: Utilitários Puros de Seed e Backfill de Modalidades
 *
 * Responsável por:
 * 1. Derivar deterministicamente as linhas de `sports` e `sport_metrics` a partir do
 *    Modality Profile Registry v1.1.0 (10 modalidades Core + modalidades de suporte/compatibilidade).
 * 2. Inferir o `modalityCode` canônico a partir de textos legados (`modalityLabel` em `planning_goals`
 *    ou `modalityCode` livre em `training_programs` / `workout_sessions`).
 * 3. Definir o contrato `RoutineTrainingEffectSnapshot` persistido em `training_programs.training_effect`.
 */

import type { ExerciseCategoryId } from "../catalog/exercise-categories";
import {
  CORE_MODALITY_CODES,
  MODALITY_REGISTRY,
  resolveCoreModalityCode,
} from "./registry";
import type { CoreModalityCode, TrainingCapacityCode } from "./types";

/**
 * Snapshot estruturado persistido em `training_programs.training_effect` (jsonb).
 * Alimenta a Fase 4 ("o que esta ficha entrega para o seu objetivo?").
 */
export interface RoutineTrainingEffectSnapshot {
  schemaVersion: "1.0";
  primaryCapacity: TrainingCapacityCode;
  secondaryCapacities: TrainingCapacityCode[];
  muscleCategorySets: Partial<Record<ExerciseCategoryId, number>>;
  estimatedTotalSets: number;
  estimatedDurationMin: number;
  estimatedLoadUa: number;
  targetModalities: CoreModalityCode[];
  summaryPt: string;
  computedAt: string;
}

export interface SportSeedRow {
  code: string;
  namePt: string;
  category: string;
  icon: string;
  isActive: boolean;
}

export interface SportMetricSeedRow {
  sportId: string;
  metricKey: string;
  labelPt: string;
  unit: string;
  dataType: "numeric" | "time" | "integer" | "string";
  isRequired: boolean;
  schemaDefinition: Record<string, unknown>;
}

const CORE_SPORT_ICONS: Record<CoreModalityCode, string> = {
  strength: "dumbbell",
  running: "activity",
  cycling: "bike",
  beach_volleyball: "sun",
  swimming: "waves",
  functional: "zap",
  futsal: "circle-dot",
  football: "trophy",
  martial_arts: "shield",
  calisthenics: "user",
};

/** Modalidades complementares/legadas preservadas no catálogo `sports` para compatibilidade */
const SUPPORTING_SPORT_ROWS: SportSeedRow[] = [
  { code: "footvolley", namePt: "Futevôlei", category: "team_sport", icon: "circle", isActive: true },
  { code: "beach_tennis", namePt: "Beach Tennis", category: "team_sport", icon: "sun", isActive: true },
  { code: "cross_training", namePt: "Cross Training", category: "hybrid", icon: "flame", isActive: true },
  { code: "pilates", namePt: "Pilates", category: "wellness", icon: "feather", isActive: true },
  { code: "mobility", namePt: "Mobilidade", category: "wellness", icon: "compass", isActive: true },
  { code: "walking", namePt: "Caminhada", category: "wellness", icon: "footprints", isActive: true },
];

/**
 * Gera a lista completa de modalidades para upsert em `sports`:
 * todas as 10 modalidades Core do Registry + 6 modalidades de suporte/compatibilidade.
 */
export function buildSportsSeedRows(): SportSeedRow[] {
  const coreRows: SportSeedRow[] = CORE_MODALITY_CODES.map((code) => {
    const spec = MODALITY_REGISTRY[code];
    return {
      code: spec.code,
      namePt: spec.shortNamePt,
      category: spec.category,
      icon: CORE_SPORT_ICONS[code],
      isActive: true,
    };
  });

  return [...coreRows, ...SUPPORTING_SPORT_ROWS];
}

function inferMetricDataType(unit: string): SportMetricSeedRow["dataType"] {
  const normalized = unit.toLowerCase();
  if (normalized === "s" || normalized.includes("/km") || normalized.includes("/100m")) {
    return "time";
  }
  if (
    normalized.includes("séries") ||
    normalized.includes("saltos") ||
    normalized.includes("sessões") ||
    normalized.includes("rounds") ||
    normalized === "reps"
  ) {
    return "integer";
  }
  return "numeric";
}

/**
 * Gera todas as definições de KPIs das 10 modalidades Core para upsert idempotente em `sport_metrics`.
 */
export function buildSportMetricsSeedRows(
  sportIdByCode: Record<string, string>
): SportMetricSeedRow[] {
  const rows: SportMetricSeedRow[] = [];

  for (const code of CORE_MODALITY_CODES) {
    const sportId = sportIdByCode[code];
    if (!sportId) continue;

    const spec = MODALITY_REGISTRY[code];
    for (const kpi of spec.kpis) {
      rows.push({
        sportId,
        metricKey: kpi.key,
        labelPt: kpi.labelPt,
        unit: kpi.unit,
        dataType: inferMetricDataType(kpi.unit),
        isRequired: kpi.isPrimaryGoalMetric,
        schemaDefinition: {
          registryVersion: "1.1.0",
          shortLabelPt: kpi.shortLabelPt,
          direction: kpi.direction,
          cadence: kpi.cadence,
          formulaExpression: kpi.formulaExpression,
          requiredInputs: kpi.requiredInputs,
          experienceRanges: kpi.experienceRanges,
          scientificRefIds: kpi.scientificRefIds,
        },
      });
    }
  }

  return rows;
}

function normalizeForMatch(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Infere deterministicamente um `CoreModalityCode` a partir de rótulos livres legados
 * (ex.: `planning_goals.modality_label` como "Multimodal & Força", "Vôlei de Praia",
 * "Corrida 10km", "Jiu-Jitsu", "Futsal") ou códigos legados.
 */
export function inferCoreModalityFromText(
  rawLabelOrCode?: string | null,
  fallback: CoreModalityCode = "strength"
): CoreModalityCode {
  if (!rawLabelOrCode || !rawLabelOrCode.trim()) return fallback;

  // 1. Correspondência exata via Registry/Alias map
  const direct = resolveCoreModalityCode(rawLabelOrCode);
  if (direct) return direct;

  const norm = normalizeForMatch(rawLabelOrCode);

  // 2. Regras semânticas PT-BR / EN (ordem do mais específico para o mais genérico)
  if (/(volei|praia|areia|futevolei|beach)/.test(norm)) return "beach_volleyball";
  if (/(futsal|quadra)/.test(norm)) return "futsal";
  if (/(futebol|soccer|campo|society)/.test(norm)) return "football";
  if (/(corrida|correr|maratona|meia maratona|5k|10k|21k|42k|running|trail)/.test(norm)) {
    return "running";
  }
  if (/(ciclismo|bike|pedal|mtb|spinning|gran fondo|cycling)/.test(norm)) {
    return "cycling";
  }
  if (/(natacao|nadar|piscina|aguas abertas|travessia|swim)/.test(norm)) {
    return "swimming";
  }
  if (/(luta|jiu|bjj|judo|boxe|muay|thai|mma|kickboxing|wrestling|karate|combate|artes marciais)/.test(norm)) {
    return "martial_arts";
  }
  if (/(calistenia|peso corporal|barra fixa|street workout|calisthenics)/.test(norm)) {
    return "calisthenics";
  }
  if (/(funcional|crossfit|cross training|wod|hiit|hibrido|functional)/.test(norm)) {
    return "functional";
  }
  if (/(musculacao|forca|hipertrofia|academia|strength|multimodal)/.test(norm)) {
    return "strength";
  }

  return fallback;
}

/**
 * Retorna o KPI primário padrão de uma modalidade para backfill de metas legadas sem `primary_kpi_key`.
 */
export function getDefaultPrimaryKpiForModality(code: CoreModalityCode): {
  kpiKey: string;
  unit: string;
} {
  const spec = MODALITY_REGISTRY[code];
  const primary = spec.kpis.find((k) => k.isPrimaryGoalMetric) || spec.kpis[0];
  return {
    kpiKey: primary.key,
    unit: primary.unit,
  };
}
