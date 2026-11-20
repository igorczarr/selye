"use server";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getOrCreateDemoUser } from "./workout";
import {
  MODALITY_REGISTRY,
  type CoreModalityCode,
} from "@/core/modalities";

export interface RecordKpiMeasurementInput {
  modalityCode: CoreModalityCode;
  kpiKey: string;
  valueNumeric: number;
  notes?: string;
}

/**
 * Registra uma marca ou teste periódico de KPI em `athlete_kpi_measurements` (§Fase 3).
 * Ex.: Salto Vertical CMJ (cm), FTP (W/kg), CSS (s/100m), Yo-Yo IR1 (m), Sprint 30m (s), Barra Fixa (reps).
 */
export async function recordKpiMeasurementAction(
  input: RecordKpiMeasurementInput
) {
  const user = await getOrCreateDemoUser();
  const spec = MODALITY_REGISTRY[input.modalityCode];
  if (!spec) {
    throw new Error("Modalidade não encontrada no registro científico.");
  }

  const kpiDef = spec.kpis.find((k) => k.key === input.kpiKey);
  if (!kpiDef) {
    throw new Error("KPI não encontrado para a modalidade selecionada.");
  }

  if (
    typeof input.valueNumeric !== "number" ||
    Number.isNaN(input.valueNumeric) ||
    !Number.isFinite(input.valueNumeric)
  ) {
    throw new Error("Informe um valor numérico válido.");
  }

  const [sportRow] = await db
    .select()
    .from(schema.sports)
    .where(eq(schema.sports.code, input.modalityCode))
    .limit(1);

  const [created] = await db
    .insert(schema.athleteKpiMeasurements)
    .values({
      userId: user.id,
      sportId: sportRow?.id || null,
      modalityCode: input.modalityCode,
      kpiKey: kpiDef.key,
      valueNumeric: input.valueNumeric,
      unit: kpiDef.unit,
      source: "manual_test",
      measuredAt: new Date(),
      notes: input.notes?.trim() || null,
    })
    .returning();

  revalidatePath("/evolucao");
  revalidatePath("/perfil");
  revalidatePath("/");

  return { ok: true, measurement: created };
}
