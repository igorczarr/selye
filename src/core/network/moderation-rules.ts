/**
 * Regras de Moderação e Bloqueio (§11.5)
 * Garante ambiente esportivo respeitoso, sem assédio e com privacidade auditável.
 */

export interface BlockRelation {
  blockerId: string;
  blockedId: string;
}

export function isContentVisibleBetween(
  authorId: string,
  viewerId: string,
  blocks: BlockRelation[]
): boolean {
  if (authorId === viewerId) return true;

  // Bloqueio mútuo: se qualquer um bloqueou o outro, o conteúdo não é visível
  const isBlocked = blocks.some(
    (b) =>
      (b.blockerId === viewerId && b.blockedId === authorId) ||
      (b.blockerId === authorId && b.blockedId === viewerId)
  );

  return !isBlocked;
}

export const VALID_REPORT_REASONS = [
  "Spam ou publicidade indevida",
  "Conteúdo tóxico ou desrespeito esportivo",
  "Assédio ou discriminação",
  "Informação física ou de saúde enganosa",
  "Outro motivo",
] as const;

export function validateReportInput(input: {
  targetType: "post" | "comment" | "user";
  targetId: string;
  reason: string;
}): { isValid: boolean; error?: string } {
  if (!input.targetId || input.targetId.trim().length === 0) {
    return { isValid: false, error: "Identificador do alvo da denúncia é obrigatório." };
  }

  if (!input.reason || input.reason.trim().length < 3) {
    return { isValid: false, error: "Motivo da denúncia deve conter pelo menos 3 caracteres." };
  }

  return { isValid: true };
}