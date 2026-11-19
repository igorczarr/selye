import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isLeapYear,
  getDayOfYear,
  getDailyEditorialForDate,
} from "./daily-quotes";

describe("Phase 3 - Daily Editorial Quotes & Annual Day Counter", () => {
  it("calcula corretamente o dia do ano (1..365) e anos bissextos (366)", () => {
    assert.equal(isLeapYear(2026), false);
    assert.equal(isLeapYear(2028), true);

    const jan1 = getDayOfYear(new Date(2026, 0, 1));
    assert.equal(jan1.dayOfYear, 1);
    assert.equal(jan1.totalDaysInYear, 365);

    const dec31 = getDayOfYear(new Date(2026, 11, 31));
    assert.equal(dec31.dayOfYear, 365);
    assert.equal(dec31.totalDaysInYear, 365);
  });

  it("retorna frases diferentes de filósofos, cientistas e atletas em dias consecutivos", () => {
    const day1 = getDailyEditorialForDate(new Date(2026, 10, 18));
    const day2 = getDailyEditorialForDate(new Date(2026, 10, 19));
    const day3 = getDailyEditorialForDate(new Date(2026, 10, 20));

    assert.notEqual(day1.quote.messageText, day2.quote.messageText);
    assert.notEqual(day2.quote.messageText, day3.quote.messageText);
    assert.match(day1.dayCounterLabel, /^Dia \d+ de 365$/);
  });

  it("ignora placeholder legado 'Selye Editorial' e prioriza a curadoria de filósofos/atletas", () => {
    const res = getDailyEditorialForDate(new Date(2026, 10, 18), {
      messageText: "Menos achismo, mais histórico.",
      author: "Selye Editorial",
      category: "consistencia",
    });

    assert.notEqual(res.quote.author, "Selye Editorial");
  });
});
