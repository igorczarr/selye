/**
 * Avisos do Treinador Selye (Fase 7)
 * Transformam o estado "nos trilhos?" + proteções da modalidade em avisos curtos,
 * citando a modalidade e a meta do atleta, e organizados por prioridade.
 */

export type CoachAlertPriority = "now" | "plan" | "info";

export interface CoachAlert {
  id: string;
  priority: CoachAlertPriority;
  badgePt: string;
  titlePt: string;
  bodyPt: string;
  ctaHref: string;
  ctaLabelPt: string;
}

export interface CoachAlertInput {
  modalityShortNamePt: string;
  onTrack: {
    status: "on_track" | "attention" | "off_track" | "awaiting_data";
    headlinePt: string;
    reasonPt: string;
    nextActionPt: string;
    primaryKpiLabelPt: string;
    actualProgressPercent: number | null;
    expectedProgressPercent: number | null;
  };
  guardrailWarnings: Array<{
    code: string;
    severity: "info" | "caution" | "high";
    titlePt: string;
    detailPt: string;
  }>;
  casualSessionsLast7d: number;
  goalTitle?: string | null;
}

const PRIORITY_ORDER: Record<CoachAlertPriority, number> = {
  now: 0,
  plan: 1,
  info: 2,
};

export function buildCoachAlerts(input: CoachAlertInput): CoachAlert[] {
  const alerts: CoachAlert[] = [];
  const mod = input.modalityShortNamePt;
  const goal = input.goalTitle ? ` (${input.goalTitle})` : "";

  for (const w of input.guardrailWarnings.filter((x) => x.severity !== "info")) {
    alerts.push({
      id: `coach_guard_${w.code}`,
      priority: w.severity === "high" ? "now" : "plan",
      badgePt: `Cuidado · ${mod}`,
      titlePt: w.titlePt,
      bodyPt: w.detailPt,
      ctaHref: "/evolucao",
      ctaLabelPt: "Ver detalhes",
    });
  }

  const t = input.onTrack;
  if (t.status === "off_track") {
    alerts.push({
      id: "coach_ontrack_off",
      priority: "now",
      badgePt: `Sua meta · ${mod}`,
      titlePt: `Vamos reajustar a rota${goal}`,
      bodyPt: `${t.reasonPt} ${t.nextActionPt}`.trim(),
      ctaHref: "/calendario",
      ctaLabelPt: "Ajustar plano",
    });
  } else if (t.status === "attention") {
    alerts.push({
      id: "coach_ontrack_attention",
      priority: "plan",
      badgePt: `Sua meta · ${mod}`,
      titlePt: `Você está perto da curva${goal}`,
      bodyPt: `${t.reasonPt} ${t.nextActionPt}`.trim(),
      ctaHref: "/evolucao",
      ctaLabelPt: "Ver meu progresso",
    });
  } else if (t.status === "on_track") {
    const pct =
      t.actualProgressPercent !== null
        ? ` Você já cumpriu ${Math.round(t.actualProgressPercent)}% do caminho.`
        : "";
    alerts.push({
      id: "coach_ontrack_ok",
      priority: "info",
      badgePt: `Sua meta · ${mod}`,
      titlePt: `Tudo nos trilhos em ${t.primaryKpiLabelPt}`,
      bodyPt: `${t.headlinePt}.${pct}`,
      ctaHref: "/evolucao",
      ctaLabelPt: "Ver evolução",
    });
  } else {
    alerts.push({
      id: "coach_ontrack_waiting",
      priority: "plan",
      badgePt: `Sua meta · ${mod}`,
      titlePt: "Falta sua primeira marca",
      bodyPt: t.nextActionPt,
      ctaHref: "/evolucao",
      ctaLabelPt: "Registrar marca",
    });
  }

  if (input.casualSessionsLast7d >= 3) {
    alerts.push({
      id: "coach_casual_volume",
      priority: "info",
      badgePt: "Atividades soltas",
      titlePt: `${input.casualSessionsLast7d} atividades soltas na semana`,
      bodyPt: `Elas gastam sua energia, mas não contam como treino de ${mod}. Se estiver cansado, capriche no descanso antes do próximo treino principal.`,
      ctaHref: "/evolucao",
      ctaLabelPt: "Ver minha energia",
    });
  }

  return sortCoachAlerts(alerts);
}

export function sortCoachAlerts(alerts: CoachAlert[]): CoachAlert[] {
  return [...alerts].sort(
    (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
  );
}

export function groupCoachAlerts(alerts: CoachAlert[]): {
  now: CoachAlert[];
  plan: CoachAlert[];
  info: CoachAlert[];
} {
  return {
    now: alerts.filter((a) => a.priority === "now"),
    plan: alerts.filter((a) => a.priority === "plan"),
    info: alerts.filter((a) => a.priority === "info"),
  };
}
