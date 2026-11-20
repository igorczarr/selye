import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CORE_MODALITY_CODES,
  buildSportMetricsSeedRows,
  buildSportsSeedRows,
  getDefaultPrimaryKpiForModality,
  inferCoreModalityFromText,
} from "./index";

describe("Phase 1 - Modality Seed & Backfill Helpers", () => {
  it("gera linhas de seed para todas as 10 modalidades Core + suporte sem códigos duplicados", () => {
    const rows = buildSportsSeedRows();
    const codes = rows.map((r) => r.code);
    const uniqueCodes = new Set(codes);

    assert.equal(codes.length, uniqueCodes.size, "Não deve haver códigos duplicados em sports");
    for (const coreCode of CORE_MODALITY_CODES) {
      assert.ok(uniqueCodes.has(coreCode), `Modalidade core ${coreCode} ausente no seed`);
    }
    assert.ok(uniqueCodes.has("footvolley"));
    assert.ok(uniqueCodes.has("walking"));
  });

  it("gera todas as linhas de sport_metrics a partir dos KPIs do Registry", () => {
    const fakeIdMap: Record<string, string> = Object.fromEntries(
      CORE_MODALITY_CODES.map((code, i) => [code, `00000000-0000-0000-0000-0000000000${String(i).padStart(2, "0")}`])
    );

    const metricRows = buildSportMetricsSeedRows(fakeIdMap);
    // 10 modalidades × >=3 KPIs = pelo menos 30 métricas
    assert.ok(metricRows.length >= 34, `Esperado >=34 métricas, veio ${metricRows.length}`);

    // Garante unicidade da chave composta (sportId, metricKey)
    const compositeKeys = new Set(metricRows.map((m) => `${m.sportId}:${m.metricKey}`));
    assert.equal(compositeKeys.size, metricRows.length);

    // Garante schemaDefinition enriquecido com fórmula e referências
    for (const row of metricRows) {
      assert.ok(row.schemaDefinition.formulaExpression);
      assert.ok(Array.isArray(row.schemaDefinition.scientificRefIds));
    }
  });

  it("infere corretamente o modalityCode canônico a partir de textos livres legados", () => {
    assert.equal(inferCoreModalityFromText("Multimodal & Força"), "strength");
    assert.equal(inferCoreModalityFromText("Vôlei de Praia · Torneio"), "beach_volleyball");
    assert.equal(inferCoreModalityFromText("Corrida 10km Sub-50"), "running");
    assert.equal(inferCoreModalityFromText("Ciclismo Estrada / Gran Fondo"), "cycling");
    assert.equal(inferCoreModalityFromText("Natação Águas Abertas"), "swimming");
    assert.equal(inferCoreModalityFromText("Futsal Liga Amadora"), "futsal");
    assert.equal(inferCoreModalityFromText("Futebol Society / Campo"), "football");
    assert.equal(inferCoreModalityFromText("Jiu-Jitsu & Muay Thai"), "martial_arts");
    assert.equal(inferCoreModalityFromText("Calistenia Muscle-Up"), "calisthenics");
    assert.equal(inferCoreModalityFromText("CrossFit / Funcional"), "functional");
    assert.equal(inferCoreModalityFromText("soccer"), "football");
    assert.equal(inferCoreModalityFromText("bjj"), "martial_arts");
    assert.equal(inferCoreModalityFromText(null), "strength");
  });

  it("retorna KPI primário padrão válido para cada modalidade Core", () => {
    for (const code of CORE_MODALITY_CODES) {
      const def = getDefaultPrimaryKpiForModality(code);
      assert.ok(def.kpiKey.length > 0);
      assert.ok(def.unit.length > 0);
    }
  });
});
