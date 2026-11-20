"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Compass,
  Dumbbell,
  Plus,
  ShieldAlert,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import type {
  ComputedKpiCard,
  ModalityKpiDashboardResult,
  OnTrackStatus,
} from "@/core/kpi";
import { MODALITY_REGISTRY } from "@/core/modalities";
import { recordKpiMeasurementAction } from "@/actions/kpi";

const STATUS_STYLE: Record<
  OnTrackStatus,
  { badgeClass: string; borderClass: string; bgClass: string; dotClass: string }
> = {
  on_track: {
    badgeClass: "bg-lima text-grafite",
    borderClass: "border-profundo/50",
    bgClass: "bg-lima/10",
    dotClass: "bg-emerald-500",
  },
  attention: {
    badgeClass: "bg-amber-400/25 text-amber-500 border border-amber-500/40",
    borderClass: "border-amber-500/40",
    bgClass: "bg-amber-500/[0.06]",
    dotClass: "bg-amber-500",
  },
  off_track: {
    badgeClass: "bg-red-500/20 text-red-400 border border-red-500/40",
    borderClass: "border-red-500/40",
    bgClass: "bg-red-500/[0.06]",
    dotClass: "bg-red-500",
  },
  awaiting_data: {
    badgeClass: "bg-foreground/10 text-muted border border-line",
    borderClass: "border-line",
    bgClass: "bg-foreground/[0.02]",
    dotClass: "bg-mineral",
  },
};

