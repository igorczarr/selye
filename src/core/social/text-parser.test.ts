import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeHashtag,
  extractHashtags,
  extractMentions,
  tokenizeSocialText,
  computeTrendingHashtags,
} from "./text-parser";

describe("Phase 7 - Social Hashtags, Mentions & Trending Parser", () => {
  it("normaliza hashtags com acentos PT-BR e remove caracteres inválidos", () => {
    assert.equal(normalizeHashtag("#Força"), "forca");
    assert.equal(normalizeHashtag("#VôleiDePraia!"), "voleidepraia");
    assert.equal(normalizeHashtag("##Treino_A"), "treino_a");
  });

  it("extrai hashtags e menções únicas de um texto esportivo", () => {
    const text =
      "PR no agachamento com @coach_silva e @ana.run! #Força #Agachamento #forca";
    assert.deepEqual(extractHashtags(text), ["forca", "agachamento"]);
    assert.deepEqual(extractMentions(text), ["coach_silva", "ana.run"]);
  });

  it("tokeniza texto preservando ordem de texto, hashtags e menções", () => {
    const tokens = tokenizeSocialText("Treino com @igor #Vôlei hoje");
    assert.equal(tokens.length, 5);
    assert.deepEqual(tokens[1], {
      type: "mention",
      value: "@igor",
      username: "igor",
    });
    assert.deepEqual(tokens[3], {
      type: "hashtag",
      value: "#Vôlei",
      tag: "volei",
    });
  });

  it("calcula hashtags em alta respeitando a janela de 7 dias", () => {
    const now = new Date("2026-11-18T12:00:00Z");
    const trending = computeTrendingHashtags(
      [
        {
          contentText: "Dia 1 entregue #Força #Vôlei",
          createdAt: "2026-11-18T10:00:00Z",
        },
        {
          contentText: "Areia pesada hoje #Vôlei #Areia",
          createdAt: "2026-11-15T10:00:00Z",
        },
        {
          contentText: "Post antigo ignorado #Antigo",
          createdAt: "2026-10-01T10:00:00Z",
        },
      ],
      { windowDays: 7, now }
    );

    assert.deepEqual(trending, [
      { tag: "volei", count: 2 },
      { tag: "areia", count: 1 },
      { tag: "forca", count: 1 },
    ]);
  });
});
