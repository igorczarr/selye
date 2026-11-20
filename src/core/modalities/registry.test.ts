import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CORE_MODALITY_CODES,
  MODALITY_REGISTRY,
  SCIENTIFIC_REFERENCES,
  buildModalityRegistrySnapshot,
  classifyActivityForAthlete,
  evaluateWeeklySafetyGuardrails,
  getComplementaryStrengthGuidance,
  getModalitySpec,
  listCoreModalities,
  resolveCoreModalityCode,
  type ExperienceLevel,
} from "./index";

const ALL_LEVELS: ExperienceLevel[] = [
  "beginner",
  "intermediate",
  "advanced",
  "competitive",
];

describe("Phase 0 - Modality Profile Registry & Scientific Foundation", () => {
  it("cobre todas as 10 modalidades Core da v1 com metadados e KPIs completos", () => {
    const modalities = listCoreModalities();
    assert.equal(modalities.length, 10);
    assert.deepEqual(
      modalities.map((m) => m.code),
      [...CORE_MODALITY_CODES]
    );

    for (const mod of modalities) {
      assert.ok(mod.namePt.length > 0, `${mod.code} precisa de namePt`);
      assert.ok(mod.kpis.length >= 3, `${mod.code} precisa de pelo menos 3 KPIs`);
      assert.ok(
        mod.kpis.some((k) => k.isPrimaryGoalMetric),
        `${mod.code} precisa de pelo menos 1 KPI primário de meta`
      );
      assert.ok(
        mod.intensityZones.length >= 3,
        `${mod.code} precisa de zonas de intensidade definidas`
      );
      assert.ok(
        mod.sessionArchetypes.length >= 3,
        `${mod.code} precisa de arquétipos concretos de sessão (substituindo X/Y/Z)`
      );
      assert.ok(
        mod.periodizationPhases.length >= 3,
        `${mod.code} precisa de fases de periodização`
      );

      // Soma dos percentuais de fases do macrociclo deve fechar em 100%
      const totalShare = mod.periodizationPhases.reduce(
        (acc, p) => acc + p.shareOfMacrocyclePct,
        0
      );
      assert.equal(
        totalShare,
        100,
        `Soma de shareOfMacrocyclePct em ${mod.code} deve ser 100 (atual: ${totalShare})`
      );
    }
  });

  it("garante critério de aceite da Fase 0: todo KPI tem fórmula, entradas, faixas nos 4 níveis e citações válidas", () => {
    for (const mod of listCoreModalities()) {
      for (const refId of mod.scientificRefIds) {
        assert.ok(
          SCIENTIFIC_REFERENCES[refId],
          `Referência inválida ${refId} em ${mod.code}`
        );
      }
      for (const refId of mod.complementaryStrength.scientificRefIds) {
        assert.ok(
          SCIENTIFIC_REFERENCES[refId],
          `Referência inválida ${refId} em complementaryStrength de ${mod.code}`
        );
      }
      for (const refId of mod.safetyGuardrails.scientificRefIds) {
        assert.ok(
          SCIENTIFIC_REFERENCES[refId],
          `Referência inválida ${refId} em safetyGuardrails de ${mod.code}`
        );
      }

      for (const kpi of mod.kpis) {
        assert.ok(
          kpi.formulaExpression.trim().length > 0,
          `KPI ${mod.code}.${kpi.key} sem fórmula`
        );
        assert.ok(
          kpi.requiredInputs.length > 0,
          `KPI ${mod.code}.${kpi.key} sem entradas definidas`
        );
        assert.ok(
          kpi.unit.trim().length > 0,
          `KPI ${mod.code}.${kpi.key} sem unidade`
        );
        assert.ok(
          kpi.scientificRefIds.length > 0,
          `KPI ${mod.code}.${kpi.key} sem fonte científica`
        );

        for (const refId of kpi.scientificRefIds) {
          assert.ok(
            SCIENTIFIC_REFERENCES[refId],
            `Referência inválida ${refId} em KPI ${mod.code}.${kpi.key}`
          );
        }

        for (const level of ALL_LEVELS) {
          const band = kpi.experienceRanges[level];
          assert.ok(band, `KPI ${mod.code}.${kpi.key} sem faixa para ${level}`);
          assert.ok(
            band.min <= band.max,
            `KPI ${mod.code}.${kpi.key} (${level}) com min > max`
          );
        }
      }
    }
  });

  it("modela protocolos de fortalecimento complementar distintos para Corrida, Ciclismo, Vôlei de Praia, Futsal, Futebol, Lutas e Calistenia", () => {
    const runStrength = getComplementaryStrengthGuidance("running", "intermediate");
    const cycleStrength = getComplementaryStrengthGuidance("cycling", "intermediate");
    const bvStrength = getComplementaryStrengthGuidance(
      "beach_volleyball",
      "intermediate"
    );
    const futsalStrength = getComplementaryStrengthGuidance("futsal", "intermediate");
    const footballStrength = getComplementaryStrengthGuidance("football", "intermediate");
    const combatStrength = getComplementaryStrengthGuidance("martial_arts", "intermediate");
    const calisStrength = getComplementaryStrengthGuidance("calisthenics", "intermediate");

    assert.equal(runStrength.protocol.role, "complementary_support");
    assert.ok(
      runStrength.protocol.targetCapacities.includes("running_economy")
    );
    assert.ok(
      runStrength.protocol.scientificRefIds.includes("blagrove_2018")
    );

    assert.ok(
      cycleStrength.protocol.scientificRefIds.includes("ronnestad_mujika_2014")
    );
    assert.ok(
      cycleStrength.protocol.expectedKpiImpacts.some(
        (i) => i.kpiKey === "ftp_watts_per_kg"
      )
    );

    assert.ok(
      bvStrength.protocol.targetCapacities.includes("shoulder_prehab")
    );
    assert.ok(
      bvStrength.protocol.priorityExerciseCategories.includes("ombros")
    );
    assert.equal(
      bvStrength.protocol.minSeparationHoursFromMainModality,
      24
    );

    assert.ok(
      futsalStrength.protocol.targetCapacities.includes("eccentric_hamstring_protection")
    );
    assert.ok(
      futsalStrength.protocol.scientificRefIds.includes("naser_2017")
    );

    assert.ok(
      footballStrength.protocol.scientificRefIds.includes("petersen_2011")
    );
    assert.equal(
      footballStrength.protocol.minSeparationHoursFromMainModality,
      48
    );

    assert.ok(
      combatStrength.protocol.targetCapacities.includes("grip_isometric_endurance")
    );
    assert.ok(
      combatStrength.protocol.scientificRefIds.includes("james_2016")
    );

    assert.ok(
      calisStrength.protocol.scientificRefIds.includes("kotarsky_2018")
    );
    assert.ok(
      calisStrength.protocol.priorityExerciseCategories.includes("pernas")
    );
  });

  it("diferencia corretamente atividade solta (casual), modalidade séria (serious) e suporte (complementary)", () => {
    // 1. Praticante sério de musculação que faz uma corrida solta no domingo
    const lifterProfile = {
      primaryModality: "strength" as const,
      complementaryModalities: [],
      experienceLevel: "intermediate" as const,
    };

    const casualRun = classifyActivityForAthlete({
      activityModalityCode: "running",
      athleteProfile: lifterProfile,
    });
    assert.equal(casualRun.activityClass, "casual");
    assert.equal(casualRun.countsTowardPrimaryKpis, false);
    assert.equal(casualRun.countsTowardSystemicLoadAndEa, true);
    assert.equal(casualRun.countsTowardConsistencyStreak, true);

    // 2. Corredor sério que usa musculação como fortalecimento complementar
    const runnerProfile = {
      primaryModality: "running" as const,
      complementaryModalities: ["strength" as const],
      experienceLevel: "intermediate" as const,
    };

    const mainRun = classifyActivityForAthlete({
      activityModalityCode: "running",
      athleteProfile: runnerProfile,
    });
    assert.equal(mainRun.activityClass, "serious");
    assert.equal(mainRun.countsTowardPrimaryKpis, true);

    const strengthSupport = classifyActivityForAthlete({
      activityModalityCode: "strength",
      athleteProfile: runnerProfile,
    });
    assert.equal(strengthSupport.activityClass, "complementary");
    assert.equal(strengthSupport.countsTowardPrimaryKpis, false);
    assert.equal(strengthSupport.countsTowardSystemicLoadAndEa, true);

    // 3. Mesmo corredor faz um pedal recreativo solto no sábado
    const casualBike = classifyActivityForAthlete({
      activityModalityCode: "cycling",
      athleteProfile: runnerProfile,
    });
    assert.equal(casualBike.activityClass, "casual");
    assert.equal(casualBike.countsTowardPrimaryKpis, false);
    assert.equal(casualBike.countsTowardSystemicLoadAndEa, true);

    // 4. Corrida marcada explicitamente como solta/casual mesmo por um corredor
    const explicitCasualRun = classifyActivityForAthlete({
      activityModalityCode: "running",
      athleteProfile: runnerProfile,
      explicitClass: "casual",
    });
    assert.equal(explicitCasualRun.activityClass, "casual");
    assert.equal(explicitCasualRun.countsTowardPrimaryKpis, false);
  });

  it("resolve aliases de modalidades estendidas sem perder retrocompatibilidade", () => {
    assert.equal(resolveCoreModalityCode("footvolley"), "beach_volleyball");
    assert.equal(resolveCoreModalityCode("beach_tennis"), "beach_volleyball");
    assert.equal(resolveCoreModalityCode("calisthenics"), "calisthenics");
    assert.equal(resolveCoreModalityCode("cross_training"), "functional");
    assert.equal(resolveCoreModalityCode("futsal"), "futsal");
    assert.equal(resolveCoreModalityCode("football"), "football");
    assert.equal(resolveCoreModalityCode("soccer"), "football");
    assert.equal(resolveCoreModalityCode("combat"), "martial_arts");
    assert.equal(resolveCoreModalityCode("bjj"), "martial_arts");
    assert.equal(resolveCoreModalityCode("muay_thai"), "martial_arts");
    assert.equal(resolveCoreModalityCode("walking"), null);
    assert.equal(getModalitySpec("footvolley")?.code, "beach_volleyball");
    assert.equal(getModalitySpec("soccer")?.code, "football");
    assert.equal(getModalitySpec("bjj")?.code, "martial_arts");
    assert.equal(getModalitySpec("walking"), null);
  });

  it("dispara guard-rails conservadores para salto de volume, monotonia, saltos na areia, sparring duro, futebol e interferência concorrente", () => {
    // Corrida com salto de +30% no volume e monotonia 2.4
    const runWarnings = evaluateWeeklySafetyGuardrails({
      modalityCode: "running",
      previousWeekVolume: 20,
      currentWeekVolume: 26,
      weeklyMonotony: 2.4,
      acwr: 1.42,
    });
    assert.ok(runWarnings.some((w) => w.code === "weekly_volume_jump"));
    assert.ok(runWarnings.some((w) => w.code === "high_monotony"));
    assert.ok(runWarnings.some((w) => w.code === "acwr_elevated_advisory"));

    // Vôlei de praia com excesso de saltos e endurance/potência na mesma sessão
    const bvWarnings = evaluateWeeklySafetyGuardrails({
      modalityCode: "beach_volleyball",
      experienceLevel: "intermediate",
      weeklyJumpContacts: 410,
      sameSessionEnduranceAndPower: true,
    });
    assert.ok(bvWarnings.some((w) => w.code === "excessive_jump_contacts"));
    assert.ok(
      bvWarnings.some((w) => w.code === "concurrent_power_interference")
    );

    // Funcional com 75% das sessões em RPE >= 8
    const funcWarnings = evaluateWeeklySafetyGuardrails({
      modalityCode: "functional",
      weeklyHighIntensitySharePct: 75,
    });
    assert.ok(funcWarnings.some((w) => w.code === "excessive_high_rpe_share"));

    // Lutas com excesso de sparring duro (>3/sem)
    const combatWarnings = evaluateWeeklySafetyGuardrails({
      modalityCode: "martial_arts",
      weeklyHardSparringSessions: 5,
    });
    assert.ok(combatWarnings.some((w) => w.code === "excessive_hard_sparring"));

    // Futebol com 2+ jogos na semana sem prevenção excêntrica de posteriores
    const footballWarnings = evaluateWeeklySafetyGuardrails({
      modalityCode: "football",
      weeklyMatchesCount: 2,
      weeklyEccentricPrehabSessions: 0,
    });
    assert.ok(
      footballWarnings.some((w) => w.code === "missing_eccentric_hamstring_prehab")
    );
  });

  it("exporta snapshot serializável em JSON com schemaVersion", () => {
    const snapshot = buildModalityRegistrySnapshot();
    const json = JSON.stringify(snapshot);
    const parsed = JSON.parse(json);

    assert.equal(parsed.schemaVersion, "1.1.0");
    assert.equal(parsed.coreModalitiesCount, 10);
    assert.equal(
      Object.keys(parsed.modalities).length,
      Object.keys(MODALITY_REGISTRY).length
    );
  });
});
