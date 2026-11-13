/**
 * Deduplicação de Atividades de Plataformas Externas (§16.2 do Briefing)
 * Evita contagem dupla de volume e streak quando o atleta usa Apple Watch + Strava simultaneamente.
 */

export interface ExistingActivity {
  id: string;
  externalActivityId?: string | null;
  source: string;
  startedAt: string; // ISO 8601
  durationMinutes: number;
  sportCode?: string | null;
}

export interface IncomingExternalActivity {
  externalActivityId: string;
  source: "strava" | "apple_health" | "health_connect" | "garmin";
  startedAt: string; // ISO 8601
  durationMinutes: number;
  sportCode?: string | null;
}

export function isDuplicateActivity(
  incoming: IncomingExternalActivity,
  existingList: ExistingActivity[]
): { isDuplicate: boolean; matchedExistingId?: string; reason?: string } {
  const incomingTime = new Date(incoming.startedAt).getTime();

  for (const existing of existingList) {
    // 1. Chave idêntica explícita
    if (
      existing.externalActivityId &&
      existing.externalActivityId === incoming.externalActivityId
    ) {
      return {
        isDuplicate: true,
        matchedExistingId: existing.id,
        reason: `Chave externa idêntica encontrada (${incoming.externalActivityId}).`,
      };
    }

    // 2. Janela temporal aproximada (+/- 15 minutos) e mesma modalidade
    const existingTime = new Date(existing.startedAt).getTime();
    const diffMinutes = Math.abs(incomingTime - existingTime) / (1000 * 60);

    if (diffMinutes <= 15) {
      // Se tiver esporte informado e for o mesmo, ou se durações forem similares (+/- 10 min)
      const durationDiff = Math.abs(incoming.durationMinutes - existing.durationMinutes);
      const sameSport =
        !incoming.sportCode ||
        !existing.sportCode ||
        incoming.sportCode === existing.sportCode;

      if (sameSport && durationDiff <= 10) {
        return {
          isDuplicate: true,
          matchedExistingId: existing.id,
          reason: `Atividade concorrente detectada via ${existing.source} no mesmo intervalo de tempo (${Math.round(diffMinutes)} min de diferença).`,
        };
      }
    }
  }

  return { isDuplicate: false };
}