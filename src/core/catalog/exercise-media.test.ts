import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  classifyMedia,
  toYouTubeEmbed,
  muscleToPt,
  equipmentToPt,
  levelToPt,
  looksEnglish,
  splitInstructionSteps,
  buildFreeExerciseDbImages,
} from "./exercise-media";

describe("Phase 4 - Exercise media & PT-BR localization", () => {
  it("classifica imagens, vídeos e YouTube preservando a ordem dos passos", () => {
    const r = classifyMedia([
      "https://x.dev/a/0.jpg",
      "https://x.dev/a/1.jpg",
      "https://x.dev/v.mp4",
      "https://youtu.be/dQw4w9WgXcQ",
      "texto-invalido",
    ]);
    assert.deepEqual(r.images, ["https://x.dev/a/0.jpg", "https://x.dev/a/1.jpg"]);
    assert.deepEqual(r.videos, ["https://x.dev/v.mp4"]);
    assert.deepEqual(r.youtubeEmbeds, ["https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"]);
  });

  it("converte formatos de URL do YouTube e rejeita hosts desconhecidos", () => {
    assert.equal(
      toYouTubeEmbed("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"
    );
    assert.equal(toYouTubeEmbed("https://evil.com/watch?v=dQw4w9WgXcQ"), null);
    assert.equal(toYouTubeEmbed("não é url"), null);
  });

  it("traduz músculos, equipamentos e nível para PT-BR", () => {
    assert.equal(muscleToPt("quadriceps"), "Quadríceps");
    assert.equal(muscleToPt("lower back"), "Lombar");
    assert.equal(equipmentToPt("body only"), "Peso corporal");
    assert.equal(levelToPt("expert"), "Avançado");
  });

  it("detecta texto em inglês e não confunde português", () => {
    assert.equal(looksEnglish("Lie down on the floor and keep your back straight, then raise your hips."), true);
    assert.equal(looksEnglish("Deite no chão com os joelhos flexionados e mantenha a coluna neutra."), false);
  });

  it("divide instruções em passos e monta URLs de imagem", () => {
    assert.deepEqual(splitInstructionSteps("1. Deite.\n2. Suba o quadril."), ["Deite.", "Suba o quadril."]);
    assert.equal(
      buildFreeExerciseDbImages(["Air_Bike/0.jpg"])[0],
      "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Air_Bike/0.jpg"
    );
  });
});
