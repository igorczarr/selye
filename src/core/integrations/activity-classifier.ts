/**
 * Classificação de Atividades Livres e Importadas (Fase 6)
 *
 * Separa de forma determinística:
 * - `serious`: treino da modalidade principal (alimenta KPIs, meta, carga EA e consistência)
 * - `complementary`: fortalecimento/suporte estruturado (alimenta transferência, carga EA e consistência)
 * - `casual`: atividade solta/cardio/lazer fora do foco (alimenta carga EA e consistência,
 *   SEM poluir os KPIs nem a periodização da modalidade principal)
 */

import {
  classifyActivityForAthlete,
  getModalitySpec,
  type ActivityClass,
  type ActivityClassificationResult,
  type AthleteModalityProfile,
  type CoreModalityCode,
} from "@/core/modalities";

export type ActivityClassChoice = ActivityClass | "auto";

export interface ActivityClassPresentation {
  activityClass: ActivityClass;
  badgePt: string;
  titlePt: string;
  impactSummaryPt: string;
}

export const ACTIVITY_CLASS_PRESENTATION: Record<
  ActivityClass,
  ActivityClassPresentation
> = {
  serious: {
    activityClass: "serious",
    badgePt: "Modalidade",
    titlePt: "Treino da Modalidade",
    impactSummaryPt: "Atualiza KPIs, curva de meta, carga (EA) e consistência.",
  },
  complementary: {
    activityClass: "complementary",
    badgePt: "Suporte",
    titlePt: "Fortalecimento / Suporte",
    impactSummaryPt:
      "Conta na transferência de força, carga (EA) e consistência sem poluir KPIs principais.",
  },
  casual: {
    activityClass: "casual",
    badgePt: "Solta",
    titlePt: "Atividade Solta",
    impactSummaryPt:
      "Entra na carga sistêmica (EA) e consistência sem alterar KPIs ou periodização.",
  },
};

export function getActivityClassPresentation(
  activityClass?: string | null
): ActivityClassPresentation {
  if (activityClass === "serious") return ACTIVITY_CLASS_PRESENTATION.serious;
  if (activityClass === "complementary") {
    return ACTIVITY_CLASS_PRESENTATION.complementary;
  }
  return ACTIVITY_CLASS_PRESENTATION.casual;
}

export interface ClassifyImportedOrFreeActivityInput {
  activityModalityCode?: string | null;
  athleteProfile: Pick<
    AthleteModalityProfile,
    "primaryModality" | "complementaryModalities"
  >;
  explicitClass?: ActivityClassChoice | null;
  /** True quando há compromisso planejado na data ou sessão ligada a uma ficha do plano */
  linkedToPlannedSession?: boolean;
}

export interface ClassifiedActivityOutcome extends ActivityClassificationResult {
  presentation: ActivityClassPresentation;
  wasExplicitOverride: boolean;
  primaryModalityNamePt: string;
}

export function classifyImportedOrFreeActivity(
  input: ClassifyImportedOrFreeActivityInput
): ClassifiedActivityOutcome {
  const normalizedExplicit: ActivityClass | null =
    input.explicitClass && input.explicitClass !== "auto"
      ? input.explicitClass
      : null;

  const fullProfile: AthleteModalityProfile = {
    primaryModality: input.athleteProfile.primaryModality,
    complementaryModalities: input.athleteProfile.complementaryModalities,
    experienceLevel: "intermediate",
  };

  const result = classifyActivityForAthlete({
    activityModalityCode: input.activityModalityCode,
    athleteProfile: fullProfile,
    explicitClass: normalizedExplicit,
    linkedToPlannedSession: input.linkedToPlannedSession,
  });

  const primarySpec = getModalitySpec(input.athleteProfile.primaryModality);
  const presentation = getActivityClassPresentation(result.activityClass);

  return {
    ...result,
    presentation,
    wasExplicitOverride: normalizedExplicit !== null,
    primaryModalityNamePt: primarySpec?.shortNamePt || "Musculação",
  };
}

/**
 * Classifica um lote de atividades importadas (.GPX, .TCX, .CSV, .JSON) contra
 * o perfil do atleta e as datas com compromissos planejados no calendário.
 */
export function classifyExternalActivityBatch<
  T extends { modalityCode: string; localDate: string }
>(input: {
  activities: T[];
  athleteProfile: Pick<
    AthleteModalityProfile,
    "primaryModality" | "complementaryModalities"
  >;
  explicitOverride?: ActivityClassChoice | null;
  plannedDatesSet?: ReadonlySet<string>;
}): Array<{
  activity: T;
  classification: ClassifiedActivityOutcome;
}> {
  return input.activities.map((activity) => {
    const linkedToPlannedSession = Boolean(
      input.plannedDatesSet && input.plannedDatesSet.has(activity.localDate)
    );
    const classification = classifyImportedOrFreeActivity({
      activityModalityCode: activity.modalityCode,
      athleteProfile: input.athleteProfile,
      explicitClass: input.explicitOverride ?? "auto",
      linkedToPlannedSession,
    });
    return { activity, classification };
  });
}

export function getDefaultAthleteProfileFallback(
  primaryModality?: CoreModalityCode | null,
  complementaryModalities?: CoreModalityCode[] | null
): Pick<
  AthleteModalityProfile,
  "primaryModality" | "complementaryModalities"
> {
  const primary: CoreModalityCode = primaryModality || "strength";
  const complementary: CoreModalityCode[] =
    complementaryModalities && complementaryModalities.length > 0
      ? complementaryModalities.filter((m) => m !== primary)
      : primary === "strength"
        ? []
        : ["strength"];
  return {
    primaryModality: primary,
    complementaryModalities: complementary,
  };
}
