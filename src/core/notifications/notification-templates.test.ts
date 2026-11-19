import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildNotificationEventPayload,
  renderEventEmail,
} from "./notification-templates";

describe("Phase 16 - Multi-Channel Notification & Resend Email Engine", () => {
  it("Gera notificação In-App e HTML de e-mail para conclusão de treino sem jargão técnico intimidador", () => {
    const payload = buildNotificationEventPayload("workout_completed", {
      recipientName: "Igor Santos",
      title: "Treino A — Pernas & Estabilidade",
      durationMinutes: 50,
      loadEa: 350,
    });

    assert.equal(payload.category, "training");
    assert.ok(payload.title.includes("Treino A"));
    assert.ok(payload.body.includes("50 min"));

    const email = renderEventEmail(payload);
    assert.ok(email.subject.includes("Treino A"));
    assert.ok(email.html.includes("Igor"));
    assert.ok(email.html.includes("selye.vrtice.com.br"));
    assert.ok(!email.html.includes("Machine Learning"));
  });

  it("Gera notificação e e-mail acolhedor para Check-in Matinal e Decisão do Dia", () => {
    const payload = buildNotificationEventPayload("morning_checkin_done", {
      recipientName: "Marina Costa",
      readinessScore: 88,
      decisionHeadline: "Sinal Verde: seu corpo está pronto para evoluir hoje",
    });

    assert.equal(payload.category, "recovery");
    assert.ok(payload.title.includes("88/100"));

    const email = renderEventEmail(payload);
    assert.ok(email.html.includes("88 / 100"));
    assert.ok(email.text.includes("Marina"));
  });

  it("Gera notificação de boas-vindas com passo a passo didático para iniciantes", () => {
    const payload = buildNotificationEventPayload("welcome_onboarding", {
      recipientName: "Lucas",
    });

    assert.equal(payload.category, "engagement");
    const email = renderEventEmail(payload);
    assert.ok(email.html.includes("Fazer Check-in Matinal"));
    assert.ok(email.html.includes("Constância sem culpa"));
  });
});
