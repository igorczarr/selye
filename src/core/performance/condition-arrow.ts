/**
 * Indicador de Condição Física Estilo PES / FIFA conectado diretamente à Reserva de EA (§Fase 21)
 *
 * Traduz a porcentagem da Reserva de Energia Adaptativa (EA) disponível do atleta
 * nos 5 estados clássicos de seta de condição esportiva:
 * - peak_up       (>= 85%): ⬆️ Azul-Ciano Elétrico — Ápice Físico · Voando!
 * - good_up       (65-84%): ↗️ Verde Esmeralda — Boa Forma · Pronto para Evoluir
 * - steady_flat   (45-64%): ➡️ Amarelo Ouro — Forma Estável · Ritmo Moderado
 * - tired_down    (25-44%): ↘️ Laranja — Fadiga Acumulada · Priorize +EA
 * - exhausted_down (< 25%): ⬇️ Vermelho — Reserva Crítica · Descanso Prioritário
 */

export type ConditionArrowTier =
  | "peak_up"
  | "good_up"
  | "steady_flat"
  | "tired_down"
  | "exhausted_down";

export interface ConditionArrowStatus {
  tier: ConditionArrowTier;
  /** Rotação em graus relativa à seta apontando para cima (0° = ⬆️, 45° = ↗️, 90° = ➡️, 135° = ↘️, 180° = ⬇️) */
  rotationDeg: 0 | 45 | 90 | 135 | 180;
  /** Cor hex principal do indicador estilo PES/FIFA */
  colorHex: string;
  /** Cor secundária de brilho/glow */
  glowHex: string;
  /** Nome curto da condição em PT-BR */
  labelPt: string;
  /** Explicação direta para tooltip e perfil */
  descriptionPt: string;
  /** Percentual normalizado da reserva de EA (0..100) */
  reservePercent: number;
}

export function resolveConditionArrow(input: {
  reservePercent: number;
  availableReserveEa?: number;
  personalCapacityEa?: number;
}): ConditionArrowStatus {
  const pct = Math.max(0, Math.min(100, Math.round(input.reservePercent)));
  const eaContext =
    typeof input.availableReserveEa === "number" &&
    typeof input.personalCapacityEa === "number"
      ? ` (${input.availableReserveEa}/${input.personalCapacityEa} EA)`
      : ` (${pct}% EA)`;

  if (pct >= 85) {
    return {
      tier: "peak_up",
      rotationDeg: 0,
      colorHex: "#00D4FF",
      glowHex: "rgba(0, 212, 255, 0.55)",
      labelPt: "Ápice Físico",
      descriptionPt: `Reserva no topo${eaContext}: corpo leve e pronto para treinos intensos ou recordes.`,
      reservePercent: pct,
    };
  }

  if (pct >= 65) {
    return {
      tier: "good_up",
      rotationDeg: 45,
      colorHex: "#22C55E",
      glowHex: "rgba(34, 197, 94, 0.45)",
      labelPt: "Em Boa Forma",
      descriptionPt: `Boa reserva energética${eaContext}: ótimo momento para manter sua progressão.`,
      reservePercent: pct,
    };
  }

  if (pct >= 45) {
    return {
      tier: "steady_flat",
      rotationDeg: 90,
      colorHex: "#EAB308",
      glowHex: "rgba(234, 179, 8, 0.42)",
      labelPt: "Forma Estável",
      descriptionPt: `Energia equilibrada${eaContext}: ritmo moderado e foco em técnica limpa.`,
      reservePercent: pct,
    };
  }

  if (pct >= 25) {
    return {
      tier: "tired_down",
      rotationDeg: 135,
      colorHex: "#F97316",
      glowHex: "rgba(249, 115, 22, 0.45)",
      labelPt: "Fadiga Acumulada",
      descriptionPt: `Reserva reduzida${eaContext}: alivie o volume e priorize sono e hábitos +EA.`,
      reservePercent: pct,
    };
  }

  return {
    tier: "exhausted_down",
    rotationDeg: 180,
    colorHex: "#EF4444",
    glowHex: "rgba(239, 68, 68, 0.5)",
    labelPt: "Reserva Crítica",
    descriptionPt: `Bateria muito baixa${eaContext}: priorize descanso real para evitar esgotamento.`,
    reservePercent: pct,
  };
}
