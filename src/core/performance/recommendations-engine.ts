/**
 * Motor de Recomendações Esportivas Transparentes e Explicáveis (XAI - §21 do Briefing)
 * Baseado estritamente em ciência do esporte (Foster, Banister, Gabbett).
 * Princípio ético inegociável: Sem diagnósticos médicos, sem promessas estéticas.
 * Toda recomendação DEVE explicar com clareza o motivo técnico de sua exibição.
 */

import { type ACWRResult } from "./training-load";

export interface PerformanceRecommendation {
  id: string;
  type: "recovery" | "deload" | "progressive_overload" | "consistency" | "hydration_sleep";
  urgency: "info" | "warning" | "alert";
  title: string;
  message: string;
  scientificRationale: string; // "Por que estou vendo isso?"
  actionableStep?: string;
}

export interface AthleteContext {
  acwrResult: ACWRResult;
  consecutiveTrainingDays: number;
  averageRpeLast7Days: number;
  weeklyGoalTarget: number;
  completedDaysThisWeek: number;
}

export function generatePerformanceRecommendations(
  ctx: AthleteContext
): PerformanceRecommendation[] {
  const recommendations: PerformanceRecommendation[] = [];

  // Regra 1: Pico Agudo Desproporcional (ACWR > 1.50)
  if (ctx.acwrResult.acwr > 1.5) {
    recommendations.push({
      id: "rec_danger_zone_acwr",
      type: "recovery",
      urgency: "alert",
      title: "Pico de Carga Aguda Detectado",
      message:
        "Sua demanda física nos últimos 7 dias cresceu consideravelmente acima do seu histórico dos últimos 28 dias. Priorize uma sessão de recuperação ativa ou descanso.",
      scientificRationale: `Sua razão de carga aguda para crônica (ACWR) calculada é de ${ctx.acwrResult.acwr}. A literatura científica em fisiologia do exercício (Gabbett, 2016) aponta que índices acima de 1.5 multiplicam significativamente a suscetibilidade a lesões por sobrecarga e fadiga neuromuscular acumulada.`,
      actionableStep: "Opte por uma caminhada leve, sessão de mobilidade articular ou descanso total nas próximas 24 horas.",
    });
  }

  // Regra 2: Alerta de Carga Acelerada (1.30 < ACWR <= 1.50)
  else if (ctx.acwrResult.acwr > 1.3) {
    recommendations.push({
      id: "rec_elevated_risk_acwr",
      type: "deload",
      urgency: "warning",
      title: "Progressão de Carga em Ritmo Acelerado",
      message:
        "Você está evoluindo sua intensidade de forma rápida. Para consolidar essa adaptação sem estagnação, assegure pausas estratégicas.",
      scientificRationale: `Seu ACWR atual é de ${ctx.acwrResult.acwr}, logo acima da faixa ótima (0.8 a 1.3). Uma elevação controlada gera ganhos esportivos, contudo requer atenção redobrada à qualidade do sono e tempo de intervalo entre treinos intensos.`,
      actionableStep: "Mantenha o treino programado, mas evite séries até a falha muscular concêntrica hoje.",
    });
  }

  // Regra 3: Sub-treinamento ou Carga Decrescente (ACWR < 0.80)
  else if (ctx.acwrResult.acwr < 0.8 && ctx.acwrResult.chronicLoad > 0) {
    recommendations.push({
      id: "rec_under_training_acwr",
      type: "progressive_overload",
      urgency: "info",
      title: "Oportunidade de Retomada Gradual",
      message:
        "Sua carga aguda recente está abaixo da capacidade desenvolvida nos últimos 28 dias. Uma retomada progressiva restabelecerá seu condicionamento.",
      scientificRationale: `Com ACWR em ${ctx.acwrResult.acwr}, seu corpo assimilou os estímulos anteriores e dispõe de prontidão biológica para novos estímulos de força ou endurance, sem necessidade de saltos súbitos de carga.`,
      actionableStep: "Retome sua rotina habitual mantendo o controle de cargas registradas.",
    });
  }

  // Regra 4: Dias Consecutivos com Intensidade Alta (>= 4 dias seguidos com RPE >= 7.5)
  if (ctx.consecutiveTrainingDays >= 4 && ctx.averageRpeLast7Days >= 7.5) {
    recommendations.push({
      id: "rec_high_consecutive_intensity",
      type: "hydration_sleep",
      urgency: "warning",
      title: "Acúmulo de Intensidade Contínua",
      message:
        "Você registrou 4 ou mais dias seguidos de esforço elevado (RPE médio alto). A supercompensação exige tempo hábil de regeneração.",
      scientificRationale: `O princípio biológico da supercompensação (Hans Selye / Banister) estabelece que o aprimoramento físico ocorre na fase de repouso subsequente ao estresse adaptativo. Sessões sucessivas de RPE elevado sem intervalo diminuem os estoques de glicogênio e aumentam a fadiga central.`,
      actionableStep: "Priorize 8 horas de sono restaurador e hidratação adequada.",
    });
  }

  // Regra 5: Faixa Ótima & Consistência Exemplar (Sweet Spot)
  if (ctx.acwrResult.status === "sweet_spot" && recommendations.length === 0) {
    recommendations.push({
      id: "rec_sweet_spot_consistency",
      type: "consistency",
      urgency: "info",
      title: "Carga em Faixa Ótima de Adaptação",
      message:
        "Seu ritmo de treino está perfeitamente calibrado entre o estímulo atual e a sua capacidade crônica de recuperação.",
      scientificRationale: `Seu ACWR de ${ctx.acwrResult.acwr} encontra-se dentro do 'Sweet Spot' (0.80 a 1.30). Nesta faixa, o atleta maximiza ganhos de condicionamento físico com a menor probabilidade relativa de sobrecarga negativa.`,
      actionableStep: "Mantenha o cumprimento regular da sua meta semanal com disciplina.",
    });
  }

  return recommendations;
}