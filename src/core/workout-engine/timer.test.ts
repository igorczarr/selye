import { describe, it } from "node:test";
import assert from "node:assert";
import {
  calculateElapsedSeconds,
  formatDuration,
  calculateRestCountdown,
} from "./timer";

describe("Workout Engine — Timer com Timestamps Persistidos (Briefing §10.3)", () => {
  it("deve calcular o tempo decorrido com precisão sem depender de ticks do JS", () => {
    const startedAt = new Date("2026-11-09T10:00:00Z");
    const now = new Date("2026-11-09T10:15:30Z"); // 15 min e 30 seg = 930 seg

    const result = calculateElapsedSeconds(
      {
        startedAt,
        accumulatedPausedSeconds: 0,
      },
      now
    );

    assert.strictEqual(result.elapsedSeconds, 930);
    assert.strictEqual(result.isPaused, false);
    assert.strictEqual(formatDuration(result.elapsedSeconds), "15:30");
  });

  it("deve descontar pausas acumuladas corretamente", () => {
    const startedAt = new Date("2026-11-09T10:00:00Z");
    const now = new Date("2026-11-09T10:15:00Z"); // 900 seg brutos

    // Usuário pausou por 120 segundos no passado
    const result = calculateElapsedSeconds(
      {
        startedAt,
        accumulatedPausedSeconds: 120,
      },
      now
    );

    assert.strictEqual(result.elapsedSeconds, 780); // 900 - 120 = 780 seg (13:00)
    assert.strictEqual(formatDuration(result.elapsedSeconds), "13:00");
  });

  it("deve congelar a contagem quando o treino estiver pausado no momento", () => {
    const startedAt = new Date("2026-11-09T10:00:00Z");
    const pausedAt = new Date("2026-11-09T10:20:00Z"); // 1200 seg
    const now = new Date("2026-11-09T10:35:00Z"); // 15 min após a pausa

    const result = calculateElapsedSeconds(
      {
        startedAt,
        pausedAt,
        accumulatedPausedSeconds: 0,
      },
      now
    );

    assert.strictEqual(result.isPaused, true);
    assert.strictEqual(result.elapsedSeconds, 1200); // Fixo no momento da pausa
  });

  it("deve respeitar a data de término de uma sessão concluída", () => {
    const startedAt = new Date("2026-11-09T10:00:00Z");
    const finishedAt = new Date("2026-11-09T11:12:30Z"); // 1h 12m 30s = 4350s
    const now = new Date("2026-11-09T15:00:00Z"); // Horas depois

    const result = calculateElapsedSeconds(
      {
        startedAt,
        finishedAt,
        accumulatedPausedSeconds: 0,
      },
      now
    );

    assert.strictEqual(result.isPaused, false);
    assert.strictEqual(result.elapsedSeconds, 4350);
    assert.strictEqual(formatDuration(result.elapsedSeconds), "01:12:30");
  });

  it("deve calcular o descanso regressivo da série", () => {
    const completedAt = new Date("2026-11-09T10:00:00Z");
    const now30sLater = new Date("2026-11-09T10:00:30Z");
    const now90sLater = new Date("2026-11-09T10:01:30Z");

    const rest30 = calculateRestCountdown(completedAt, 60, now30sLater);
    assert.strictEqual(rest30.remainingSeconds, 30);
    assert.strictEqual(rest30.isOver, false);

    const restOver = calculateRestCountdown(completedAt, 60, now90sLater);
    assert.strictEqual(restOver.remainingSeconds, 0);
    assert.strictEqual(restOver.isOver, true);
  });
});