export function ModalityKpiPanel({
  dashboard,
  onboardingCompleted,
  variant = "full",
  onOpenFullTab,
}: {
  dashboard: ModalityKpiDashboardResult;
  onboardingCompleted: boolean;
  variant?: "compact" | "full";
  onOpenFullTab?: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [loggingKpi, setLoggingKpi] = useState<ComputedKpiCard | null>(null);
  const [valueInput, setValueInput] = useState("");
  const [notesInput, setNotesInput] = useState("");
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const spec = MODALITY_REGISTRY[dashboard.modalityCode];
  const onTrackStyle = STATUS_STYLE[dashboard.onTrack.status];

  const handleSaveMeasurement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loggingKpi) return;
    setErrorMsg(null);

    let numericValue = Number(valueInput.replace(",", "."));
    // Suporte amigável para entrada mm:ss quando a unidade for s/km ou s/100m
    if (
      (loggingKpi.unit === "s/km" || loggingKpi.unit === "s/100m") &&
      valueInput.includes(":")
    ) {
      const [mStr, sStr] = valueInput.split(":");
      const mins = Number(mStr);
      const secs = Number(sStr);
      if (!Number.isNaN(mins) && !Number.isNaN(secs)) {
        numericValue = mins * 60 + secs;
      }
    }

    if (Number.isNaN(numericValue) || numericValue <= 0) {
      setErrorMsg("Informe um valor positivo válido.");
      return;
    }

    startTransition(async () => {
      try {
        await recordKpiMeasurementAction({
          modalityCode: dashboard.modalityCode,
          kpiKey: loggingKpi.key,
          valueNumeric: numericValue,
          notes: notesInput,
        });
        setFeedbackMsg(
          `Marca de ${loggingKpi.shortLabelPt} registrada! Painel recalculado.`
        );
        setLoggingKpi(null);
        setValueInput("");
        setNotesInput("");
        router.refresh();
        setTimeout(() => setFeedbackMsg(null), 4000);
      } catch {
        setErrorMsg("Erro ao salvar medição. Tente novamente.");
      }
    });
  };

  return (
    <section className="flex flex-col gap-4">
      {/* Cabeçalho + Selo "Nos Trilhos?" */}
      <div
        className={`card p-5 sm:p-6 border ${onTrackStyle.borderClass} ${onTrackStyle.bgClass} flex flex-col gap-4`}
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="t-label !text-accent-text">
                Indicadores · {dashboard.modalityShortNamePt}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold ${onTrackStyle.badgeClass}`}
              >
                {dashboard.onTrack.badgePt}
              </span>
              <span className="text-[10px] font-mono text-muted capitalize">
                Nível: {dashboard.experienceLevel}
              </span>
            </div>

            <h2 className="t-h2 mt-1.5 leading-snug">
              {dashboard.onTrack.headlinePt}
            </h2>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              {dashboard.onTrack.reasonPt}
            </p>
            <p className="text-xs text-foreground font-medium mt-1.5">
              Próximo passo: {dashboard.onTrack.nextActionPt}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {!onboardingCompleted && (
              <Link
                href="/onboarding"
                className="btn btn-primary h-8 px-3 text-[11px] font-mono font-bold"
              >
                <Sparkles size={12} />
                <span>Calibrar Modalidade</span>
              </Link>
            )}
            {variant === "compact" && onOpenFullTab && (
              <button
                type="button"
                onClick={onOpenFullTab}
                className="btn btn-ghost h-8 px-3 text-[11px] font-mono cursor-pointer"
              >
                <span>Ver Indicadores & Marcas</span>
                <ArrowUpRight size={13} />
              </button>
            )}
            {variant === "full" && (
              <Link
                href="/onboarding"
                className="btn btn-ghost h-8 px-3 text-[11px] font-mono"
              >
                <Compass size={12} />
                <span>Ajustar Modalidade / Meta</span>
              </Link>
            )}
          </div>
        </div>

        {/* Barra Real vs Esperado quando há meta numérica + data */}
        {dashboard.onTrack.actualProgressPercent !== null && (
          <div className="flex flex-col gap-1.5 pt-2 border-t border-line/60">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-muted">
                Progresso em {dashboard.onTrack.primaryKpiLabelPt}
              </span>
              <span className="text-foreground font-semibold">
                Real: {dashboard.onTrack.actualProgressPercent}%
                {dashboard.onTrack.expectedProgressPercent !== null
                  ? ` · Esperado hoje: ${dashboard.onTrack.expectedProgressPercent}%`
                  : ""}
              </span>
            </div>
            <div className="relative w-full h-2.5 rounded-full bg-foreground/10 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${onTrackStyle.dotClass}`}
                style={{
                  width: `${Math.min(100, Math.max(4, dashboard.onTrack.actualProgressPercent))}%`,
                }}
              />
              {dashboard.onTrack.expectedProgressPercent !== null && (
                <div
                  title={`Curva esperada hoje: ${dashboard.onTrack.expectedProgressPercent}%`}
                  className="absolute top-0 bottom-0 w-0.5 bg-foreground"
                  style={{
                    left: `${Math.min(99, Math.max(1, dashboard.onTrack.expectedProgressPercent))}%`,
                  }}
                />
              )}
            </div>
          </div>
        )}

        {/* Contagem transparente: Séria vs Complementar vs Atividade Solta (últimos 7d) */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-line/60 text-[11px] font-mono text-muted">
          <span>
            Últimos 7d ·{" "}
            <strong className="text-foreground">
              {dashboard.seriousSessionsLast7d}
            </strong>{" "}
            {dashboard.modalityShortNamePt}
          </span>
          {dashboard.complementarySessionsLast7d > 0 && (
            <span>
              ·{" "}
              <strong className="text-foreground">
                {dashboard.complementarySessionsLast7d}
              </strong>{" "}
              complementar
            </span>
          )}
          {dashboard.casualSessionsLast7d > 0 && (
            <span title="Atividades soltas entram na sua energia (EA) e consistência, sem distorcer os indicadores da sua modalidade principal">
              ·{" "}
              <strong className="text-foreground">
                {dashboard.casualSessionsLast7d}
              </strong>{" "}
              atividade(s) solta(s) fora dos indicadores principais
            </span>
          )}
        </div>
      </div>

      {/* Feedback de medição salva */}
      {feedbackMsg && (
        <div className="rounded-xl border border-profundo bg-lima/20 px-4 py-2.5 text-xs text-foreground flex items-center gap-2">
          <CheckCircle2 size={14} className="text-accent-text shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Guard-Rails Científicos Ativos */}
      {dashboard.guardrailWarnings.length > 0 && (
        <div className="flex flex-col gap-2">
          {dashboard.guardrailWarnings.map((w) => (
            <div
              key={w.code}
              className={`rounded-xl border p-3.5 flex items-start gap-3 ${
                w.severity === "high"
                  ? "border-red-500/40 bg-red-500/10"
                  : "border-amber-500/40 bg-amber-500/10"
              }`}
            >
              {w.severity === "high" ? (
                <ShieldAlert size={16} className="text-red-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
              )}
              <div>
                <h4 className="text-xs font-semibold text-foreground">
                  {w.titlePt}
                </h4>
                <p className="text-[11px] text-muted mt-0.5 leading-relaxed">
                  {w.detailPt}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Grid de Cards de KPIs Específicos da Modalidade */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {dashboard.kpis.map((kpi) => {
          const st = STATUS_STYLE[kpi.status];
          return (
            <div
              key={kpi.key}
              className="card p-4 flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="t-label text-[10px] leading-tight">
                    {kpi.shortLabelPt}
                  </span>
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 mt-1 ${st.dotClass}`}
                    title={kpi.statusLabelPt}
                  />
                </div>

                <div className="mt-1.5 flex items-baseline gap-2">
                  <span className="t-data text-xl sm:text-2xl font-bold text-foreground leading-none">
                    {kpi.formattedValue}
                  </span>
                  {kpi.deltaLabelPt && (
                    <span className="text-[10px] font-mono text-accent-text font-semibold">
                      {kpi.deltaLabelPt}
                    </span>
                  )}
                </div>

                <span className="text-[10px] font-mono text-muted block mt-1">
                  {kpi.statusLabelPt} · {kpi.sourceLabelPt}
                </span>
              </div>

              <div className="pt-2.5 border-t border-line/60 flex flex-col gap-2">
                <span className="text-[10px] text-muted leading-snug">
                  Ref. ({dashboard.experienceLevel}):{" "}
                  <strong className="text-foreground font-mono">
                    {kpi.referenceBand.min}–{kpi.referenceBand.max} {kpi.unit}
                  </strong>
                </span>

                {variant === "full" && kpi.canLogManualTest && (
                  <button
                    type="button"
                    onClick={() => {
                      setLoggingKpi(kpi);
                      setValueInput(
                        kpi.currentValue !== null ? String(kpi.currentValue) : ""
                      );
                      setErrorMsg(null);
                    }}
                    className="h-7 px-2.5 rounded-lg border border-line bg-foreground/[0.02] hover:bg-foreground/5 text-[11px] font-mono text-foreground flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Plus size={12} />
                    <span>Registrar marca</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Formulário Inline de Registro de Teste/Marca de KPI */}
      {loggingKpi && (
        <form
          onSubmit={handleSaveMeasurement}
          className="card p-4 sm:p-5 border-profundo/50 bg-lima/[0.06] flex flex-col gap-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="t-label !text-accent-text">
                Registrar Marca · {dashboard.modalityShortNamePt}
              </span>
              <h3 className="text-sm font-semibold text-foreground mt-0.5">
                {loggingKpi.labelPt}
              </h3>
              <p className="text-[11px] text-muted mt-0.5">
                {loggingKpi.interpretationPt}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setLoggingKpi(null)}
              aria-label="Fechar registro"
              className="p-1 text-muted hover:text-foreground cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-4 flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-foreground">
                Valor ({loggingKpi.unit}
                {loggingKpi.unit === "s/km" || loggingKpi.unit === "s/100m"
                  ? " ou mm:ss"
                  : ""}
                )
              </label>
              <input
                type="text"
                required
                value={valueInput}
                onChange={(e) => setValueInput(e.target.value)}
                placeholder={
                  loggingKpi.unit === "s/km"
                    ? "Ex: 5:00 ou 300"
                    : loggingKpi.unit === "s/100m"
                      ? "Ex: 1:40 ou 100"
                      : `Ex: ${loggingKpi.referenceBand.min}`
                }
                className="input h-9 text-xs font-mono"
              />
            </div>

            <div className="sm:col-span-5 flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-foreground">
                Observação do teste (opcional)
              </label>
              <input
                type="text"
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                placeholder="Ex: Teste 10km pista / CMJ pré-treino"
                className="input h-9 text-xs"
              />
            </div>

            <div className="sm:col-span-3">
              <button
                type="submit"
                disabled={isPending}
                className="btn btn-primary w-full h-9 text-xs font-mono font-bold cursor-pointer"
              >
                <Target size={13} />
                <span>{isPending ? "Salvando..." : "Salvar Marca"}</span>
              </button>
            </div>
          </div>

          {errorMsg && (
            <p className="text-xs text-red-400">{errorMsg}</p>
          )}
        </form>
      )}

      {/* Card Científico de Transferência da Musculação Complementar (modo full, quando esporte != musculação) */}
      {variant === "full" && dashboard.modalityCode !== "strength" && (
        <div className="card p-5 flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-lima/20 text-accent-text">
              <Dumbbell size={15} />
            </span>
            <div>
              <span className="t-label !text-accent-text">
                Integração Musculação → {dashboard.modalityShortNamePt}
              </span>
              <h3 className="text-sm font-semibold text-foreground">
                {spec.complementaryStrength.objectiveHeadlinePt}
              </h3>
            </div>
          </div>
          <p className="text-xs text-muted leading-relaxed">
            {spec.complementaryStrength.physiologicalTransferPt}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-line/60 text-[11px]">
            <div className="rounded-lg bg-foreground/[0.02] border border-line p-2.5">
              <span className="font-mono text-[10px] uppercase text-muted block">
                Protocolo Recomendado
              </span>
              <span className="text-foreground mt-0.5 block leading-snug">
                {spec.complementaryStrength.intensityPrescriptionPt}
              </span>
            </div>
            <div className="rounded-lg bg-foreground/[0.02] border border-line p-2.5">
              <span className="font-mono text-[10px] uppercase text-muted block">
                Separação Mínima ({spec.complementaryStrength.minSeparationHoursFromMainModality}h)
              </span>
              <span className="text-foreground mt-0.5 block leading-snug">
                {spec.complementaryStrength.separationRationalePt}
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
