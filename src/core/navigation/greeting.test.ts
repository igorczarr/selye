import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getDayPeriodFromHour,
  extractFirstName,
  buildContextualGreeting,
} from "./greeting";

describe("Phase 2 - Contextual Header Greeting", () => {
  it("classifica corretamente manhã (05h–11h), tarde (12h–17h) e noite (18h–04h)", () => {
    assert.equal(getDayPeriodFromHour(5), "morning");
    assert.equal(getDayPeriodFromHour(11), "morning");
    assert.equal(getDayPeriodFromHour(12), "afternoon");
    assert.equal(getDayPeriodFromHour(17), "afternoon");
    assert.equal(getDayPeriodFromHour(18), "evening");
    assert.equal(getDayPeriodFromHour(2), "evening");
  });

  it("extrai o primeiro nome capitalizado ou usa fallback 'Atleta'", () => {
    assert.equal(extractFirstName("Igor Santos"), "Igor");
    assert.equal(extractFirstName("  maria clara "), "Maria");
    assert.equal(extractFirstName(""), "Atleta");
    assert.equal(extractFirstName(null), "Atleta");
  });

  it("monta a saudação completa contextualizada", () => {
    const morning = buildContextualGreeting({ name: "Igor Czarr", hour: 8 });
    assert.equal(morning.fullGreeting, "Bom dia, Igor");

    const afternoon = buildContextualGreeting({ name: "Igor", hour: 15 });
    assert.equal(afternoon.fullGreeting, "Boa tarde, Igor");

    const evening = buildContextualGreeting({ name: null, hour: 21 });
    assert.equal(evening.fullGreeting, "Boa noite, Atleta");
  });
});
