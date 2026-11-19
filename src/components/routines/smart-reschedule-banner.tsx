"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { applySmartRescheduleAction } from "@/actions/routines";
import type { RescheduleProposal } from "@/core/performance/weekly-rescheduler";
import {
  CalendarClock,
  ArrowLeftRight,
  SlidersHorizontal,
  Check,
  X,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export function SmartRescheduleBanner({
  proposals,
}: {
  proposals: RescheduleProposal[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dismissedIds, setDismissedIds] = useState<Record<string, boolean>>({});
  const [appliedBanner, setAppliedBanner] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const visibleProposals = proposals.filter((p) => !dismissedIds[p.id]);

  if (visibleProposals.length === 0 && !appliedBanner) {
    return null;
  }

  const handleApply = (prop: RescheduleProposal) => {
    startTransition(async () => {
      await applySmartRescheduleAction({
        actionType: prop.actionType,
        targetProgramId: prop.targetProgramId,
        toJsDay: prop.toJsDay,
        swapWithProgramId: prop.swapWithProgramId,
      });
      setDismissedIds((prev) => ({ ...prev, [prop.id]: true }));
      setAppliedBanner(
        `Ajuste aplicado com sucesso em "${prop.targetProgramTitle}". Sua semana foi recalibrada.`
      );
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-3 fade-up">
      {appliedBanner && (
        <div
          role="status"
          className="rounded-xl border border-profundo bg-lima/20 px-4 py-3 flex items-center justify-between gap-3 text-xs text-foreground"
        >
          <div className="flex items-center gap-2">
            <Check size={15} className="text-accent-text shrink-0" />
            <span className="font-medium">{appliedBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setAppliedBanner(null)}
            aria-label="Fechar confirmação"
            className="text-muted hover:text-foreground cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {visibleProposals.map((prop) => {
        const isOpen = expandedId === prop.id;
        const ActionIcon =
          prop.actionType === "swap_days"
            ? ArrowLeftRight
            : prop.actionType === "deload_volume"
              ? SlidersHorizontal
              : CalendarClock;

        return (
          <section
            key={prop.id}
            aria-label={`Sugestão de reagendamento: ${prop.title}`}
            className="card p-4 sm:p-5 flex flex-col gap-3 border-l-4 border-l-profundo bg-foreground/[0.02]"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-lima/25 text-foreground flex items-center justify-center shrink-0 mt-0.5">
                  <ActionIcon size={17} />
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="t-label !text-accent-text">
                      Reagendamento Inteligente · 1 Toque
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-foreground/8 text-foreground">
                      {prop.conflictType === "same_day_free_activity"
                        ? "Atividade Livre Hoje"
                        : prop.conflictType === "consecutive_lower_interference"
                          ? "Prevenção de Interferência"
                          : "Gestão de Orçamento"}
                    </span>
                  </div>

                  <h3 className="font-semibold text-sm text-foreground mt-1">
                    {prop.title}
                  </h3>
                  <p className="text-xs text-muted mt-0.5 leading-relaxed">
                    {prop.whyExplanation}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleApply(prop)}
                  className="btn btn-primary h-9 px-3.5 text-xs"
                >
                  <Check size={13} strokeWidth={2.4} />
                  <span>
                    {isPending ? "Aplicando..." : prop.actionButtonLabel}
                  </span>
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    setDismissedIds((prev) => ({ ...prev, [prop.id]: true }))
                  }
                  className="btn btn-ghost h-9 px-3 text-xs font-mono text-muted hover:text-foreground"
                >
                  Manter como está
                </button>
              </div>
            </div>

            <div className="border-t border-line/60 pt-2 flex items-center justify-between">
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setExpandedId(isOpen ? null : prop.id)}
                className="text-[11px] font-mono text-muted hover:text-foreground inline-flex items-center gap-1.5 cursor-pointer"
              >
                <HelpCircle size={12} />
                <span>Base científica (Efeito de Interferência)</span>
                {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
              <span className="text-[11px] font-mono text-muted">
                Sugestão opcional · Você está no comando
              </span>
            </div>

            {isOpen && (
              <p className="p-3 rounded-lg bg-surface border border-line text-xs text-muted font-mono leading-relaxed">
                {prop.scientificNote}
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}
