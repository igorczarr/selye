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

  // Regra 1: Pico de Esforço Recente (ACWR > 1.50)
  if (ctx.acwrResult.acwr > 1.5) {
    recommendations.push({
      id: "rec_danger_zone_acwr",
      type: "recovery",
      urgency: "alert",
      title: "Pico de Esforço Recente · Priorize Recuperação",
      message:
        "Sua demanda física nos últimos 7 dias ficou significativamente acima da sua média de 28 dias. Equilibre a semana com sono, hidratação ou sessão regenerativa.",
      scientificRationale: `Sua tendência de carga aguda vs. crônica (ACWR) é de ${ctx.acwrResult.acwr}. A literatura de monitoramento de carga (Foster; Gabbett, 2016; Impellizzeri et al., 2020) utiliza esta razão como indicador contextual de variação abrupta de volume/intensidade para calibrar o descanso entre estímulos.`,
      actionableStep: "Opte por uma sessão regenerativa, mobilidade articular ou descanso ativo nas próximas 24 horas.",
    });
  }

  // Regra 2: Semana Forte · Progressão (1.30 < ACWR <= 1.50)
  else if (ctx.acwrResult.acwr > 1.3) {
    recommendations.push({
      id: "rec_elevated_risk_acwr",
      type: "deload",
      urgency: "warning",
      title: "Semana Forte · Progressão Ativa",
      message:
        "Você elevou sua carga semanal acima da média habitual. Para consolidar essa adaptação com qualidade, garanta boas janelas de recuperação.",
      scientificRationale: `Sua razão 7d/28d atual é de ${ctx.acwrResult.acwr}, logo acima da faixa de estabilidade (0.8 a 1.3). Uma progressão controlada estimula supercompensação, desde que acompanhada de sono e nutrição adequados.`,
      actionableStep: "Mantenha o treino programado controlando a margem de repetições em reserva (RIR 1–2).",
    });
  }

  // Regra 3: Semana Leve · Recuperação ou Retomada (ACWR < 0.80)
  else if (ctx.acwrResult.acwr < 0.8 && ctx.acwrResult.chronicLoad > 0) {
    recommendations.push({
      id: "rec_under_training_acwr",
      type: "progressive_overload",
      urgency: "info",
      title: "Semana Leve · Janela de Recuperação e Prontidão",
      message:
        "Sua carga dos últimos 7 dias está mais leve que sua média de 28 dias — excelente para assimilar blocos intensos ou retomar o ritmo gradualmente.",
      scientificRationale: `Com razão 7d/28d em ${ctx.acwrResult.acwr}, seu organismo reduziu a fadiga residual acumulada e dispõe de reserva adaptativa para a próxima sessão de força, quadra ou corrida.`,
      actionableStep: "Aproveite a prontidão para executar sua próxima ficha com técnica limpa e progressão gradual.",
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